import type { FilmDetail, FilmFrame, FilmJourneyEvent, FilmLotDetail, FilmLotSummary, FilmSummary, FrameJourneyEvent } from '@frollz2/schema';
import { filmStateSchema, frameStateCodeSchema, filmJourneyEventDataLoadedSchema } from '@frollz2/schema';
import { allocateCostForFilm } from '../../domain/film/cost-allocation.js';
import type { FilmEntity, FilmFrameEntity, FilmJourneyEventEntity, FilmLotEntity, FrameJourneyEventEntity } from '../entities/index.js';
import { mapEmulsionEntity, mapFilmFormatEntity, mapFilmStateEntity, mapPackageTypeEntity } from './reference.mapper.js';

export type NormalizedLoadedEventData = {
  deviceId: number;
  slotSideNumber: number | null;
  loadTargetType: 'camera_direct' | 'interchangeable_back' | 'film_holder_slot';
};

type CostProjection = { amount: number; currencyCode: string } | null;

function allocatePurchaseCost(entity: FilmLotEntity, filmId: number): CostProjection {
  const total = entity.purchaseInfo?.price;
  const currencyCode = entity.purchaseInfo?.currencyCode;
  if (total == null || !currencyCode || entity.quantity <= 0) {
    return null;
  }

  return { amount: allocateCostForFilm(total, entity.quantity, filmId), currencyCode };
}

export function parseDevelopmentCost(eventData: Record<string, unknown>): CostProjection {
  const cost = eventData.cost;
  if (!cost || typeof cost !== 'object') {
    return null;
  }
  const amount = Reflect.get(cost as object, 'amount');
  const currencyCode = Reflect.get(cost as object, 'currencyCode');
  if (typeof amount !== 'number' || typeof currencyCode !== 'string') {
    return null;
  }
  return { amount, currencyCode };
}

export function parseLoadedEventData(raw: unknown): NormalizedLoadedEventData | null {
  const parsed = filmJourneyEventDataLoadedSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  if (parsed.data.loadTargetType === 'camera_direct') {
    return { deviceId: parsed.data.cameraId, slotSideNumber: null, loadTargetType: 'camera_direct' };
  }

  if (parsed.data.loadTargetType === 'interchangeable_back') {
    return { deviceId: parsed.data.interchangeableBackId, slotSideNumber: null, loadTargetType: 'interchangeable_back' };
  }

  return { deviceId: parsed.data.filmHolderId, slotSideNumber: parsed.data.slotNumber, loadTargetType: 'film_holder_slot' };
}

export function mapFilmLotSummaryEntity(entity: FilmLotEntity, filmCount: number): FilmLotSummary {
  return {
    id: entity.id,
    userId: entity.user.id,
    emulsionId: entity.emulsion.id,
    packageTypeId: entity.packageType.id,
    filmFormatId: entity.filmFormat.id,
    quantity: entity.quantity,
    expirationDate: entity.expirationDate,
    purchaseInfo: (entity.purchaseInfo || entity.supplier)
      ? {
        supplierId: entity.supplier?.id,
        channel: entity.purchaseInfo?.channel ?? null,
        price: entity.purchaseInfo?.price ?? null,
        currencyCode: entity.purchaseInfo?.currencyCode ?? null,
        orderRef: entity.purchaseInfo?.orderRef ?? null,
        obtainedDate: entity.purchaseInfo?.obtainedDate ?? null
      }
      : null,
    rating: entity.rating,
    filmCount,
    emulsion: mapEmulsionEntity(entity.emulsion),
    packageType: mapPackageTypeEntity(entity.packageType),
    filmFormat: mapFilmFormatEntity(entity.filmFormat)
  };
}

export function mapFilmLotDetailEntity(entity: FilmLotEntity, films: FilmEntity[]): FilmLotDetail {
  return {
    ...mapFilmLotSummaryEntity(entity, films.length),
    films: films.map((film) => mapFilmSummaryEntity(film))
  };
}

export function mapFilmSummaryEntity(entity: FilmEntity, developmentCost: CostProjection = null, latestEvent: FilmJourneyEventEntity | null = null): FilmSummary {
  return {
    id: entity.id,
    userId: entity.user.id,
    filmLotId: entity.filmLot.id,
    name: entity.name,
    emulsionId: entity.emulsion.id,
    packageTypeId: entity.packageType.id,
    filmFormatId: entity.filmFormat.id,
    supplierId: entity.filmLot.supplier?.id ?? null,
    purchaseCostAllocated: allocatePurchaseCost(entity.filmLot, entity.id),
    developmentCost,
    expirationDate: entity.expirationDate,
    currentStateId: entity.currentState.id,
    currentStateCode: filmStateSchema.shape.code.parse(entity.currentState.code),
    emulsion: mapEmulsionEntity(entity.emulsion),
    packageType: mapPackageTypeEntity(entity.packageType),
    filmFormat: mapFilmFormatEntity(entity.filmFormat),
    currentState: mapFilmStateEntity(entity.currentState),
    latestEvent: latestEvent ? mapFilmJourneyEventEntity(latestEvent) : null
  };
}

export function mapFilmJourneyEventEntity(entity: FilmJourneyEventEntity): FilmJourneyEvent {
  return {
    id: entity.id,
    filmId: entity.film.id,
    userId: entity.user.id,
    filmStateId: entity.filmState.id,
    filmStateCode: filmStateSchema.shape.code.parse(entity.filmState.code),
    occurredAt: entity.occurredAt,
    recordedAt: entity.recordedAt,
    notes: entity.notes,
    eventData: entity.eventData
  };
}

export function mapFilmDetailEntity(entity: FilmEntity, latestEvent: FilmJourneyEventEntity | null, developmentCost: CostProjection = null): FilmDetail {
  return {
    ...mapFilmSummaryEntity(entity, developmentCost, latestEvent),
    latestEvent: latestEvent ? mapFilmJourneyEventEntity(latestEvent) : null
  };
}

export function mapFilmFrameEntity(entity: FilmFrameEntity): FilmFrame {
  return {
    id: entity.id,
    userId: entity.user.id,
    filmId: entity.film.id,
    frameNumber: entity.frameNumber,
    currentStateId: entity.currentState.id,
    currentStateCode: filmStateSchema.shape.code.parse(entity.currentState.code),
    currentState: mapFilmStateEntity(entity.currentState),
    aperture: entity.aperture,
    shutterSpeedSeconds: entity.shutterSpeedSeconds,
    filterUsed: entity.filterUsed
  };
}

export function mapFrameJourneyEventEntity(entity: FrameJourneyEventEntity): FrameJourneyEvent {
  return {
    id: entity.id,
    filmId: entity.film.id,
    filmFrameId: entity.filmFrame.id,
    userId: entity.user.id,
    filmStateId: entity.filmState.id,
    frameStateCode: frameStateCodeSchema.parse(entity.filmState.code),
    occurredAt: entity.occurredAt,
    recordedAt: entity.recordedAt,
    notes: entity.notes,
    eventData: entity.eventData
  };
}
