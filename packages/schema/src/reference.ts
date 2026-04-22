import { z } from 'zod';
import { codeSchema, idSchema, labelSchema } from './common.js';

export const filmFormatCodeSchema = codeSchema;
export const developmentProcessCodeSchema = codeSchema;
export const filmStateCodeSchema = codeSchema;
export const storageLocationCodeSchema = codeSchema;
export const slotStateCodeSchema = codeSchema;
export const deviceTypeCodeSchema = codeSchema;
export const holderTypeCodeSchema = codeSchema;

export const filmFormatSchema = z.object({
  id: idSchema,
  code: filmFormatCodeSchema,
  label: labelSchema
});

export const developmentProcessSchema = z.object({
  id: idSchema,
  code: developmentProcessCodeSchema,
  label: labelSchema
});

export const packageTypeSchema = z.object({
  id: idSchema,
  code: codeSchema,
  label: labelSchema,
  filmFormatId: idSchema,
  filmFormat: filmFormatSchema
});

export const filmStateSchema = z.object({
  id: idSchema,
  code: filmStateCodeSchema,
  label: labelSchema
});

export const storageLocationSchema = z.object({
  id: idSchema,
  code: storageLocationCodeSchema,
  label: labelSchema
});

export const slotStateSchema = z.object({
  id: idSchema,
  code: slotStateCodeSchema,
  label: labelSchema
});

export const deviceTypeSchema = z.object({
  id: idSchema,
  code: deviceTypeCodeSchema,
  label: labelSchema
});

export const holderTypeSchema = z.object({
  id: idSchema,
  code: holderTypeCodeSchema,
  label: labelSchema
});

export const emulsionSchema = z.object({
  id: idSchema,
  brand: z.string().min(1),
  manufacturer: z.string().min(1),
  isoSpeed: z.number().int().positive(),
  developmentProcessId: idSchema,
  developmentProcess: developmentProcessSchema,
  balance: z.string().min(1),
  filmFormats: z.array(filmFormatSchema)
});

export const referenceTablesSchema = z.object({
  filmFormats: z.array(filmFormatSchema),
  developmentProcesses: z.array(developmentProcessSchema),
  packageTypes: z.array(packageTypeSchema),
  filmStates: z.array(filmStateSchema),
  storageLocations: z.array(storageLocationSchema),
  slotStates: z.array(slotStateSchema),
  deviceTypes: z.array(deviceTypeSchema),
  holderTypes: z.array(holderTypeSchema),
  emulsions: z.array(emulsionSchema)
});

export type FilmFormat = z.infer<typeof filmFormatSchema>;
export type DevelopmentProcess = z.infer<typeof developmentProcessSchema>;
export type PackageType = z.infer<typeof packageTypeSchema>;
export type FilmState = z.infer<typeof filmStateSchema>;
export type StorageLocation = z.infer<typeof storageLocationSchema>;
export type SlotState = z.infer<typeof slotStateSchema>;
export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type HolderType = z.infer<typeof holderTypeSchema>;
export type Emulsion = z.infer<typeof emulsionSchema>;
export type ReferenceTables = z.infer<typeof referenceTablesSchema>;
