export interface FilmRow {
  id: number;
  name: string;
  parent_id: number | null;
  emulsion_id: number;
  expiration_date: Date;
  transition_profile_id: number;
}

export interface EmulsionRow {
  id: number;
  parent_id: number | null;
  process_id: number;
  format_id: number;
  name: string;
  brand: string;
  manufacturer: string;
  speed: number;
}

export interface FilmStateRow {
  id: number;
  film_id: number;
  state_id: number;
  date: Date;
  note: string | null;
}

export interface FilmStateMetadataRow {
  id: number;
  film_state_id: number;
  transition_state_metadata_id: number;
  value: string | null;
}

export interface FilmTagRow {
  id: number;
  film_id: number;
  tag_id: number;
}

export interface EmulsionTagRow {
  id: number;
  emulsion_id: number;
  tag_id: number;
}

export interface TagRow {
  id: number;
  name: string;
  color_code: string;
  description: string | null;
}

export interface FormatRow {
  id: number;
  package_id: number;
  name: string;
}

export interface PackageRow {
  id: number;
  name: string;
}

export interface ProcessRow {
  id: number;
  name: string;
}

export interface TransitionRuleRow {
  id: number;
  from_state_id: number;
  to_state_id: number;
  profile_id: number;
}

export interface TransitionStateRow {
  id: number;
  name: string;
}

export interface TransitionStateMetadataRow {
  id: number;
  field_id: number;
  transition_state_id: number;
  default_value: string | null;
}

export interface TransitionMetadataFieldRow {
  id: number;
  name: string;
  field_type: string;
  allow_multiple: boolean;
}

export interface TransitionProfileRow {
  id: number;
  name: string;
}
