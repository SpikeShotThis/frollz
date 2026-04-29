import type { FilmDetail, FilmFrame, FilmJourneyEvent, FilmLotDetail, FilmLotSummary, FilmSummary, FrameJourneyEvent } from '@frollz2/schema';
import { filmStateSchema, frameStateCodeSchema, filmJourneyEventDataLoadedSchema } from '@frollz2/schema';
import type { FilmEntity, FilmFrameEntity, FilmJourneyEventEntity, FilmLotEntity, FrameJourneyEventEntity } from '../entities/index.js';
import { mapEmulsionEntity, mapFilmFormatEntity, mapFilmStateEntity, mapPackageTypeEntity } from './reference.mapper.js';

export type NormalizedLoadedEventData = {
  deviceId: number;
  slotSideNumber: number | null;
  loadTargetType: 'camera_direct' | 'interchangeable_back' | 'film_holder_slot';
};

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
    supplierId: entity.supplier?.id ?? null,
    supplierName: entity.supplier?.name ?? entity.supplierName,
    purchaseChannel: entity.purchaseChannel,
    purchasePrice: entity.purchasePrice,
    purchaseCurrencyCode: entity.purchaseCurrencyCode,
    orderRef: entity.orderRef,
    obtainedDate: entity.obtainedDate,
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
    films: films.map(mapFilmSummaryEntity)
  };
}

export function mapFilmSummaryEntity(entity: FilmEntity): FilmSummary {
  return {
    id: entity.id,
    userId: entity.user.id,
    filmLotId: entity.filmLot.id,
    name: entity.name,
    emulsionId: entity.emulsion.id,
    packageTypeId: entity.packageType.id,
    filmFormatId: entity.filmFormat.id,
    supplierId: entity.filmLot.supplier?.id ?? null,
    supplierName: entity.filmLot.supplier?.name ?? entity.filmLot.supplierName,
    expirationDate: entity.expirationDate,
    currentStateId: entity.currentState.id,
    currentStateCode: filmStateSchema.shape.code.parse(entity.currentState.code),
    emulsion: mapEmulsionEntity(entity.emulsion),
    packageType: mapPackageTypeEntity(entity.packageType),
    filmFormat: mapFilmFormatEntity(entity.filmFormat),
    currentState: mapFilmStateEntity(entity.currentState)
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

export function mapFilmDetailEntity(entity: FilmEntity, latestEvent: FilmJourneyEventEntity | null): FilmDetail {
  return {
    ...mapFilmSummaryEntity(entity),
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
    currentState: mapFilmStateEntity(entity.currentState)
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
