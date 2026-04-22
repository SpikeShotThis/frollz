import type { FilmHolderSlot, FilmReceiver } from '@frollz2/schema';
import { holderTypeSchema, slotStateSchema } from '@frollz2/schema';
import type { FilmHolderSlotEntity, FilmReceiverEntity } from '../entities/index.js';

export function mapFilmHolderSlotEntity(entity: FilmHolderSlotEntity): FilmHolderSlot {
  return {
    id: entity.id,
    userId: entity.user.id,
    filmReceiverId: entity.filmHolder.filmReceiver.id,
    sideNumber: entity.sideNumber,
    slotStateId: entity.slotState.id,
    slotStateCode: slotStateSchema.shape.code.parse(entity.slotState.code),
    loadedFilmId: entity.loadedFilm ? entity.loadedFilm.id : null,
    createdAt: entity.createdAt
  };
}

export function mapFilmReceiverEntity(entity: FilmReceiverEntity): FilmReceiver {
  if (entity.camera) {
    return {
      id: entity.id,
      userId: entity.user.id,
      receiverTypeId: entity.receiverType.id,
      filmFormatId: entity.filmFormat.id,
      frameSize: entity.frameSize,
      receiverTypeCode: 'camera' as const,
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
      receiverTypeId: entity.receiverType.id,
      receiverTypeCode: 'interchangeable_back' as const,
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
      receiverTypeId: entity.receiverType.id,
      receiverTypeCode: 'film_holder' as const,
      filmFormatId: entity.filmFormat.id,
      frameSize: entity.frameSize,
      name: entity.filmHolder.name,
      brand: entity.filmHolder.brand,
      holderTypeId: entity.filmHolder.holderType.id,
      holderTypeCode: holderTypeSchema.shape.code.parse(entity.filmHolder.holderType.code),
      slots: entity.filmHolder.slots.getItems().map(mapFilmHolderSlotEntity)
    };
  }

  throw new Error(`Unsupported receiver type ${entity.receiverType.code}`);
}
