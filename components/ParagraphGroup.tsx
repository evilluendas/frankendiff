import { AlignedParagraphGroup, Edition } from '@/lib/types'

interface ParagraphGroupProps {
  group: AlignedParagraphGroup
  editions: Edition[]
}

export default function ParagraphGroup({ group, editions }: ParagraphGroupProps) {
  const cols = editions.length

  return (
    <div
      className="grid gap-8 py-6 border-b border-border last:border-0"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {editions.map((edition) => {
        const para = group.paragraphs[edition]
        return (
          <div key={edition} className="min-w-0">
            {para ? (
              <p
                className="prose-serif text-fg"
                id={`${edition}-${group.alignmentKey}`}
              >
                {para.text}
              </p>
            ) : (
              <p className="prose-serif text-muted italic text-sm">
                — not present in this edition —
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
