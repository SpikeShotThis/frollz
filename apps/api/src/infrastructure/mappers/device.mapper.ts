import type { FilmHolderSlot, FilmDevice } from '@frollz2/schema';
import { holderTypeSchema, slotStateSchema } from '@frollz2/schema';
import type { FilmHolderSlotEntity, FilmDeviceEntity } from '../entities/index.js';

export function mapFilmHolderSlotEntity(entity: FilmHolderSlotEntity): FilmHolderSlot {
  return {
    id: entity.id,
    userId: entity.user.id,
    filmDeviceId: entity.filmHolder.filmDevice.id,
    sideNumber: entity.sideNumber,
    slotStateId: entity.slotState.id,
    slotStateCode: slotStateSchema.shape.code.parse(entity.slotState.code),
    loadedFilmId: entity.loadedFilm ? entity.loadedFilm.id : null,
    createdAt: entity.createdAt
  };
}

export function mapFilmDeviceEntity(entity: FilmDeviceEntity): FilmDevice {
  if (entity.camera) {
    return {
      id: entity.id,
      userId: entity.user.id,
      deviceTypeId: entity.deviceType.id,
      filmFormatId: entity.filmFormat.id,
      frameSize: entity.frameSize,
      deviceTypeCode: 'camera' as const,
      make: entity.camera.make,
      model: entity.camera.model,
      serialNumber: entity.camera.serialNumber,
      dateAcquired: entity.camera.dateAcquired
    };
  }

  if (entity.interchangeableBack) {
    return {
      id: entity.id,
      userId: entity.user.id,
      deviceTypeId: entity.deviceType.id,
      deviceTypeCode: 'interchangeable_back' as const,
      filmFormatId: entity.filmFormat.id,
      frameSize: entity.frameSize,
      name: entity.interchangeableBack.name,
      system: entity.interchangeableBack.system
    };
  }

  if (entity.filmHolder) {
    return {
      id: entity.id,
      userId: entity.user.id,
      deviceTypeId: entity.deviceType.id,
      deviceTypeCode: 'film_holder' as const,
      filmFormatId: entity.filmFormat.id,
      frameSize: entity.frameSize,
      name: entity.filmHolder.name,
      brand: entity.filmHolder.brand,
      holderTypeId: entity.filmHolder.holderType.id,
      holderTypeCode: holderTypeSchema.shape.code.parse(entity.filmHolder.holderType.code),
      slots: entity.filmHolder.slots.getItems().map(mapFilmHolderSlotEntity)
    };
  }

  throw new Error(`Unsupported device type ${entity.deviceType.code}`);
}
