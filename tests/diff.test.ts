import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeDiff } from '../scripts/diff'
import { DiffOp } from '../lib/types'

/** The text each side of a diff reconstructs to: 1818 = equal + delete, 1831 = equal + insert. */
function reconstruct(ops: DiffOp[]): { a: string; b: string } {
  return {
    a: ops.filter((o) => o.type !== 'insert').map((o) => o.text).join(''),
    b: ops.filter((o) => o.type !== 'delete').map((o) => o.text).join(''),
  }
}

function assertRoundTrip(a: string, b: string) {
  const ops = computeDiff(a, b)
  const r = reconstruct(ops)
  assert.equal(r.a, a, 'delete + equal ops must reproduce the 1818 text')
  assert.equal(r.b, b, 'insert + equal ops must reproduce the 1831 text')
  return ops
}

test('identical texts are a single equal op', () => {
  assert.deepEqual(computeDiff('The same.', 'The same.'), [{ type: 'equal', text: 'The same.' }])
})

test('a one-word change keeps the surrounding words equal', () => {
  const ops = assertRoundTrip('Every one adored Elizabeth.', 'Every one loved Elizabeth.')
  assert.deepEqual(ops, [
    { type: 'equal', text: 'Every one ' },
    { type: 'delete', text: 'adored' },
    { type: 'insert', text: 'loved' },
    { type: 'equal', text: ' Elizabeth.' },
  ])
})

test('a shared word between two insertions is kept on both sides (Letter, Chapter VI)', () => {
  // Regression: the "semantic island" cleanup absorbed a short equal run into
  // both neighbours; when both were insertions the word appeared twice in
  // 1831 and vanished from 1818 ("Justine Moritz Justine Moritz").
  const a = '"And now I must tell you a little story that will please, and perhaps amuse you. Do you not remember Justine Moritz? Probably you do not.'
  const b = '"Little alteration, except the growth of our dear children, has taken place since you left us. My trifling occupations take up my time and amuse me. Do you remember on what occasion Justine Moritz entered our family? Probably you do not.'
  const ops = assertRoundTrip(a, b)
  const inserted = ops.filter((o) => o.type === 'insert').map((o) => o.text).join('')
  const deleted = ops.filter((o) => o.type === 'delete').map((o) => o.text).join('')
  assert.ok((inserted.match(/Justine Moritz/g) ?? []).length <= 1, 'the shared name must not be duplicated on the 1831 side')
  assert.ok((inserted.match(/amuse/g) ?? []).length <= 1, '"amuse" must not be duplicated on the 1831 side')
  assert.ok(deleted.includes('amuse you'), '"amuse you" must survive on the 1818 side')
})

test('a full rewrite collapses to one delete and one insert', () => {
  const a = 'My father had a sister whom he tenderly loved.'
  const b = 'From Italy they visited Germany and France with the utmost care.'
  const ops = assertRoundTrip(a, b)
  assert.deepEqual(ops.map((o) => o.type), ['delete', 'insert'])
})

test('never produces empty or adjacent same-type ops', () => {
  const a = 'She busied herself in following the aërial creations of the poets. The world was to me a secret, which I desired to discover.'
  const b = 'She busied herself with following the aerial creations of the poets; and in the majestic scenes she found delight. The world was to me a secret which I desired to divine.'
  const ops = assertRoundTrip(a, b)
  for (let i = 0; i < ops.length; i++) {
    assert.ok(ops[i].text.length > 0, 'empty op')
    if (i > 0) assert.notEqual(ops[i].type, ops[i - 1].type, 'adjacent ops of the same type')
  }
})
