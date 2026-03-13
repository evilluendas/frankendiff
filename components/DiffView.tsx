import { AlignedParagraphGroup, Edition, DiffOp, ParagraphElementType } from '@/lib/types'
import DiffDisplay from './DiffDisplay'

interface DiffViewProps {
  groups: AlignedParagraphGroup[]
  available: Edition[]
}

// The comparison is always 1818 → 1831.
const EDITION_A: Edition = '1818'
const EDITION_B: Edition = '1831'

export default function DiffView({ groups }: DiffViewProps) {
  const diffKey = `${EDITION_A}_${EDITION_B}`
  const reversedKey = `${EDITION_B}_${EDITION_A}`

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-8 font-sans text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-ins-bg" />
          Added in {EDITION_B}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-del-bg" />
          Removed from {EDITION_A}
        </span>
      </div>

      {/* Diff paragraphs */}
      <div className="space-y-8">
        {groups.map((group) => {
          const paraA = group.paragraphs[EDITION_A]
          const paraB = group.paragraphs[EDITION_B]

          const rawOps = group.diffs[diffKey] ?? group.diffs[reversedKey] ?? []
          const isReversed = !group.diffs[diffKey] && !!group.diffs[reversedKey]

          let ops: DiffOp[]
          if (rawOps.length === 0 && !paraA && paraB) {
            // Paragraph only exists in 1831 — entire text is an insertion
            ops = [{ type: 'insert', text: paraB.text }]
          } else if (rawOps.length === 0 && paraA && !paraB) {
            // Paragraph only exists in 1818 — entire text is a deletion
            ops = [{ type: 'delete', text: paraA.text }]
          } else {
            ops = isReversed
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
          }

          const elementType: ParagraphElementType =
            paraA?.elementType ?? paraB?.elementType ?? 'body'

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
