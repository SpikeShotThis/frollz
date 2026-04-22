import { z } from 'zod';
import { developmentProcessCodeSchema, emulsionSchema, filmFormatSchema, filmStateCodeSchema, filmStateSchema, holderTypeSchema, packageTypeSchema, deviceTypeSchema, slotStateSchema, storageLocationSchema } from './reference.js';
import { idSchema, isoDateTimeSchema, nullableTextSchema } from './common.js';
export const filmTransitionMap = new Map([
    ['purchased', ['stored', 'loaded']],
    ['stored', ['stored', 'loaded']],
    ['loaded', ['exposed']],
    ['exposed', ['removed']],
    ['removed', ['stored', 'sent_for_dev']],
    ['sent_for_dev', ['developed']],
    ['developed', ['scanned', 'archived']],
    ['scanned', ['archived']],
    ['archived', []]
]);
export const filmSummarySchema = z.object({
    id: idSchema,
    userId: idSchema,
    name: z.string().min(1),
    emulsionId: idSchema,
    packageTypeId: idSchema,
    filmFormatId: idSchema,
    expirationDate: isoDateTimeSchema.nullable(),
    currentStateId: idSchema,
    currentStateCode: filmStateCodeSchema,
    emulsion: emulsionSchema,
    packageType: packageTypeSchema,
    filmFormat: filmFormatSchema,
    currentState: filmStateSchema
});
export const filmDetailSchema = filmSummarySchema.extend({
    latestEvent: z.lazy(() => filmJourneyEventSchema).nullable()
});
export const filmCreateRequestSchema = z.object({
    name: z.string().min(1),
    emulsionId: idSchema,
    packageTypeId: idSchema,
    filmFormatId: idSchema,
    expirationDate: isoDateTimeSchema.nullable().optional()
});
export const filmUpdateRequestSchema = z.object({
    name: z.string().min(1).optional(),
    expirationDate: isoDateTimeSchema.nullable().optional()
});
export const filmListQuerySchema = z.object({
    stateCode: filmStateCodeSchema.optional(),
    filmFormatId: z.coerce.number().int().positive().optional(),
    emulsionId: z.coerce.number().int().positive().optional()
});
export const filmJourneyEventDataPurchasedSchema = z.object({}).strict();
export const filmJourneyEventDataStoredSchema = z.object({
    storageLocationId: idSchema,
    storageLocationCode: storageLocationSchema.shape.code
});
export const filmJourneyEventDataLoadedSchema = z.object({
    deviceId: idSchema,
    slotSideNumber: z.number().int().nullable(),
    intendedPushPull: z.number().int().nullable()
});
export const filmJourneyEventDataExposedSchema = z.object({}).strict();
export const filmJourneyEventDataRemovedSchema = z.object({}).strict();
export const filmJourneyEventDataSentForDevSchema = z.object({
    labName: nullableTextSchema,
    labContact: nullableTextSchema,
    actualPushPull: z.number().int().nullable()
});
export const filmJourneyEventDataDevelopedSchema = z.object({
    labName: nullableTextSchema,
    actualPushPull: z.number().int().nullable()
});
export const filmJourneyEventDataScannedSchema = z.object({
    scannerOrSoftware: nullableTextSchema,
    scanLink: nullableTextSchema
});
export const filmJourneyEventDataArchivedSchema = z.object({}).strict();
export const filmJourneyEventPayloadSchema = z.discriminatedUnion('filmStateCode', [
    z.object({ filmStateCode: z.literal('purchased'), eventData: filmJourneyEventDataPurchasedSchema }),
    z.object({ filmStateCode: z.literal('stored'), eventData: filmJourneyEventDataStoredSchema }),
    z.object({ filmStateCode: z.literal('loaded'), eventData: filmJourneyEventDataLoadedSchema }),
    z.object({ filmStateCode: z.literal('exposed'), eventData: filmJourneyEventDataExposedSchema }),
    z.object({ filmStateCode: z.literal('removed'), eventData: filmJourneyEventDataRemovedSchema }),
    z.object({ filmStateCode: z.literal('sent_for_dev'), eventData: filmJourneyEventDataSentForDevSchema }),
    z.object({ filmStateCode: z.literal('developed'), eventData: filmJourneyEventDataDevelopedSchema }),
    z.object({ filmStateCode: z.literal('scanned'), eventData: filmJourneyEventDataScannedSchema }),
    z.object({ filmStateCode: z.literal('archived'), eventData: filmJourneyEventDataArchivedSchema })
]);
export const filmJourneyEventSchema = z.object({
    id: idSchema,
    filmId: idSchema,
    userId: idSchema,
    filmStateId: idSchema,
    filmStateCode: filmStateCodeSchema,
    occurredAt: isoDateTimeSchema,
    recordedAt: isoDateTimeSchema,
    notes: z.string().nullable(),
    eventData: z.record(z.string(), z.unknown())
});
export const deviceLoadTimelineEventSchema = z.object({
    eventId: idSchema,
    filmId: idSchema,
    filmName: z.string().min(1),
    emulsionName: z.string().min(1),
    stockLabel: z.string().nullable(),
    developmentProcessCode: developmentProcessCodeSchema,
    occurredAt: isoDateTimeSchema,
    removedAt: isoDateTimeSchema.nullable(),
    slotSideNumber: z.number().int().nullable()
});
export const createFilmJourneyEventRequestSchema = z.object({
    filmStateCode: filmStateCodeSchema,
    occurredAt: isoDateTimeSchema,
    notes: z.string().optional(),
    eventData: z.record(z.string(), z.unknown())
});
export const filmHolderSlotSchema = z.object({
    id: idSchema,
    userId: idSchema,
    filmDeviceId: idSchema,
    sideNumber: z.number().int().positive(),
    slotStateId: idSchema,
    slotStateCode: slotStateSchema.shape.code,
    loadedFilmId: idSchema.nullable(),
    createdAt: isoDateTimeSchema
});
export const filmDeviceSummarySchema = z.object({
    id: idSchema,
    userId: idSchema,
    deviceTypeId: idSchema,
    deviceTypeCode: deviceTypeSchema.shape.code,
    filmFormatId: idSchema,
    frameSize: z.string().min(1)
});
export const cameraSchema = filmDeviceSummarySchema.extend({
    deviceTypeCode: z.literal('camera'),
    make: z.string().min(1),
    model: z.string().min(1),
    serialNumber: z.string().nullable(),
    dateAcquired: isoDateTimeSchema.nullable()
});
export const interchangeableBackSchema = filmDeviceSummarySchema.extend({
    deviceTypeCode: z.literal('interchangeable_back'),
    name: z.string().min(1),
    system: z.string().min(1)
});
export const filmHolderSchema = filmDeviceSummarySchema.extend({
    deviceTypeCode: z.literal('film_holder'),
    name: z.string().min(1),
    brand: z.string().min(1),
    holderTypeId: idSchema,
    holderTypeCode: holderTypeSchema.shape.code,
    slots: z.array(filmHolderSlotSchema)
});
export const filmDeviceSchema = z.discriminatedUnion('deviceTypeCode', [
    cameraSchema,
    interchangeableBackSchema,
    filmHolderSchema
]);
export const createFilmDeviceRequestSchema = z.discriminatedUnion('deviceTypeCode', [
    z.object({
        deviceTypeCode: z.literal('camera'),
        deviceTypeId: idSchema,
        filmFormatId: idSchema,
        frameSize: z.string().min(1),
        make: z.string().min(1),
        model: z.string().min(1),
        serialNumber: z.string().nullable().optional(),
        dateAcquired: isoDateTimeSchema.nullable().optional()
    }),
    z.object({
        deviceTypeCode: z.literal('interchangeable_back'),
        deviceTypeId: idSchema,
        filmFormatId: idSchema,
        frameSize: z.string().min(1),
        name: z.string().min(1),
        system: z.string().min(1)
    }),
    z.object({
        deviceTypeCode: z.literal('film_holder'),
        deviceTypeId: idSchema,
        filmFormatId: idSchema,
        frameSize: z.string().min(1),
        name: z.string().min(1),
        brand: z.string().min(1),
        holderTypeId: idSchema
    })
]);
export const updateFilmDeviceRequestSchema = z.object({
    filmFormatId: idSchema.optional(),
    frameSize: z.string().min(1).optional(),
    make: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    serialNumber: z.string().nullable().optional(),
    dateAcquired: isoDateTimeSchema.nullable().optional(),
    name: z.string().min(1).optional(),
    system: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    holderTypeId: idSchema.optional()
});
//# sourceMappingURL=film.js.map
