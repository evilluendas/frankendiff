'use client'

import { useState } from 'react'
import { AlignedParagraphGroup, Edition, EDITION_LABELS } from '@/lib/types'
import ParagraphGroup from './ParagraphGroup'

interface ChapterViewProps {
  groups: AlignedParagraphGroup[]
  available: Edition[]
  initialEditions?: Edition[]
}

export default function ChapterView({ groups, available, initialEditions }: ChapterViewProps) {
  const [selected, setSelected] = useState<Edition[]>(initialEditions ?? available)

  function toggle(edition: Edition) {
    const next = selected.includes(edition)
      ? selected.filter((e) => e !== edition)
      : [...selected, edition].sort() as Edition[]
    if (next.length === 0) return
    setSelected(next)
  }

  return (
    <div>
      {/* Edition selector */}
      <div className="flex items-center gap-1 flex-wrap mb-8">
        <span className="text-xs text-muted font-sans mr-1">Editions:</span>
        {available.map((edition) => {
          const active = selected.includes(edition)
          return (
            <button
              key={edition}
              onClick={() => toggle(edition)}
              aria-pressed={active}
              title={EDITION_LABELS[edition]}
              className={[
                'px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors border',
                active
                  ? 'bg-fg text-bg border-fg'
                  : 'bg-transparent text-muted border-border hover:border-muted hover:text-fg',
              ].join(' ')}
            >
              {edition}
            </button>
          )
        })}
      </div>

      {/* Edition column headers */}
      {selected.length > 1 && (
        <div
          className="grid gap-8 mb-2"
          style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}
        >
          {selected.map((ed) => (
            <p key={ed} className="font-sans text-xs tracking-widest text-muted uppercase">
              {ed}
            </p>
          ))}
        </div>
      )}

      {/* Paragraphs */}
      {groups.map((group) => (
        <ParagraphGroup key={group.alignmentKey} group={group} editions={selected} />
      ))}
    </div>
  )
}
