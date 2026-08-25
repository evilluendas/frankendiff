import { Fragment, ReactNode } from 'react'
import { AlignedParagraphGroup, Edition, SectionStart } from '@/lib/types'
import ParagraphGroup from './ParagraphGroup'
import SectionStartMarker from './SectionStartMarker'

interface ChapterViewProps {
  groups: AlignedParagraphGroup[]
  edition: Edition
}

export default function ChapterView({ groups, edition }: ChapterViewProps) {
  const paragraphs = groups.flatMap((group) => group.paragraphs[edition] ?? [])
  const firstBodyId = paragraphs.find((p) => (p.elementType ?? 'body') === 'body')?.id

  // Where the *other* edition starts a new chapter inside this one, show a
  // note before the next paragraph of this edition. Rows without a paragraph
  // in this edition can carry a marker too, so markers are held until the
  // next paragraph that is actually rendered. When the other edition's
  // chapter begins inside a row this edition covers with one paragraph, the
  // note says so.
  const items: ReactNode[] = []
  let pending: [Edition, SectionStart, boolean][] = []
  for (const group of groups) {
    for (const [ed, start] of Object.entries(group.sectionStart ?? {}) as [Edition, SectionStart | undefined][]) {
      if (!start || ed === edition) continue
      const within = (group.paragraphs[ed]?.findIndex((p) => p.id === start.paragraphId) ?? 0) > 0
      pending.push([ed, start, within])
    }
    const paras = group.paragraphs[edition]
    if (!paras?.length) continue
    items.push(
      <Fragment key={group.alignmentKey}>
        {pending.map(([ed, start, within]) => (
          <SectionStartMarker key={`${ed}-${start.slug}`} edition={ed} start={start} variant={within ? 'read-within' : 'read'} />
        ))}
        {paras.map((para) => (
          <ParagraphGroup key={para.id} para={para} dropCap={para.id === firstBodyId} />
        ))}
      </Fragment>,
    )
    pending = []
  }

  return <div className="flex flex-col gap-6">{items}</div>
}
