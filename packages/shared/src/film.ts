import { z } from 'zod'

export const FilmListIteam = z.strictObject({
  id: z.int().nonnegative(),
})
