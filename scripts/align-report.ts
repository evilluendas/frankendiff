/**
 * Alignment report — flags rows where the paragraph pairing looks wrong.
 *
 * Reads content/processed/ch*.json (run `npm run preprocess` first) and, for
 * every aligned row, scores how similar the 1818 and 1831 paragraphs are.
 * Rows that are weakly paired or one-sided are then checked against the other
 * edition's paragraphs in nearby rows; a clearly better neighbour is the
 * classic signature of an off-by-one alignment that needs an override in
 * content/alignment-overrides.json.
 *
 * Usage:
 *   npm run align:report                     # every chapter, problems only
 *   npm run align:report -- --chapter 1      # one chapter
 *   npm run align:report -- --all            # also list rows that look fine
 *   npm run align:report -- --window 10      # search further for neighbours
 *   npm run align:report -- --threshold 0.3  # what counts as a weak pair
 *
 * The score is a Dice coefficient over words of four or more letters, which
 * ignores most function words ("my", "the", "and") that would otherwise make
 * unrelated paragraphs look alike. It is a heuristic for humans to review,
 * not a decision the pipeline acts on.
 */

import fs from 'fs'
import path from 'path'
import { AlignedParagraphGroup, BookParagraph, ChapterMeta, Edition } from '../lib/types'

const A: Edition = '1818'
const B: Edition = '1831'

const PROCESSED_DIR = path.join(process.cwd(), 'content', 'processed')

// ── CLI options ─────────────────────────────────────────

interface Options {
  chapter: string | null
  all: boolean
  window: number
  threshold: number
  /** A neighbour must beat the current pairing by at least this much. */
  margin: number
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { chapter: null, all: false, window: 3, threshold: 0.35, margin: 0.15 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    if (arg === '--chapter')        opts.chapter = next()
    else if (arg === '--all')       opts.all = true
    else if (arg === '--window')    opts.window = parseInt(next(), 10)
    else if (arg === '--threshold') opts.threshold = parseFloat(next())
    else if (arg === '--margin')    opts.margin = parseFloat(next())
    else {
      console.error(`Unknown option: ${arg}`)
      process.exit(2)
    }
  }
  return opts
}

// ── Similarity ──────────────────────────────────────────

const MIN_WORD_LEN = 4

function wordCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const w of text.toLowerCase().match(/[a-zà-ÿ]+/g) ?? []) {
    if (w.length < MIN_WORD_LEN) continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return counts
}

/** Dice coefficient over word multisets: 2·|A∩B| / (|A|+|B|). */
function similarity(a: BookParagraph, b: BookParagraph): number {
  const ca = wordCounts(a.text)
  const cb = wordCounts(b.text)
  let sizeA = 0
  let sizeB = 0
  let shared = 0
  for (const n of ca.values()) sizeA += n
  for (const n of cb.values()) sizeB += n
  for (const [w, n] of ca) shared += Math.min(n, cb.get(w) ?? 0)
  return sizeA + sizeB === 0 ? 1 : (2 * shared) / (sizeA + sizeB)
}

// ── Report ──────────────────────────────────────────────

type Kind = 'ok' | 'weak' | 'only-1818' | 'only-1831' | 'empty'

interface RowReport {
  row: number
  kind: Kind
  score: number | null
  a?: BookParagraph
  b?: BookParagraph
  /** Better match for the row's paragraph in the *other* edition, if any. */
  suggestion?: { edition: Edition; fromRow: number; toRow: number; score: number }
}

function snippet(p: BookParagraph | undefined, len = 46): string {
  if (!p) return '—'
  const t = p.text.replace(/\s+/g, ' ')
  return `"${t.length > len ? t.slice(0, len).trimEnd() + '…' : t}"`
}

function ref(p: BookParagraph | undefined): string {
  return p ? `${p.edition}[${p.paragraphIndex}]` : '        '
}

/** A row's paragraphs of one edition as one paragraph-like value for scoring. */
function rowParagraph(group: AlignedParagraphGroup, edition: Edition): BookParagraph | undefined {
  const paras = group.paragraphs[edition]
  if (!paras?.length) return undefined
  if (paras.length === 1) return paras[0]
  return { ...paras[0], text: paras.map((p) => p.text).join(' ') }
}

function analyseChapter(groups: AlignedParagraphGroup[], opts: Options): RowReport[] {
  const reports: RowReport[] = []

  for (let i = 0; i < groups.length; i++) {
    const a = rowParagraph(groups[i], A)
    const b = rowParagraph(groups[i], B)
    const report: RowReport = { row: i, kind: 'empty', score: null, a, b }

    if (a && b) {
      report.score = similarity(a, b)
      report.kind = report.score < opts.threshold ? 'weak' : 'ok'
    } else if (a) {
      report.kind = 'only-1818'
    } else if (b) {
      report.kind = 'only-1831'
    }

    // For weak or one-sided rows, look for a better partner nearby.
    if (report.kind !== 'ok' && report.kind !== 'empty') {
      const mine = a ?? b!
      const other: Edition = a ? B : A
      let best: RowReport['suggestion'] | undefined
      for (let j = Math.max(0, i - opts.window); j <= Math.min(groups.length - 1, i + opts.window); j++) {
        if (j === i) continue
        const candidate = rowParagraph(groups[j], other)
        if (!candidate) continue
        const s = similarity(mine, candidate)
        if (s >= opts.threshold && s >= (report.score ?? 0) + opts.margin && (!best || s > best.score)) {
          best = { edition: other, fromRow: i, toRow: j, score: s }
        }
      }
      report.suggestion = best
    }

    reports.push(report)
  }

  return reports
}

function pct(s: number | null): string {
  return s === null ? '  – ' : `${Math.round(s * 100).toString().padStart(3)}%`
}

function printChapter(meta: ChapterMeta, reports: RowReport[], opts: Options): { flagged: number; suggested: number } {
  const counts = { ok: 0, weak: 0, 'only-1818': 0, 'only-1831': 0, empty: 0 } as Record<Kind, number>
  for (const r of reports) counts[r.kind]++

  const problems = reports.filter((r) => r.kind === 'weak' || r.suggestion)
  const oneSided = reports.filter((r) => (r.kind === 'only-1818' || r.kind === 'only-1831') && !r.suggestion)
  const flagged = problems.length
  const suggested = reports.filter((r) => r.suggestion).length

  if (!opts.all && flagged === 0) return { flagged, suggested }

  console.log(
    `\nch${meta.slug} — ${meta.title}  (${reports.length} rows: ` +
    `${counts.ok} ok, ${counts.weak} weak, ${counts['only-1818']} 1818-only, ${counts['only-1831']} 1831-only)`,
  )

  const show = opts.all ? reports : problems
  for (const r of show) {
    const tag = r.kind === 'ok' ? 'ok  ' : r.kind === 'weak' ? 'WEAK' : r.kind.toUpperCase().padEnd(9)
    console.log(`  row ${String(r.row).padStart(3)}  ${tag.padEnd(9)} ${pct(r.score)}  ${ref(r.a)} ${snippet(r.a)}`)
    console.log(`  ${' '.repeat(23)}${ref(r.b)} ${snippet(r.b)}`)
    if (r.suggestion) {
      const s = r.suggestion
      const mine = r.a ?? r.b!
      const theirs = reports[s.toRow][s.edition === A ? 'a' : 'b']
      console.log(
        `  ${' '.repeat(10)}→ ${ref(mine)} matches ${ref(theirs)} at row ${s.toRow} (${pct(s.score).trim()}) — ` +
        `${s.toRow > s.fromRow ? 'shift' : 'unshift'} ${mine.edition} by ${Math.abs(s.toRow - s.fromRow)}?`,
      )
    }
  }

  if (!opts.all && oneSided.length > 0) {
    console.log(`  (${oneSided.length} one-sided row${oneSided.length === 1 ? '' : 's'} with no nearby match — expected for genuine cuts/insertions)`)
  }

  return { flagged, suggested }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))

  const indexFile = path.join(PROCESSED_DIR, 'chapters.json')
  if (!fs.existsSync(indexFile)) {
    console.error('No content/processed/chapters.json — run `npm run preprocess` first.')
    process.exit(1)
  }
  const chapters = JSON.parse(fs.readFileSync(indexFile, 'utf-8')) as ChapterMeta[]

  console.log(`Alignment report — threshold ${opts.threshold}, neighbour window ±${opts.window}`)

  let totalFlagged = 0
  let totalSuggested = 0
  let chaptersWithIssues = 0

  for (const meta of chapters) {
    if (opts.chapter && meta.slug !== opts.chapter) continue
    const file = path.join(PROCESSED_DIR, `ch${meta.slug}.json`)
    if (!fs.existsSync(file)) continue
    const groups = JSON.parse(fs.readFileSync(file, 'utf-8')) as AlignedParagraphGroup[]
    const { flagged, suggested } = printChapter(meta, analyseChapter(groups, opts), opts)
    totalFlagged += flagged
    totalSuggested += suggested
    if (flagged > 0) chaptersWithIssues++
  }

  console.log(
    `\n${totalFlagged} flagged row${totalFlagged === 1 ? '' : 's'} in ${chaptersWithIssues} chapter${chaptersWithIssues === 1 ? '' : 's'}; ` +
    `${totalSuggested} with a likely better neighbour.`,
  )
}

main()
