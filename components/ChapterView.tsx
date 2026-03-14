import { AlignedParagraphGroup, Edition } from '@/lib/types'
import ParagraphGroup from './ParagraphGroup'

interface ChapterViewProps {
  groups: AlignedParagraphGroup[]
  edition: Edition
}

export default function ChapterView({ groups, edition }: ChapterViewProps) {
  const filtered = groups.filter((group) => group.paragraphs[edition] != null)
  const firstBodyKey = filtered.find(
    (group) => (group.paragraphs[edition]?.elementType ?? 'body') === 'body',
  )?.alignmentKey

  return (
    <div className="flex flex-col gap-6">
      {filtered.map((group) => (
        <ParagraphGroup
          key={group.alignmentKey}
          group={group}
          edition={edition}
          dropCap={group.alignmentKey === firstBodyKey}
        />
      ))}
    </div>
  )
}
