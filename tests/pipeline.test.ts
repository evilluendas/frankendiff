import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parseMarkdown, sectionsToParagraphs, ParsedSection } from '../scripts/parse'
import { alignAllChapters } from '../scripts/align'
import { computeDiff } from '../scripts/diff'
import { BookParagraph, Edition, EDITIONS } from '../lib/types'

/**
 * Whole-book invariants, run over the real editions in content/raw so that a
 * regression anywhere in the text is caught, not just in a hand-picked sample.
 */

const ROOT = path.resolve(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')

function loadBook() {
  const sectionsByEdition: Partial<Record<Edition, ParsedSection[]>> = {}
  const paragraphsByEdition: Partial<Record<Edition, BookParagraph[]>> = {}
  for (const edition of EDITIONS) {
    const raw = fs.readFileSync(path.join(CONTENT, 'raw', `${edition}.md`), 'utf-8')
    const sections = parseMarkdown(raw)
    sectionsByEdition[edition] = sections
    paragraphsByEdition[edition] = sectionsToParagraphs(sections, edition)
  }
  return { sectionsByEdition, paragraphsByEdition, chapters: alignAllChapters(sectionsByEdition, paragraphsByEdition, CONTENT) }
}

test('every paired paragraph diff reproduces both texts exactly', () => {
  const { chapters } = loadBook()
  let pairs = 0
  for (const [slug, groups] of chapters) {
    for (const g of groups) {
      const a = g.paragraphs['1818']
      const b = g.paragraphs['1831']
      if (!a || !b) continue
      pairs++
      const ops = computeDiff(a.text, b.text)
      const from1818 = ops.filter((o) => o.type !== 'insert').map((o) => o.text).join('')
      const from1831 = ops.filter((o) => o.type !== 'delete').map((o) => o.text).join('')
      assert.equal(from1818, a.text, `${slug} row ${g.paragraphIndex}: 1818 text altered by the diff`)
      assert.equal(from1831, b.text, `${slug} row ${g.paragraphIndex}: 1831 text altered by the diff`)
    }
  }
  assert.ok(pairs > 500, `expected hundreds of paired paragraphs, saw ${pairs}`)
})
