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

export interface FacsimileMetadataApiResponse {
  archive_info?: string | null;
  description?: string | null;
  external_url?: string | null;
  facs_coll_id?: number | null;
  facsimile_title?: string | null;
  image_number_info?: string | null;
  number_of_images?: number | null;
  page_nr?: number | null;
  priority?: number | null;
  publication_manuscript_id?: number | null;
  publication_variant_id?: number | null;
  section_id?: string | null;
  title?: string | null;
  [key: string]: unknown;
}

export interface FacsimileMetadata {
  archive_info: string | null;
  external_url: string | null;
  facs_coll_id: number | null;
  facsimile_title: string | null;
  image_number_info: string | null;
  number_of_images: number | null;
  priority: number | null;
}

export interface TranslationMetadata {
  translated_into: string | null;
  translators: string[] | null;
}

export interface PublicationMetadataApiResponse {
  author?: string[] | null;
  collection_id?: number | null;
  collection_title?: string | null;
  document_type?: string | null;
  facsimiles?: FacsimileMetadataApiResponse[] | null;
  id?: string | number | null;
  keywords?: string | null;
  licence?: string | null;
  licence_url?: string | null;
  manuscript_id?: number | null;
  original_language?: string | null;
  phys_description?: string | null;
  phys_dimensions?: string | null;
  publication_date?: string | null;
  publication_genre?: string | null;
  publication_language?: string | null;
  publication_subtitle?: string | null;
  publication_title?: string | null;
  published_by?: string | null;
  recipient?: string[] | null;
  sender?: string[] | null;
  source_archive?: string | null;
  source_bibl?: string | null;
  translations?: TranslationMetadata[] | null;
  [key: string]: unknown;
}

export interface PublicationMetadata {
  author: string[];
  collection_id: number | null;
  collection_title: string | null;
  document_type: string | null;
  facsimiles: FacsimileMetadata[];
  id: string | null;
  keywords: string | null;
  licence: string | null;
  licence_url: string | null;
  manuscript_id: number | null;
  original_language: string | null;
  phys_description: string | null;
  phys_dimensions: string | null;
  publication_date: string | null;
  publication_genre: string | null;
  publication_language: string | null;
  publication_subtitle: string | null;
  publication_title: string | null;
  published_by: string | null;
  recipient: string[];
  sender: string[];
  source_archive: string | null;
  source_bibl: string | null;
  translations: TranslationMetadata[];
}

export interface ReferenceData {
  intro_reference_text: string | null;
  reference_text: string | null;
  urn: string | null;
}

export interface ReferenceDataApiResponse {
  date_created?: string | null;
  date_modified?: string | null;
  deleted?: number | null;
  id?: number | null;
  intro_reference_text?: string | null;
  legacy_id?: string | null;
  project_id?: number | null;
  reference_text?: string | null;
  url?: string | null;
  urn?: string | null;
  [key: string]: unknown;
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

export const toFacsimileMetadata = (
  f: FacsimileMetadataApiResponse
): FacsimileMetadata => ({
  archive_info: f.archive_info ?? null,
  external_url: f.external_url ?? null,
  facs_coll_id: f.facs_coll_id ?? null,
  facsimile_title: f.facsimile_title ?? null,
  image_number_info: f.image_number_info ?? null,
  number_of_images: f.number_of_images ?? null,
  priority: f.priority ?? null,
});

export const toPublicationMetadata = (
  m: PublicationMetadataApiResponse
): PublicationMetadata => ({
  author: m.author ?? [],
  collection_id: m.collection_id ?? null,
  collection_title: m.collection_title ?? null,
  document_type: m.document_type ?? null,
  facsimiles: (m.facsimiles ?? []).map(toFacsimileMetadata),
  id: m.id == null ? null : String(m.id),
  keywords: m.keywords ?? null,
  licence: m.licence ?? null,
  licence_url: m.licence_url ?? null,
  manuscript_id: m.manuscript_id ?? null,
  original_language: m.original_language ?? null,
  phys_description: m.phys_description ?? null,
  phys_dimensions: m.phys_dimensions ?? null,
  publication_date: m.publication_date ?? null,
  publication_genre: m.publication_genre ?? null,
  publication_language: m.publication_language ?? null,
  publication_subtitle: m.publication_subtitle ?? null,
  publication_title: m.publication_title ?? null,
  published_by: m.published_by ?? null,
  recipient: m.recipient ?? [],
  sender: m.sender ?? [],
  source_archive: m.source_archive ?? null,
  source_bibl: m.source_bibl ?? null,
  translations: m.translations ?? []
});

export const toReferenceData = (
  r: ReferenceDataApiResponse
): ReferenceData => ({
  intro_reference_text: r.intro_reference_text ?? null,
  reference_text: r.reference_text ?? null,
  urn: r.urn ?? null
});
