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

  // Collect all chapter slugs across all editions
  const slugSet = new Set<string>()
  for (const sections of Object.values(sectionsByEdition)) {
    for (const s of sections ?? []) slugSet.add(s.slug)
  }

  const result = new Map<string, AlignedParagraphGroup[]>()

  for (const slug of slugSet) {
    const byEdition: Partial<Record<Edition, BookParagraph[]>> = {}
    for (const [edition, paras] of Object.entries(paragraphsByEdition)) {
      byEdition[edition as Edition] = paras.filter((p) => p.chapter === slug)
    }
    result.set(slug, alignChapter(slug, byEdition, overrides))
  }

  return result
}
