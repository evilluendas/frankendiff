import { AlignedParagraphGroup, Edition } from '@/lib/types'
import ParagraphGroup from './ParagraphGroup'

interface ChapterViewProps {
  groups: AlignedParagraphGroup[]
  edition: Edition
}

export default function ChapterView({ groups, edition }: ChapterViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {groups
        .filter((group) => group.paragraphs[edition] != null)
        .map((group) => (
          <ParagraphGroup key={group.alignmentKey} group={group} edition={edition} />
        ))}
    </div>
  )
}
