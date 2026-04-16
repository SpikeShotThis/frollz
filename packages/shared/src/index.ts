// Package (e.g. Roll, Sheet, Instant)
import { z } from 'zod'

export const Package = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
})
export type Package = z.infer<typeof Package>

// Format (e.g. 35mm, 120) — belongs to a Package
export const Format = z.strictObject({
  id: z.int().nonnegative(),
  packageId: z.int().nonnegative(),
  name: z.string().nonempty(),
  package: Package.optional(),
})

export type Format = z.infer<typeof Format>

// Process (e.g. C-41, E-6)
export const Process = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
})

export type Process = z.infer<typeof Process>
// Tag
export const Tag = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    {
      message: 'Invalid hex color format',
    }),
  description: z.string().nonempty().optional(),
})
export type Tag = z.infer<typeof Tag>
// Emulsion (replaces Stock)
export const Emulsion = z.strictObject({
  id: z.int().nonnegative(),
  brand: z.string().nonempty(),
  manufacturer: z.string().nonempty(),
  speed: z.int().nonnegative(),
  formatId: z.int().nonnegative(),
  processId: z.int().nonnegative(),
  parentId: z.int().nonnegative().optional(),
  boxImageMimeType: z.string().nonempty().optional(),
  tags: z.array(Tag),
})
export type Emulsion = z.infer<typeof Emulsion>
// EmulsionTag (replaces StockTag)
export const EmulsionTag = z.strictObject({
  id: z.int().nonnegative(),
  emulsionId: z.int().nonnegative(),
  tagId: z.int().nonnegative(),
})
export type EmulsionTag = z.infer<typeof EmulsionTag>
// FilmTag (replaces RollTag)
export const FilmTag = z.strictObject({
  id: z.int().nonnegative(),
  filmId: z.int().nonnegative(),
  tagId: z.int().nonnegative(),
})
export type FilmTag = z.infer<typeof FilmTag>

export const FilmStateMetadataField = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
  fieldType: z.string().nonempty(),
  allowMultiple: z.boolean(),
})
export type FilmStateMetadataField = z.infer<typeof FilmStateMetadataField>

export const TransitionStateMetadata = z.strictObject({
  id: z.int().nonnegative(),
  fieldId: z.int().nonnegative(),
  transitionStateId: z.int().nonnegative(),
  defaultValue: z.string().nullable(),
})

export type TransitionStateMetadata = z.infer<typeof TransitionStateMetadata>

export const FilmStateMetadata = z.strictObject({
  id: z.int().nonnegative(),
  filmStateId: z.int().nonnegative(),
  transitionStateMetadataId: z.int().nonnegative(),
  value: z.union([
    z.string(),
    z.array(z.string()),
  ]).nullable(),

  transitionStateMetadata: TransitionStateMetadata,
})

export type FilmStateMetadata = z.infer<typeof FilmStateMetadata>
// FilmState (replaces RollStateHistory)
export const FilmState = z.strictObject({
  id: z.int().nonnegative(),
  filmId: z.int().nonnegative(),
  stateId: z.int().nonnegative(),
  date: z.iso.date(),
  note: z.string().nonempty().nullable(),
})
export type FilmState = z.infer<typeof FilmState>

// Film (replaces Roll)
export const Film = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
  emulsionId: z.int().nonnegative(),
  expirationDate: z.iso.date().nullable(),
  parentId: z.int().nonnegative().nullable(),
  transitionProfileId: z.int().nonnegative(),
  emulsion: Emulsion,
  tags: Tag.array(),
  states: FilmState.array(),
})

export type Film = z.infer<typeof Film>
// Transition profile
export const TransitionProfile = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
})
export type TransitionProfile = z.infer<typeof TransitionProfile>

// Transition graph
export const TransitionMetadataField = z.strictObject({
  field: z.string().nonempty(),
  fieldType: z.string().nonempty(),
  allowMultiple: z.boolean(),
  defaultValue: z.string().nonempty().nullable(),
  isRequired: z.boolean(),
})
export type TransitionMetadataField = z.infer<typeof TransitionMetadataField>

export const TransitionEdge = z.strictObject({
  id: z.int().nonnegative(),
  fromState: z.string().nonempty(),
  toState: z.string().nonempty(),
  metadata: z.array(TransitionMetadataField),
})
export type TransitionEdge = z.infer<typeof TransitionEdge>

export const TransitionGraph = z.strictObject({
  states: z.string().nonempty().array(),
  transitions: TransitionEdge.array(),
})

export type TransitionGraph = z.infer<typeof TransitionGraph>
// Stats
export const StateCount = z.strictObject({
  state: z.string().nonempty(),
  count: z.int().nonnegative(),
})

export type StateCount = z.infer<typeof StateCount>
export const MonthCount = z.strictObject({
  month: z.string().nonempty(),
  count: z.int().nonnegative(),
})
export type MonthCount = z.infer<typeof MonthCount>
export const EmulsionCount = z.strictObject({
  emulsionName: z.string().nonempty(),
  count: z.int().nonnegative(),
})
export type EmulsionCount = z.infer<typeof EmulsionCount>
export const TransitionDuration = z.strictObject({
  transition: z.string().nonempty(),
  avgDays: z.float32().nonnegative().nullable(),
})
export type TransitionDuration = z.infer<typeof TransitionDuration>
