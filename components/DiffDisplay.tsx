import { DiffOp, ParagraphElementType } from '@/lib/types'
import { renderText } from '@/lib/utils'

interface DiffDisplayProps {
  ops: DiffOp[]
  elementType?: ParagraphElementType
}

const ELEMENT_LABELS: Partial<Record<ParagraphElementType, string>> = {
  salutation: 'To',
  dateline: 'Date',
  closing: 'Closing',
  signature: 'Signature',
  poem: 'Verse',
}

export default function DiffDisplay({ ops, elementType = 'body' }: DiffDisplayProps) {
  const label = ELEMENT_LABELS[elementType]
  const isEmpty = !ops || ops.length === 0

  const content = isEmpty ? (
    <p className="prose-serif text-muted italic text-sm">
      No differences in this paragraph.
    </p>
  ) : elementType === 'poem' ? (
    <blockquote className="prose-serif italic border-l-2 border-border pl-4 leading-relaxed whitespace-pre-line">
      {renderOps(ops)}
    </blockquote>
  ) : (
    <p
      className={[
        'prose-serif leading-[1.85]',
        elementType === 'salutation' || elementType === 'closing' ? 'italic text-sm' : '',
        elementType === 'dateline' ? 'font-sans text-sm text-muted' : '',
        elementType === 'signature' ? 'font-semibold' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {renderOps(ops)}
    </p>
  )

  if (!label) return content

  return (
    <div className="space-y-1">
      <span className="font-sans text-[10px] uppercase tracking-widest text-muted select-none">
        {label}
      </span>
      {content}
    </div>
  )
}

function renderOps(ops: DiffOp[]) {
  return ops.map((op, i) => {
    if (op.type === 'equal') {
      return <span key={i}>{renderText(op.text)}</span>
    }
    if (op.type === 'insert') {
      return (
        <ins
          key={i}
          className="no-underline bg-ins-bg text-ins-text rounded-sm px-0.5"
          title="Added in this edition"
        >
          {renderText(op.text)}
        </ins>
      )
    }
    return (
      <del
        key={i}
        className="bg-del-bg text-del-text rounded-sm px-0.5"
        title="Removed in this edition"
      >
        {renderText(op.text)}
      </del>
    )
  })
}
