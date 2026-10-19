import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { renderSnapshots, SNAPSHOT_DIR } from '../scripts/snapshot'

/**
 * The committed HTML snapshots (tests/snapshots/) must match what the pages
 * render now, so that every PR's diff shows its effect on the markup.
 */

test('the HTML snapshots are up to date (npm run snapshot rewrites them)', () => {
  const rendered = renderSnapshots()
  const onDisk = new Set(
    (fs.readdirSync(SNAPSHOT_DIR, { recursive: true }) as string[])
      .filter((f) => f.endsWith('.html'))
      .map((f) => f.split(path.sep).join('/')),
  )
  const stale: string[] = []
  for (const [file, html] of rendered) {
    if (!onDisk.has(file)) stale.push(`${file} (missing)`)
    else if (fs.readFileSync(path.join(SNAPSHOT_DIR, file), 'utf-8') !== html) stale.push(`${file} (changed)`)
  }
  for (const file of onDisk) if (!rendered.has(file)) stale.push(`${file} (no longer rendered)`)
  assert.deepEqual(stale, [], 'run `npm run snapshot` and commit tests/snapshots/')
})
