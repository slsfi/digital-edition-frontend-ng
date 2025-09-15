import { Illustration } from '@models/illustration.models';

export type TextKey = Readonly<{
  collectionID: string;
  publicationID: string;
  chapterID?: string;
  textItemID: string;
}>;

// Valid view types
export type ViewType =
  | 'readingtext'
  | `readingtext_${string}`
  | 'comments'
  | 'facsimiles'
  | 'manuscripts'
  | 'variants'
  | 'illustrations'
  | 'legend'
  | 'metadata';

// Template-literal UID: "v1", "v2", ...
export type ViewUid = `v${number}`;

/**
 * One entry in the `views` array.
 * 
 * Notes:
 * - `uid` is optional in memory but should be present after normalization (e.g. via ensureUids()).
 * - `title` exists in-memory only and is intentionally stripped from the URL.
 * - `id`, `sortOrder`, and `nr` are used by facsimiles/variants etc., but remain optional here.
 */
export interface ViewState {
  type: ViewType;         // required
  uid?: ViewUid | null;   // e.g. "v12"
  id?: number | string;   // backend/entity id (facsimile, ms, variant, …)
  sortOrder?: number;     // used by variants/facsimiles
  nr?: number;            // e.g. facsimile page number
  image?: Illustration | null;
  title?: string;         // used in UI, not serialized to URL
}
