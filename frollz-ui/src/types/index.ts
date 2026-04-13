// Package (e.g. Roll, Sheet, Instant)
export interface Package {
  id: number
  name: string
}

// Format (e.g. 35mm, 120) — belongs to a Package
export interface Format {
  id: number
  packageId: number
  name: string
  package?: Package
}

// Process (e.g. C-41, E-6)
export interface Process {
  id: number
  name: string
}

// Emulsion (replaces Stock)
export interface Emulsion {
  id: number
  name: string
  brand: string
  manufacturer: string
  speed: number
  formatId: number
  processId: number
  parentId: number | null
  boxImageMimeType: string | null
  tags: Tag[]
}

// Tag
export interface Tag {
  id: number
  name: string
  colorCode: string
  description: string | null
}

// EmulsionTag (replaces StockTag)
export interface EmulsionTag {
  id: number
  emulsionId: number
  tagId: number
}

// FilmTag (replaces RollTag)
export interface FilmTag {
  id: number
  filmId: number
  tagId: number
}

export interface FilmStateMetadataField {
  id: number
  name: string
  fieldType: string
  allowMultiple: boolean
}

export interface FilmStateMetadata {
  id: number
  filmStateId: number
  transitionStateMetadataId: number
  value: string | string[] | null
  transitionStateMetadata?: {
    id: number
    fieldId: number
    transitionStateId: number
    defaultValue: string | null
    field?: FilmStateMetadataField
  }
}

// FilmState (replaces RollStateHistory)
export interface FilmState {
  id: number
  filmId: number
  stateId: number
  date: Date
  note: string | null
  state?: { id: number; name: string }
  metadata: FilmStateMetadata[]
}

// Film (replaces Roll)
export interface Film {
  id: number
  name: string
  emulsionId: number
  expirationDate: Date | null
  parentId: number | null
  transitionProfileId: number
  emulsion?: Emulsion
  tags: Tag[]
  states: FilmState[]
  parent?: Film
}

// Transition profile
export interface TransitionProfile {
  id: number
  name: string
}

// Transition graph
export interface TransitionMetadataField {
  field: string
  fieldType: string
  allowMultiple: boolean
  defaultValue: string | null
  isRequired: boolean
}

export interface TransitionEdge {
  id: number
  fromState: string
  toState: string
  metadata: TransitionMetadataField[]
}

export interface TransitionGraph {
  states: string[]
  transitions: TransitionEdge[]
}

// Helpers — derive current state name from Film.states
export function currentStateName(film: Film): string {
  if (!film.states?.length) return ''
  const sorted = [...film.states].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  return sorted[0]?.state?.name ?? ''
}

// Helpers — collect all scan URLs stored in film state metadata
export function getScanUrls(film: Film): string[] {
  const urls: string[] = []
  for (const state of film.states ?? []) {
    for (const m of state.metadata ?? []) {
      if (m.transitionStateMetadata?.field?.name === 'scansUrl' && Array.isArray(m.value)) {
        urls.push(...m.value)
      }
    }
  }
  // deduplicate while preserving order
  return [...new Set(urls)]
}
