import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CreateFilmJourneyEventRequest,
  FilmCreateRequest,
  CreateFrameJourneyEventRequest,
  FilmDetail,
  FilmFrame,
  FilmJourneyEvent,
  FilmListQuery,
  FilmSummary,
  FilmUpdateRequest,
  FrameJourneyEvent,
  FrameSizeCode
} from '@frollz2/schema';
import { filmJourneyEventPayloadSchema, frameJourneyEventPayloadSchema, resolveNonLargeFrameCount } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { applyFilmTransition } from '../../domain/film/film-state-machine.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import {
  EmulsionEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmStockEntity,
  FilmFrameEntity,
  FilmHolderSlotEntity,
  FilmJourneyEventEntity,
  FrameJourneyEventEntity,
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

type NormalizedLoadedEventData = {
  deviceId: number;
  slotSideNumber: number | null;
  loadTargetType: 'camera_direct' | 'interchangeable_back' | 'film_holder_slot';
};

type NormalizedLoadedFrameEventData = NormalizedLoadedEventData & { filmFrameId: number };

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

      const framesTotal = this.getSheetCountForPackageType(packageType.code);
      const stock = transactionalEntityManager.create(FilmStockEntity, {
        user,
        name: film.name,
        emulsion,
        packageType,
        filmFormat,
        unitsTotal: framesTotal,
        expirationDate: film.expirationDate
      });
      transactionalEntityManager.persist(stock);
      await transactionalEntityManager.flush();

      if (this.isLargeFormatCode(film.filmFormat.code)) {
        await this.createFrames(transactionalEntityManager, user, film, stock, framesTotal, purchasedState);
      }

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

  async listFrames(userId: number, filmId: number): Promise<FilmFrame[]> {
    const film = await this.filmRepository.findByIdSummary(userId, filmId);

    if (!film) {
      throw new DomainError('NOT_FOUND', 'Film not found');
    }

    return this.filmRepository.listFrames(userId, filmId);
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

      if (this.isLargeFormatCode(film.filmFormat.code)) {
        throw new DomainError('DOMAIN_ERROR', 'Large format film uses frame-level events only');
      }

      const targetState = await transactionalEntityManager.findOne(FilmStateEntity, { code: input.filmStateCode });
      if (!targetState) {
        throw new DomainError('NOT_FOUND', 'Film state not found');
      }

      const transitionResult = applyFilmTransition(film.currentState.code, input.filmStateCode);
      if (transitionResult instanceof DomainError) {
        const allowExposedToSentForDev = await this.shouldAllowExposedToSentForDevTransition(
          transactionalEntityManager,
          userId,
          film.id,
          film.currentState.code,
          input.filmStateCode
        );
        if (!allowExposedToSentForDev) {
          throw transitionResult;
        }
      }

      const parsedPayload = filmJourneyEventPayloadSchema.parse({
        filmStateCode: input.filmStateCode,
        eventData: input.eventData
      });

      const user = transactionalEntityManager.getReference(UserEntity, userId);
      const recordedAt = nowIso();
      const latestEvent = await this.findLatestEvent(transactionalEntityManager, userId, filmId);

      let persistedEventData: Record<string, unknown> = parsedPayload.eventData;
      if (input.filmStateCode === 'loaded') {
        persistedEventData = await this.applyLoadedEventSideEffects(transactionalEntityManager, userId, film, parsedPayload.eventData, user);
      }

      if (input.filmStateCode === 'exposed') {
        await this.applyExposedEventSideEffects(transactionalEntityManager, userId, latestEvent);
      }

      if (input.filmStateCode === 'removed') {
        await this.applyRemovedEventSideEffects(transactionalEntityManager, userId, film);
      }

      film.currentState = targetState;
      await this.updateAllFramesForFilm(transactionalEntityManager, userId, film.id, targetState);

      const event = transactionalEntityManager.create(FilmJourneyEventEntity, {
        film,
        user,
        filmState: targetState,
        occurredAt: input.occurredAt,
        recordedAt,
        notes: input.notes ?? null,
        eventData: persistedEventData
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

  async createFrameEvent(userId: number, filmId: number, frameId: number, input: CreateFrameJourneyEventRequest): Promise<FrameJourneyEvent> {
    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const film = await transactionalEntityManager.findOne(FilmEntity, { id: filmId, user: userId }, { populate: ['filmFormat'] });
      if (!film) {
        throw new DomainError('NOT_FOUND', 'Film not found');
      }
      if (!this.isLargeFormatCode(film.filmFormat.code)) {
        throw new DomainError('DOMAIN_ERROR', 'Frame events are only supported for large format film');
      }

      const frame = await transactionalEntityManager.findOne(
        FilmFrameEntity,
        { id: frameId, user: userId, legacyFilm: filmId },
        { populate: ['currentState', 'boundHolderDevice'] }
      );
      if (!frame) {
        throw new DomainError('NOT_FOUND', 'Frame not found');
      }

      const parsedPayload = frameJourneyEventPayloadSchema.parse({
        frameStateCode: input.frameStateCode,
        eventData: input.eventData
      });

      const targetState = await transactionalEntityManager.findOne(FilmStateEntity, { code: input.frameStateCode });
      if (!targetState) {
        throw new DomainError('NOT_FOUND', 'Film state not found');
      }

      const transitionResult = applyFilmTransition(frame.currentState.code, input.frameStateCode);
      if (transitionResult instanceof DomainError) {
        throw transitionResult;
      }

      let persistedEventData: Record<string, unknown> = parsedPayload.eventData;
      const user = transactionalEntityManager.getReference(UserEntity, userId);

      if (input.frameStateCode === 'loaded') {
        persistedEventData = await this.applyLoadedFrameEventSideEffects(transactionalEntityManager, userId, film, frame, parsedPayload.eventData, user);
      }
      if (input.frameStateCode === 'exposed') {
        await this.applyExposedFrameEventSideEffects(transactionalEntityManager, userId, frameId);
      }
      if (input.frameStateCode === 'removed') {
        await this.applyRemovedFrameEventSideEffects(transactionalEntityManager, userId, frameId);
      }

      frame.currentState = targetState;
      transactionalEntityManager.persist(frame);

      const event = transactionalEntityManager.create(FrameJourneyEventEntity, {
        film,
        filmFrame: frame,
        user,
        filmState: targetState,
        occurredAt: input.occurredAt,
        recordedAt: nowIso(),
        notes: input.notes ?? null,
        eventData: persistedEventData
      });
      transactionalEntityManager.persist(event);
      await transactionalEntityManager.flush();

      return {
        id: event.id,
        filmId: film.id,
        filmFrameId: frame.id,
        userId: userId,
        filmStateId: targetState.id,
        frameStateCode: targetState.code as FrameJourneyEvent['frameStateCode'],
        occurredAt: event.occurredAt,
        recordedAt: event.recordedAt,
        notes: event.notes,
        eventData: event.eventData
      };
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
  ): Promise<Record<string, unknown>> {
    const loadTarget = this.parseLoadedEventData(eventData);
    if (!loadTarget) {
      throw new DomainError('DOMAIN_ERROR', 'A loaded event requires a valid load target');
    }

    if (film.filmFormat.code === '35mm' && film.packageType.code === '100ft_bulk') {
      throw new DomainError('DOMAIN_ERROR', '35mm 100ft bulk must be converted to a supported roll before loading');
    }

    const device = await entityManager.findOne(
      FilmDeviceEntity,
      { id: loadTarget.deviceId, user: userId },
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

    let frames = await entityManager.find(
      FilmFrameEntity,
      { user: userId, legacyFilm: film.id },
      { orderBy: { frameNumber: 'asc', id: 'asc' }, populate: ['currentState'] }
    );

    if (frames.some((frame) => frame.firstLoadedAt !== null)) {
      throw new DomainError('CONFLICT', 'This film has already been loaded and cannot be reloaded');
    }

    if (frames.length === 0) {
      const purchasedState = await entityManager.findOneOrFail(FilmStateEntity, { code: 'purchased' });
      const stock = await entityManager.findOneOrFail(FilmStockEntity, { user: userId, name: film.name, filmFormat: film.filmFormat.id, packageType: film.packageType.id });
      const frameCount = this.resolveFrameCountForFilm(film.filmFormat.code, film.packageType.code, device.frameSize);
      await this.createFrames(entityManager, user, film, stock, frameCount, purchasedState);
      frames = await entityManager.find(
        FilmFrameEntity,
        { user: userId, legacyFilm: film.id },
        { orderBy: { frameNumber: 'asc', id: 'asc' }, populate: ['currentState'] }
      );
    }

    if (device.camera) {
      if (loadTarget.loadTargetType === 'film_holder_slot') {
        throw new DomainError('DOMAIN_ERROR', 'Use camera_direct load target for direct camera loads');
      }
      if (device.camera.loadMode !== 'direct') {
        throw new DomainError('DOMAIN_ERROR', 'This camera cannot be loaded directly');
      }
      const occupiedFilmId = await this.filmRepository.findOccupiedFilmForDeviceId(userId, device.id);
      if (occupiedFilmId !== null) {
        throw new DomainError('CONFLICT', 'Device already has an active loaded film');
      }

      for (const frame of frames) {
        frame.firstLoadedAt = nowIso();
        entityManager.persist(frame);
      }
      return eventData;
    }

    if (device.interchangeableBack) {
      if (loadTarget.loadTargetType === 'film_holder_slot') {
        throw new DomainError('DOMAIN_ERROR', 'Use interchangeable_back load target for back loads');
      }
      const occupiedFilmId = await this.filmRepository.findOccupiedFilmForDeviceId(userId, device.id);
      if (occupiedFilmId !== null) {
        throw new DomainError('CONFLICT', 'Device already has an active loaded film');
      }

      for (const frame of frames) {
        frame.firstLoadedAt = nowIso();
        entityManager.persist(frame);
      }
      return eventData;
    }

    if (!device.filmHolder) {
      throw new DomainError('DOMAIN_ERROR', 'Loaded events require a compatible device');
    }

    if (loadTarget.loadTargetType !== 'film_holder_slot' || loadTarget.slotSideNumber === null) {
      throw new DomainError('DOMAIN_ERROR', 'A holder load requires film_holder_slot target with slotNumber');
    }
    const slotSideNumber = loadTarget.slotSideNumber;
    if (slotSideNumber < 1 || slotSideNumber > device.filmHolder.slotCount) {
      throw new DomainError('DOMAIN_ERROR', 'That holder slot does not exist for this holder');
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
    for (const frame of frames) {
      frame.firstLoadedAt = nowIso();
      entityManager.persist(frame);
    }
    return eventData;
  }

  private async applyLoadedFrameEventSideEffects(
    entityManager: EntityManager,
    userId: number,
    film: FilmEntity,
    frame: FilmFrameEntity,
    eventData: Record<string, unknown>,
    user: UserEntity
  ): Promise<Record<string, unknown>> {
    const loadTarget = this.parseLoadedFrameEventData(eventData);
    if (!loadTarget) {
      throw new DomainError('DOMAIN_ERROR', 'A loaded frame event requires a valid load target');
    }
    if (loadTarget.filmFrameId !== frame.id) {
      throw new DomainError('DOMAIN_ERROR', 'Loaded frame target does not match selected frame');
    }
    if (frame.firstLoadedAt) {
      throw new DomainError('CONFLICT', 'That frame has already been loaded and cannot be reused');
    }

    const device = await entityManager.findOne(
      FilmDeviceEntity,
      { id: loadTarget.deviceId, user: userId },
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

    if (device.camera) {
      if (loadTarget.loadTargetType === 'film_holder_slot') {
        throw new DomainError('DOMAIN_ERROR', 'Use camera_direct load target for direct camera loads');
      }
      if (device.camera.loadMode !== 'direct') {
        throw new DomainError('DOMAIN_ERROR', 'This camera cannot be loaded directly');
      }
      const occupiedFilmId = await this.filmRepository.findOccupiedFilmForDeviceId(userId, device.id);
      if (occupiedFilmId !== null) {
        throw new DomainError('CONFLICT', 'Device already has an active loaded film');
      }

      frame.firstLoadedAt = nowIso();
      entityManager.persist(frame);
      return eventData;
    }

    if (device.interchangeableBack) {
      if (loadTarget.loadTargetType === 'film_holder_slot') {
        throw new DomainError('DOMAIN_ERROR', 'Use interchangeable_back load target for back loads');
      }
      const occupiedFilmId = await this.filmRepository.findOccupiedFilmForDeviceId(userId, device.id);
      if (occupiedFilmId !== null) {
        throw new DomainError('CONFLICT', 'Device already has an active loaded film');
      }

      frame.firstLoadedAt = nowIso();
      entityManager.persist(frame);
      return eventData;
    }

    if (!device.filmHolder) {
      throw new DomainError('DOMAIN_ERROR', 'Loaded events require a compatible device');
    }

    if (loadTarget.loadTargetType !== 'film_holder_slot' || loadTarget.slotSideNumber === null) {
      throw new DomainError('DOMAIN_ERROR', 'A holder load requires film_holder_slot target with slotNumber');
    }
    const slotSideNumber = loadTarget.slotSideNumber;
    if (slotSideNumber < 1 || slotSideNumber > device.filmHolder.slotCount) {
      throw new DomainError('DOMAIN_ERROR', 'That holder slot does not exist for this holder');
    }

    const latestSlot = await this.findLatestSlot(entityManager, userId, device.id, slotSideNumber);
    if (latestSlot && latestSlot.slotStateCode !== 'removed') {
      throw new DomainError('CONFLICT', 'That holder slot is already occupied');
    }

    if (frame.boundHolderDevice && frame.boundHolderSlotNumber) {
      if (frame.boundHolderDevice.id !== device.id || frame.boundHolderSlotNumber !== slotSideNumber) {
        throw new DomainError('CONFLICT', 'This frame is permanently bound to a different holder slot');
      }
    } else {
      frame.boundHolderDevice = device;
      frame.boundHolderSlotNumber = slotSideNumber;
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
    frame.firstLoadedAt = nowIso();
    entityManager.persist(frame);
    return eventData;
  }

  private async applyExposedEventSideEffects(
    entityManager: EntityManager,
    userId: number,
    latestEvent: FilmJourneyEventEntity | null
  ): Promise<void> {
    const deviceContext = await this.resolveLoadedDeviceContext(entityManager, userId, latestEvent);

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

  private async applyExposedFrameEventSideEffects(entityManager: EntityManager, userId: number, frameId: number): Promise<void> {
    const latestLoadedEvent = await entityManager.findOne(
      FrameJourneyEventEntity,
      { user: userId, filmFrame: frameId, filmState: { code: 'loaded' } },
      { orderBy: { occurredAt: 'desc', id: 'desc' }, populate: ['film', 'filmFrame', 'filmState'] }
    );
    if (!latestLoadedEvent) {
      throw new DomainError('DOMAIN_ERROR', 'An exposed frame event requires a previous loaded frame event');
    }

    const loadedData = this.parseLoadedFrameEventData(latestLoadedEvent.eventData);
    if (!loadedData || loadedData.loadTargetType !== 'film_holder_slot' || loadedData.slotSideNumber === null) {
      return;
    }

    const slot = await this.findLatestSlot(entityManager, userId, loadedData.deviceId, loadedData.slotSideNumber);
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
    const deviceContext = await this.resolveLoadedDeviceContext(entityManager, userId, loadedEvent);

    if (!deviceContext) {
      throw new DomainError('DOMAIN_ERROR', 'A removed event requires a previously loaded device context');
    }

    if (deviceContext.deviceTypeCode === 'camera' && deviceContext.cameraCanUnload === false) {
      throw new DomainError('DOMAIN_ERROR', 'This camera does not support unloading; continue directly to sent_for_dev');
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

  private async applyRemovedFrameEventSideEffects(entityManager: EntityManager, userId: number, frameId: number): Promise<void> {
    const latestLoadedEvent = await entityManager.findOne(
      FrameJourneyEventEntity,
      { user: userId, filmFrame: frameId, filmState: { code: 'loaded' } },
      { orderBy: { occurredAt: 'desc', id: 'desc' }, populate: ['film', 'filmFrame', 'filmState'] }
    );
    if (!latestLoadedEvent) {
      throw new DomainError('DOMAIN_ERROR', 'A removed frame event requires a previous loaded frame event');
    }

    const loadedData = this.parseLoadedFrameEventData(latestLoadedEvent.eventData);
    if (!loadedData || loadedData.loadTargetType !== 'film_holder_slot' || loadedData.slotSideNumber === null) {
      return;
    }

    const slot = await this.findLatestSlot(entityManager, userId, loadedData.deviceId, loadedData.slotSideNumber);
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

  private async resolveLoadedDeviceContext(
    entityManager: EntityManager,
    userId: number,
    latestEvent: FilmJourneyEventEntity | null
  ):
    Promise<{
      deviceId: number;
      slotSideNumber: number | null;
      deviceTypeCode: 'camera' | 'interchangeable_back' | 'film_holder';
      cameraCanUnload: boolean | null;
    } | null> {
    if (!latestEvent) {
      return null;
    }

    if (latestEvent.filmState.code !== 'loaded') {
      return null;
    }

    const loadedData = this.parseLoadedEventData(latestEvent.eventData);
    if (!loadedData) {
      return null;
    }

    const device = await entityManager.findOne(
      FilmDeviceEntity,
      { id: loadedData.deviceId, user: userId },
      { populate: ['camera', 'interchangeableBack', 'filmHolder'] }
    );

    if (!device) {
      return null;
    }

    if (device.camera) {
      return {
        deviceId: loadedData.deviceId,
        slotSideNumber: loadedData.slotSideNumber,
        deviceTypeCode: 'camera',
        cameraCanUnload: device.camera.canUnload
      };
    }

    if (device.interchangeableBack) {
      return {
        deviceId: loadedData.deviceId,
        slotSideNumber: loadedData.slotSideNumber,
        deviceTypeCode: 'interchangeable_back',
        cameraCanUnload: null
      };
    }

    if (!device.filmHolder) {
      return null;
    }

    return {
      deviceId: loadedData.deviceId,
      slotSideNumber: loadedData.slotSideNumber,
      deviceTypeCode: 'film_holder',
      cameraCanUnload: null
    };
  }

  private parseLoadedEventData(eventData: unknown): NormalizedLoadedEventData | null {
    const parsed = filmJourneyEventPayloadSchema.safeParse({
      filmStateCode: 'loaded',
      eventData
    });

    if (!parsed.success || parsed.data.filmStateCode !== 'loaded') {
      return null;
    }

    if (parsed.data.eventData.loadTargetType === 'camera_direct') {
      return {
        deviceId: parsed.data.eventData.cameraId,
        slotSideNumber: null,
        loadTargetType: 'camera_direct'
      };
    }

    if (parsed.data.eventData.loadTargetType === 'interchangeable_back') {
      return {
        deviceId: parsed.data.eventData.interchangeableBackId,
        slotSideNumber: null,
        loadTargetType: 'interchangeable_back'
      };
    }

    return {
      deviceId: parsed.data.eventData.filmHolderId,
      slotSideNumber: parsed.data.eventData.slotNumber,
      loadTargetType: 'film_holder_slot'
    };
  }

  private parseLoadedFrameEventData(eventData: unknown): NormalizedLoadedFrameEventData | null {
    const parsed = frameJourneyEventPayloadSchema.safeParse({
      frameStateCode: 'loaded',
      eventData
    });

    if (!parsed.success || parsed.data.frameStateCode !== 'loaded') {
      return null;
    }

    if (parsed.data.eventData.loadTargetType === 'camera_direct') {
      return {
        deviceId: parsed.data.eventData.cameraId,
        slotSideNumber: null,
        filmFrameId: parsed.data.eventData.filmFrameId,
        loadTargetType: 'camera_direct'
      };
    }

    if (parsed.data.eventData.loadTargetType === 'interchangeable_back') {
      return {
        deviceId: parsed.data.eventData.interchangeableBackId,
        slotSideNumber: null,
        filmFrameId: parsed.data.eventData.filmFrameId,
        loadTargetType: 'interchangeable_back'
      };
    }

    return {
      deviceId: parsed.data.eventData.filmHolderId,
      slotSideNumber: parsed.data.eventData.slotNumber,
      filmFrameId: parsed.data.eventData.filmFrameId,
      loadTargetType: 'film_holder_slot'
    };
  }

  private async updateAllFramesForFilm(entityManager: EntityManager, userId: number, filmId: number, targetState: FilmStateEntity): Promise<void> {
    const frames = await entityManager.find(FilmFrameEntity, { user: userId, legacyFilm: filmId });
    for (const frame of frames) {
      frame.currentState = targetState;
      entityManager.persist(frame);
    }
  }

  private async createFrames(
    entityManager: EntityManager,
    user: UserEntity,
    film: FilmEntity,
    stock: FilmStockEntity,
    frameCount: number,
    initialState: FilmStateEntity
  ): Promise<void> {
    for (let frameNumber = 1; frameNumber <= frameCount; frameNumber += 1) {
      const frame = entityManager.create(FilmFrameEntity, {
        user,
        filmStock: stock,
        legacyFilm: film,
        frameNumber,
        currentState: initialState,
        boundHolderDevice: null,
        boundHolderSlotNumber: null,
        firstLoadedAt: null
      });
      entityManager.persist(frame);
    }
    await entityManager.flush();
  }

  private isLargeFormatCode(formatCode: string): boolean {
    return formatCode === '4x5' || formatCode === '5x7' || formatCode === '8x10' || formatCode === '11x14';
  }

  private getSheetCountForPackageType(packageTypeCode: string): number {
    const sheetsMatch = /^(\d+)sheets$/i.exec(packageTypeCode);
    if (sheetsMatch) {
      const frames = Number(sheetsMatch[1]);
      return Number.isInteger(frames) && frames > 0 ? frames : 1;
    }
    return 1;
  }

  private resolveFrameCountForFilm(formatCode: string, packageTypeCode: string, frameSize: string): number {
    const resolved = resolveNonLargeFrameCount({
      formatCode,
      packageTypeCode,
      frameSize: frameSize as FrameSizeCode
    });

    if (!resolved.ok) {
      throw new DomainError('DOMAIN_ERROR', resolved.message);
    }

    return resolved.frameCount;
  }

  private async shouldAllowExposedToSentForDevTransition(
    entityManager: EntityManager,
    userId: number,
    filmId: number,
    currentStateCode: FilmEntity['currentState']['code'],
    targetStateCode: FilmStateEntity['code']
  ): Promise<boolean> {
    if (currentStateCode !== 'exposed' || targetStateCode !== 'sent_for_dev') {
      return false;
    }

    const loadedEvent = await this.findLatestEventByState(entityManager, userId, filmId, 'loaded');
    const deviceContext = await this.resolveLoadedDeviceContext(entityManager, userId, loadedEvent);
    return deviceContext?.deviceTypeCode === 'camera' && deviceContext.cameraCanUnload === false;
  }

  private async findLatestSlot(entityManager: EntityManager, userId: number, deviceId: number, sideNumber: number): Promise<FilmHolderSlotEntity | null> {
    return entityManager.findOne(
      FilmHolderSlotEntity,
      { user: userId, filmHolder: { filmDevice: deviceId }, sideNumber },
      { orderBy: { createdAt: 'desc', id: 'desc' }, populate: ['user', 'filmHolder', 'slotState', 'loadedFilm'] }
    );
  }
}
