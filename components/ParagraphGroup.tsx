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
        <figure id={id} className="my-2 pl-4 border-l-2 border-border">
          <span className="font-sans text-[10px] uppercase tracking-widest text-muted select-none block mb-1">
            {ELEMENT_LABELS.poem}
          </span>
          <blockquote className="prose-serif text-fg italic whitespace-pre-line leading-relaxed">
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
