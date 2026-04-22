import { z } from 'zod';
export declare const idSchema: z.ZodNumber;
export declare const codeSchema: z.ZodString;
export declare const labelSchema: z.ZodString;
export declare const isoDateTimeSchema: z.ZodISODateTime;
export declare const nullableTextSchema: z.ZodNullable<z.ZodString>;
export declare const emptyObjectSchema: z.ZodObject<{}, z.core.$strict>;
export type Id = z.infer<typeof idSchema>;
//# sourceMappingURL=common.d.ts.map