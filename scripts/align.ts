/**
 * Aligns paragraphs across editions into rows (AlignedParagraphGroup).
 *
 * Strategy: positional, anchored by pins.  Within a section, paragraph N of
 * 1818 is read against paragraph N of 1831 — until a pin says otherwise.
 * A pin (content/alignment-overrides.json, `rows`) names the paragraphs of
 * one row by identity:
 *
 *   { "1818": "v1-1/10", "1831": ["1/10", "2/1"], "note": "…" }   a 1:2 row
 *   { "1818": "v1-1/24", "1831": null,            "note": "…" }   1818-only
 *
 * A reference is `<section slug of that edition>/<1-based paragraph number>`
 * — the number in the paragraph's Read-view permalink (#p10).  Between two
 * pins the paragraphs pair off positionally again; whatever one side has
 * left over becomes edition-only rows at the end of that stretch.  A pin
 * therefore only affects its own neighbourhood: nothing renumbers when an
 * earlier pin is added or removed.
 *
 * Cross-edition slug mapping:
 *   The 1818 source uses volume-scoped chapter slugs ("v2-1" for Volume II,
 *   Chapter I). content/edition-alignment.json maps these to the canonical
 *   slugs used for navigation and processed JSON filenames (e.g. "v2-1" →
 *   "8"). Sections without an entry (preface, letters, walton-in-
 *   continuation) share the same slug across editions.
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

/** One pinned row, as written in alignment-overrides.json. */
export interface RowPin {
  '1818'?: string | string[] | null
  '1831'?: string | string[] | null
  note?: string
}

export interface Overrides {
  rows: RowPin[]
}

export function loadOverrides(contentRoot: string): Overrides {
  const p = path.join(contentRoot, 'alignment-overrides.json')
  if (!fs.existsSync(p)) return { rows: [] }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'))
    return { rows: Array.isArray(raw.rows) ? raw.rows : [] }
  } catch {
    return { rows: [] }
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

/** "v1-1/10" → the paragraph's id as parse.ts builds it ("1818-chv1-1-p9"). */
export function refToId(edition: Edition, ref: string): string | null {
  const m = ref.match(/^(.+)\/(\d+)$/)
  if (!m) return null
  const n = parseInt(m[2], 10)
  if (!(n >= 1)) return null
  return `${edition}-ch${m[1]}-p${n - 1}`
}

/** The reference of a paragraph, as written in a pin. */
export function paragraphRef(p: BookParagraph): string {
  return `${p.chapter}/${p.paragraphIndex + 1}`
}

/** A pin resolved against the paragraph lists of one unit. */
interface ResolvedPin {
  /** Index ranges [start, end) into each edition's list; absent when the pin has no paragraph there. */
  '1818'?: [number, number]
  '1831'?: [number, number]
}

/** Warnings collected while aligning, so a caller (or test) can see them. */
export interface AlignWarning { unit: string; message: string }

function resolvePins(
  unit: string,
  pins: RowPin[],
  byEdition: Partial<Record<Edition, BookParagraph[]>>,
  warn: (message: string) => void,
): ResolvedPin[] {
  const index: Partial<Record<Edition, Map<string, number>>> = {}
  for (const [edition, paras] of Object.entries(byEdition) as [Edition, BookParagraph[]][]) {
    index[edition] = new Map(paras.map((p, i) => [p.id, i]))
  }

  const resolved: ResolvedPin[] = []
  for (const pin of pins) {
    const out: ResolvedPin = {}
    let hasRefs = false
    let broken = false
    for (const edition of ['1818', '1831'] as Edition[]) {
      const value = pin[edition]
      if (value == null) continue
      const refs = Array.isArray(value) ? value : [value]
      const ids = refs.map((r) => refToId(edition, r))
      const positions = ids.map((id) => (id ? index[edition]?.get(id) : undefined))
      hasRefs = true
      if (positions.some((p) => p === undefined)) {
        warn(`pin ${JSON.stringify(pin)}: ${edition} reference(s) ${refs.join(', ')} not all found — pin ignored`)
        broken = true
        break
      }
      const sorted = positions as number[]
      for (let k = 1; k < sorted.length; k++) {
        if (sorted[k] !== sorted[k - 1] + 1) {
          warn(`pin ${JSON.stringify(pin)}: ${edition} paragraphs must be consecutive — pin ignored`)
          broken = true
        }
      }
      if (broken) break
      out[edition] = [sorted[0], sorted[sorted.length - 1] + 1]
    }
    if (hasRefs && !broken) resolved.push(out)
  }

  // Pins must not overlap, and must keep the same order in both editions.
  const claimed: Partial<Record<Edition, Set<number>>> = { '1818': new Set(), '1831': new Set() }
  const ok: ResolvedPin[] = []
  for (const pin of resolved) {
    let overlap = false
    for (const edition of ['1818', '1831'] as Edition[]) {
      const range = pin[edition]
      if (!range) continue
      for (let i = range[0]; i < range[1]; i++) if (claimed[edition]!.has(i)) overlap = true
    }
    if (overlap) {
      warn(`pin covering ${describePin(pin, byEdition)} overlaps another pin — ignored`)
      continue
    }
    for (const edition of ['1818', '1831'] as Edition[]) {
      const range = pin[edition]
      if (!range) continue
      for (let i = range[0]; i < range[1]; i++) claimed[edition]!.add(i)
    }
    ok.push(pin)
  }
  const paired = ok.filter((p) => p['1818'] && p['1831']).sort((x, y) => x['1818']![0] - y['1818']![0])
  for (let k = 1; k < paired.length; k++) {
    if (paired[k]['1831']![0] < paired[k - 1]['1831']![1]) {
      warn(`pins ${describePin(paired[k - 1], byEdition)} and ${describePin(paired[k], byEdition)} cross — the second is ignored`)
      const idx = ok.indexOf(paired[k])
      ok.splice(idx, 1)
    }
  }
  return ok
}

function describePin(pin: ResolvedPin, byEdition: Partial<Record<Edition, BookParagraph[]>>): string {
  return (['1818', '1831'] as Edition[])
    .filter((e) => pin[e])
    .map((e) => `${e} ${paragraphRef(byEdition[e]![pin[e]![0]])}${pin[e]![1] - pin[e]![0] > 1 ? `–${paragraphRef(byEdition[e]![pin[e]![1] - 1])}` : ''}`)
    .join(' ↔ ')
}

/**
 * Build the rows of one unit: positional pairing, anchored by pins.
 *
 * Both lists are walked with a cursor.  While neither cursor is on a pinned
 * paragraph, the two paragraphs pair off.  When a cursor reaches a pinned
 * paragraph, the other edition's unpinned paragraphs up to that pin (if it
 * has any on that side) are edition-only rows — the leftovers of the
 * stretch — and then the pinned row is emitted.  1818's rows come first
 * when both cursors sit on different edition-only pins.
 */
export function alignRows(
  unit: string,
  byEdition: Partial<Record<Edition, BookParagraph[]>>,
  pins: RowPin[],
  warn: (message: string) => void = () => {},
): AlignedParagraphGroup[] {
  const A = byEdition['1818'] ?? []
  const B = byEdition['1831'] ?? []
  const resolved = resolvePins(unit, pins, byEdition, warn)

  const pinAt: Partial<Record<Edition, Map<number, ResolvedPin>>> = { '1818': new Map(), '1831': new Map() }
  for (const pin of resolved) {
    for (const edition of ['1818', '1831'] as Edition[]) {
      const range = pin[edition]
      if (range) for (let i = range[0]; i < range[1]; i++) pinAt[edition]!.set(i, pin)
    }
  }

  const rows: AlignedParagraphGroup[] = []
  const push = (a: BookParagraph[], b: BookParagraph[]) => {
    const i = rows.length
    const group: AlignedParagraphGroup = {
      chapter: unit,
      paragraphIndex: i,
      alignmentKey: `ch${unit}-p${i}`,
      paragraphs: {},
      diffs: {},
    }
    if (a.length) group.paragraphs['1818'] = a
    if (b.length) group.paragraphs['1831'] = b
    rows.push(group)
  }
  const emitPin = (pin: ResolvedPin) => {
    const a = pin['1818'] ? A.slice(pin['1818'][0], pin['1818'][1]) : []
    const b = pin['1831'] ? B.slice(pin['1831'][0], pin['1831'][1]) : []
    push(a, b)
    if (pin['1818']) ia = pin['1818'][1]
    if (pin['1831']) ib = pin['1831'][1]
  }

  let ia = 0
  let ib = 0
  while (ia < A.length || ib < B.length) {
    const pinA = ia < A.length ? pinAt['1818']!.get(ia) : undefined
    const pinB = ib < B.length ? pinAt['1831']!.get(ib) : undefined

    if (pinA) {
      // Flush 1831's leftovers up to this pin's 1831 block (edition-only, or their own 1831-only pins).
      const stop = pinA['1831'] ? pinA['1831'][0] : (pinB && !pinB['1818'] ? ib : ib)
      while (ib < stop) {
        const other = pinAt['1831']!.get(ib)
        if (other && !other['1818']) emitPin(other)
        else push([], [B[ib++]])
      }
      emitPin(pinA)
    } else if (pinB) {
      const stop = pinB['1818'] ? pinB['1818'][0] : ia
      while (ia < stop) {
        const other = pinAt['1818']!.get(ia)
        if (other && !other['1831']) emitPin(other)
        else push([A[ia++]], [])
      }
      emitPin(pinB)
    } else if (ia < A.length && ib < B.length) {
      push([A[ia++]], [B[ib++]])
    } else if (ia < A.length) {
      push([A[ia++]], [])
    } else {
      push([], [B[ib++]])
    }
  }

  return rows
}

export function alignAllChapters(
  sectionsByEdition: Partial<Record<Edition, ParsedSection[]>>,
  paragraphsByEdition: Partial<Record<Edition, BookParagraph[]>>,
  contentRoot: string,
  warnings: AlignWarning[] = [],
): Map<string, AlignedParagraphGroup[]> {
  const overrides = loadOverrides(contentRoot)
  const editionAlignment = loadEditionAlignment(contentRoot)
  const diffUnits = loadDiffUnits(contentRoot)
  const warn = (unit: string, message: string) => {
    warnings.push({ unit, message })
    console.warn(`  ⚠  alignment ${unit}: ${message}`)
  }

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

  // The paragraph lists of every unit, then each pin goes to the one unit
  // where all of its references resolve (a pin may span two sections of an
  // edition — the end of one chapter and the start of the next — which only
  // resolve together inside their diff unit, not in the sections' own files).
  const lists = new Map<string, Partial<Record<Edition, BookParagraph[]>>>()
  for (const slug of slugSet) {
    const unit = diffUnits[slug]
    const byEdition: Partial<Record<Edition, BookParagraph[]>> = {}
    for (const edition of Object.keys(paragraphsByEdition) as Edition[]) {
      const sections = unit?.[edition]
      byEdition[edition] = sections
        ? sections.flatMap((sec) => sectionParagraphs(edition, sec))
        : sectionParagraphs(edition, slug)
    }
    lists.set(slug, byEdition)
  }

  const pinsByUnit = new Map<string, RowPin[]>()
  for (const pin of overrides.rows) {
    const refs = (['1818', '1831'] as Edition[]).flatMap((e) => {
      const v = pin[e]
      return v == null ? [] : (Array.isArray(v) ? v : [v]).map((r) => refToId(e, r))
    })
    if (refs.length === 0 || refs.some((id) => id === null)) {
      warn('-', `pin ${JSON.stringify(pin)} is malformed — ignored`)
      continue
    }
    const home = [...lists.entries()].find(([, byEdition]) => {
      const ids = new Set(Object.values(byEdition).flat().map((p) => p.id))
      return refs.every((id) => ids.has(id!))
    })
    if (!home) {
      warn('-', `pin ${JSON.stringify(pin)} names paragraphs that are not all in one unit — ignored`)
      continue
    }
    pinsByUnit.set(home[0], [...(pinsByUnit.get(home[0]) ?? []), pin])
  }

  const result = new Map<string, AlignedParagraphGroup[]>()

  for (const slug of slugSet) {
    const unit = diffUnits[slug]
    const byEdition = lists.get(slug)!
    const pins = pinsByUnit.get(slug) ?? []

    const groups = alignRows(slug, byEdition, pins, (m) => warn(slug, m))

    // Mark where each later section of a multi-section edition begins.
    if (unit) {
      for (const [edition, sections] of Object.entries(unit) as [Edition, string[]][]) {
        for (let k = 1; k < sections.length; k++) {
          const first = sectionParagraphs(edition, sections[k])[0]
          if (!first) {
            warn(slug, `diff-units.json lists ${edition} section "${sections[k]}" which has no paragraphs`)
            continue
          }
          const group = groups.find((g) => g.paragraphs[edition]?.some((p) => p.id === first.id))
          if (!group) {
            warn(slug, `first paragraph of ${edition} section "${sections[k]}" is not shown in the unit`)
            continue
          }
          const start: SectionStart = {
            slug: sections[k],
            label: sectionTitle(edition, sections[k]),
            afterLabel: sectionTitle(edition, sections[k - 1]),
            paragraphId: first.id,
          }
          group.sectionStart = { ...(group.sectionStart ?? {}), [edition]: start }
        }
      }
    }

    result.set(slug, groups)
  }

  return result
}
