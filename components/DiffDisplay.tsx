import { DiffOp, ParagraphElementType } from '@/lib/types'
import { renderDiffOps } from '@/lib/utils'

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
        elementType === 'salutation' || elementType === 'closing' ? '' : '',
        elementType === 'dateline' ? '' : '',
        elementType === 'signature' ? 'font-semibold [font-variant:small-caps]' : '',
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
      {content}
    </div>
  )
}

function renderOps(ops: DiffOp[]) {
  return renderDiffOps(ops)
}
