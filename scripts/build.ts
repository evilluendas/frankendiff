/**
 * Preprocessing pipeline. Run with:
 *   npm run preprocess
 *
 * Reads:  content/raw/{1818,1831}.md
 * Writes: content/processed/chapters.json
 *         content/processed/ch{slug}.json
 */

import fs from 'fs'
import path from 'path'
import { parseMarkdown, sectionsToParagraphs, ParsedSection } from './parse'
import { alignAllChapters } from './align'
import { computePairDiffs } from './diff'
import { Edition, EDITIONS, ChapterMeta, AlignedParagraphGroup, BookParagraph } from '../lib/types'

const ROOT = path.resolve(process.cwd())
const RAW_DIR = path.join(ROOT, 'content', 'raw')
const OUT_DIR = path.join(ROOT, 'content', 'processed')

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

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
  const contentRoot = path.join(ROOT, 'content')
  const chapterMap = alignAllChapters(
    sectionsByEdition,
    paragraphsByEdition,
    contentRoot,
  )
  console.log(`  ✓  Aligned ${chapterMap.size} chapters`)

  // ── 3. Compute diffs for each aligned group ────────
  for (const [slug, groups] of chapterMap) {
    for (const group of groups) {
      group.diffs = computePairDiffs(group.paragraphs)
    }
    chapterMap.set(slug, groups)
  }
  console.log(`  ✓  Diffs computed`)

  // ── 4. Build ChapterMeta index ────────────────────
  // Collect unique slugs across all editions with their titles + order
  const slugMeta = new Map<string, { title: string; order: number; editions: Set<Edition> }>()

  for (const [edition, sections] of Object.entries(sectionsByEdition)) {
    for (const section of sections as ParsedSection[]) {
      if (!slugMeta.has(section.slug)) {
        slugMeta.set(section.slug, {
          title: section.title,
          order: section.order,
          editions: new Set(),
        })
      }
      slugMeta.get(section.slug)!.editions.add(edition as Edition)
    }
  }

  const chapters: ChapterMeta[] = Array.from(slugMeta.entries())
    .map(([slug, meta]) => ({
      slug,
      order: meta.order,
      title: meta.title,
      editions: Array.from(meta.editions).sort(),
    }))
    .sort((a, b) => a.order - b.order)

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
