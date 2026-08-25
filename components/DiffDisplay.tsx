import { AlignedParagraphGroup, DiffOp, Edition, ParagraphElementType, SectionStart } from '@/lib/types'
import { renderDiffBlocks, DiffBreak } from '@/lib/utils'
import ParagraphBreakMarker from './ParagraphBreakMarker'
import SectionStartMarker from './SectionStartMarker'

interface DiffDisplayProps {
  ops: DiffOp[]
  elementType?: ParagraphElementType
  /** The row being shown, so a paragraph break inside it can be tied to a section start. */
  group?: AlignedParagraphGroup
}

export default function DiffDisplay({ ops, elementType = 'body', group }: DiffDisplayProps) {
  const isEmpty = !ops || ops.length === 0

  if (isEmpty) {
    return (
      <p className="prose-serif text-muted italic text-sm">
        No differences in this paragraph.
      </p>
    )
  }

  const blocks = renderDiffBlocks(ops)

  return (
    <>
      {blocks.map((block, i) => (
        <div key={i}>
          {block.breakBefore && (
            <>
              {/* The chapter note is about the boundary; the ¶ marker is part of
                  the change and belongs with the paragraph it opens, so it comes last. */}
              {sectionStartsAt(group, block.breakBefore).map(([edition, start]) => (
                <SectionStartMarker key={edition} edition={edition} start={start} variant="diff-within" />
              ))}
              <ParagraphBreakMarker type={block.breakBefore.type} />
            </>
          )}
          {elementType === 'poem' ? (
            <blockquote className="prose-serif italic border-l-2 border-border pl-4 leading-relaxed whitespace-pre-line">
              {block.nodes}
            </blockquote>
          ) : (
            <p
              className={[
                'prose-serif leading-[1.85]',
                elementType === 'signature' ? 'font-semibold [font-variant:small-caps]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {block.nodes}
            </p>
          )}
        </div>
      ))}
    </>
  )
}

/** Section starts (if any) that fall on the paragraph opened by a break. */
function sectionStartsAt(group: AlignedParagraphGroup | undefined, brk: DiffBreak): [Edition, SectionStart][] {
  if (!group?.sectionStart) return []
  const out: [Edition, SectionStart][] = []
  for (const [edition, start] of Object.entries(group.sectionStart) as [Edition, SectionStart | undefined][]) {
    const k = brk.boundary[edition]
    if (start && k !== undefined && group.paragraphs[edition]?.[k + 1]?.id === start.paragraphId) {
      out.push([edition, start])
    }
  }
  return out
}
