// Package (e.g. Roll, Sheet, Instant)
export interface Package {
  id: number
  name: string
}

// Format (e.g. 35mm, 120) — belongs to a Package
export interface Format {
  id: number
  packageid: number
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
  formatid: number
  processid: number
  parentId: number | null
  boxImageUrl?: string
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
  tagid: number
}

// FilmTag (replaces RollTag)
export interface FilmTag {
  id: number
  filmId: number
  tagid: number
}

// FilmState (replaces RollStateHistory)
export interface FilmState {
  id: number
  filmId: number
  stateid: number
  date: Date
  note: string | null
  state?: { id: number; name: string }
  metadata: unknown[]
}

// Film (replaces Roll)
export interface Film {
  id: number
  name: string
  emulsionId: number
  expirationDate: Date | null
  parentId: number | null
  transitionprofileId: number
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
