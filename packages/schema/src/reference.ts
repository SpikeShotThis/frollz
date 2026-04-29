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

export const referenceValueKindSchema = z.enum([
  'manufacturer',
  'brand',
  'device_make',
  'device_model',
  'device_system',
  'lab_name',
  'lab_contact',
  'supplier_name',
  'supplier_channel'
]);

export const referenceValueSchema = z.object({
  id: idSchema,
  userId: idSchema,
  kind: referenceValueKindSchema,
  value: z.string().min(1),
  normalizedValue: z.string().min(1),
  usageCount: z.number().int().nonnegative(),
  lastUsedAt: z.string().min(1)
});

export const listReferenceValuesQuerySchema = z.object({
  kind: referenceValueKindSchema,
  q: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10)
});

export const upsertReferenceValueInputSchema = z.object({
  kind: referenceValueKindSchema,
  value: z.string().min(1)
});

export const upsertReferenceValuesRequestSchema = z.object({
  items: z.array(upsertReferenceValueInputSchema).min(1).max(100)
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

export const createEmulsionRequestSchema = z.object({
  brand: z.string().min(1),
  manufacturer: z.string().min(1),
  isoSpeed: z.number().int().positive(),
  developmentProcessId: idSchema,
  filmFormatIds: z.array(idSchema).min(1)
});

export const updateEmulsionRequestSchema = z.object({
  brand: z.string().min(1),
  manufacturer: z.string().min(1),
  isoSpeed: z.number().int().positive(),
  developmentProcessId: idSchema,
  filmFormatIds: z.array(idSchema).min(1)
});

export const referenceTablesSchema = z.object({
  filmFormats: z.array(filmFormatSchema),
  developmentProcesses: z.array(developmentProcessSchema),
  packageTypes: z.array(packageTypeSchema),
  filmStates: z.array(filmStateSchema),
  storageLocations: z.array(storageLocationSchema),
  slotStates: z.array(slotStateSchema),
  deviceTypes: z.array(deviceTypeSchema),
  holderTypes: z.array(holderTypeSchema)
});

export type FilmFormat = z.infer<typeof filmFormatSchema>;
export type DevelopmentProcess = z.infer<typeof developmentProcessSchema>;
export type PackageType = z.infer<typeof packageTypeSchema>;
export type FilmState = z.infer<typeof filmStateSchema>;
export type StorageLocation = z.infer<typeof storageLocationSchema>;
export type SlotState = z.infer<typeof slotStateSchema>;
export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type HolderType = z.infer<typeof holderTypeSchema>;
export type ReferenceValueKind = z.infer<typeof referenceValueKindSchema>;
export type ReferenceValue = z.infer<typeof referenceValueSchema>;
export type ListReferenceValuesQuery = z.infer<typeof listReferenceValuesQuerySchema>;
export type UpsertReferenceValueInput = z.infer<typeof upsertReferenceValueInputSchema>;
export type UpsertReferenceValuesRequest = z.infer<typeof upsertReferenceValuesRequestSchema>;
export type Emulsion = z.infer<typeof emulsionSchema>;
export type CreateEmulsionRequest = z.infer<typeof createEmulsionRequestSchema>;
export type UpdateEmulsionRequest = z.infer<typeof updateEmulsionRequestSchema>;
export type ReferenceTables = z.infer<typeof referenceTablesSchema>;
