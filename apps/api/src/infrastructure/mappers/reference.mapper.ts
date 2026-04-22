import type {
  DevelopmentProcess,
  Emulsion,
  FilmFormat,
  FilmState,
  HolderType,
  PackageType,
  ReceiverType,
  ReferenceTables,
  SlotState,
  StorageLocation
} from '@frollz2/schema';
import {
  developmentProcessSchema,
  filmFormatSchema,
  filmStateSchema,
  holderTypeSchema,
  receiverTypeSchema,
  slotStateSchema,
  storageLocationSchema
} from '@frollz2/schema';
import type {
  DevelopmentProcessEntity,
  EmulsionEntity,
  FilmFormatEntity,
  FilmStateEntity,
  HolderTypeEntity,
  PackageTypeEntity,
  ReceiverTypeEntity,
  SlotStateEntity,
  StorageLocationEntity
} from '../entities/index.js';

export function mapFilmFormatEntity(entity: FilmFormatEntity): FilmFormat {
  return {
    id: entity.id,
    code: filmFormatSchema.shape.code.parse(entity.code),
    label: entity.label
  };
}

export function mapDevelopmentProcessEntity(entity: DevelopmentProcessEntity): DevelopmentProcess {
  return {
    id: entity.id,
    code: developmentProcessSchema.shape.code.parse(entity.code),
    label: entity.label
  };
}

export function mapPackageTypeEntity(entity: PackageTypeEntity): PackageType {
  return {
    id: entity.id,
    code: entity.code,
    label: entity.label,
    filmFormatId: entity.filmFormat.id,
    filmFormat: mapFilmFormatEntity(entity.filmFormat)
  };
}

export function mapFilmStateEntity(entity: FilmStateEntity): FilmState {
  return {
    id: entity.id,
    code: filmStateSchema.shape.code.parse(entity.code),
    label: entity.label
  };
}

export function mapStorageLocationEntity(entity: StorageLocationEntity): StorageLocation {
  return {
    id: entity.id,
    code: storageLocationSchema.shape.code.parse(entity.code),
    label: entity.label
  };
}

export function mapSlotStateEntity(entity: SlotStateEntity): SlotState {
  return {
    id: entity.id,
    code: slotStateSchema.shape.code.parse(entity.code),
    label: entity.label
  };
}

export function mapReceiverTypeEntity(entity: ReceiverTypeEntity): ReceiverType {
  return {
    id: entity.id,
    code: receiverTypeSchema.shape.code.parse(entity.code),
    label: entity.label
  };
}

export function mapHolderTypeEntity(entity: HolderTypeEntity): HolderType {
  return {
    id: entity.id,
    code: holderTypeSchema.shape.code.parse(entity.code),
    label: entity.label
  };
}

export function mapEmulsionEntity(entity: EmulsionEntity): Emulsion {
  return {
    id: entity.id,
    brand: entity.brand,
    manufacturer: entity.manufacturer,
    isoSpeed: entity.isoSpeed,
    developmentProcessId: entity.developmentProcess.id,
    developmentProcess: mapDevelopmentProcessEntity(entity.developmentProcess),
    balance: entity.balance,
    filmFormats: entity.filmFormats.getItems().map(mapFilmFormatEntity)
  };
}

export function mapReferenceTables(entities: {
  filmFormats: FilmFormatEntity[];
  developmentProcesses: DevelopmentProcessEntity[];
  packageTypes: PackageTypeEntity[];
  filmStates: FilmStateEntity[];
  storageLocations: StorageLocationEntity[];
  slotStates: SlotStateEntity[];
  receiverTypes: ReceiverTypeEntity[];
  holderTypes: HolderTypeEntity[];
  emulsions: EmulsionEntity[];
}): ReferenceTables {
  return {
    filmFormats: entities.filmFormats.map(mapFilmFormatEntity),
    developmentProcesses: entities.developmentProcesses.map(mapDevelopmentProcessEntity),
    packageTypes: entities.packageTypes.map(mapPackageTypeEntity),
    filmStates: entities.filmStates.map(mapFilmStateEntity),
    storageLocations: entities.storageLocations.map(mapStorageLocationEntity),
    slotStates: entities.slotStates.map(mapSlotStateEntity),
    receiverTypes: entities.receiverTypes.map(mapReceiverTypeEntity),
    holderTypes: entities.holderTypes.map(mapHolderTypeEntity),
    emulsions: entities.emulsions.map(mapEmulsionEntity)
  };
}
