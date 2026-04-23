import type { FilmDetail, FilmFrame, FilmJourneyEvent, FilmSummary } from '@frollz2/schema';
import { filmStateSchema } from '@frollz2/schema';
import type { FilmEntity, FilmFrameEntity, FilmJourneyEventEntity } from '../entities/index.js';
import { mapEmulsionEntity, mapFilmFormatEntity, mapFilmStateEntity, mapPackageTypeEntity } from './reference.mapper.js';

export function mapFilmSummaryEntity(entity: FilmEntity): FilmSummary {
  return {
    id: entity.id,
    userId: entity.user.id,
    name: entity.name,
    emulsionId: entity.emulsion.id,
    packageTypeId: entity.packageType.id,
    filmFormatId: entity.filmFormat.id,
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
    filmStockId: entity.filmStock.id,
    frameNumber: entity.frameNumber,
    currentStateId: entity.currentState.id,
    currentStateCode: filmStateSchema.shape.code.parse(entity.currentState.code),
    boundHolderDeviceId: entity.boundHolderDevice ? entity.boundHolderDevice.id : null,
    boundHolderSlotNumber: entity.boundHolderSlotNumber,
    firstLoadedAt: entity.firstLoadedAt,
    currentState: mapFilmStateEntity(entity.currentState)
  };
}
