/**
 * Parses a Markdown source file into structured BookParagraph objects.
 *
 * Expected format:
 *   ## Section Title
 *
 *   Paragraph one text.
 *
 *   Paragraph two text.
 *
 *   ## Next Section
 *   ...
 *
 * Numbered chapters ("Chapter I", "Chapter 1", "Chapter II", etc.) get a
 * numeric slug; other headings ("Preface", "Letter I") get a lowercased
 * kebab-case slug.
 */

import { BookParagraph, Edition } from '../lib/types'

const CHAPTER_HEADING_RE =
  /^chapter\s+([ivxlcdm]+|\d+)$/i

function toSlug(title: string): string {
  const m = title.match(CHAPTER_HEADING_RE)
  if (m) {
    const num = parseRoman(m[1]) ?? parseInt(m[1], 10)
    return String(num)
  }
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function toOrder(slug: string): number {
  const n = parseInt(slug, 10)
  if (!isNaN(n)) return n
  // Non-numeric sections sort before chapter 1
  if (slug === 'preface') return -2
  if (slug.startsWith('letter')) return -1
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
    const cur = map[lower[i]]
    const next = map[lower[i + 1]]
    if (next && cur < next) {
      result -= cur
    } else {
      result += cur
    }
  }
  return result
}

export interface ParsedSection {
  slug: string
  order: number
  title: string
  paragraphs: string[]
}

export function parseMarkdown(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = []

  // Split on lines that start with "## " to get sections
  const parts = raw.split(/^## /m)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const newlineIdx = trimmed.indexOf('\n')
    const title = newlineIdx === -1 ? trimmed : trimmed.slice(0, newlineIdx).trim()
    const body = newlineIdx === -1 ? '' : trimmed.slice(newlineIdx + 1).trim()

    // Skip the document title (# heading) or empty bodies
    if (!title || title.startsWith('#')) continue

    const paragraphs = body
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, ' ').trim())
      .filter((p) => p.length > 0)

    if (paragraphs.length === 0) continue

    const slug = toSlug(title)
    sections.push({
      slug,
      order: toOrder(slug),
      title,
      paragraphs,
    })
  }

  return sections
}

export function sectionsToParagraphs(
  sections: ParsedSection[],
  edition: Edition,
): BookParagraph[] {
  const result: BookParagraph[] = []
  for (const section of sections) {
    section.paragraphs.forEach((text, idx) => {
      result.push({
        id: `${edition}-ch${section.slug}-p${idx}`,
        edition,
        chapter: section.slug,
        paragraphIndex: idx,
        text,
      })
    })
  }
  return result
}
