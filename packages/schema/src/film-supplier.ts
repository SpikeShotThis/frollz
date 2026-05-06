import { z } from 'zod';
import { idSchema, LIST_DEFAULT_LIMIT, LIST_MAX_LIMIT, queryBooleanSchema } from './common.js';

// Expresses "omit the field entirely" vs "explicitly clear it to null"
const nullableOptional = <T extends z.ZodTypeAny>(schema: T) => schema.nullable().optional();

export const filmSupplierRatingSchema = z.number().int().min(1).max(5);

export const filmSupplierSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  contact: z.string().nullable(),
  email: z.email().nullable(),
  website: z.url().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  rating: filmSupplierRatingSchema.nullable()
});

export const createFilmSupplierRequestSchema = z.object({
  name: z.string().min(1),
  contact: nullableOptional(z.string()),
  email: nullableOptional(z.email()),
  website: nullableOptional(z.url()),
  notes: nullableOptional(z.string()),
  rating: filmSupplierRatingSchema.optional()
});

export const updateFilmSupplierRequestSchema = z.object({
  name: z.string().min(1).optional(),
  contact: nullableOptional(z.string()),
  email: nullableOptional(z.email()),
  website: nullableOptional(z.url()),
  notes: nullableOptional(z.string()),
  active: z.boolean().optional(),
  rating: nullableOptional(filmSupplierRatingSchema)
});

export const listFilmSuppliersQuerySchema = z.object({
  q: z.string().optional().default(''),
  includeInactive: queryBooleanSchema.optional().default(false),
  limit: z.coerce.number().int().min(1).max(LIST_MAX_LIMIT).optional().default(LIST_DEFAULT_LIMIT)
});

export type FilmSupplier = z.infer<typeof filmSupplierSchema>;
export type CreateFilmSupplierRequest = z.infer<typeof createFilmSupplierRequestSchema>;
export type UpdateFilmSupplierRequest = z.infer<typeof updateFilmSupplierRequestSchema>;
export type ListFilmSuppliersQuery = z.infer<typeof listFilmSuppliersQuerySchema>;
