import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common.js';
export const registerRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().min(1)
});
export const loginRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(1)
});
export const refreshRequestSchema = z.object({
    refreshToken: z.string().min(1)
});
export const tokenPairSchema = z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1)
});
export const currentUserSchema = z.object({
    id: idSchema,
    email: z.email(),
    name: z.string().min(1),
    createdAt: isoDateTimeSchema
});
//# sourceMappingURL=auth.js.map