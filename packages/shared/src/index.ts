import { z } from 'zod'

// ---------------------------------------------------------------------------
// Reference entities
// ---------------------------------------------------------------------------

// Package (e.g. Roll, Sheet, Instant)
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
  pkg: Package.optional(),
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
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format',
  }),
  description: z.string().nonempty().optional().nullable(),
})
export type Tag = z.infer<typeof Tag>

// ---------------------------------------------------------------------------
// Emulsion
// ---------------------------------------------------------------------------

export const Emulsion = z.strictObject({
  id: z.int().nonnegative(),
  brand: z.string().nonempty(),
  manufacturer: z.string().nonempty(),
  speed: z.int().nonnegative(),
  formatId: z.int().nonnegative(),
  processId: z.int().nonnegative(),
  parentId: z.int().nonnegative().optional().nullable(),
  boxImageMimeType: z.string().nonempty().optional(),
  tags: z.array(Tag),
})
export type Emulsion = z.infer<typeof Emulsion>

export const EmulsionTag = z.strictObject({
  id: z.int().nonnegative(),
  emulsionId: z.int().nonnegative(),
  tagId: z.int().nonnegative(),
})
export type EmulsionTag = z.infer<typeof EmulsionTag>

// ---------------------------------------------------------------------------
// Film
// ---------------------------------------------------------------------------

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
  field: FilmStateMetadataField.optional(),
})
export type TransitionStateMetadata = z.infer<typeof TransitionStateMetadata>

export const FilmStateMetadata = z.strictObject({
  id: z.int().nonnegative(),
  filmStateId: z.int().nonnegative(),
  transitionStateMetadataId: z.int().nonnegative(),
  value: z.union([z.string(), z.array(z.string())]).nullable(),
  transitionStateMetadata: TransitionStateMetadata.optional(),
})
export type FilmStateMetadata = z.infer<typeof FilmStateMetadata>

// FilmState.date: the mapper does `new Date(row.date)`, which JSON-serializes
// as a full ISO datetime string, not a date-only string.
export const FilmState = z.strictObject({
  id: z.int().nonnegative(),
  filmId: z.int().nonnegative(),
  stateId: z.int().nonnegative(),
  date: z.iso.datetime(),
  note: z.string().nonempty().nullable(),
  metadata: FilmStateMetadata.array(),
  state: z.strictObject({
    id: z.int().nonnegative(),
    name: z.string().nonempty(),
    metadata: FilmStateMetadata.array().optional(),
  }).optional(),
})
export type FilmState = z.infer<typeof FilmState>

// Film.expirationDate: the mapper does `new Date(row.expiration_date)`, which
// JSON-serializes as a full ISO datetime string.
export const Film = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
  emulsionId: z.int().nonnegative(),
  expirationDate: z.iso.datetime().nullable(),
  parentId: z.int().nonnegative().nullable(),
  transitionProfileId: z.int().nonnegative(),
  emulsion: Emulsion,
  tags: Tag.array(),
  states: FilmState.array(),
})
export type Film = z.infer<typeof Film>

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export const CameraStatus = z.enum(['active', 'retired', 'in_repair'])
export type CameraStatus = z.infer<typeof CameraStatus>

export const CameraAcceptedFormat = z.strictObject({
  id: z.int().nonnegative(),
  cameraId: z.int().nonnegative(),
  formatId: z.int().nonnegative(),
  format: Format.optional(),
})
export type CameraAcceptedFormat = z.infer<typeof CameraAcceptedFormat>

// Camera.createdAt/updatedAt/acquiredAt: Date objects from DB, stringified to
// full ISO datetime in the mapper before being transmitted over the wire.
export const Camera = z.strictObject({
  id: z.int().nonnegative(),
  brand: z.string().nonempty(),
  model: z.string().nonempty(),
  status: CameraStatus,
  acceptedFormats: z.array(CameraAcceptedFormat),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  notes: z.string().optional(),
  serialNumber: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  acquiredAt: z.iso.datetime().optional(),
})
export type Camera = z.infer<typeof Camera>

// ---------------------------------------------------------------------------
// Transition workflow
// ---------------------------------------------------------------------------

export const TransitionProfile = z.strictObject({
  id: z.int().nonnegative(),
  name: z.string().nonempty(),
})
export type TransitionProfile = z.infer<typeof TransitionProfile>

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

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Input schemas — request bodies for create / update operations
// These replace class-validator DTOs in the API. The `Input` suffix prevents
// name collisions with the response schemas above.
// ---------------------------------------------------------------------------

// Film inputs
export const CreateFilmInput = z.strictObject({
  name: z.string().nonempty(),
  emulsionId: z.int().positive(),
  expirationDate: z.iso.datetime().nullable().optional(),
  parentId: z.int().positive().optional(),
  transitionProfileId: z.int().positive(),
  metadata: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
})
export type CreateFilmInput = z.infer<typeof CreateFilmInput>

export const UpdateFilmInput = z.strictObject({
  name: z.string().nonempty().optional(),
  emulsionId: z.int().positive().optional(),
  expirationDate: z.iso.datetime().nullable().optional(),
  transitionProfileId: z.int().positive().optional(),
})
export type UpdateFilmInput = z.infer<typeof UpdateFilmInput>

export const TransitionFilmInput = z.strictObject({
  targetStateName: z.string().nonempty(),
  date: z.iso.datetime().optional(),
  note: z.string().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
})
export type TransitionFilmInput = z.infer<typeof TransitionFilmInput>

// Camera inputs
export const CreateCameraInput = z.strictObject({
  brand: z.string().nonempty(),
  model: z.string().nonempty(),
  status: CameraStatus,
  notes: z.string().optional(),
  serialNumber: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  acquiredAt: z.iso.datetime().optional(),
  supportedFormatIds: z.array(z.int().positive()).optional(),
})
export type CreateCameraInput = z.infer<typeof CreateCameraInput>

export const UpdateCameraInput = z.strictObject({
  brand: z.string().nonempty().optional(),
  model: z.string().nonempty().optional(),
  status: CameraStatus.optional(),
  notes: z.string().optional(),
  serialNumber: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  acquiredAt: z.iso.datetime().optional(),
  supportedFormatIds: z.array(z.int().positive()).optional(),
})
export type UpdateCameraInput = z.infer<typeof UpdateCameraInput>

// Emulsion inputs
export const CreateEmulsionInput = z.strictObject({
  brand: z.string().nonempty(),
  manufacturer: z.string().nonempty(),
  speed: z.int().positive(),
  processId: z.int().positive(),
  formatId: z.int().positive(),
  parentId: z.int().positive().optional(),
})
export type CreateEmulsionInput = z.infer<typeof CreateEmulsionInput>

export const UpdateEmulsionInput = z.strictObject({
  brand: z.string().nonempty().optional(),
  manufacturer: z.string().nonempty().optional(),
  speed: z.int().positive().optional(),
  processId: z.int().positive().optional(),
  formatId: z.int().positive().optional(),
  parentId: z.int().positive().optional(),
})
export type UpdateEmulsionInput = z.infer<typeof UpdateEmulsionInput>

export const CreateEmulsionMultipleFormatsInput = z.strictObject({
  brand: z.string().nonempty(),
  manufacturer: z.string().nonempty(),
  speed: z.int().positive(),
  processId: z.int().positive(),
  formatIds: z.array(z.int().positive()).min(1),
  parentId: z.int().positive().optional(),
})
export type CreateEmulsionMultipleFormatsInput = z.infer<typeof CreateEmulsionMultipleFormatsInput>

// Tag inputs
export const CreateTagInput = z.strictObject({
  name: z.string().nonempty(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format',
  }),
  description: z.string().optional(),
})
export type CreateTagInput = z.infer<typeof CreateTagInput>

export const UpdateTagInput = z.strictObject({
  name: z.string().nonempty().optional(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  description: z.string().optional(),
})
export type UpdateTagInput = z.infer<typeof UpdateTagInput>

export const AddTagInput = z.strictObject({
  tagId: z.int().positive(),
})
export type AddTagInput = z.infer<typeof AddTagInput>

// Format inputs
export const CreateFormatInput = z.strictObject({
  packageId: z.int().positive(),
  name: z.string().nonempty(),
})
export type CreateFormatInput = z.infer<typeof CreateFormatInput>

export const UpdateFormatInput = z.strictObject({
  packageId: z.int().positive().optional(),
  name: z.string().nonempty().optional(),
})
export type UpdateFormatInput = z.infer<typeof UpdateFormatInput>
