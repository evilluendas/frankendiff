import { AlignedParagraphGroup, Edition, DiffOp, ParagraphElementType } from '@/lib/types'
import DiffDisplay from './DiffDisplay'

interface DiffViewProps {
  groups: AlignedParagraphGroup[]
  available: Edition[]
}

export default function DiffView({ groups, available }: DiffViewProps) {
  const editionA = available[0]
  const editionB = available[available.length - 1]

  const diffKey = `${editionA}_${editionB}`
  const reversedKey = `${editionB}_${editionA}`

  return (
    <div>
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
