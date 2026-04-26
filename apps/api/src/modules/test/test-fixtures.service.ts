import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MikroORM, EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import bcrypt from 'bcrypt';
import {
  createFilmDeviceRequestSchema,
  createFilmJourneyEventRequestSchema,
  filmLotCreateRequestSchema,
  type CreateFilmDeviceRequest,
  type CreateFilmJourneyEventRequest,
  type FilmLotCreateRequest,
} from '@frollz2/schema';
import { z } from 'zod';
import { seedDatabase } from '../../infrastructure/seed.js';
import { UserEntity } from '../../infrastructure/entities/index.js';
import { AuthService } from '../auth/auth.service.js';
import { DevicesService } from '../devices/devices.service.js';
import { FilmService } from '../film/film.service.js';
import { ReferenceService } from '../reference/reference.service.js';

const loginAsSchema = z.object({
  email: z.email().optional(),
  password: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});

const fixturesUsersSchema = z.object({
  users: z.array(z.object({
    email: z.email(),
    password: z.string().min(1),
    name: z.string().min(1).optional(),
  })).min(1).optional(),
});

const fixturesDevicesSchema = z.object({
  userEmail: z.email().optional(),
  userPassword: z.string().min(1).optional(),
  userName: z.string().min(1).optional(),
  devices: z.array(z.custom<CreateFilmDeviceRequest>((value) => createFilmDeviceRequestSchema.safeParse(value).success)).min(1),
});

const fixturesFilmSchema = z.object({
  userEmail: z.email().optional(),
  userPassword: z.string().min(1).optional(),
  userName: z.string().min(1).optional(),
  lots: z.array(z.custom<FilmLotCreateRequest>((value) => filmLotCreateRequestSchema.safeParse(value).success)).default([]),
  events: z.array(z.object({
    filmId: z.number().int().positive(),
    event: z.custom<CreateFilmJourneyEventRequest>((value) => createFilmJourneyEventRequestSchema.safeParse(value).success),
  })).default([]),
}).refine((value) => value.lots.length > 0 || value.events.length > 0, {
  message: 'At least one lot or event is required',
});

@Injectable()
export class TestFixturesService {
  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager,
    @Inject(MikroORM) private readonly orm: MikroORM,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(FilmService) private readonly filmService: FilmService,
    @Inject(ReferenceService) private readonly referenceService: ReferenceService,
  ) {}

  assertTestEnvironment(): void {
    if (process.env['NODE_ENV'] !== 'test') {
      throw new NotFoundException();
    }
  }

  defaultUser(): { email: string; password: string; name: string } {
    return {
      email: process.env['TEST_USER_EMAIL'] ?? 'demo@example.com',
      password: process.env['TEST_USER_PASSWORD'] ?? 'password123',
      name: process.env['TEST_USER_NAME'] ?? 'Demo User',
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (error instanceof UniqueConstraintViolationException) {
      return true;
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.includes('UNIQUE constraint failed') || message.includes('duplicate key value violates unique constraint');
  }

  async ensureUser(input: { email?: string | undefined; password?: string | undefined; name?: string | undefined }): Promise<UserEntity> {
    const defaults = this.defaultUser();
    const email = (input.email ?? defaults.email).toLowerCase().trim();
    const password = input.password ?? defaults.password;
    const name = input.name ?? defaults.name;

    const existing = await this.entityManager.findOne(UserEntity, { email });

    if (!existing) {
      try {
        const created = this.entityManager.create(UserEntity, {
          email,
          name,
          passwordHash: await bcrypt.hash(password, 12),
          createdAt: new Date().toISOString(),
        });
        this.entityManager.persist(created);
        await this.entityManager.flush();
        return created;
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        // Another fixture request inserted the same email concurrently.
        this.entityManager.clear();
        const concurrent = await this.entityManager.findOne(UserEntity, { email });
        if (!concurrent) {
          throw error;
        }
        return concurrent;
      }
    }

    const passwordMatches = await bcrypt.compare(password, existing.passwordHash);
    if (!passwordMatches) {
      existing.passwordHash = await bcrypt.hash(password, 12);
    }
    if (existing.name !== name) {
      existing.name = name;
    }
    await this.entityManager.flush();
    return existing;
  }

  async loginAs(rawInput: unknown): Promise<{ accessToken: string; refreshToken: string; user: { id: number; email: string; name: string; createdAt: string } }> {
    const input = loginAsSchema.parse(rawInput ?? {});
    const user = await this.ensureUser(input);
    const defaults = this.defaultUser();
    const password = input.password ?? defaults.password;
    const tokenPair = await this.authService.login({ email: user.email, password });

    return {
      ...tokenPair,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }

  async ensureUsers(rawInput: unknown): Promise<Array<{ id: number; email: string; name: string; createdAt: string }>> {
    const input = fixturesUsersSchema.parse(rawInput ?? {});
    const users = input.users ?? [this.defaultUser()];

    const ensured: Array<{ id: number; email: string; name: string; createdAt: string }> = [];
    for (const userInput of users) {
      const user = await this.ensureUser(userInput);
      ensured.push({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
    }

    return ensured;
  }

  async ensureReferenceData(): Promise<{ ok: boolean; counts: Record<string, number> }> {
    await seedDatabase(this.orm, { skipMigrations: true });
    const tables = await this.referenceService.getAll();

    return {
      ok: true,
      counts: {
        filmFormats: tables.filmFormats.length,
        developmentProcesses: tables.developmentProcesses.length,
        packageTypes: tables.packageTypes.length,
        filmStates: tables.filmStates.length,
        storageLocations: tables.storageLocations.length,
        slotStates: tables.slotStates.length,
        deviceTypes: tables.deviceTypes.length,
        holderTypes: tables.holderTypes.length,
        emulsions: tables.emulsions.length,
      },
    };
  }

  async createDeviceFixtures(rawInput: unknown): Promise<{ created: unknown[]; userId: number }> {
    const input = fixturesDevicesSchema.parse(rawInput);
    const user = await this.ensureUser({ email: input.userEmail, password: input.userPassword, name: input.userName });

    const created: unknown[] = [];
    for (const device of input.devices) {
      created.push(await this.devicesService.create(user.id, createFilmDeviceRequestSchema.parse(device)));
    }

    return { created, userId: user.id };
  }

  async createFilmFixtures(rawInput: unknown): Promise<{ lots: unknown[]; events: unknown[]; userId: number }> {
    const input = fixturesFilmSchema.parse(rawInput);
    const user = await this.ensureUser({ email: input.userEmail, password: input.userPassword, name: input.userName });

    const lots: unknown[] = [];
    for (const lot of input.lots) {
      lots.push(await this.filmService.createLot(user.id, filmLotCreateRequestSchema.parse(lot)));
    }

    const events: unknown[] = [];
    for (const item of input.events) {
      events.push(await this.filmService.createEvent(user.id, item.filmId, createFilmJourneyEventRequestSchema.parse(item.event)));
    }

    return { lots, events, userId: user.id };
  }
}
