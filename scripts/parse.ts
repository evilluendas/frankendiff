/**
 * Parses a Markdown source file into structured BookParagraph objects.
 *
 * Expected format for 1831 (flat):
 *   ## Section Title
 *
 *   Paragraph one text.
 *
 * Expected format for 1818 (volume-structured):
 *   # Volume I
 *
 *   ## Letter I
 *   ...
 *   ## Chapter VII
 *
 *   # Volume II
 *
 *   ## Chapter I
 *   ...
 *
 * Numbered chapters get volume-aware slugs:
 *   - Without a volume context: "Chapter VII" → slug "7"
 *   - With volume context (1818): "Chapter I" in Volume II → slug "v2-1"
 *
 * Other headings ("Letter I", "Walton, in continuation") get kebab-case slugs,
 * unchanged regardless of volume context.
 */

import { BookParagraph, Edition, ParagraphElementType } from '../lib/types'

const CHAPTER_HEADING_RE = /^chapter\s+([ivxlcdm]+|\d+)$/i
const VOLUME_HEADING_RE  = /^volume\s+([ivxlcdm]+|\d+)$/i

function toSlug(title: string, volume: number | null): string {
  const chapMatch = title.match(CHAPTER_HEADING_RE)
  if (chapMatch) {
    const num = parseRoman(chapMatch[1]) ?? parseInt(chapMatch[1], 10)
    return volume !== null ? `v${volume}-${num}` : String(num)
  }
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function toOrder(slug: string): number {
  // Volume-prefixed chapter slugs: "v2-1" → sort as if they were continuous
  const volChap = slug.match(/^v(\d+)-(\d+)$/)
  if (volChap) {
    const vol = parseInt(volChap[1], 10)
    const ch  = parseInt(volChap[2], 10)
    // Pack into a single integer: vol * 100 + ch (volumes never exceed 9 chapters * 3)
    return vol * 100 + ch
  }
  const n = parseInt(slug, 10)
  if (!isNaN(n)) return n
  if (slug === 'introduction') return -3
  if (slug === 'preface') return -2
  if (slug.startsWith('letter')) return -1
  if (slug === 'walton-in-continuation') return 1000
  return 0
}

function parseRoman(s: string): number | null {
  const map: Record<string, number> = {
    i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000,
  }
  const lower = s.toLowerCase()
  if (!/^[ivxlcdm]+$/.test(lower)) return null
  let result = 0
  for (let i = 0; i < lower.length; i++) {
    const cur  = map[lower[i]]
    const next = map[lower[i + 1]]
    if (next && cur < next) {
      result -= cur
    } else {
      result += cur
    }
  }
  return result
}

/**
 * Known structural element tags. Any `[tag]` marker at the start of a
 * paragraph block is stripped from the text and stored as `elementType`.
 * Poem blocks preserve internal newlines so they render correctly.
 */
const KNOWN_ELEMENT_TAGS: ParagraphElementType[] = [
  'salutation',
  'dateline',
  'closing',
  'signature',
  'poem',
]

const ELEMENT_TAG_RE = /^\[([a-z]+)\]\s*\n?/

function detectElement(raw: string): {
  elementType: ParagraphElementType
  text: string
} {
  const m = raw.match(ELEMENT_TAG_RE)
  if (m) {
    const tag = m[1] as ParagraphElementType
    if ((KNOWN_ELEMENT_TAGS as string[]).includes(tag)) {
      return { elementType: tag, text: raw.slice(m[0].length).trim() }
    }
  }
  return { elementType: 'body', text: raw }
}

export interface ParsedSection {
  slug: string
  order: number
  title: string           // original heading text, e.g. "Chapter I"
  volume?: number         // 1 | 2 | 3 — only present for 1818 volume-structured files
  paragraphs: string[]
}

export function parseMarkdown(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  let currentVolume: number | null = null
  let currentTitle: string | null  = null
  let currentBodyLines: string[]   = []

  function flushSection() {
    if (currentTitle === null) return

    const body = currentBodyLines.join('\n').trim()
    const paragraphs = body
      .split(/\n{2,}/)
      .map((p) => {
        const block = p.trim()
        if (/^\[poem\]/i.test(block)) return block
        return block.replace(/\n/g, ' ')
      })
      .filter((p) => p.length > 0)

    if (paragraphs.length === 0) {
      currentTitle = null
      currentBodyLines = []
      return
    }

    const slug = toSlug(currentTitle, currentVolume)
    const section: ParsedSection = {
      slug,
      order: toOrder(slug),
      title: currentTitle,
      paragraphs,
    }
    if (currentVolume !== null) {
      section.volume = currentVolume
    }
    sections.push(section)

    currentTitle = null
    currentBodyLines = []
  }

  const lines = raw.split('\n')

  for (const line of lines) {
    // H1 heading — either the document title or a volume marker
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      flushSection()
      const heading = line.slice(2).trim()
      const volMatch = heading.match(VOLUME_HEADING_RE)
      if (volMatch) {
        currentVolume = parseRoman(volMatch[1]) ?? parseInt(volMatch[1], 10)
      }
      // Document title and other H1s are ignored as section content
      continue
    }

    // H2 heading — a section
    if (line.startsWith('## ')) {
      flushSection()
      currentTitle = line.slice(3).trim()
      currentBodyLines = []
      continue
    }

    // Body line — accumulate
    if (currentTitle !== null) {
      currentBodyLines.push(line)
    }
  }

  flushSection()

  return sections
}

export function sectionsToParagraphs(
  sections: ParsedSection[],
  edition: Edition,
): BookParagraph[] {
  const result: BookParagraph[] = []
  for (const section of sections) {
    section.paragraphs.forEach((raw, idx) => {
      const { elementType, text } = detectElement(raw)
      result.push({
        id: `${edition}-ch${section.slug}-p${idx}`,
        edition,
        chapter: section.slug,
        paragraphIndex: idx,
        text,
        elementType,
      })
    })
  }
  return result
}
