import { Fragment } from 'react'
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

/**
 * The paragraphs of one diffed row, returned bare so they are direct children
 * of the row (DiffView), each preceded by the note for a section that begins
 * at its break. Styled by element in globals.css.
 */
export default function DiffDisplay({ ops, elementType = 'body', group }: DiffDisplayProps) {
  const isEmpty = !ops || ops.length === 0

  if (isEmpty) {
    return <p className="text-muted italic">No differences in this paragraph.</p>
  }

  return renderDiffBlocks(ops).map((block, i) => {
    // The chapter note is about the boundary and stands on its own; the ¶
    // marker is part of the change and opens the paragraph inline.
    const marker = block.breakBefore ? <ParagraphBreakMarker type={block.breakBefore.type} /> : null
    return (
      <Fragment key={i}>
        {block.breakBefore &&
          sectionStartsAt(group, block.breakBefore).map(([edition, start]) => (
            <SectionStartMarker key={edition} edition={edition} start={start} variant="diff-within" />
          ))}
        {elementType === 'poem' ? (
          <blockquote>
            {marker}
            {block.nodes}
          </blockquote>
        ) : (
          <p className={elementType === 'signature' ? 'signature' : undefined}>
            {marker}
            {block.nodes}
          </p>
        )}
      </Fragment>
    )
  })
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
