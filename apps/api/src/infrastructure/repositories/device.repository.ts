import type {
  CreateDeviceMountRequest,
  CreateFilmDeviceRequest,
  DeviceMount,
  FilmDevice,
  FilmHolderSlot,
  UnmountDeviceRequest,
  UpdateFilmDeviceRequest
} from '@frollz2/schema';

export abstract class DeviceRepository {
  abstract list(userId: number): Promise<FilmDevice[]>;

  abstract findById(userId: number, deviceId: number): Promise<FilmDevice | null>;

  abstract create(userId: number, input: CreateFilmDeviceRequest): Promise<FilmDevice>;

  abstract update(userId: number, deviceId: number, input: UpdateFilmDeviceRequest): Promise<FilmDevice | null>;

  abstract delete(userId: number, deviceId: number): Promise<void>;

  abstract listHolderSlots(userId: number, filmDeviceId: number): Promise<FilmHolderSlot[]>;

  abstract findActiveHolderSlot(
    userId: number,
    filmDeviceId: number,
    sideNumber: number
  ): Promise<FilmHolderSlot | null>;

  abstract listMountsForCamera(userId: number, cameraDeviceId: number): Promise<DeviceMount[]>;

  abstract createMount(userId: number, cameraDeviceId: number, input: CreateDeviceMountRequest): Promise<DeviceMount>;

  abstract unmount(userId: number, cameraDeviceId: number, input: UnmountDeviceRequest): Promise<DeviceMount | null>;

  abstract findActiveMountForCamera(userId: number, cameraDeviceId: number): Promise<DeviceMount | null>;

  abstract findActiveMountForMountedDevice(userId: number, mountedDeviceId: number): Promise<DeviceMount | null>;
}
