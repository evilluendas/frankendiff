/**
 * Preprocessing pipeline. Run with:
 *   npm run preprocess
 *
 * Reads:  content/raw/{1818,1831}.md
 *         content/edition-alignment.json
 *         content/alignment-overrides.json
 *         content/diff-units.json
 * Writes: content/processed/chapters.json
 *         content/processed/ch{slug}.json
 */

import fs from 'fs'
import path from 'path'
import { parseMarkdown, sectionsToParagraphs, ParsedSection } from './parse'
import { alignAllChapters, loadDiffUnits } from './align'
import { computePairDiffs } from './diff'
import { Edition, EDITIONS, ChapterMeta, BookParagraph, rowText } from '../lib/types'

const ROOT        = path.resolve(process.cwd())
const RAW_DIR     = path.join(ROOT, 'content', 'raw')
const OUT_DIR     = path.join(ROOT, 'content', 'processed')
const CONTENT_DIR = path.join(ROOT, 'content')

const ROMAN_NUMERALS = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
                        'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX',
                        'XXI','XXII','XXIII','XXIV','XXV']

function toRoman(n: number): string {
  return ROMAN_NUMERALS[n - 1] ?? String(n)
}

/** Load content/edition-alignment.json — maps 1818 volume slugs to canonical slugs. */
function loadEditionAlignment(): Record<string, string> {
  const p = path.join(CONTENT_DIR, 'edition-alignment.json')
  if (!fs.existsSync(p)) return {}
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, string>
  } catch {
    return {}
  }
}

/** "Chapter I" + "Chapter II" → "Chapters I–II"; anything else is joined with " / ". */
function joinSectionLabels(labels: string[]): string {
  const nums = labels.map((l) => l.match(/^Chapter\s+(\S+)$/)?.[1])
  if (labels.length > 1 && nums.every(Boolean)) {
    return `Chapters ${nums[0]}–${nums[nums.length - 1]}`
  }
  return labels.join(' / ')
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const editionAlignment = loadEditionAlignment()

  // ── 1. Parse all editions ─────────────────────────
  const sectionsByEdition: Partial<Record<Edition, ParsedSection[]>> = {}
  const paragraphsByEdition: Partial<Record<Edition, BookParagraph[]>> = {}

  for (const edition of EDITIONS) {
    const file = path.join(RAW_DIR, `${edition}.md`)
    if (!fs.existsSync(file)) {
      console.warn(`  ⚠  Missing ${edition}.md — skipping`)
      continue
    }
    const raw = fs.readFileSync(file, 'utf-8')
    const sections = parseMarkdown(raw)
    sectionsByEdition[edition] = sections
    paragraphsByEdition[edition] = sectionsToParagraphs(sections, edition)
    console.log(
      `  ✓  Parsed ${edition}: ${sections.length} sections, ` +
      `${paragraphsByEdition[edition]!.length} paragraphs`,
    )
  }

  // ── 2. Align paragraphs across editions ───────────
  const chapterMap = alignAllChapters(
    sectionsByEdition,
    paragraphsByEdition,
    CONTENT_DIR,
  )
  console.log(`  ✓  Aligned ${chapterMap.size} chapters`)

  // ── 3. Compute diffs for each aligned group ────────
  for (const groups of chapterMap.values()) {
    for (const group of groups) {
      group.diffs = computePairDiffs({
        '1818': rowText(group, '1818'),
        '1831': rowText(group, '1831'),
      })
    }
  }
  console.log(`  ✓  Diffs computed`)

  // ── 4. Build ChapterMeta index ────────────────────
  // labelsByEdition accumulates per-edition display labels keyed by canonical slug
  const slugMeta = new Map<string, {
    title: string
    order: number
    editions: Set<Edition>
    labelsByEdition: Partial<Record<Edition, string>>
  }>()

  for (const [edition, sections] of Object.entries(sectionsByEdition)) {
    for (const section of sections as ParsedSection[]) {
      // Remap 1818 volume-chapter slugs to canonical equivalents
      const canonical = (edition === '1818' && editionAlignment[section.slug])
        ? editionAlignment[section.slug]
        : section.slug

      // Compute the canonical sort order from the canonical slug, not the
      // edition-specific one (avoids v2-1 → order 201 for canonical slug "8")
      const canonicalOrder = (() => {
        const n = parseInt(canonical, 10)
        if (!isNaN(n)) return n
        if (canonical === 'cover') return -4
        if (canonical === 'introduction') return -3
        if (canonical === 'preface') return -2
        if (canonical.startsWith('letter')) return -1
        if (canonical === 'walton-in-continuation') return 1000
        return section.order
      })()

      if (!slugMeta.has(canonical)) {
        slugMeta.set(canonical, {
          title: section.title,
          order: canonicalOrder,
          editions: new Set(),
          labelsByEdition: {},
        })
      }

      const meta = slugMeta.get(canonical)!
      meta.editions.add(edition as Edition)
      // Prefer 1831 title as the canonical display title (continuous numbering)
      if (edition === '1831') {
        meta.title = section.title
      }

      // Build a human-readable label for this edition
      const isVolumeChapter = /^v\d+-\d+$/.test(section.slug)
      if (edition === '1818' && section.volume !== undefined && isVolumeChapter) {
        // Volume-structured 1818 chapter: "Volume II, Chapter I"
        const chapNum = parseInt(section.slug.split('-')[1], 10)
        meta.labelsByEdition['1818'] =
          `Volume ${toRoman(section.volume)}, Chapter ${toRoman(chapNum)}`
      } else {
        // Shared sections (letters, walton) or 1831 chapters — use title as-is
        meta.labelsByEdition[edition as Edition] = section.title
      }
    }
  }

  const chapters: ChapterMeta[] = Array.from(slugMeta.entries())
    .map(([slug, meta]) => {
      const ch: ChapterMeta = {
        slug,
        order: meta.order,
        title: meta.title,
        editions: Array.from(meta.editions).sort(),
      }
      // Only include labelsByEdition when the two editions have different labels
      const labels = meta.labelsByEdition
      if (labels['1818'] !== labels['1831']) {
        ch.labelsByEdition = labels
      }
      return ch
    })
    .sort((a, b) => a.order - b.order)

  // ── 4b. Diff units ────────────────────────────────
  // A unit page compares one chapter against several sections of the other
  // edition; the absorbed sections point back to the unit for the Diff view
  // (they keep their own Read pages).
  const chapterBySlug = new Map(chapters.map((c) => [c.slug, c]))
  for (const [unitSlug, perEdition] of Object.entries(loadDiffUnits(CONTENT_DIR))) {
    const unit = chapterBySlug.get(unitSlug)
    if (!unit) {
      console.warn(`  ⚠  diff-units.json: unknown unit slug "${unitSlug}" — ignored`)
      continue
    }
    for (const [edition, sections] of Object.entries(perEdition) as [Edition, string[]][]) {
      const missing = sections.filter((s) => !chapterBySlug.get(s)?.editions.includes(edition))
      if (missing.length) {
        console.warn(`  ⚠  diff-units.json: unit "${unitSlug}" lists ${edition} section(s) ${missing.join(', ')} that do not exist in that edition — ignored`)
        continue
      }
      unit.unitSections = { ...(unit.unitSections ?? {}), [edition]: sections }
      unit.diffLabelsByEdition = {
        ...(unit.diffLabelsByEdition ?? {}),
        [edition]: joinSectionLabels(sections.map((s) => slugMeta.get(s)!.labelsByEdition[edition] ?? chapterBySlug.get(s)!.title)),
      }
      for (const s of sections) {
        if (s !== unitSlug) chapterBySlug.get(s)!.diffUnit = unitSlug
      }
    }
    console.log(`  ✓  Diff unit ${unitSlug}: ` + Object.entries(perEdition).map(([e, s]) => `${e} ${s!.join('+')}`).join(', '))
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'chapters.json'),
    JSON.stringify(chapters, null, 2),
  )
  console.log(`  ✓  Wrote chapters.json (${chapters.length} chapters)`)

  // ── 5. Write per-chapter JSON files ───────────────
  for (const [slug, groups] of chapterMap) {
    const outFile = path.join(OUT_DIR, `ch${slug}.json`)
    fs.writeFileSync(outFile, JSON.stringify(groups, null, 2))
  }
  console.log(`  ✓  Wrote ${chapterMap.size} chapter files to ${OUT_DIR}`)

  console.log('\nPreprocessing complete.\n')
}

main()
