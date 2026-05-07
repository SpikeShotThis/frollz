import { z } from 'zod';
import { currencyCodeSchema, idSchema, isoDateTimeSchema } from './common.js';
import { developmentProcessSchema, emulsionSchema, filmFormatSchema, packageTypeSchema } from './reference.js';

export const insightRangeSchema = z.enum(['30d', '90d', '365d', 'all']);

export const insightsQuerySchema = z.object({
  range: insightRangeSchema.optional().default('365d'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(5)
});

export const insightMoneySchema = z.object({
  amount: z.number().nonnegative(),
  currencyCode: currencyCodeSchema
});

export const insightMoneyStatsSchema = z.object({
  currencyCode: currencyCodeSchema,
  averageAmount: z.number().nonnegative(),
  medianAmount: z.number().nonnegative()
});

export const filmQueueInsightItemSchema = z.object({
  filmId: idSchema,
  filmName: z.string().min(1),
  occurredAt: isoDateTimeSchema,
  daysWaiting: z.number().nonnegative(),
  emulsion: emulsionSchema,
  filmFormat: filmFormatSchema,
  developmentProcess: developmentProcessSchema,
  labId: idSchema.nullable(),
  labName: z.string().nullable()
});

export const filmWorkflowBreakdownSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  count: z.number().int().nonnegative()
});

export const filmWorkflowInsightsSchema = z.object({
  range: insightRangeSchema,
  generatedAt: isoDateTimeSchema,
  totals: z.object({
    totalFilms: z.number().int().nonnegative(),
    activeFilms: z.number().int().nonnegative(),
    removedNotSent: z.number().int().nonnegative(),
    atLab: z.number().int().nonnegative(),
    recentCompletions: z.number().int().nonnegative()
  }),
  oldestWaitingFilm: filmQueueInsightItemSchema.nullable(),
  oldestLabQueueItem: filmQueueInsightItemSchema.nullable(),
  byFormat: z.array(filmWorkflowBreakdownSchema),
  byDevelopmentProcess: z.array(filmWorkflowBreakdownSchema)
});

export const labPerformanceInsightRowSchema = z.object({
  labId: idSchema,
  labName: z.string().min(1),
  developmentProcess: developmentProcessSchema,
  completedCount: z.number().int().nonnegative(),
  activeQueueCount: z.number().int().nonnegative(),
  medianTurnaroundDays: z.number().nonnegative().nullable(),
  fastestTurnaroundDays: z.number().nonnegative().nullable(),
  slowestTurnaroundDays: z.number().nonnegative().nullable(),
  lastUsedAt: isoDateTimeSchema.nullable(),
  developmentCostByCurrency: z.array(insightMoneyStatsSchema)
});

export const labPerformanceInsightsSchema = z.object({
  range: insightRangeSchema,
  generatedAt: isoDateTimeSchema,
  rows: z.array(labPerformanceInsightRowSchema)
});

export const supplierPriceInsightRowSchema = z.object({
  emulsion: emulsionSchema,
  packageType: packageTypeSchema,
  filmFormat: filmFormatSchema,
  currencyCode: currencyCodeSchema,
  lowestPackagePrice: z.number().nonnegative(),
  medianPackagePrice: z.number().nonnegative(),
  lowestUnitPrice: z.number().nonnegative(),
  medianUnitPrice: z.number().nonnegative(),
  bestSupplier: z.object({
    supplierId: idSchema,
    supplierName: z.string().min(1)
  }).nullable(),
  purchaseCount: z.number().int().nonnegative(),
  totalUnitsPurchased: z.number().int().nonnegative(),
  lastPurchaseDate: isoDateTimeSchema
});

export const supplierPerformanceInsightsSchema = z.object({
  range: insightRangeSchema,
  generatedAt: isoDateTimeSchema,
  rows: z.array(supplierPriceInsightRowSchema)
});

export const deviceUsageInsightRowSchema = z.object({
  deviceId: idSchema,
  deviceName: z.string().min(1),
  deviceTypeCode: z.string().min(1),
  filmFormat: filmFormatSchema,
  loadCount: z.number().int().nonnegative(),
  activeLoadCount: z.number().int().nonnegative(),
  lastLoadedAt: isoDateTimeSchema.nullable()
});

export const deviceUsageInsightsSchema = z.object({
  range: insightRangeSchema,
  generatedAt: isoDateTimeSchema,
  totalDevices: z.number().int().nonnegative(),
  activeLoads: z.number().int().nonnegative(),
  rows: z.array(deviceUsageInsightRowSchema)
});

export const dashboardInsightsSchema = z.object({
  range: insightRangeSchema,
  generatedAt: isoDateTimeSchema,
  slowestLabQueue: filmQueueInsightItemSchema.nullable(),
  bestRecentPrice: supplierPriceInsightRowSchema.nullable(),
  workflowBottleneck: z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    count: z.number().int().nonnegative(),
    href: z.string().min(1)
  }).nullable()
});

export type InsightRange = z.infer<typeof insightRangeSchema>;
export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
export type InsightMoney = z.infer<typeof insightMoneySchema>;
export type InsightMoneyStats = z.infer<typeof insightMoneyStatsSchema>;
export type FilmQueueInsightItem = z.infer<typeof filmQueueInsightItemSchema>;
export type FilmWorkflowInsights = z.infer<typeof filmWorkflowInsightsSchema>;
export type LabPerformanceInsightRow = z.infer<typeof labPerformanceInsightRowSchema>;
export type LabPerformanceInsights = z.infer<typeof labPerformanceInsightsSchema>;
export type SupplierPriceInsightRow = z.infer<typeof supplierPriceInsightRowSchema>;
export type SupplierPerformanceInsights = z.infer<typeof supplierPerformanceInsightsSchema>;
export type DeviceUsageInsightRow = z.infer<typeof deviceUsageInsightRowSchema>;
export type DeviceUsageInsights = z.infer<typeof deviceUsageInsightsSchema>;
export type DashboardInsights = z.infer<typeof dashboardInsightsSchema>;
