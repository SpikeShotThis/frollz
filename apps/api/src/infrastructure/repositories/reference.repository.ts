import type {
  DevelopmentProcess,
  FilmFormat,
  FilmState,
  HolderType,
  ListReferenceValuesQuery,
  PackageType,
  ReferenceValue,
  UpsertReferenceValueInput,
  DeviceType,
  ReferenceTables,
  SlotState,
  StorageLocation
} from '@frollz2/schema';

export abstract class ReferenceRepository {
  abstract getAll(): Promise<ReferenceTables>;

  abstract listFilmFormats(): Promise<FilmFormat[]>;
  abstract listDevelopmentProcesses(): Promise<DevelopmentProcess[]>;
  abstract listPackageTypes(): Promise<PackageType[]>;
  abstract listFilmStates(): Promise<FilmState[]>;
  abstract listStorageLocations(): Promise<StorageLocation[]>;
  abstract listSlotStates(): Promise<SlotState[]>;
  abstract listDeviceTypes(): Promise<DeviceType[]>;
  abstract listHolderTypes(): Promise<HolderType[]>;
  abstract listReferenceValues(userId: number, query: ListReferenceValuesQuery): Promise<ReferenceValue[]>;
  abstract upsertReferenceValues(userId: number, values: UpsertReferenceValueInput[]): Promise<void>;
}
