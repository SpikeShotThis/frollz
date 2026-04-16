import { z } from 'zod'

export const Tag = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format',
  }),
  description: z.string().nonempty(),
})

export type Tag = z.infer<typeof Tag>
