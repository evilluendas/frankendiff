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
 */

import { AlignedParagraphGroup, BookParagraph, Edition } from '../lib/types'
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

  // Find the maximum paragraph count across all editions for this chapter
  const editions = Object.keys(paragraphsByEdition) as Edition[]
  const maxLen = Math.max(
    0,
    ...editions.map((e) => paragraphsByEdition[e]?.length ?? 0),
  )

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
        // Apply the first matching chapter shift for this edition/row
        const shift = shifts.find((s) => s.edition === edition && i >= s.fromRow)
        idx = shift ? i + shift.shift : i
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

  const result = new Map<string, AlignedParagraphGroup[]>()

  for (const slug of slugSet) {
    const byEdition: Partial<Record<Edition, BookParagraph[]>> = {}
    for (const [edition, paras] of Object.entries(paragraphsByEdition)) {
      if (edition === '1818') {
        // Collect paragraphs from both the canonical slug (shared sections like letters)
        // and any volume-scoped aliases (e.g. "v2-1" for canonical "8")
        const aliases = inverseAlignment.get(slug) ?? new Set<string>()
        byEdition[edition as Edition] = paras.filter(
          (p) => p.chapter === slug || aliases.has(p.chapter),
        )
      } else {
        byEdition[edition as Edition] = paras.filter((p) => p.chapter === slug)
      }
    }
    result.set(slug, alignChapter(slug, byEdition, overrides))
  }

  return result
}
