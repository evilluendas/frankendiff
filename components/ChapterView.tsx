import { Fragment, ReactNode } from 'react'
import { AlignedParagraphGroup, Edition, SectionStart } from '@/lib/types'
import ParagraphGroup from './ParagraphGroup'
import SectionStartMarker from './SectionStartMarker'

interface ChapterViewProps {
  groups: AlignedParagraphGroup[]
  edition: Edition
}

export default function ChapterView({ groups, edition }: ChapterViewProps) {
  const filtered = groups.filter((group) => group.paragraphs[edition] != null)
  const firstBodyKey = filtered.find(
    (group) => (group.paragraphs[edition]?.elementType ?? 'body') === 'body',
  )?.alignmentKey

  // Where the *other* edition starts a new chapter inside this one, show a
  // note before the next paragraph of this edition. Rows without a paragraph
  // in this edition can carry a marker too, so markers are held until the
  // next paragraph that is actually rendered.
  const items: ReactNode[] = []
  let pending: [Edition, SectionStart][] = []
  for (const group of groups) {
    for (const [ed, start] of Object.entries(group.sectionStart ?? {}) as [Edition, SectionStart | undefined][]) {
      if (start && ed !== edition) pending.push([ed, start])
    }
    if (group.paragraphs[edition] == null) continue
    items.push(
      <Fragment key={group.alignmentKey}>
        {pending.map(([ed, start]) => (
          <SectionStartMarker key={`${ed}-${start.slug}`} edition={ed} start={start} variant="read" />
        ))}
        <ParagraphGroup
          group={group}
          edition={edition}
          dropCap={group.alignmentKey === firstBodyKey}
        />
      </Fragment>,
    )
    pending = []
  }

  return <div className="flex flex-col gap-6">{items}</div>
}
