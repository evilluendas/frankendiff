'use client'

import { useState } from 'react'
import { AlignedParagraphGroup, Edition, DiffOp, ParagraphElementType } from '@/lib/types'
import DiffDisplay from './DiffDisplay'

interface DiffViewProps {
  groups: AlignedParagraphGroup[]
  available: Edition[]
}

export default function DiffView({ groups, available }: DiffViewProps) {
  const defaultA = available[0]
  const defaultB = available[available.length - 1]

  const [editionA, setEditionA] = useState<Edition>(defaultA)
  const [editionB, setEditionB] = useState<Edition>(defaultB)

  const diffKey = `${editionA}_${editionB}`
  const reversedKey = `${editionB}_${editionA}`

  return (
    <div>
      {/* Pair selector */}
      <div className="flex items-center gap-2 font-sans text-sm flex-wrap mb-6">
        <span className="text-muted text-xs">Compare</span>
        <EditionSelect
          value={editionA}
          options={available.filter((e) => e !== editionB)}
          onChange={setEditionA}
          label="Base edition"
        />
        <span className="text-muted text-xs">→</span>
        <EditionSelect
          value={editionB}
          options={available.filter((e) => e !== editionA)}
          onChange={setEditionB}
          label="Target edition"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-8 font-sans text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-ins-bg" />
          Added in {editionB}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-del-bg" />
          Removed from {editionA}
        </span>
      </div>

      {/* Diff paragraphs */}
      <div className="space-y-8">
        {groups.map((group) => {
          const rawOps = group.diffs[diffKey] ?? group.diffs[reversedKey] ?? []
          const isReversed = !group.diffs[diffKey] && !!group.diffs[reversedKey]

          const ops: DiffOp[] = isReversed
            ? rawOps.map((op) => ({
                ...op,
                type:
                  op.type === 'insert'
                    ? 'delete'
                    : op.type === 'delete'
                    ? 'insert'
                    : op.type,
              }))
            : rawOps

          const elementType: ParagraphElementType =
            group.paragraphs[editionA]?.elementType ??
            group.paragraphs[editionB]?.elementType ??
            'body'

          return (
            <div key={group.alignmentKey} className="pb-8 border-b border-border last:border-0">
              <DiffDisplay ops={ops} elementType={elementType} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditionSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: Edition
  options: Edition[]
  onChange: (v: Edition) => void
  label: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as Edition)}
      className="px-2 py-1 rounded border border-border bg-bg text-fg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-fg/30 cursor-pointer appearance-none pr-5"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 5px center',
      }}
    >
      {options.map((e) => (
        <option key={e} value={e}>
          {e}
        </option>
      ))}
    </select>
  )
}
