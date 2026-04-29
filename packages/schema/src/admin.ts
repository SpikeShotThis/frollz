import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common.js';
import { currentUserSchema } from './auth.js';
import {
  filmDeviceSchema,
  filmLotSummarySchema,
  filmSummarySchema,
  filmJourneyEventSchema,
  filmFrameSchema,
  frameJourneyEventSchema,
  deviceMountSchema
} from './film.js';

/**
 * Export data schema - complete user data snapshot
 */
export const exportDataSchema = z.object({
  version: z.literal('1.0'),
  exportedAt: isoDateTimeSchema,
  user: currentUserSchema.pick({ email: true, name: true }),
  devices: z.array(filmDeviceSchema),
  filmLots: z.array(filmLotSummarySchema),
  films: z.array(filmSummarySchema),
  filmEvents: z.array(filmJourneyEventSchema),
  frames: z.array(filmFrameSchema),
  frameEvents: z.array(frameJourneyEventSchema),
  deviceMounts: z.array(deviceMountSchema)
});

/**
 * Import request schema - accepts same structure as export
 * (Future iterations will validate and merge data)
 */
export const importDataRequestSchema = exportDataSchema;

/**
 * Import response schema - statistics about what was imported
 */
export const importDataResponseSchema = z.object({
  devicesCreated: z.number().int().nonnegative(),
  filmLotsCreated: z.number().int().nonnegative(),
  filmsCreated: z.number().int().nonnegative(),
  filmEventsCreated: z.number().int().nonnegative(),
  framesCreated: z.number().int().nonnegative(),
  frameEventsCreated: z.number().int().nonnegative(),
  deviceMountsCreated: z.number().int().nonnegative()
});

export type ExportData = z.infer<typeof exportDataSchema>;
export type ImportDataRequest = z.infer<typeof importDataRequestSchema>;
export type ImportDataResponse = z.infer<typeof importDataResponseSchema>;
