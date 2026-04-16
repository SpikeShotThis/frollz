import { z } from 'zod'

export const ItemRef = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
  url: z.url().nonempty(),
})

export type ItemRef = z.infer<typeof ItemRef>
