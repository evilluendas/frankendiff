'use client'

import Link from 'next/link'
import { BookOpen, GitCompare } from 'lucide-react'
import { Edition, EDITION_LABELS } from '@/lib/types'
import { ChapterStructureRow } from '@/lib/data'
import InlineTitle from '@/components/InlineTitle'

const EDITION_DESCRIPTIONS: Record<Edition, string> = {
  '1818': 'The novel as it first appeared in 1818. Published anonymously in three volumes, with a preface written by Percy Bysshe Shelley. This text presents the story in its earliest form.',
  '1831': 'Mary Shelley substantially revised the novel for this edition, rewriting many passages and adding a new introduction describing the book’s origin. It became the version most widely read.',
}

interface EditionBrowserProps {
  structure: ChapterStructureRow[]
  edition: Edition
  onEditionChange: (ed: Edition) => void
}

export default function EditionBrowser({ structure, edition, onEditionChange }: EditionBrowserProps) {
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
          {(['1818', '1831'] as Edition[]).map((ed) => {
            const firstChapter = structure.find((row) =>
              ed === '1818' ? row.label1818 !== null : row.label1831 !== null,
            )
            return (
              <Link
                key={ed}
                href={firstChapter ? `/chapter/${firstChapter.slug}?edition=${ed}` : '#'}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault()
                    onEditionChange(ed)
                  }
                }}
                className={[
                  'p-5 rounded-lg border text-left transition-colors',
                  edition === ed
                    ? 'border-fg bg-border/50'
                    : 'border-border bg-subtle hover:border-muted',
                ].join(' ')}
              >
                <p className="font-serif text-3xl">{ed}</p>
                <p className="font-sans text-muted text-[10px] tracking-[0.18em] uppercase mb-3">{EDITION_LABELS[ed]}</p>
                <p className="font-serif text-muted tracking-[0.01em] leading-relaxed text-pretty">
                  {EDITION_DESCRIPTIONS[ed]}
                </p>
              </Link>
            )
          })}
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
                  <div className="pt-12 pb-2 border-b border-border">
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
                    <InlineTitle text={label} />
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/chapter/${row.slug}?edition=${edition}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-sm text-muted hover:text-fg hover:bg-subtle transition-colors"
                    >
                      <BookOpen size={12} />
                      Read
                    </Link>
                    <Link
                      href={`/diff/${row.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-sm text-muted hover:text-fg hover:bg-subtle transition-colors"
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
