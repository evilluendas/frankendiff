/**
 * Extracts clean Markdown from Wikisource Parsoid XHTML files.
 *
 * Usage:
 *   tsx scripts/extract-html.ts 1818
 *   tsx scripts/extract-html.ts 1831
 *
 * Each XHTML file in content/original/<edition>/ maps to one section.
 * The script detects structural elements (salutation, dateline, closing,
 * signature) from HTML class patterns and emits them as [tag] markers.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as cheerio from 'cheerio'
import type { CheerioAPI, Cheerio, Element } from 'cheerio'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface Config {
  sourceDir: string
  outputFile: string
  bookTitle: string
  /** Substrings in filename that indicate a file should be skipped */
  skipIfContains: string[]
}

const CONFIGS: Record<string, Config> = {
  '1818': {
    sourceDir: 'content/original/1818',
    outputFile: 'content/raw/1818.md',
    bookTitle: 'Frankenstein; or, The Modern Prometheus (1818)',
    skipIfContains: [
      'c0_',           // cover page
      '__Volume_1.xhtml',  // Volume I overview / TOC
      '__Volume_2.xhtml',  // Volume II title page
      '__Volume_3.xhtml',  // Volume III title page
    ],
  },
  '1831': {
    sourceDir: 'content/original/1831',
    outputFile: 'content/raw/1831.md',
    bookTitle: 'Frankenstein; or, The Modern Prometheus (1831)',
    skipIfContains: [
      'c0_',  // cover / frontispiece
    ],
  },
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const edition = process.argv[2]
  const config = CONFIGS[edition]
  if (!config) {
    console.error('Usage: tsx scripts/extract-html.ts <1818|1831>')
    process.exit(1)
  }

  const files = fs
    .readdirSync(config.sourceDir)
    .filter((f) => f.endsWith('.xhtml') || f.endsWith('.html'))
    .filter((f) => !config.skipIfContains.some((p) => f.includes(p)))
    .sort((a, b) => {
      // Natural numeric sort: c1_ < c2_ < c10_ < c11_
      const numA = parseInt(a.match(/^c(\d+)/)?.[1] ?? '0', 10)
      const numB = parseInt(b.match(/^c(\d+)/)?.[1] ?? '0', 10)
      return numA - numB
    })

  const sections: string[] = []
  // For 1818, chapters are numbered I–VII per volume. We renumber them
  // sequentially (I–XXIII) so slugs are unique across volumes and align
  // with the 1831 continuous chapter numbering.
  let chapterCounter = 0
  for (const file of files) {
    const html = fs.readFileSync(path.join(config.sourceDir, file), 'utf-8')
    let section = extractSection(html, file)
    if (section) {
      // Renumber chapters for the 1818 edition
      if (edition === '1818') {
        section = section.replace(
          /^(## Chapter) ([IVXLCDM]+|\d+)/m,
          (_match, prefix) => {
            chapterCounter++
            return `${prefix} ${toRoman(chapterCounter)}`
          },
        )
      }
      sections.push(section)
      console.log(`  ✓ ${file}`)
    } else {
      console.log(`  – ${file} (skipped — no content)`)
    }
  }

  const output = `# ${config.bookTitle}\n\n${sections.join('\n\n---\n\n')}\n`
  fs.writeFileSync(config.outputFile, output, 'utf-8')
  console.log(`\nWrote ${sections.length} sections to ${config.outputFile}`)
}

// ---------------------------------------------------------------------------
// Section extraction
// ---------------------------------------------------------------------------

/** Converts an integer to a Roman numeral string. */
function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
  }
  return result
}

/**
 * Returns true if this text looks like a section heading:
 * "CHAPTER I", "LETTER III.", "PREFACE.", "INTRODUCTION.", "WALTON, in continuation."
 */
function isSectionHeading(text: string): boolean {
  const t = text.trim().replace(/\.$/, '').trim().toUpperCase()
  if (/^CHAPTER\s+[IVXLCDM\d]+$/.test(t)) return true
  if (/^LETTER\s+[IVXLCDM\d]+$/.test(t)) return true
  if (/^PREFACE$/.test(t)) return true
  if (/^INTRODUCTION$/.test(t)) return true
  if (/^WALTON/.test(t)) return true
  return false
}

interface ParsedElement {
  kind: 'title' | 'salutation' | 'dateline' | 'body' | 'right-align' | 'left-indent' | 'table-row'
  text: string
}

function extractSection(html: string, _filename: string): string | null {
  const $ = cheerio.load(html, { xmlMode: true })

  // Strip noise ---------------------------------------------------------------
  // Page number spans
  $('span.pagenum, span.ws-pagenum').remove()
  // Page-break decorators
  $('.wst-pagebreak').remove()
  // License blocks, navigation, TOC, collapsed sections
  $('.licenseContainer, .wst-auxtoc, .mw-collapsible, .navbox').remove()
  // Images and figures
  $('img, figure').remove()
  // Decorative horizontal spacers
  $('.wst-dhr').remove()
  // Decorative custom rules (ornamental dividers)
  $('.wst-custom-rule').remove()
  // Wikisource navigation header
  $('[class*="wst-header"]').remove()
  // smallrefs / footnote sections
  $('.wst-smallrefs').remove()
  // Hidden nop spans
  $('.wst-nop').remove()
  // Tooltip markers
  $('[class*="wst-tooltip"]').remove()
  // [sic] markers – keep inner text
  $('[class*="wst-tooltip"]').each((_i, el) => {
    $(el).replaceWith($(el).text())
  })

  // Collect all meaningful elements in document order -----------------------
  const elements: ParsedElement[] = []

  $('body').find('p, div.wst-center, div.wst-right, div[style*="text-align:left"], table').each(
    (_i, el) => {
      const elem = $(el)
      const tag = (el as Element).tagName.toLowerCase()
      const cls = elem.attr('class') ?? ''
      const style = elem.attr('style') ?? ''

      // Skip elements that are nested inside wst-center / wst-right
      // (we'll process the parent container instead)
      if (isNested(el as Element, ['wst-center', 'wst-right'])) return
      // Skip elements that are descendants of a <table>
      // (the table itself is handled below; use parents() which excludes self)
      if (elem.parents('table').length) return

      if (tag === 'table') {
        // Walton section: salutation + dateline in a single table row
        parseTableRow($, elem, elements)
        return
      }

      if (cls.includes('wst-center')) {
        // Scan all <p> elements in this wst-center.
        // The first one that matches a KNOWN SECTION HEADING pattern is the title.
        // Any <p> that starts with "To " is a salutation.
        // Others are skipped (decorative ornaments, volume headers, etc.)
        let foundTitle = false
        elem.find('p').each((_j, pEl) => {
          if (isNested(pEl as Element, ['wst-center'], el as Element)) return
          const text = cleanText($, $(pEl))
          if (!text || /^[.\s*—–]+$/.test(text)) return
          if (!foundTitle && isSectionHeading(text)) {
            elements.push({ kind: 'title', text })
            foundTitle = true
          } else if (/^\*?To\b/i.test(text)) {
            elements.push({ kind: 'salutation', text })
          }
          // Other <p> content (book title on page, volume headers, ornaments) → skip
        })
        return
      }

      if (cls.includes('wst-right')) {
        // Each <p> in wst-right may contain a closing AND a signature
        // separated by <br/>. Split them into separate elements.
        elem.find('p').each((_j, pEl) => {
          const lines = extractLinesBySplit($, $(pEl))
          for (const line of lines) {
            if (!line || /^[.\s*—–]+$/.test(line)) continue
            elements.push({ kind: 'right-align', text: line })
          }
        })
        return
      }

      const text = cleanText($, elem)
      // Skip empty text and Wikisource artifact paragraphs (lone "." etc.)
      if (!text || /^[.\s*—–]+$/.test(text)) return

      if (style.includes('text-align:left') || style.includes('text-align: left')) {
        elements.push({ kind: 'left-indent', text })
      } else {
        // Check if this plain <p> is actually a section heading (1818 chapter
        // files place their headings in bold <p> elements, not wst-center divs)
        if (isSectionHeading(text) && elem.find('b, strong').length > 0) {
          elements.push({ kind: 'title', text })
        } else {
          elements.push({ kind: 'body', text })
        }
      }
    },
  )

  if (elements.length === 0) return null

  // Derive section title: prefer wst-center heading; fall back to <title> tag
  const firstTitle = elements.find((e) => e.kind === 'title')
  const htmlTitle = $('title').text().trim()
  const rawTitle = firstTitle?.text ?? htmlTitle
  if (!rawTitle) return null

  const sectionTitle = formatTitle(rawTitle)

  // Skip pure navigational/title-page files (no body paragraphs at all)
  const hasContent = elements.some((e) => e.kind === 'body' || e.kind === 'dateline')
  if (!hasContent) return null

  // Build output -------------------------------------------------------------
  const parts: string[] = [`## ${sectionTitle}`]

  // Track state to distinguish dateline (before body) from closing/signature
  let bodyStarted = false
  // Index of last body paragraph, to split off trailing right-aligns
  const rightAligns: { text: string; idx: number }[] = []

  // We do two passes:
  // Pass 1: collect body paragraphs and right-align blocks
  const bodyParagraphs: { text: string }[] = []
  const trailingRightAligns: string[] = []

  const classified: Array<
    | { kind: 'body'; text: string }
    | { kind: 'salutation'; text: string }
    | { kind: 'dateline'; text: string }
    | { kind: 'right-align'; text: string }
    | { kind: 'left-indent'; text: string }
  > = []

  let bodyCount = 0

  for (const el of elements) {
    if (el.kind === 'title') {
      if (el.text === firstTitle.text) continue
      // Subsequent wst-center "To ..." lines are addressee salutations
      if (/^\*?To\b/i.test(el.text)) {
        classified.push({ kind: 'salutation', text: el.text })
      } else {
        classified.push({ kind: 'body', text: el.text })
      }
    } else if (el.kind === 'body') {
      classified.push({ kind: 'body', text: el.text })
      bodyCount++
    } else if (el.kind === 'salutation') {
      classified.push({ kind: 'salutation', text: el.text })
    } else if (el.kind === 'dateline') {
      classified.push({ kind: 'dateline', text: el.text })
    } else if (el.kind === 'right-align') {
      classified.push({ kind: 'right-align', text: el.text })
      rightAligns.push({ text: el.text, idx: classified.length - 1 })
    } else if (el.kind === 'left-indent') {
      classified.push({ kind: 'left-indent', text: el.text })
    } else if (el.kind === 'table-row') {
      classified.push({ kind: el.kind as 'salutation', text: el.text })
    }
  }

  // Determine which right-aligns are trailing (after last body paragraph)
  let lastBodyIdx = -1
  for (let i = classified.length - 1; i >= 0; i--) {
    if (classified[i].kind === 'body') {
      lastBodyIdx = i
      break
    }
  }

  // Now emit output
  for (let i = 0; i < classified.length; i++) {
    const el = classified[i]
    const isAfterLastBody = i > lastBodyIdx

    if (el.kind === 'body') {
      bodyStarted = true
      parts.push(el.text)
    } else if (el.kind === 'salutation') {
      parts.push(`[salutation]\n${el.text}`)
    } else if (el.kind === 'dateline') {
      parts.push(`[dateline]\n${el.text}`)
    } else if (el.kind === 'right-align') {
      if (!bodyStarted) {
        // Before first body paragraph → dateline
        parts.push(`[dateline]\n${el.text}`)
      } else if (isDateLike(el.text)) {
        // In-body date marker (Walton sub-letters) → dateline
        parts.push(`[dateline]\n${el.text}`)
      } else if (isAfterLastBody) {
        // After last body → closing or signature
        const isClosing = el.text.trimEnd().endsWith(',')
        const tag = isClosing ? 'closing' : 'signature'
        parts.push(`[${tag}]\n${el.text}`)
      } else {
        // Middle of body, non-date right-align → treat as body
        parts.push(el.text)
      }
    } else if (el.kind === 'left-indent') {
      if (isDateLike(el.text)) {
        parts.push(`[dateline]\n${el.text}`)
      } else if (isAfterLastBody) {
        const isClosing = el.text.trimEnd().endsWith(',')
        const tag = isClosing ? 'closing' : 'signature'
        parts.push(`[${tag}]\n${el.text}`)
      } else {
        parts.push(el.text)
      }
    }
  }

  if (parts.length <= 1) return null
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Table row parsing (Walton section: salutation + dateline in one <tr>)
// ---------------------------------------------------------------------------

function parseTableRow(
  $: CheerioAPI,
  table: Cheerio<Element>,
  out: ParsedElement[],
) {
  table.find('tr').each((_i, tr) => {
    const cells = $(tr).find('td')
    // Collect all cells, emit right-aligned (dateline) cells before left cells
    // so the date appears before the letter greeting in document order.
    const datelines: ParsedElement[] = []
    const other: ParsedElement[] = []

    cells.each((_j, td) => {
      const cellEl = $(td)
      const rightDiv = cellEl.find('div.wst-right')
      if (rightDiv.length) {
        const text = cleanText($, rightDiv)
        if (text) datelines.push({ kind: 'dateline', text })
      } else {
        const text = cleanText($, cellEl)
        if (!text) return
        // Only tag as salutation if it's an addressee line ("To ...")
        // Greeting lines like "My dear Sister," are body text
        if (/^\*?To\b/i.test(text)) {
          other.push({ kind: 'salutation', text })
        } else {
          other.push({ kind: 'body', text })
        }
      }
    })

    // Emit dateline(s) first, then greeting/salutation
    for (const el of [...datelines, ...other]) out.push(el)
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if element is a descendant of an element with any of the
 * given class names (used to skip inner elements when processing containers).
 * If `stopAt` is provided, stops traversal at that ancestor.
 */
function isNested(el: Element, classes: string[], stopAt?: Element): boolean {
  let parent = el.parent as Element | null
  while (parent && parent.type === 'tag') {
    if (stopAt && parent === stopAt) return false
    const cls = (parent as Element).attribs?.class ?? ''
    if (classes.some((c) => cls.includes(c))) return true
    parent = parent.parent as Element | null
  }
  return false
}

/**
 * Extracts text lines from a <p> element, splitting on <br/> tags.
 * Used to separate "Your affectionate brother,\nR. Walton." into two items.
 */
function extractLinesBySplit($: CheerioAPI, el: Cheerio<Element>): string[] {
  const clone = el.clone()
  // Remove noise
  clone.find('span.pagenum, span.ws-pagenum').remove()
  clone.find('[class*="wst-gap"], [class*="__gap"]').remove()
  clone.find('a').each((_i, node) => $(node).replaceWith($(node).text()))

  // Italic elements → *text* markdown
  clone.find('i, em').each((_i, node) => {
    const inner = $(node).text().trim()
    if (inner) $(node).replaceWith(`*${inner}*`)
    else $(node).remove()
  })

  // Replace <br> with a sentinel
  const SENTINEL = '\u0000'
  clone.find('br').replaceWith(SENTINEL)

  const raw = clone.text().replace(/\u00a0/g, ' ')
  return raw
    .split(SENTINEL)
    .map((s) => s.replace(/[ \t]+/g, ' ').replace(/\n/g, ' ').trim())
    .filter(Boolean)
}

/**
 * Extracts clean plain text from an element, removing page-number spans and
 * normalising whitespace.
 */
function cleanText($: CheerioAPI, el: Cheerio<Element>): string {
  // Clone to avoid mutating the document
  const clone = el.clone()

  // Remove page-number spans in clone
  clone.find('span.pagenum, span.ws-pagenum').remove()
  clone.find('.wst-pagebreak').remove()
  clone.find('img').remove()
  // Remove gap/spacer spans
  clone.find('[class*="wst-gap"], [class*="__gap"]').remove()
  // [sic] tooltips — keep inner text
  clone.find('[class*="wst-tooltip"]').each((_i, node) => {
    $(node).replaceWith($(node).text())
  })

  // Anchor links — unwrap to just text
  clone.find('a').each((_i, node) => {
    $(node).replaceWith($(node).text())
  })

  // Italic elements → *text* markdown
  clone.find('i, em').each((_i, node) => {
    const inner = $(node).text().trim()
    if (inner) $(node).replaceWith(`*${inner}*`)
    else $(node).remove()
  })

  const raw = clone.text()

  // Normalise whitespace: collapse runs of spaces/non-breaking spaces, trim
  return raw
    .replace(/\u00a0/g, ' ')  // non-breaking space
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*/g, ' ')
    .trim()
}

/**
 * Heuristic: does this text look like a date / letter date-marker?
 */
function isDateLike(text: string): boolean {
  const t = text.trim()
  // Contains a month name
  if (/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(t)) {
    return true
  }
  // Ends with a year or "17—" placeholder
  if (/17—/.test(t)) return true
  if (/\b(18|19|20)\d{2}\b/.test(t)) return true
  // Short text ending with a day ordinal: "September 2d.", "5th."
  if (/\d+(st|nd|rd|th)\.?$/.test(t)) return true
  return false
}

/**
 * Normalises a raw heading string extracted from centered HTML.
 *
 * "CHAPTER I." → "Chapter I"
 * "INTRODUCTION." → "Introduction"
 * "LETTER II." → "Letter II"
 * "Walton, in continuation." → "Walton, in continuation"
 * "Preface " → "Preface"
 * "Chapter 1 " → "Chapter 1"
 */
function formatTitle(raw: string): string {
  // Remove trailing punctuation and whitespace
  let s = raw.trim().replace(/[.\s]+$/, '').trim()

  return s
    .split(/\s+/)
    .map((word) => {
      // Preserve Roman numerals (all-letter combos of I V X L C D M)
      if (/^[IVXLCDMivxlcdm]+$/.test(word) && word.length <= 6) {
        return word.toUpperCase()
      }
      // All-uppercase word → title-case
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word.charAt(0) + word.slice(1).toLowerCase()
      }
      return word
    })
    .join(' ')
}

main()
