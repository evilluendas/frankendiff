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

/** Compute a word-level diff between two texts. */
export function computeDiff(textA: string, textB: string): DiffOp[] {
  const tokensA = tokenize(textA)
  const tokensB = tokenize(textB)

  const dp = buildLCS(tokensA, tokensB)

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

  return mergeOps(raw)
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
