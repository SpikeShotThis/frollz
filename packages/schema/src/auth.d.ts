import { z } from 'zod';
export declare const registerRequestSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const loginRequestSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const refreshRequestSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const tokenPairSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const currentUserSchema: z.ZodObject<{
    id: z.ZodNumber;
    email: z.ZodEmail;
    name: z.ZodString;
    createdAt: z.ZodISODateTime;
}, z.core.$strip>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
//# sourceMappingURL=auth.d.ts.map