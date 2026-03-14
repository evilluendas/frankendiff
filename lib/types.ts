export type Edition = '1818' | '1831'

export const EDITIONS: Edition[] = ['1818', '1831']

export const EDITION_LABELS: Record<Edition, string> = {
  '1818': 'First Edition',
  '1831': 'Revised Edition',
}

export type DiffOpType = 'equal' | 'insert' | 'delete'

export interface DiffOp {
  type: DiffOpType
  text: string
}

/** Structural role of a paragraph, derived from [tag] markers in source. */
export type ParagraphElementType =
  | 'body'
  | 'salutation'
  | 'dateline'
  | 'closing'
  | 'signature'
  | 'poem'
  | 'book-title'

export interface BookParagraph {
  id: string                        // e.g. "1818-ch1-p3"
  edition: Edition
  chapter: string                   // slug, e.g. "1", "preface"
  paragraphIndex: number
  text: string
  elementType: ParagraphElementType
}

export interface AlignedParagraphGroup {
  chapter: string      // slug
  paragraphIndex: number
  alignmentKey: string // stable key, e.g. "ch1-p3" — overridable later
  paragraphs: Partial<Record<Edition, BookParagraph>>
  // Keyed by "editionA_editionB", e.g. "1818_1831"
  diffs: Partial<Record<string, DiffOp[]>>
}

export interface ChapterMeta {
  slug: string         // URL param, e.g. "1", "preface"
  order: number        // sort key
  title: string
  editions: Edition[]
  /** Per-edition display label, e.g. { '1818': 'Volume II, Chapter I', '1831': 'Chapter VIII' } */
  labelsByEdition?: Partial<Record<Edition, string>>
}
