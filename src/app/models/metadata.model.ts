export interface CorrespondenceMetadataApiResponse {
  letter: LetterDataApiResponse;
  subjects: CorrespondentDataApiResponse[];
}

export interface CorrespondenceMetadata {
  letter: LetterData;
  subjects: CorrespondentData[];
}

export interface LetterDataApiResponse {
  correspondence_collection_id: number | null;
  correspondence_collection_id_legacy: number | null;
  date_created: string | null;
  date_modified: string | null;
  date_sent: string | null;
  deleted: number | null;
  description: string | null;
  full_name: string | null;
  id: number | null;
  language: string | null;
  leaf_count: string | null;
  legacy_id: string | null;
  material: string | null;
  material_color: string | null;
  material_format: string | null;
  material_notes: string | null;
  material_pattern: string | null;
  material_quality: string | null;
  material_source: string | null;
  material_state: string | null;
  material_type: string | null;
  page_count: string | null;
  project_id: number | null;
  sheet_count: string | null;
  source_archive: string | null;
  source_collection_id: string | null;
  source_id: string | number | null;
  subject_id: number | null;
  title: string | null;
  type: string | null;
}

export interface LetterData {
  correspondence_collection_id: number | null;
  correspondence_collection_id_legacy: number | null;
  date_created: string | null;
  date_modified: string | null;
  date_sent: string | null;
  deleted: number | null;
  description: string | null;
  full_name: string | null;
  id: number | null;
  language: string | null;
  leaf_count: string | null;
  legacy_id: string | null;
  material: string | null;
  material_color: string | null;
  material_format: string | null;
  material_notes: string | null;
  material_pattern: string | null;
  material_quality: string | null;
  material_source: string | null;
  material_state: string | null;
  material_type: string | null;
  page_count: string | null;
  project_id: number | null;
  sheet_count: string | null;
  source_archive: string | null;
  source_collection_id: string | null;
  source_id: string | number | null;
  subject_id: number | null;
  title: string | null;
  type: string | null;
}

export interface CorrespondentDataApiResponse {
  id: number;
  avsändare?: string | null;
  mottagare?: string | null;
}

export interface CorrespondentData {
  id: number;
  sender?: string | null;
  receiver?: string | null;
}

export const toCorrespondent = (
  c: CorrespondentDataApiResponse
): CorrespondentData => ({
  id: c.id,
  sender: c.avsändare ?? null,
  receiver: c.mottagare ?? null,
});

export const toCorrespondenceMetadata = (
  api: CorrespondenceMetadataApiResponse
): CorrespondenceMetadata => ({
  // Letter can be passed directly because types match
  letter: { ...api.letter },

  // Subjects need mapping
  subjects: api.subjects.map(toCorrespondent),
});
