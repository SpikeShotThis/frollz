import { z } from 'zod';
import { idSchema } from './common.js';

export const filmLabRatingSchema = z.number().int().min(1).max(5);

export const filmLabSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  contact: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().url().nullable(),
  defaultProcesses: z.string().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  rating: filmLabRatingSchema.nullable()
});

export const createFilmLabRequestSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  defaultProcesses: z.string().optional(),
  notes: z.string().optional(),
  rating: filmLabRatingSchema.optional()
});

export const updateFilmLabRequestSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  defaultProcesses: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
  rating: filmLabRatingSchema.nullable().optional()
});

export const listFilmLabsQuerySchema = z.object({
  q: z.string().optional().default(''),
  includeInactive: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100)
});

export type FilmLab = z.infer<typeof filmLabSchema>;
export type CreateFilmLabRequest = z.infer<typeof createFilmLabRequestSchema>;
export type UpdateFilmLabRequest = z.infer<typeof updateFilmLabRequestSchema>;
export type ListFilmLabsQuery = z.infer<typeof listFilmLabsQuerySchema>;
