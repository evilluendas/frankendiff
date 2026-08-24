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

/**
 * Hover-revealed pilcrow in the left gutter linking to the paragraph's own id,
 * so a reader can copy a URL that lands on this paragraph. Desktop only —
 * there is no hover on touch screens and no gutter to put it in.
 */
function ParagraphAnchor({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this paragraph"
      className="hidden sm:block absolute top-0 -left-8 w-6 text-center font-sans text-base not-italic no-underline select-none text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-fg transition-opacity"
    >
      ¶
    </a>
  )
}

/** Wrapper classes shared by every linkable paragraph element. */
const LINKABLE = 'group relative scroll-mt-20'

function ElementParagraph({ para, id, dropCap }: { para: BookParagraph; id: string; dropCap?: boolean }) {
  const type = para.elementType ?? 'body'

  switch (type) {
    case 'salutation':
      return (
        <div id={id} className={LINKABLE}>
          <p className="prose-serif text-fg">{renderText(para.text)}</p>
          <ParagraphAnchor id={id} />
        </div>
      )

    case 'dateline':
      return (
        <div id={id} className={LINKABLE}>
          <p className="prose-serif text-fg text-right">{renderText(para.text)}</p>
          <ParagraphAnchor id={id} />
        </div>
      )

    case 'closing':
      return (
        <div id={id} className={LINKABLE}>
          <p className="prose-serif text-fg text-right pr-16">{renderText(para.text)}</p>
          <ParagraphAnchor id={id} />
        </div>
      )

    case 'signature':
      return (
        <div id={id} className={LINKABLE}>
          <p className="prose-serif text-fg text-right font-semibold [font-variant:small-caps]">{renderText(para.text)}</p>
          <ParagraphAnchor id={id} />
        </div>
      )

    case 'book-title': {
      const [mainTitle, ...subtitleParts] = para.text.split(/;\s*/)
      const subtitle = subtitleParts.join('; ')
      return (
        <div id={id} className="text-center pt-4 pb-2">
          <p className="font-display text-4xl sm:text-5xl font-medium uppercase tracking-wide leading-tight text-fg">
            {mainTitle}
          </p>
          {subtitle && (
            <p className="font-display text-xl sm:text-2xl font-normal uppercase tracking-widest text-muted mt-3">
              {subtitle}
            </p>
          )}
        </div>
      )
    }

    case 'poem':
      return (
        <figure id={id} className={`${LINKABLE} my-8`}>
          <blockquote className="prose-serif text-fg text-center whitespace-pre-line">
            {renderText(para.text)}
          </blockquote>
          <ParagraphAnchor id={id} />
        </figure>
      )

    default:
      // The anchor comes last so the drop cap's ::first-letter still sees the text
      return (
        <p className={`${LINKABLE} prose-serif text-fg text-pretty ${dropCap ? 'drop-cap' : 'indent-10'}`} id={id}>
          {renderText(para.text)}
          <ParagraphAnchor id={id} />
        </p>
      )
  }
}
