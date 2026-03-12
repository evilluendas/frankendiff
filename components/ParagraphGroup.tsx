import { AlignedParagraphGroup, BookParagraph, Edition, ParagraphElementType } from '@/lib/types'
import { renderText } from '@/lib/utils'

interface ParagraphGroupProps {
  group: AlignedParagraphGroup
  edition: Edition
}

export default function ParagraphGroup({ group, edition }: ParagraphGroupProps) {
  const para = group.paragraphs[edition]!
  return <ElementParagraph para={para} id={`${edition}-${group.alignmentKey}`} />
}

const ELEMENT_LABELS: Partial<Record<ParagraphElementType, string>> = {
  salutation: 'To',
  dateline: 'Date',
  closing: 'Closing',
  signature: 'Signature',
  poem: 'Verse',
}

function ElementParagraph({ para, id }: { para: BookParagraph; id: string }) {
  const type = para.elementType ?? 'body'

  switch (type) {
    case 'salutation':
      return (
        <div id={id} className="space-y-0.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-muted select-none">
            {ELEMENT_LABELS.salutation}
          </span>
          <p className="prose-serif text-fg italic text-sm">{renderText(para.text)}</p>
        </div>
      )

    case 'dateline':
      return (
        <div id={id} className="space-y-0.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-muted select-none">
            {ELEMENT_LABELS.dateline}
          </span>
          <p className="font-sans text-muted text-sm">{renderText(para.text)}</p>
        </div>
      )

    case 'closing':
      return (
        <div id={id} className="space-y-0.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-muted select-none">
            {ELEMENT_LABELS.closing}
          </span>
          <p className="prose-serif text-fg italic">{renderText(para.text)}</p>
        </div>
      )

    case 'signature':
      return (
        <div id={id} className="space-y-0.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-muted select-none">
            {ELEMENT_LABELS.signature}
          </span>
          <p className="prose-serif text-fg font-semibold">{renderText(para.text)}</p>
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
        <p className="prose-serif text-fg" id={id}>
          {renderText(para.text)}
        </p>
      )
  }
}
