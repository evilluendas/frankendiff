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

/**
 * Marks that a paragraph of an edition in a row opens a new section
 * (chapter) of that edition. Only present inside diff units that span
 * several sections of one edition (see content/diff-units.json).
 */
export interface SectionStart {
  slug: string        // canonical slug of the section that begins here, e.g. "2"
  label: string       // its heading, e.g. "Chapter II"
  afterLabel: string  // heading of the section that ends here, e.g. "Chapter I"
  paragraphId: string // id of the paragraph that opens the section
}

/**
 * One row of the aligned text: the paragraphs of each edition that are read
 * against each other. A row usually holds one paragraph per edition; it
 * holds several when one edition split a paragraph the other kept whole (or
 * merged two), so the whole passage is diffed as one and the paragraph break
 * shows up inside the diff. Paragraphs are never split or reworded — only
 * grouped. A row missing an edition is edition-only.
 */
export interface AlignedParagraphGroup {
  chapter: string      // slug
  paragraphIndex: number
  alignmentKey: string // stable key, e.g. "ch1-p3" — overridable later
  paragraphs: Partial<Record<Edition, BookParagraph[]>>
  // Keyed by "editionA_editionB", e.g. "1818_1831"
  diffs: Partial<Record<string, DiffOp[]>>
  sectionStart?: Partial<Record<Edition, SectionStart>>
}

/** Separates the paragraphs of a row when they are diffed as one text. */
export const PARAGRAPH_BREAK = '\n\n'

/** The text of a row for one edition: its paragraphs joined by PARAGRAPH_BREAK. */
export function rowText(group: AlignedParagraphGroup, edition: Edition): string | undefined {
  const paras = group.paragraphs[edition]
  if (!paras?.length) return undefined
  return paras.map((p) => p.text).join(PARAGRAPH_BREAK)
}

export interface ChapterMeta {
  slug: string         // URL param, e.g. "1", "preface"
  order: number        // sort key
  title: string
  editions: Edition[]
  /** Per-edition display label, e.g. { '1818': 'Volume II, Chapter I', '1831': 'Chapter VIII' } */
  labelsByEdition?: Partial<Record<Edition, string>>
  /**
   * Diff units. A chapter whose diff is shown as part of another chapter's
   * page carries `diffUnit` (the slug of that page). The unit page itself
   * carries `unitSections` — the sections each edition contributes, in order
   * — and `diffLabelsByEdition` for headings such as "Chapters I–II".
   */
  diffUnit?: string
  unitSections?: Partial<Record<Edition, string[]>>
  diffLabelsByEdition?: Partial<Record<Edition, string>>
}
