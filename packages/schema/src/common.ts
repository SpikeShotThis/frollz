import { z } from 'zod';

export const idSchema = z.number().int().positive();
export const codeSchema = z.string().min(1);
export const labelSchema = z.string().min(1);
export const isoDateTimeSchema = z.iso.datetime();
export const nullableTextSchema = z.string().nullable();
export const emptyObjectSchema = z.object({}).strict();

export type Id = z.infer<typeof idSchema>;
