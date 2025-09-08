export interface FacsimileApi {
  date_created: string | null;
  date_modified: string | null;
  date_published_externally: string | null;
  deleted: number;
  description: string | null;
  external_url: string | null;
  first_page: number | null;
  folder_path: string | null;
  genre: string | null;
  id: number;
  language: string | null;
  last_page: number | null;
  legacy_id: string | null;
  name: string | null;
  number_of_pages: number | null;
  original_filename: string | null;
  original_publication_date: string | null;
  page_comment: string | null;
  page_nr: number | null;
  priority: number | null;
  publication_collection_id: number | null;
  publication_comment_id: number | null;
  publication_facsimile_collection_id: number | null;
  publication_facsimile_id: number;
  publication_group_id: number | null;
  publication_id: number | null;
  publication_manuscript_id: number | null;
  publication_version_id: number | null;
  published: number | null;
  published_by: string | null;
  section_id: number | null;
  start_page_number: number | null;
  start_url: string | null;
  title: string | null;
  type: number | null;
  zts_id: number | string | null;
}

export interface Facsimile {
  content: string;
  facsimile_id: number;
  id: number;
  images: any[];
  itemId: string | null;
  manuscript_id: number | null;
  number_of_pages: number;
  page: number;
  page_nr: number;
  pre_page_count: number;
  priority: number;
  publication_facsimile_collection_id: number | null;
  title: string;
  type: number | null;
  zoom: number;
  zoomedImages: any[];
}

export interface ExternalFacsimile {
  priority: number;
  title: string;
  url: string | null;
}

export const toFacsimile = (f: FacsimileApi): Facsimile => ({
  content: '',
  facsimile_id: f.publication_facsimile_id,
  id: f.id,
  images: [],
  itemId: null,
  manuscript_id: f.publication_manuscript_id,
  number_of_pages: f.number_of_pages || 0,
  page: (f.start_page_number || 0) + (f.page_nr || 0),
  page_nr: f.page_nr || 0,
  pre_page_count: f.start_page_number || 0,
  priority: f.priority || 1,
  publication_facsimile_collection_id: f.publication_facsimile_collection_id,
  title: f.title ?? '',
  type: f.type,
  zoom: 1,
  zoomedImages: [],
});

export const toExternalFacsimile = (f: FacsimileApi): ExternalFacsimile => ({
  priority: f.priority || 1,
  title: f.title ?? f.external_url ?? '',
  url: f.external_url,
});
