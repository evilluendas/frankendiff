import { AlignedParagraphGroup, BookParagraph, Edition, ParagraphElementType } from '@/lib/types'
import { renderText } from '@/lib/utils'

interface ParagraphGroupProps {
  group: AlignedParagraphGroup
  edition: Edition
  dropCap?: boolean
}

export default function ParagraphGroup({ group, edition, dropCap }: ParagraphGroupProps) {
  const para = group.paragraphs[edition]!
  return <ElementParagraph para={para} id={`${edition}-${group.alignmentKey}`} dropCap={dropCap} />
}

const ELEMENT_LABELS: Partial<Record<ParagraphElementType, string>> = {
  salutation: 'To',
  dateline: 'Date',
  closing: 'Closing',
  signature: 'Signature',
  poem: 'Verse',
}

function ElementParagraph({ para, id, dropCap }: { para: BookParagraph; id: string; dropCap?: boolean }) {
  const type = para.elementType ?? 'body'

  switch (type) {
    case 'salutation':
      return (
        <div id={id}>
          <p className="prose-serif text-fg">{renderText(para.text)}</p>
        </div>
      )

    case 'dateline':
      return (
        <div id={id}>
          <p className="prose-serif text-fg text-right">{renderText(para.text)}</p>
        </div>
      )

    case 'closing':
      return (
        <div id={id}>
          <p className="prose-serif text-fg text-right pr-16">{renderText(para.text)}</p>
        </div>
      )

    case 'signature':
      return (
        <div id={id}>
          <p className="prose-serif text-fg text-right font-semibold [font-variant:small-caps]">{renderText(para.text)}</p>
        </div>
      )

    case 'poem':
      return (
        <figure id={id} className="my-8">
          <blockquote className="prose-serif text-fg text-center whitespace-pre-line">
            {renderText(para.text)}
          </blockquote>
        </figure>
      )

    default:
      return (
        <p className={`prose-serif text-fg text-pretty ${dropCap ? 'drop-cap' : 'indent-10'}`} id={id}>
          {renderText(para.text)}
        </p>
      )
  }
}
