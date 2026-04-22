import { z } from 'zod';
import { codeSchema, idSchema, labelSchema } from './common.js';
export const filmFormatCodes = [
    '35mm',
    '120',
    '220',
    '4x5',
    '2x3',
    '8x10',
    'InstaxMini',
    'InstaxWide',
    'InstaxSquare'
];
export const developmentProcessCodes = ['C41', 'E6', 'ECN2', 'BW'];
export const filmStateCodes = [
    'purchased',
    'stored',
    'loaded',
    'exposed',
    'removed',
    'sent_for_dev',
    'developed',
    'scanned',
    'archived'
];
export const storageLocationCodes = ['freezer', 'refrigerator', 'shelf', 'other'];
export const slotStateCodes = ['empty', 'loaded', 'exposed', 'removed'];
export const deviceTypeCodes = ['camera', 'interchangeable_back', 'film_holder'];
export const holderTypeCodes = ['standard', 'grafmatic', 'readyload', 'quickload'];
export const filmFormatCodeSchema = z.enum(filmFormatCodes);
export const developmentProcessCodeSchema = z.enum(developmentProcessCodes);
export const filmStateCodeSchema = z.enum(filmStateCodes);
export const storageLocationCodeSchema = z.enum(storageLocationCodes);
export const slotStateCodeSchema = z.enum(slotStateCodes);
export const deviceTypeCodeSchema = z.enum(deviceTypeCodes);
export const holderTypeCodeSchema = z.enum(holderTypeCodes);
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
//# sourceMappingURL=reference.js.map