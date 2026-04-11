export interface FilmRow {
  id: string;
  name: string;
  parent_id: string | null;
  emulsion_id: string;
  expiration_date: Date;
}

export interface EmulsionRow {
  id: string;
  parent_id: string | null;
  process_id: string;
  format_id: string;
  name: string;
  brand: string;
  manufacturer: string;
  speed: number;
}

export interface FilmStateRow {
  id: string;
  film_id: string;
  state_id: string;
  date: Date;
  note: string | null;
}

export interface FilmStateMetadataRow {
  id: string;
  film_state_id: string;
  transition_state_metadata_id: string;
}

export interface FilmTagRow {
  id: string;
  film_id: string;
  tag_id: string;
}

export interface EmulsionTagRow {
  id: string;
  emulsion_id: string;
  tag_id: string;
}

export interface TagRow {
  id: string;
  name: string;
  color_code: string;
  description: string | null;
}

export interface FormatRow {
  id: string;
  package_id: string;
  name: string;
}

export interface PackageRow {
  id: string;
  name: string;
}

export interface ProcessRow {
  id: string;
  name: string;
}

export interface TransitionRuleRow {
  id: string;
  from_state_id: string;
  to_state: string;
  profile_id: string;
}

export interface TransitionStateRow {
  id: string;
  name: string;
}

export interface TransitionStateMetadataRow {
  id: string;
  field_id: string;
  transition_state_id: string;
  default_value: string | null;
}

export interface TransitionMetadataFieldRow {
  id: string;
  name: string;
  field_type: string;
}

export interface TransitionProfileRow {
  id: string;
  name: string;
}
