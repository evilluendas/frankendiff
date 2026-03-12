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

interface AlignmentOverride {
  alignmentKey: string
  edition: Edition
  paragraphIndex: number
}

function loadOverrides(contentRoot: string): AlignmentOverride[] {
  const p = path.join(contentRoot, 'alignment-overrides.json')
  if (!fs.existsSync(p)) return []
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as AlignmentOverride[]
  } catch {
    return []
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
  overrides: AlignmentOverride[],
): AlignedParagraphGroup[] {
  // Build a lookup for overrides keyed by alignmentKey + edition
  const overrideMap = new Map<string, number>()
  for (const o of overrides) {
    overrideMap.set(`${o.alignmentKey}|${o.edition}`, o.paragraphIndex)
  }

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
      const overrideIdx = overrideMap.get(`${alignmentKey}|${edition}`)
      const idx = overrideIdx !== undefined ? overrideIdx : i
      if (idx < edParas.length) {
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
  const overrides = loadOverrides(contentRoot)
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
