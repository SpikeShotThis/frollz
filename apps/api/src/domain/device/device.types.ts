import type {
  CreateFilmDeviceRequest,
  FilmHolderSlot,
  FilmDevice,
  UpdateFilmDeviceRequest
} from '@frollz2/schema';

export type Device = FilmDevice;
export type CreateDeviceInput = CreateFilmDeviceRequest;
export type UpdateDeviceInput = UpdateFilmDeviceRequest;
export type DeviceSlot = FilmHolderSlot;
