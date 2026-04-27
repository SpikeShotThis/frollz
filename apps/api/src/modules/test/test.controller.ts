import { Body, Controller, Delete, Inject, Post } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Public } from '../auth/public.decorator.js';
import { TestFixturesService } from './test-fixtures.service.js';
import { UserEntity } from '../../infrastructure/entities/index.js';

// User-owned tables in FK-safe deletion order (FK enforcement disabled during reset)
const USER_DATA_TABLES = [
  'frame_journey_event',
  'film_journey_event',
  'device_mount',
  'film_holder_slot',
  'film_frame',
  'film',
  'film_lot',
  'camera',
  'interchangeable_back',
  'film_holder',
  'film_device',
  'refresh_tokens',
  'idempotency_key',
];

@Controller('test')
export class TestController {
  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager,
    @Inject(TestFixturesService) private readonly fixturesService: TestFixturesService,
  ) { }

  @Delete('reset')
  @Public()
  async reset(): Promise<{ data: { ok: boolean }; meta: Record<string, never> }> {
    this.fixturesService.assertTestEnvironment();

    const defaultUserEmail = this.fixturesService.defaultUser().email;
    const preservedUser = await this.entityManager.findOne(UserEntity, { email: defaultUserEmail });

    const conn = this.entityManager.getConnection();
    await conn.execute('PRAGMA foreign_keys = OFF');
    for (const table of USER_DATA_TABLES) {
      await conn.execute(`DELETE FROM \`${table}\``);
    }

    if (preservedUser) {
      await conn.execute(`DELETE FROM \`user\` WHERE id != ${String(preservedUser.id)}`);
    } else {
      await conn.execute('DELETE FROM `user`');
    }

    await conn.execute('PRAGMA foreign_keys = ON');

    return { data: { ok: true }, meta: {} };
  }

  @Post('auth/login-as')
  @Public()
  async loginAs(@Body() body: unknown) {
    this.fixturesService.assertTestEnvironment();
    return this.fixturesService.loginAs(body);
  }

  @Post('fixtures/reference')
  @Public()
  async fixturesReference() {
    this.fixturesService.assertTestEnvironment();
    return this.fixturesService.ensureReferenceData();
  }

  @Post('fixtures/users')
  @Public()
  async fixturesUsers(@Body() body: unknown) {
    this.fixturesService.assertTestEnvironment();
    return this.fixturesService.ensureUsers(body);
  }

  @Post('fixtures/devices')
  @Public()
  async fixturesDevices(@Body() body: unknown) {
    this.fixturesService.assertTestEnvironment();
    return this.fixturesService.createDeviceFixtures(body);
  }

  @Post('fixtures/film')
  @Public()
  async fixturesFilm(@Body() body: unknown) {
    this.fixturesService.assertTestEnvironment();
    return this.fixturesService.createFilmFixtures(body);
  }
}
