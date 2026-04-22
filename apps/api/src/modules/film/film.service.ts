import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CreateFilmJourneyEventRequest,
  FilmCreateRequest,
  FilmDetail,
  FilmJourneyEvent,
  FilmListQuery,
  FilmSummary,
  FilmUpdateRequest
} from '@frollz2/schema';
import { filmJourneyEventPayloadSchema } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { applyFilmTransition } from '../../domain/film/film-state-machine.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import {
  EmulsionEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmHolderSlotEntity,
  FilmJourneyEventEntity,
  FilmDeviceEntity,
  FilmStateEntity,
  PackageTypeEntity,
  SlotStateEntity,
  UserEntity
} from '../../infrastructure/entities/index.js';
import { mapFilmDetailEntity, mapFilmJourneyEventEntity } from '../../infrastructure/mappers/index.js';

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class FilmService {
  constructor(
    @Inject(FilmRepository) private readonly filmRepository: FilmRepository,
    @Inject(EntityManager) private readonly entityManager: EntityManager
  ) { }

  list(userId: number, query: FilmListQuery): Promise<FilmSummary[]> {
    return this.filmRepository.list(userId, query);
  }

  async findById(userId: number, filmId: number): Promise<FilmDetail> {
    const film = await this.filmRepository.findById(userId, filmId);

    if (!film) {
      throw new DomainError('NOT_FOUND', 'Film not found');
    }

    return film;
  }

  async create(userId: number, input: FilmCreateRequest): Promise<FilmDetail> {
    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const emulsion = await transactionalEntityManager.findOne(EmulsionEntity, { id: input.emulsionId }, { populate: ['developmentProcess', 'filmFormats'] });
      if (!emulsion) {
        throw new DomainError('NOT_FOUND', 'Emulsion not found');
      }

      const packageType = await transactionalEntityManager.findOne(PackageTypeEntity, { id: input.packageTypeId }, { populate: ['filmFormat'] });
      if (!packageType) {
        throw new DomainError('NOT_FOUND', 'Package type not found');
      }

      if (packageType.filmFormat.id !== input.filmFormatId) {
        throw new DomainError('DOMAIN_ERROR', 'Film format must match the selected package type');
      }

      const filmFormat = await transactionalEntityManager.findOne(FilmFormatEntity, { id: input.filmFormatId });
      if (!filmFormat) {
        throw new DomainError('NOT_FOUND', 'Film format not found');
      }

      const purchasedState = await transactionalEntityManager.findOne(FilmStateEntity, { code: 'purchased' });
      if (!purchasedState) {
        throw new DomainError('NOT_FOUND', 'Film state not found');
      }

      const user = transactionalEntityManager.getReference(UserEntity, userId);
      const film = transactionalEntityManager.create(FilmEntity, {
        user,
        name: input.name,
        emulsion,
        packageType,
        filmFormat,
        expirationDate: input.expirationDate ?? null,
        currentState: purchasedState
      });

      transactionalEntityManager.persist(film);
      await transactionalEntityManager.flush();

      const purchasedEvent = transactionalEntityManager.create(FilmJourneyEventEntity, {
        film,
        user,
        filmState: purchasedState,
        occurredAt: nowIso(),
        recordedAt: nowIso(),
        notes: null,
        eventData: {}
      });

      transactionalEntityManager.persist(purchasedEvent);
      await transactionalEntityManager.flush();

      const persistedFilm = await transactionalEntityManager.findOneOrFail(
        FilmEntity,
        { id: film.id, user: userId },
        { populate: ['user', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
      );
      const latestEvent = await transactionalEntityManager.findOneOrFail(
        FilmJourneyEventEntity,
        { id: purchasedEvent.id },
        { populate: ['film', 'user', 'filmState'] }
      );

      return mapFilmDetailEntity(persistedFilm, latestEvent);
    });
  }

  async update(userId: number, filmId: number, input: FilmUpdateRequest): Promise<FilmSummary> {
    const film = await this.filmRepository.update(userId, filmId, input);

    if (!film) {
      throw new DomainError('NOT_FOUND', 'Film not found');
    }

    return film;
  }

  async listEvents(userId: number, filmId: number): Promise<FilmJourneyEvent[]> {
    const film = await this.filmRepository.findByIdSummary(userId, filmId);

    if (!film) {
      throw new DomainError('NOT_FOUND', 'Film not found');
    }

    return this.filmRepository.listEvents(userId, filmId);
  }

  async createEvent(userId: number, filmId: number, input: CreateFilmJourneyEventRequest): Promise<FilmJourneyEvent> {
    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const film = await transactionalEntityManager.findOne(
        FilmEntity,
        { id: filmId, user: userId },
        { populate: ['user', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
      );

      if (!film) {
        throw new DomainError('NOT_FOUND', 'Film not found');
      }

      const targetState = await transactionalEntityManager.findOne(FilmStateEntity, { code: input.filmStateCode });
      if (!targetState) {
        throw new DomainError('NOT_FOUND', 'Film state not found');
      }

      const transitionResult = applyFilmTransition(film.currentState.code, input.filmStateCode);
      if (transitionResult instanceof DomainError) {
        throw transitionResult;
      }

      const parsedPayload = filmJourneyEventPayloadSchema.parse({
        filmStateCode: input.filmStateCode,
        eventData: input.eventData
      });

      const user = transactionalEntityManager.getReference(UserEntity, userId);
      const recordedAt = nowIso();
      const latestEvent = await this.findLatestEvent(transactionalEntityManager, userId, filmId);

      if (input.filmStateCode === 'loaded') {
        await this.applyLoadedEventSideEffects(transactionalEntityManager, userId, film, parsedPayload.eventData, user);
      }

      if (input.filmStateCode === 'exposed') {
        await this.applyExposedEventSideEffects(transactionalEntityManager, userId, latestEvent);
      }

      if (input.filmStateCode === 'removed') {
        await this.applyRemovedEventSideEffects(transactionalEntityManager, userId, film);
      }

      film.currentState = targetState;

      const event = transactionalEntityManager.create(FilmJourneyEventEntity, {
        film,
        user,
        filmState: targetState,
        occurredAt: input.occurredAt,
        recordedAt,
        notes: input.notes ?? null,
        eventData: parsedPayload.eventData
      });

      transactionalEntityManager.persist([film, event]);
      await transactionalEntityManager.flush();

      const persistedEvent = await transactionalEntityManager.findOneOrFail(
        FilmJourneyEventEntity,
        { id: event.id },
        { populate: ['film', 'user', 'filmState'] }
      );

      return mapFilmJourneyEventEntity(persistedEvent);
    });
  }

  private async findLatestEvent(entityManager: EntityManager, userId: number, filmId: number): Promise<FilmJourneyEventEntity | null> {
    return entityManager.findOne(
      FilmJourneyEventEntity,
      { film: filmId, user: userId },
      { orderBy: { occurredAt: 'desc', id: 'desc' }, populate: ['film', 'user', 'filmState'] }
    );
  }

  private async applyLoadedEventSideEffects(
    entityManager: EntityManager,
    userId: number,
    film: FilmEntity,
    eventData: Record<string, unknown>,
    user: UserEntity
  ): Promise<void> {
    const deviceId = eventData['deviceId'];

    if (typeof deviceId !== 'number') {
      throw new DomainError('DOMAIN_ERROR', 'A loaded event requires a deviceId');
    }

    const device = await entityManager.findOne(
      FilmDeviceEntity,
      { id: deviceId, user: userId },
      {
        populate: [
          'user',
          'deviceType',
          'filmFormat',
          'camera',
          'interchangeableBack',
          'filmHolder',
          'filmHolder.holderType',
          'filmHolder.slots',
          'filmHolder.slots.slotState',
          'filmHolder.slots.loadedFilm'
        ]
      }
    );

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found');
    }

    if (device.filmFormat.id !== film.filmFormat.id) {
      throw new DomainError('DOMAIN_ERROR', 'Device format does not match the film format');
    }

    if (device.camera || device.interchangeableBack) {
      const occupiedFilmId = await this.filmRepository.findOccupiedFilmForDeviceId(userId, device.id);
      if (occupiedFilmId !== null) {
        throw new DomainError('CONFLICT', 'Device already has an active loaded film');
      }

      return;
    }

    if (!device.filmHolder) {
      throw new DomainError('DOMAIN_ERROR', 'Loaded events require a compatible device');
    }

    const slotSideNumber = eventData['slotSideNumber'];
    if (typeof slotSideNumber !== 'number') {
      throw new DomainError('DOMAIN_ERROR', 'A holder loaded event requires a slotSideNumber');
    }

    const latestSlot = await this.findLatestSlot(entityManager, userId, device.id, slotSideNumber);
    if (latestSlot && latestSlot.slotStateCode !== 'removed') {
      throw new DomainError('CONFLICT', 'That holder slot is already occupied');
    }

    const loadedSlotState = await entityManager.findOneOrFail(SlotStateEntity, { code: 'loaded' });
    const slot = entityManager.create(FilmHolderSlotEntity, {
      user,
      filmHolder: device.filmHolder,
      sideNumber: slotSideNumber,
      slotState: loadedSlotState,
      slotStateCode: loadedSlotState.code,
      loadedFilm: film,
      createdAt: nowIso()
    });

    entityManager.persist(slot);
  }

  private async applyExposedEventSideEffects(
    entityManager: EntityManager,
    userId: number,
    latestEvent: FilmJourneyEventEntity | null
  ): Promise<void> {
    const deviceContext = this.extractLoadedDeviceContext(latestEvent);

    if (!deviceContext) {
      throw new DomainError('DOMAIN_ERROR', 'An exposed event requires a previously loaded device context');
    }

    if (deviceContext.deviceTypeCode === 'camera' || deviceContext.deviceTypeCode === 'interchangeable_back') {
      return;
    }

    if (deviceContext.slotSideNumber === null) {
      throw new DomainError('DOMAIN_ERROR', 'A holder exposed event requires a slotSideNumber');
    }

    const slot = await this.findLatestSlot(entityManager, userId, deviceContext.deviceId, deviceContext.slotSideNumber);
    if (!slot || slot.slotStateCode !== 'loaded') {
      throw new DomainError('DOMAIN_ERROR', 'That holder slot is not loaded');
    }

    const exposedSlotState = await entityManager.findOneOrFail(SlotStateEntity, { code: 'exposed' });

    slot.slotState = exposedSlotState;
    slot.slotStateCode = exposedSlotState.code;
    entityManager.persist(slot);
  }

  private async applyRemovedEventSideEffects(
    entityManager: EntityManager,
    userId: number,
    film: FilmEntity
  ): Promise<void> {
    const loadedEvent = await this.findLatestEventByState(entityManager, userId, film.id, 'loaded');
    const deviceContext = this.extractLoadedDeviceContext(loadedEvent);

    if (!deviceContext) {
      throw new DomainError('DOMAIN_ERROR', 'A removed event requires a previously loaded device context');
    }

    if (deviceContext.deviceTypeCode === 'camera' || deviceContext.deviceTypeCode === 'interchangeable_back') {
      return;
    }

    if (deviceContext.slotSideNumber === null) {
      throw new DomainError('DOMAIN_ERROR', 'A holder removed event requires a slotSideNumber');
    }

    const slot = await this.findLatestSlot(entityManager, userId, deviceContext.deviceId, deviceContext.slotSideNumber);
    if (!slot || slot.slotStateCode !== 'exposed') {
      throw new DomainError('DOMAIN_ERROR', 'That holder slot is not exposed');
    }

    const removedSlotState = await entityManager.findOneOrFail(SlotStateEntity, { code: 'removed' });

    slot.slotState = removedSlotState;
    slot.slotStateCode = removedSlotState.code;
    slot.loadedFilm = null;
    entityManager.persist(slot);
  }

  private async findLatestEventByState(
    entityManager: EntityManager,
    userId: number,
    filmId: number,
    filmStateCode: FilmJourneyEventEntity['filmState']['code']
  ): Promise<FilmJourneyEventEntity | null> {
    return entityManager.findOne(
      FilmJourneyEventEntity,
      { film: filmId, user: userId, filmState: { code: filmStateCode } },
      { orderBy: { occurredAt: 'desc', id: 'desc' }, populate: ['film', 'user', 'filmState'] }
    );
  }

  private extractLoadedDeviceContext(latestEvent: FilmJourneyEventEntity | null):
    | { deviceId: number; slotSideNumber: number | null; deviceTypeCode: 'camera' | 'interchangeable_back' | 'film_holder' }
    | null {
    if (!latestEvent) {
      return null;
    }

    if (latestEvent.filmState.code !== 'loaded') {
      return null;
    }

    const parsed = filmJourneyEventPayloadSchema.safeParse({
      filmStateCode: latestEvent.filmState.code,
      eventData: latestEvent.eventData
    });

    if (!parsed.success || parsed.data.filmStateCode !== 'loaded') {
      return null;
    }

    const deviceId = parsed.data.eventData.deviceId;
    const slotSideNumber = parsed.data.eventData.slotSideNumber;

    if (typeof deviceId !== 'number') {
      return null;
    }

    return {
      deviceId,
      slotSideNumber,
      deviceTypeCode: typeof slotSideNumber === 'number' ? 'film_holder' : 'camera'
    };
  }


  private async findLatestSlot(entityManager: EntityManager, userId: number, deviceId: number, sideNumber: number): Promise<FilmHolderSlotEntity | null> {
    return entityManager.findOne(
      FilmHolderSlotEntity,
      { user: userId, filmHolder: { filmDevice: deviceId }, sideNumber },
      { orderBy: { createdAt: 'desc', id: 'desc' }, populate: ['user', 'filmHolder', 'slotState', 'loadedFilm'] }
    );
  }
}
