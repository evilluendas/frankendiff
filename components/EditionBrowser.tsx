'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, GitCompare } from 'lucide-react'
import { Edition, EDITION_LABELS } from '@/lib/types'
import { ChapterStructureRow } from '@/lib/data'

const EDITION_DESCRIPTIONS: Record<Edition, string> = {
  '1818': 'Published anonymously. Three volumes with per-volume chapter numbering. Percy Shelley contributed the preface.',
  '1831': 'Substantially revised. Mary Shelley added a new introduction, replaced the preface, and rewrote significant passages throughout.',
}

interface EditionBrowserProps {
  structure: ChapterStructureRow[]
}

export default function EditionBrowser({ structure }: EditionBrowserProps) {
  const [edition, setEdition] = useState<Edition>('1831')

  const rows = structure.filter((row) =>
    edition === '1818' ? row.label1818 !== null : row.label1831 !== null,
  )

  return (
    <>
      {/* Edition cards */}
      <section className="mb-12">
        <h2 className="font-sans text-xs tracking-widest text-muted uppercase mb-6">
          The two editions
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {(['1818', '1831'] as Edition[]).map((ed) => (
            <button
              key={ed}
              onClick={() => setEdition(ed)}
              className={[
                'p-5 rounded-lg border text-left transition-colors',
                edition === ed
                  ? 'border-fg bg-fg/[0.04]'
                  : 'border-border bg-subtle hover:border-muted',
              ].join(' ')}
            >
              <p className="font-serif text-3xl font-medium mb-1">{ed}</p>
              <p className="font-sans text-xs text-muted mb-3">{EDITION_LABELS[ed]}</p>
              <p className="font-serif text-sm text-muted leading-relaxed text-pretty">
                {EDITION_DESCRIPTIONS[ed]}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Chapter list for selected edition */}
      <section>
        <h2 className="font-sans text-xs tracking-widest text-muted uppercase mb-6">
          Chapters
        </h2>
        <div className="divide-y divide-border border-y border-border">
          {rows.map((row) => {
            const label = edition === '1818' ? row.label1818! : row.label1831!
            return (
              <div key={row.slug}>
                {/* Volume break header — only meaningful for 1818 */}
                {row.volBreak && edition === '1818' && (
                  <div className="py-2 border-b border-border">
                    <span className="font-sans text-[10px] tracking-widest uppercase text-muted font-medium">
                      {row.volBreak}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-4 gap-4">
                  <Link
                    href={`/chapter/${row.slug}?edition=${edition}`}
                    className="font-serif text-base hover:text-muted transition-colors"
                  >
                    {label}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/chapter/${row.slug}?edition=${edition}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs text-muted hover:text-fg hover:bg-subtle transition-colors"
                    >
                      <BookOpen size={12} />
                      Read
                    </Link>
                    <Link
                      href={`/diff/${row.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs text-muted hover:text-fg hover:bg-subtle transition-colors"
                    >
                      <GitCompare size={12} />
                      Diff
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
