/**
 * Aligns paragraphs across editions into AlignedParagraphGroup objects.
 *
 * Current strategy: positional — paragraph N in edition A aligns with
 * paragraph N in edition B within the same chapter.
 *
 * To override alignment in the future, create
 *   content/alignment-overrides.json
 * as an array of { alignmentKey, edition, paragraphIndex } entries.
 * The loader here will check for that file and apply overrides before
 * falling back to the positional strategy.
 *
 * Cross-edition slug mapping:
 *   The 1818 source now uses volume-scoped chapter slugs ("v2-1" for
 *   Volume II, Chapter I). content/edition-alignment.json maps these to the
 *   canonical slugs used for navigation and processed JSON filenames
 *   (e.g. "v2-1" → "8"). Sections without an entry (preface, letters,
 *   walton-in-continuation) share the same slug across editions.
 *
 * Diff units:
 *   When one edition split a chapter that the other kept whole, the diff
 *   should compare the whole chapter against all of its pieces at once.
 *   content/diff-units.json lists, per unit slug, the sections each edition
 *   contributes in order, e.g. { "1": { "1831": ["1", "2"] } }. The listed
 *   sections' paragraphs are concatenated before alignment (paragraphs are
 *   never split or altered) and the first paragraph of each later section
 *   is marked with `sectionStart` so the views can show where it begins.
 *   Absorbed sections still get their own processed file for the Read view.
 */

import { AlignedParagraphGroup, BookParagraph, Edition, SectionStart } from '../lib/types'
import { ParsedSection } from './parse'
import fs from 'fs'
import path from 'path'

/** Override the paragraph index used for a specific (row, edition) pair.
 *  Set paragraphIndex to null to leave that edition empty for the row
 *  (useful when one edition has an extra paragraph with no counterpart). */
interface AlignmentOverride {
  alignmentKey: string
  edition: Edition
  paragraphIndex: number | null
}

/** Shift one edition's paragraph index by `shift` for all rows >= fromRow
 *  within a given chapter.  Combine with a rowOverride (paragraphIndex: null)
 *  on the row just before fromRow to create a clean "1818-only" slot. */
interface ChapterShift {
  chapter: string
  edition: Edition
  fromRow: number
  shift: number
}

interface Overrides {
  rowOverrides: AlignmentOverride[]
  chapterShifts: ChapterShift[]
}

function loadOverrides(contentRoot: string): Overrides {
  const p = path.join(contentRoot, 'alignment-overrides.json')
  if (!fs.existsSync(p)) return { rowOverrides: [], chapterShifts: [] }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'))
    // Support legacy format (plain array of row overrides)
    if (Array.isArray(raw)) return { rowOverrides: raw, chapterShifts: [] }
    return {
      rowOverrides: raw.rowOverrides ?? [],
      chapterShifts: raw.chapterShifts ?? [],
    }
  } catch {
    return { rowOverrides: [], chapterShifts: [] }
  }
}

export type DiffUnits = Record<string, Partial<Record<Edition, string[]>>>

/** Load content/diff-units.json — unit slug → sections per edition. */
export function loadDiffUnits(contentRoot: string): DiffUnits {
  const p = path.join(contentRoot, 'diff-units.json')
  if (!fs.existsSync(p)) return {}
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, Record<string, unknown>>
    const units: DiffUnits = {}
    for (const [slug, entry] of Object.entries(raw)) {
      units[slug] = {}
      for (const [key, value] of Object.entries(entry)) {
        if (key === 'note') continue
        if (!Array.isArray(value) || value.length < 2) {
          console.warn(`  ⚠  diff-units.json: unit "${slug}" edition ${key} must list at least two sections — ignored`)
          continue
        }
        units[slug][key as Edition] = value.map(String)
      }
    }
    return units
  } catch {
    return {}
  }
}

/** Load content/edition-alignment.json — maps 1818 volume slugs to canonical slugs. */
function loadEditionAlignment(contentRoot: string): Record<string, string> {
  const p = path.join(contentRoot, 'edition-alignment.json')
  if (!fs.existsSync(p)) return {}
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, string>
  } catch {
    return {}
  }
}

export function alignChapter(
  slug: string,
  paragraphsByEdition: Partial<Record<Edition, BookParagraph[]>>,
  { rowOverrides, chapterShifts }: Overrides,
): AlignedParagraphGroup[] {
  // Build a lookup for row overrides keyed by "alignmentKey|edition"
  // Value is number (use that index) or null (leave this edition empty for the row)
  const overrideMap = new Map<string, number | null>()
  for (const o of rowOverrides) {
    overrideMap.set(`${o.alignmentKey}|${o.edition}`, o.paragraphIndex)
  }

  // Chapter shifts applicable to this chapter
  const shifts = chapterShifts.filter((s) => s.chapter === slug)

  const editions = Object.keys(paragraphsByEdition) as Edition[]

  // Base maxLen: the largest paragraph count across all editions.
  let maxLen = Math.max(
    0,
    ...editions.map((e) => paragraphsByEdition[e]?.length ?? 0),
  )

  // A negative shift pushes an edition's paragraphs to higher display rows.
  // For example, shift=-2 from row 27 means the last paragraph of that edition
  // (say index 32) appears at display row 34 rather than 32.  Extend maxLen so
  // those paragraphs are not silently dropped.
  for (const s of shifts) {
    if (s.shift < 0) {
      const edCount = paragraphsByEdition[s.edition]?.length ?? 0
      if (edCount > 0) {
        // Last paragraph (idx edCount-1) sits at display row (edCount-1) - s.shift
        // (subtracting a negative shift = adding its absolute value).
        const lastDisplayRow = (edCount - 1) - s.shift
        maxLen = Math.max(maxLen, lastDisplayRow + 1)
      }
    }
  }

  const groups: AlignedParagraphGroup[] = []

  for (let i = 0; i < maxLen; i++) {
    const alignmentKey = `ch${slug}-p${i}`
    const group: AlignedParagraphGroup = {
      chapter: slug,
      paragraphIndex: i,
      alignmentKey,
      paragraphs: {},
      diffs: {},
    }

    for (const edition of editions) {
      const edParas = paragraphsByEdition[edition] ?? []
      const rowKey = `${alignmentKey}|${edition}`

      let idx: number | null
      if (overrideMap.has(rowKey)) {
        idx = overrideMap.get(rowKey)!  // may be null (explicit skip)
      } else {
        // Accumulate all chapter shifts that apply to this edition and row.
        // Multiple shifts with different fromRow values stack (e.g. two separate
        // paragraph insertions in the same chapter each contribute −1).
        const totalShift = shifts
          .filter((s) => s.edition === edition && i >= s.fromRow)
          .reduce((acc, s) => acc + s.shift, 0)
        idx = i + totalShift
      }

      if (idx !== null && idx >= 0 && idx < edParas.length) {
        group.paragraphs[edition] = edParas[idx]
      }
    }

    groups.push(group)
  }

  return groups
}

export function alignAllChapters(
  sectionsByEdition: Partial<Record<Edition, ParsedSection[]>>,
  paragraphsByEdition: Partial<Record<Edition, BookParagraph[]>>,
  contentRoot: string,
): Map<string, AlignedParagraphGroup[]> {
  const overrides: Overrides = loadOverrides(contentRoot)
  const editionAlignment = loadEditionAlignment(contentRoot)
  const diffUnits = loadDiffUnits(contentRoot)

  // Build inverse map: canonical slug → set of edition-specific slugs
  // (used to find 1818 paragraphs that live under volume-scoped slugs)
  const inverseAlignment = new Map<string, Set<string>>()
  for (const [edSlug, canonical] of Object.entries(editionAlignment)) {
    if (!inverseAlignment.has(canonical)) {
      inverseAlignment.set(canonical, new Set())
    }
    inverseAlignment.get(canonical)!.add(edSlug)
  }

  // Collect all canonical slugs across all editions
  const slugSet = new Set<string>()
  for (const [edition, sections] of Object.entries(sectionsByEdition)) {
    for (const s of sections ?? []) {
      // Remap 1818 volume-chapter slugs to their canonical equivalents
      const canonical = (edition === '1818' && editionAlignment[s.slug])
        ? editionAlignment[s.slug]
        : s.slug
      slugSet.add(canonical)
    }
  }

  /** Paragraphs of one edition belonging to a canonical section slug. */
  function sectionParagraphs(edition: Edition, canonical: string): BookParagraph[] {
    const paras = paragraphsByEdition[edition] ?? []
    if (edition === '1818') {
      // Collect paragraphs from both the canonical slug (shared sections like letters)
      // and any volume-scoped aliases (e.g. "v2-1" for canonical "8")
      const aliases = inverseAlignment.get(canonical) ?? new Set<string>()
      return paras.filter((p) => p.chapter === canonical || aliases.has(p.chapter))
    }
    return paras.filter((p) => p.chapter === canonical)
  }

  function sectionTitle(edition: Edition, canonical: string): string {
    const sections = sectionsByEdition[edition] ?? []
    const match = sections.find((s) => {
      const c = (edition === '1818' && editionAlignment[s.slug]) ? editionAlignment[s.slug] : s.slug
      return c === canonical
    })
    return match?.title ?? canonical
  }

  const result = new Map<string, AlignedParagraphGroup[]>()

  for (const slug of slugSet) {
    const unit = diffUnits[slug]
    const byEdition: Partial<Record<Edition, BookParagraph[]>> = {}
    for (const edition of Object.keys(paragraphsByEdition) as Edition[]) {
      const sections = unit?.[edition]
      byEdition[edition] = sections
        ? sections.flatMap((sec) => sectionParagraphs(edition, sec))
        : sectionParagraphs(edition, slug)
    }

    const groups = alignChapter(slug, byEdition, overrides)

    // Mark where each later section of a multi-section edition begins.
    if (unit) {
      for (const [edition, sections] of Object.entries(unit) as [Edition, string[]][]) {
        for (let k = 1; k < sections.length; k++) {
          const first = sectionParagraphs(edition, sections[k])[0]
          if (!first) {
            console.warn(`  ⚠  diff-units.json: unit "${slug}" lists ${edition} section "${sections[k]}" which has no paragraphs`)
            continue
          }
          const group = groups.find((g) => g.paragraphs[edition]?.id === first.id)
          if (!group) {
            console.warn(`  ⚠  diff-units.json: first paragraph of ${edition} section "${sections[k]}" is not shown in unit "${slug}" (dropped by an override?)`)
            continue
          }
          const start: SectionStart = {
            slug: sections[k],
            label: sectionTitle(edition, sections[k]),
            afterLabel: sectionTitle(edition, sections[k - 1]),
          }
          group.sectionStart = { ...(group.sectionStart ?? {}), [edition]: start }
        }
      }
    }

    result.set(slug, groups)
  }

  return result
}
