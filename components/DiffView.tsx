import { AlignedParagraphGroup, Edition, DiffOp, ParagraphElementType, rowText } from '@/lib/types'
import DiffDisplay from './DiffDisplay'
import SectionStartMarker from './SectionStartMarker'

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

      {/* Diff paragraphs */}
      <div className="space-y-8">
        {groups.map((group) => {
          const textA = rowText(group, EDITION_A)
          const textB = rowText(group, EDITION_B)

          const rawOps = group.diffs[diffKey] ?? group.diffs[reversedKey] ?? []
          const isReversed = !group.diffs[diffKey] && !!group.diffs[reversedKey]

          let ops: DiffOp[]
          if (rawOps.length === 0 && textA === undefined && textB !== undefined) {
            // Row only exists in 1831 — entire text is an insertion
            ops = [{ type: 'insert', text: textB }]
          } else if (rawOps.length === 0 && textA !== undefined && textB === undefined) {
            // Row only exists in 1818 — entire text is a deletion
            ops = [{ type: 'delete', text: textA }]
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
            group.paragraphs[EDITION_A]?.[0]?.elementType ?? group.paragraphs[EDITION_B]?.[0]?.elementType ?? 'body'

          // A section that begins with the row's first paragraph is marked
          // above the row; one that begins at a break inside the row is
          // marked at that break (DiffDisplay).
          const starts = (Object.entries(group.sectionStart ?? {}) as [Edition, NonNullable<AlignedParagraphGroup['sectionStart']>[Edition]][])
            .filter(([edition, start]) => start && group.paragraphs[edition]?.[0]?.id === start.paragraphId)

          return (
            <div key={group.alignmentKey} className="pb-8 border-b border-dashed border-border text-pretty last:border-0">
              {starts.map(([edition, start]) =>
                start ? <SectionStartMarker key={edition} edition={edition} start={start} variant="diff" /> : null,
              )}
              <DiffDisplay ops={ops} elementType={elementType} group={group} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
