import type { DeviceMount, FilmHolderSlot, FilmDevice } from '@frollz2/schema';
import { frameSizeCodeSchema, holderTypeSchema, slotStateSchema } from '@frollz2/schema';
import type { DeviceMountEntity, FilmHolderSlotEntity, FilmDeviceEntity } from '../entities/index.js';

function normalizeSideNumber(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export function mapFilmHolderSlotEntity(entity: FilmHolderSlotEntity): FilmHolderSlot {
  return {
    id: entity.id,
    userId: entity.user.id,
    filmDeviceId: entity.filmHolder.filmDevice.id,
    // Backward compatibility for legacy rows that may contain 0/invalid side numbers.
    sideNumber: normalizeSideNumber(entity.sideNumber),
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
      frameSize: frameSizeCodeSchema.parse(entity.frameSize),
      deviceTypeCode: 'camera' as const,
      make: entity.camera.make,
      model: entity.camera.model,
      loadMode: entity.camera.loadMode,
      canUnload: entity.camera.canUnload,
      cameraSystem: entity.camera.cameraSystem,
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
      frameSize: frameSizeCodeSchema.parse(entity.frameSize),
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
      frameSize: frameSizeCodeSchema.parse(entity.frameSize),
      name: entity.filmHolder.name,
      brand: entity.filmHolder.brand,
      slotCount: entity.filmHolder.slotCount,
      holderTypeId: entity.filmHolder.holderType.id,
      holderTypeCode: holderTypeSchema.shape.code.parse(entity.filmHolder.holderType.code),
      slots: entity.filmHolder.slots.getItems().map(mapFilmHolderSlotEntity)
    };
  }

  throw new Error(`Unsupported device type ${entity.deviceType.code}`);
}

export function mapDeviceMountEntity(entity: DeviceMountEntity): DeviceMount {
  return {
    id: entity.id,
    userId: entity.user.id,
    cameraDeviceId: entity.cameraDevice.id,
    mountedDeviceId: entity.mountedDevice.id,
    mountedAt: entity.mountedAt,
    unmountedAt: entity.unmountedAt
  };
}
