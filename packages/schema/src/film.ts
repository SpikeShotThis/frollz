import { z } from 'zod';
import {
  developmentProcessCodeSchema,
  emulsionSchema,
  filmFormatSchema,
  filmStateCodeSchema,
  filmStateSchema,
  holderTypeSchema,
  packageTypeSchema,
  deviceTypeSchema,
  slotStateSchema,
  storageLocationSchema
} from './reference.js';
import { idSchema, isoDateTimeSchema, nullableTextSchema } from './common.js';

export const cameraLoadModeSchema = z.enum(['direct', 'interchangeable_back', 'film_holder']);

export const frameSizeCodeSchema = z.enum([
  'full_frame',
  'half_frame',
  '645',
  '6x6',
  '6x7',
  '6x8',
  '6x9',
  '6x12',
  '6x17',
  '4x5',
  '8x10',
  '2x3',
  'instax'
]);

export const filmTransitionMap = new Map<string, string[]>([
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

export const nonLargeFilmLoadTargetCameraDirectSchema = z.object({
  loadTargetType: z.literal('camera_direct'),
  cameraId: idSchema,
  intendedPushPull: z.number().int().nullable()
});
export const nonLargeFilmLoadTargetInterchangeableBackSchema = z.object({
  loadTargetType: z.literal('interchangeable_back'),
  interchangeableBackId: idSchema,
  intendedPushPull: z.number().int().nullable()
});
export const nonLargeFilmLoadTargetFilmHolderSlotSchema = z.object({
  loadTargetType: z.literal('film_holder_slot'),
  filmHolderId: idSchema,
  slotNumber: z.union([z.literal(1), z.literal(2)]),
  intendedPushPull: z.number().int().nullable()
});
export const nonLargeFilmLoadTargetSchema = z.discriminatedUnion('loadTargetType', [
  nonLargeFilmLoadTargetCameraDirectSchema,
  nonLargeFilmLoadTargetInterchangeableBackSchema,
  nonLargeFilmLoadTargetFilmHolderSlotSchema
]);

export const frameLoadTargetCameraDirectSchema = z.object({
  loadTargetType: z.literal('camera_direct'),
  filmFrameId: idSchema,
  cameraId: idSchema,
  intendedPushPull: z.number().int().nullable()
});
export const frameLoadTargetInterchangeableBackSchema = z.object({
  loadTargetType: z.literal('interchangeable_back'),
  filmFrameId: idSchema,
  interchangeableBackId: idSchema,
  intendedPushPull: z.number().int().nullable()
});
export const frameLoadTargetFilmHolderSlotSchema = z.object({
  loadTargetType: z.literal('film_holder_slot'),
  filmFrameId: idSchema,
  filmHolderId: idSchema,
  slotNumber: z.union([z.literal(1), z.literal(2)]),
  intendedPushPull: z.number().int().nullable()
});
export const frameLoadTargetSchema = z.discriminatedUnion('loadTargetType', [
  frameLoadTargetCameraDirectSchema,
  frameLoadTargetInterchangeableBackSchema,
  frameLoadTargetFilmHolderSlotSchema
]);

export const filmJourneyEventDataLoadedSchema = nonLargeFilmLoadTargetSchema;
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

export const frameStateCodeSchema = z.enum([
  'purchased',
  'stored',
  'loaded',
  'exposed',
  'removed',
  'sent_for_dev',
  'developed',
  'scanned',
  'archived'
]);

export const frameJourneyEventPayloadSchema = z.discriminatedUnion('frameStateCode', [
  z.object({ frameStateCode: z.literal('purchased'), eventData: z.object({}).strict() }),
  z.object({ frameStateCode: z.literal('stored'), eventData: filmJourneyEventDataStoredSchema }),
  z.object({ frameStateCode: z.literal('loaded'), eventData: frameLoadTargetSchema }),
  z.object({ frameStateCode: z.literal('exposed'), eventData: filmJourneyEventDataExposedSchema }),
  z.object({ frameStateCode: z.literal('removed'), eventData: filmJourneyEventDataRemovedSchema }),
  z.object({ frameStateCode: z.literal('sent_for_dev'), eventData: filmJourneyEventDataSentForDevSchema }),
  z.object({ frameStateCode: z.literal('developed'), eventData: filmJourneyEventDataDevelopedSchema }),
  z.object({ frameStateCode: z.literal('scanned'), eventData: filmJourneyEventDataScannedSchema }),
  z.object({ frameStateCode: z.literal('archived'), eventData: filmJourneyEventDataArchivedSchema })
]);

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

export const frameJourneyEventSchema = z.object({
  id: idSchema,
  filmId: idSchema,
  filmFrameId: idSchema,
  userId: idSchema,
  filmStateId: idSchema,
  frameStateCode: frameStateCodeSchema,
  occurredAt: isoDateTimeSchema,
  recordedAt: isoDateTimeSchema,
  notes: z.string().nullable(),
  eventData: z.record(z.string(), z.unknown())
});

export const filmFrameSchema = z.object({
  id: idSchema,
  userId: idSchema,
  filmStockId: idSchema,
  frameNumber: z.number().int().positive(),
  currentStateId: idSchema,
  currentStateCode: filmStateCodeSchema,
  boundHolderDeviceId: idSchema.nullable(),
  boundHolderSlotNumber: z.number().int().nullable(),
  firstLoadedAt: isoDateTimeSchema.nullable(),
  currentState: filmStateSchema
});

export const filmStockSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1),
  emulsionId: idSchema,
  packageTypeId: idSchema,
  filmFormatId: idSchema,
  framesTotal: z.number().int().positive(),
  framesAvailable: z.number().int().nonnegative(),
  expirationDate: isoDateTimeSchema.nullable(),
  emulsion: emulsionSchema,
  packageType: packageTypeSchema,
  filmFormat: filmFormatSchema,
  frames: z.array(filmFrameSchema)
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

export const deviceMountSchema = z.object({
  id: idSchema,
  userId: idSchema,
  cameraDeviceId: idSchema,
  mountedDeviceId: idSchema,
  mountedAt: isoDateTimeSchema,
  unmountedAt: isoDateTimeSchema.nullable()
});

export const createDeviceMountRequestSchema = z.object({
  mountedDeviceId: idSchema,
  mountedAt: isoDateTimeSchema.optional()
});

export const unmountDeviceRequestSchema = z.object({
  mountedDeviceId: idSchema,
  unmountedAt: isoDateTimeSchema.optional()
});

export const createFilmJourneyEventRequestSchema = z.object({
  filmStateCode: filmStateCodeSchema,
  occurredAt: isoDateTimeSchema,
  notes: z.string().optional(),
  eventData: z.record(z.string(), z.unknown())
});

export const createFrameJourneyEventRequestSchema = z.object({
  frameStateCode: frameStateCodeSchema,
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
  frameSize: frameSizeCodeSchema
});

export const cameraSchema = filmDeviceSummarySchema.extend({
  deviceTypeCode: z.literal('camera'),
  make: z.string().min(1),
  model: z.string().min(1),
  loadMode: cameraLoadModeSchema,
  canUnload: z.boolean(),
  cameraSystem: z.string().nullable(),
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
  slotCount: z.union([z.literal(1), z.literal(2)]),
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
    frameSize: frameSizeCodeSchema,
    make: z.string().min(1),
    model: z.string().min(1),
    loadMode: cameraLoadModeSchema.optional().default('direct'),
    canUnload: z.boolean().optional().default(true),
    cameraSystem: z.string().nullable().optional(),
    serialNumber: z.string().nullable().optional(),
    dateAcquired: isoDateTimeSchema.nullable().optional()
  }),
  z.object({
    deviceTypeCode: z.literal('interchangeable_back'),
    deviceTypeId: idSchema,
    filmFormatId: idSchema,
    frameSize: frameSizeCodeSchema,
    name: z.string().min(1),
    system: z.string().min(1)
  }),
  z.object({
    deviceTypeCode: z.literal('film_holder'),
    deviceTypeId: idSchema,
    filmFormatId: idSchema,
    frameSize: frameSizeCodeSchema,
    name: z.string().min(1),
    brand: z.string().min(1),
    slotCount: z.union([z.literal(1), z.literal(2)]).optional().default(2),
    holderTypeId: idSchema
  })
]);

export const updateFilmDeviceRequestSchema = z.object({
  filmFormatId: idSchema.optional(),
  frameSize: frameSizeCodeSchema.optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  loadMode: cameraLoadModeSchema.optional(),
  canUnload: z.boolean().optional(),
  cameraSystem: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  dateAcquired: isoDateTimeSchema.nullable().optional(),
  name: z.string().min(1).optional(),
  system: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  slotCount: z.union([z.literal(1), z.literal(2)]).optional(),
  holderTypeId: idSchema.optional()
});

export type FilmSummary = z.infer<typeof filmSummarySchema>;
export type FilmDetail = z.infer<typeof filmDetailSchema>;
export type FilmStock = z.infer<typeof filmStockSchema>;
export type FilmFrame = z.infer<typeof filmFrameSchema>;
export type FilmCreateRequest = z.infer<typeof filmCreateRequestSchema>;
export type FilmUpdateRequest = z.infer<typeof filmUpdateRequestSchema>;
export type FilmListQuery = z.infer<typeof filmListQuerySchema>;
export type FilmJourneyEvent = z.infer<typeof filmJourneyEventSchema>;
export type FrameJourneyEvent = z.infer<typeof frameJourneyEventSchema>;
export type DeviceLoadTimelineEvent = z.infer<typeof deviceLoadTimelineEventSchema>;
export type DeviceMount = z.infer<typeof deviceMountSchema>;
export type FilmJourneyEventPayload = z.infer<typeof filmJourneyEventPayloadSchema>;
export type FrameJourneyEventPayload = z.infer<typeof frameJourneyEventPayloadSchema>;
export type FrameLoadTarget = z.infer<typeof frameLoadTargetSchema>;
export type NonLargeFilmLoadTarget = z.infer<typeof nonLargeFilmLoadTargetSchema>;
export type CreateFilmJourneyEventRequest = z.infer<typeof createFilmJourneyEventRequestSchema>;
export type CreateFrameJourneyEventRequest = z.infer<typeof createFrameJourneyEventRequestSchema>;
export type CreateDeviceMountRequest = z.infer<typeof createDeviceMountRequestSchema>;
export type UnmountDeviceRequest = z.infer<typeof unmountDeviceRequestSchema>;
export type FilmHolderSlot = z.infer<typeof filmHolderSlotSchema>;
export type FilmDevice = z.infer<typeof filmDeviceSchema>;
export type CreateFilmDeviceRequest = z.infer<typeof createFilmDeviceRequestSchema>;
export type UpdateFilmDeviceRequest = z.infer<typeof updateFilmDeviceRequestSchema>;
export type FrameSizeCode = z.infer<typeof frameSizeCodeSchema>;
