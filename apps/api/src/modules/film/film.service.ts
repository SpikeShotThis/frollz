import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import type {
  CreateFilmJourneyEventRequest,
  CreateFrameJourneyEventRequest,
  FilmDetail,
  FilmFrame,
  FilmJourneyEvent,
  FilmListQuery,
  FilmListResponse,
  FilmLotCreateRequest,
  FilmLotDetail,
  FilmSummary,
  UpsertReferenceValueInput,
  FilmUpdateRequest,
  FrameJourneyEvent,
  FrameSizeCode
} from '@frollz2/schema';
import { filmJourneyEventPayloadSchema, frameJourneyEventPayloadSchema, getFilmTypeForFormatCode, resolveNonLargeFrameCount } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { applyFilmTransition } from '../../domain/film/film-state-machine.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import { FilmLotRepository } from '../../infrastructure/repositories/film-lot.repository.js';
import {
  EmulsionEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmLotEntity,
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
import { mapFilmJourneyEventEntity, parseLoadedEventData, type NormalizedLoadedEventData } from '../../infrastructure/mappers/index.js';
import { nowIso } from '../../common/utils/time.js';
import { ReferenceService } from '../reference/reference.service.js';

type NormalizedLoadedFrameEventData = NormalizedLoadedEventData & { filmFrameId: number };

@Injectable()
export class FilmService {
  constructor(
    @Inject(FilmRepository) private readonly filmRepository: FilmRepository,
    @Inject(FilmLotRepository) private readonly filmLotRepository: FilmLotRepository,
    @Inject(EntityManager) private readonly entityManager: EntityManager,
    @Inject(ReferenceService) private readonly referenceService: ReferenceService
  ) { }

  list(userId: number, query: FilmListQuery): Promise<FilmListResponse> {
    return this.filmRepository.list(userId, query);
  }

  async findById(userId: number, filmId: number): Promise<FilmDetail> {
    const film = await this.filmRepository.findById(userId, filmId);

    if (!film) {
      throw new DomainError('NOT_FOUND', 'Film not found');
    }

    return film;
  }

  async createLot(userId: number, input: FilmLotCreateRequest): Promise<FilmLotDetail> {
    try {
      return await this.entityManager.transactional(async (em) => {
        const emulsion = await em.findOne(EmulsionEntity, { id: input.emulsionId }, { populate: ['developmentProcess', 'filmFormats'] });
        if (!emulsion) {
          throw new DomainError('NOT_FOUND', 'Emulsion not found');
        }

        const packageType = await em.findOne(PackageTypeEntity, { id: input.packageTypeId }, { populate: ['filmFormat'] });
        if (!packageType) {
          throw new DomainError('NOT_FOUND', 'Package type not found');
        }

        if (packageType.filmFormat.id !== input.filmFormatId) {
          throw new DomainError('DOMAIN_ERROR', 'Film format must match the selected package type');
        }

        const filmFormat = await em.findOne(FilmFormatEntity, { id: input.filmFormatId });
        if (!filmFormat) {
          throw new DomainError('NOT_FOUND', 'Film format not found');
        }

        const purchasedState = await em.findOneOrFail(FilmStateEntity, { code: 'purchased' });
        const user = em.getReference(UserEntity, userId);
        const isLargeFormat = this.isLargeFormatCode(filmFormat.code);

        const lot = em.create(FilmLotEntity, {
          user,
          emulsion,
          packageType,
          filmFormat,
          quantity: input.quantity,
          expirationDate: input.expirationDate ?? null,
          createdAt: nowIso()
        });
        em.persist(lot);
        await em.flush();

        for (let i = 0; i < input.quantity; i++) {
          const providedName = input.films?.[i]?.name;
          const filmName = providedName ?? (isLargeFormat ? `Sheet ${i + 1}` : `Roll ${i + 1}`);
          await this.createFilm(em, user, filmName, lot, emulsion, packageType, filmFormat, purchasedState, isLargeFormat);
        }

        const lotDetail = await this.filmLotRepository.findById(userId, lot.id);
        if (!lotDetail) {
          throw new DomainError('NOT_FOUND', 'Film lot not found after creation');
        }
        return lotDetail;
      });
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'A film with that name already exists in your collection');
      }
      throw err;
    }
  }

  async update(userId: number, filmId: number, input: FilmUpdateRequest): Promise<FilmSummary> {
    try {
      const film = await this.filmRepository.update(userId, filmId, input);

      if (!film) {
        throw new DomainError('NOT_FOUND', 'Film not found');
      }

      return film;
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'You already have a film with that name');
      }
      throw err;
    }
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

      if (input.filmStateCode === 'sent_for_dev' || input.filmStateCode === 'developed') {
        await this.referenceService.upsertReferenceValues(userId, this.extractLabReferenceValues(input.eventData));
      }

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

      const frame = await transactionalEntityManager.findOne(
        FilmFrameEntity,
        { id: frameId, user: userId, film: filmId },
        { populate: ['currentState'] }
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

  private async createFilm(
    entityManager: EntityManager,
    user: UserEntity,
    name: string,
    filmLot: FilmLotEntity,
    emulsion: EmulsionEntity,
    packageType: PackageTypeEntity,
    filmFormat: FilmFormatEntity,
    purchasedState: FilmStateEntity,
    isLargeFormat: boolean
  ): Promise<FilmEntity> {
    const film = entityManager.create(FilmEntity, {
      user,
      filmLot,
      name,
      emulsion,
      packageType,
      filmFormat,
      expirationDate: filmLot.expirationDate,
      currentState: purchasedState
    });
    entityManager.persist(film);
    await entityManager.flush();

    const purchasedEvent = entityManager.create(FilmJourneyEventEntity, {
      film,
      user,
      filmState: purchasedState,
      occurredAt: nowIso(),
      recordedAt: nowIso(),
      notes: null,
      eventData: {}
    });
    entityManager.persist(purchasedEvent);

    if (isLargeFormat) {
      await entityManager.flush();
      await this.createFrames(entityManager, user, film, 1, purchasedState);
    } else {
      await entityManager.flush();
    }

    return film;
  }

  private async findLatestEvent(entityManager: EntityManager, userId: number, filmId: number): Promise<FilmJourneyEventEntity | null> {
    return entityManager.findOne(
      FilmJourneyEventEntity,
      { film: filmId, user: userId },
      { orderBy: { occurredAt: 'desc', id: 'desc' }, populate: ['film', 'user', 'filmState'] }
    );
  }

  private extractLabReferenceValues(eventData: Record<string, unknown>): UpsertReferenceValueInput[] {
    const items: UpsertReferenceValueInput[] = [];

    if (typeof eventData.labName === 'string' && eventData.labName.trim().length > 0) {
      items.push({ kind: 'lab_name', value: eventData.labName });
    }

    if (typeof eventData.labContact === 'string' && eventData.labContact.trim().length > 0) {
      items.push({ kind: 'lab_contact', value: eventData.labContact });
    }

    return items;
  }

  private async applyLoadedEventSideEffects(
    entityManager: EntityManager,
    userId: number,
    film: FilmEntity,
    eventData: Record<string, unknown>,
    user: UserEntity
  ): Promise<Record<string, unknown>> {
    const loadTarget = parseLoadedEventData(eventData);
    if (!loadTarget) {
      throw new DomainError('DOMAIN_ERROR', 'A loaded event requires a valid load target');
    }

    if (film.filmFormat.code === '35mm' && film.packageType.code === '100ft_bulk') {
      throw new DomainError('DOMAIN_ERROR', '35mm 100ft bulk must be converted to a supported roll before loading');
    }

    const previousLoadedEvent = await this.findLatestEventByState(entityManager, userId, film.id, 'loaded');
    if (previousLoadedEvent) {
      throw new DomainError('CONFLICT', 'This film has already been loaded and cannot be reloaded');
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

      await this.ensureFramesCreated(entityManager, user, film, device.frameSize);
      film.currentDevice = device;
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

      await this.ensureFramesCreated(entityManager, user, film, device.frameSize);
      film.currentDevice = device;
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
    film.currentDevice = device;
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

    const previousLoadedFrameEvent = await entityManager.findOne(
      FrameJourneyEventEntity,
      { user: userId, filmFrame: frame.id, filmState: { code: 'loaded' } }
    );
    if (previousLoadedFrameEvent) {
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

    film.currentDevice = null;

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

    const loadedData = parseLoadedEventData(latestEvent.eventData);
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
    await entityManager.nativeUpdate(
      FilmFrameEntity,
      { user: userId, film: filmId },
      { currentState: targetState.id }
    );
  }

  private async ensureFramesCreated(
    entityManager: EntityManager,
    user: UserEntity,
    film: FilmEntity,
    deviceFrameSize: string
  ): Promise<void> {
    const existingCount = await entityManager.count(FilmFrameEntity, { user: user.id, film: film.id });
    if (existingCount > 0) {
      return;
    }

    const purchasedState = await entityManager.findOneOrFail(FilmStateEntity, { code: 'purchased' });
    const frameCount = this.resolveFrameCountForFilm(film.filmFormat.code, film.packageType.code, deviceFrameSize);
    await this.createFrames(entityManager, user, film, frameCount, purchasedState);
  }

  private async createFrames(
    entityManager: EntityManager,
    user: UserEntity,
    film: FilmEntity,
    frameCount: number,
    initialState: FilmStateEntity
  ): Promise<void> {
    for (let frameNumber = 1; frameNumber <= frameCount; frameNumber += 1) {
      const frame = entityManager.create(FilmFrameEntity, {
        user,
        film,
        frameNumber,
        currentState: initialState
      });
      entityManager.persist(frame);
    }
    await entityManager.flush();
  }

  private isLargeFormatCode(formatCode: string): boolean {
    return getFilmTypeForFormatCode(formatCode) === 'sheet';
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
