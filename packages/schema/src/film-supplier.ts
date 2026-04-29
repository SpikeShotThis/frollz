import { z } from 'zod';
import { idSchema } from './common.js';

export const filmSupplierRatingSchema = z.number().int().min(1).max(5);

export const filmSupplierSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  contact: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().url().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  rating: filmSupplierRatingSchema.nullable()
});

export const createFilmSupplierRequestSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional(),
  rating: filmSupplierRatingSchema.optional()
});

export const updateFilmSupplierRequestSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
  rating: filmSupplierRatingSchema.nullable().optional()
});

export const listFilmSuppliersQuerySchema = z.object({
  q: z.string().optional().default(''),
  includeInactive: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100)
});

export type FilmSupplier = z.infer<typeof filmSupplierSchema>;
export type CreateFilmSupplierRequest = z.infer<typeof createFilmSupplierRequestSchema>;
export type UpdateFilmSupplierRequest = z.infer<typeof updateFilmSupplierRequestSchema>;
export type ListFilmSuppliersQuery = z.infer<typeof listFilmSuppliersQuerySchema>;
