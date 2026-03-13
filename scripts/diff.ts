/**
 * Word-level diff using the LCS (longest common subsequence) algorithm.
 *
 * Tokenises text into alternating word and whitespace chunks so that
 * insertions and deletions align naturally at word boundaries.
 * Consecutive ops of the same type are merged into a single DiffOp.
 */

import { DiffOp, DiffOpType } from '../lib/types'

/**
 * Split text into fine-grained tokens: words (with apostrophes for
 * contractions), individual punctuation characters, and whitespace runs.
 *
 * Splitting punctuation from words means a change like "excellent," → "excellent"
 * will only highlight the comma rather than the entire word.
 */
function tokenize(text: string): string[] {
  return text.match(/\w+(?:'\w+)*|[^\w\s]|\s+/g) ?? []
}

/** Build LCS DP table for two token arrays. */
function buildLCS(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp
}

/** Merge consecutive ops of the same type. */
function mergeOps(ops: DiffOp[]): DiffOp[] {
  const merged: DiffOp[] = []
  for (const op of ops) {
    const last = merged[merged.length - 1]
    if (last && last.type === op.type) {
      last.text += op.text
    } else {
      merged.push({ ...op })
    }
  }
  return merged
}

/**
 * Collapse the "every word highlighted" pattern that arises when two paragraphs
 * are heavily rewritten.
 *
 * The LCS algorithm matches whitespace tokens that appear in both texts,
 * producing a sequence like:
 *   del "My"  eq " "  ins "From"  eq " "  del "father"  eq " "  ins "Italy" …
 *
 * This pass walks through the ops and, whenever it finds a run of del/ins ops
 * separated only by whitespace-only equal ops, merges them into a single del
 * block and a single ins block, preserving natural word spacing in each:
 *   del "My father …"  ins "From Italy …"
 *
 * The whitespace is assigned to whichever side (del or ins) it immediately
 * follows, so both blocks read naturally without double-counted spaces.
 */
function cleanupEditZones(ops: DiffOp[]): DiffOp[] {
  const result: DiffOp[] = []
  let i = 0

  while (i < ops.length) {
    const op = ops[i]

    if (op.type === 'equal') {
      result.push(op)
      i++
      continue
    }

    // Collect a contiguous edit zone: del/ins ops with only whitespace-only
    // equal ops between them.
    let delText = ''
    let insText = ''
    let lastSide: 'delete' | 'insert' | null = null

    while (i < ops.length) {
      const cur = ops[i]
      const next = ops[i + 1]

      if (cur.type === 'delete') {
        delText += cur.text
        lastSide = 'delete'
        i++
      } else if (cur.type === 'insert') {
        insText += cur.text
        lastSide = 'insert'
        i++
      } else if (
        cur.type === 'equal' &&
        /^\s+$/.test(cur.text) &&
        next &&
        next.type !== 'equal'
      ) {
        // The whitespace belongs to both texts, so absorb it into both blocks
        // so each reads naturally (e.g. "My father had" not "Myfatherhad").
        delText += cur.text
        insText += cur.text
        i++
      } else {
        break
      }
    }

    if (delText) result.push({ type: 'delete', text: delText })
    if (insText) result.push({ type: 'insert', text: insText })
  }

  return result
}

/**
 * Collapse "chaotic zones" — contiguous regions where the word-level diff is
 * fragmented because the LCS matched scattered function words rather than
 * genuine semantic phrases.
 *
 * The algorithm splits the op stream at "anchor" equal ops (long enough to be
 * unambiguously shared content, >= ANCHOR_MIN_CHARS characters).  Between two
 * anchors we have a "zone".  If the Dice similarity of the equal content within
 * the zone to the total content is below ZONE_MIN_DICE, the zone is collapsed
 * to a single del + single ins, reconstructing the original 1818 and 1831 text
 * by merging del/ins/equal ops appropriately.
 */
function cleanupChaoticZones(ops: DiffOp[]): DiffOp[] {
  const ANCHOR_MIN_CHARS = 15
  const ZONE_MIN_DICE = 0.25

  const result: DiffOp[] = []
  let i = 0

  while (i < ops.length) {
    const op = ops[i]

    if (op.type === 'equal' && op.text.length >= ANCHOR_MIN_CHARS) {
      result.push(op)
      i++
      continue
    }

    // Collect a zone until the next anchor (large equal) or end of ops.
    let j = i
    let text1818 = ''
    let text1831 = ''
    let equalChars = 0

    while (j < ops.length) {
      const cur = ops[j]
      if (cur.type === 'equal' && cur.text.length >= ANCHOR_MIN_CHARS) break
      if (cur.type === 'delete') {
        text1818 += cur.text
      } else if (cur.type === 'insert') {
        text1831 += cur.text
      } else {
        text1818 += cur.text
        text1831 += cur.text
        equalChars += cur.text.length
      }
      j++
    }

    const totalChars = text1818.length + text1831.length
    const dice = totalChars === 0 ? 1 : (2 * equalChars) / totalChars

    if (dice < ZONE_MIN_DICE) {
      if (text1818) result.push({ type: 'delete', text: text1818 })
      if (text1831) result.push({ type: 'insert', text: text1831 })
    } else {
      for (let k = i; k < j; k++) result.push(ops[k])
    }

    i = j
  }

  return result
}

/**
 * Absorb "noise equal" islands — short equal ops that are completely surrounded
 * by edits on both sides and are shorter than both neighbouring edit blocks.
 *
 * Example: [del "My father had a sister"] eq "my" [ins "From Italy they visited"]
 * The equal "my" (2 chars) is far shorter than either edit, so it adds no
 * useful context and only fragments the highlighted region.  Absorbing it
 * gives:  [del "My father had a sistermy"] [ins "myFrom Italy they visited"]
 * which, after a subsequent mergeOps call, becomes a single del and a single
 * ins spanning the whole passage.
 *
 * The loop runs repeatedly until no more islands can be absorbed (handles
 * cascading cases where removing one island creates another).
 */
function cleanupSemanticIslands(ops: DiffOp[]): DiffOp[] {
  let arr = ops.map((op) => ({ ...op }))
  let changed = true

  while (changed) {
    changed = false

    for (let i = 1; i < arr.length - 1; i++) {
      const prev = arr[i - 1]
      const curr = arr[i]
      const next = arr[i + 1]

      if (
        curr.type === 'equal' &&
        prev.type !== 'equal' &&
        next.type !== 'equal' &&
        curr.text.length <= prev.text.length &&
        curr.text.length <= next.text.length
      ) {
        prev.text += curr.text
        next.text = curr.text + next.text
        arr.splice(i, 1)
        arr = mergeOps(arr)
        changed = true
        break
      }
    }
  }

  return arr
}

const FULL_REPLACEMENT = (a: string, b: string): DiffOp[] => [
  { type: 'delete', text: a },
  { type: 'insert', text: b },
]

/**
 * Decide whether a cleaned-up word-level diff is useful to display.
 *
 * The Dice coefficient on raw tokens (a priori check) can be fooled by
 * high-frequency function words — "my", "and", "was", "the", "of" — that
 * appear in almost every English sentence.  Two completely rewritten
 * paragraphs may share 50 %+ of their tokens by count simply because of
 * these words, yet the word-level diff is still fragmented.
 *
 * This a posteriori check looks at the RESULT after cleanup: if less than
 * MIN_EQUAL_FRACTION of the total character count lands in equal ops, the
 * diff isn't providing enough shared context to anchor the reader, and a
 * plain full-replacement is cleaner.
 */
const MIN_EQUAL_FRACTION = 0.20   // at least 20 % of chars must be equal
const MIN_INPUT_DICE     = 0.50   // fast pre-filter: skip backtracking when clearly too different

/** Compute a word-level diff between two texts. */
export function computeDiff(textA: string, textB: string): DiffOp[] {
  if (textA === textB) return [{ type: 'equal', text: textA }]

  const tokensA = tokenize(textA)
  const tokensB = tokenize(textB)

  const dp = buildLCS(tokensA, tokensB)
  const lcsLen = dp[tokensA.length][tokensB.length]

  // Fast pre-filter: if the raw token Dice score is too low, skip the full
  // backtracking and immediately return a full replacement.
  const dice = (tokensA.length + tokensB.length === 0)
    ? 1
    : (2 * lcsLen) / (tokensA.length + tokensB.length)
  if (dice < MIN_INPUT_DICE) return FULL_REPLACEMENT(textA, textB)

  const raw: { type: DiffOpType; text: string }[] = []
  let i = tokensA.length
  let j = tokensB.length

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      tokensA[i - 1] === tokensB[j - 1]
    ) {
      raw.unshift({ type: 'equal', text: tokensA[i - 1] })
      i--
      j--
    } else if (
      j > 0 &&
      (i === 0 || dp[i][j - 1] >= dp[i - 1][j])
    ) {
      raw.unshift({ type: 'insert', text: tokensB[j - 1] })
      j--
    } else {
      raw.unshift({ type: 'delete', text: tokensA[i - 1] })
      i--
    }
  }

  const result = cleanupChaoticZones(cleanupSemanticIslands(cleanupEditZones(mergeOps(raw))))

  // A posteriori check: even if raw Dice was acceptable, the cleaned-up diff
  // might still be mostly edits because the shared tokens were scattered
  // function words rather than genuine semantic overlap.  If the equal
  // content is less than MIN_EQUAL_FRACTION of the total, fall back to a
  // full replacement.
  const equalChars = result
    .filter((op) => op.type === 'equal')
    .reduce((sum, op) => sum + op.text.length, 0)
  if (equalChars / (textA.length + textB.length) < MIN_EQUAL_FRACTION) {
    return FULL_REPLACEMENT(textA, textB)
  }

  return result
}

/**
 * Compute diffs for all relevant edition pairs within an aligned group.
 * Returns a record keyed by "editionA_editionB".
 */
export function computePairDiffs(
  paragraphs: Partial<Record<string, { text: string }>>,
): Record<string, DiffOp[]> {
  const editions = Object.keys(paragraphs)
  const result: Record<string, DiffOp[]> = {}

  for (let i = 0; i < editions.length; i++) {
    for (let j = i + 1; j < editions.length; j++) {
      const a = editions[i]
      const b = editions[j]
      const paraA = paragraphs[a]
      const paraB = paragraphs[b]
      if (paraA && paraB) {
        result[`${a}_${b}`] = computeDiff(paraA.text, paraB.text)
      }
    }
  }

  return result
}
