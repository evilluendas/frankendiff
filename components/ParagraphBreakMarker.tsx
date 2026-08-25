import { Pilcrow } from 'lucide-react'
import { DiffOpType } from '@/lib/types'

const STYLE: Record<DiffOpType, { cls: string; label: string }> = {
  insert: { cls: 'bg-ins-bg text-ins-text', label: 'New paragraph in 1831' },
  delete: { cls: 'bg-del-bg text-del-text', label: 'Paragraph break in 1818 only' },
  equal: { cls: 'bg-subtle text-muted', label: 'New paragraph in both editions' },
}

/**
 * Marks a paragraph break inside a diffed row: green when 1831 split the
 * paragraph, red when 1831 joined two paragraphs of 1818, neutral when both
 * editions break here. Sits on its own line between the two blocks, in the
 * same colours as the inline changes it belongs with.
 */
export default function ParagraphBreakMarker({ type }: { type: DiffOpType }) {
  const { cls, label } = STYLE[type]
  return (
    <div className="my-3 font-sans text-xs" role="note">
      <span className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 ${cls}`}>
        <Pilcrow size={12} strokeWidth={2} aria-hidden="true" />
        {label}
      </span>
    </div>
  )
}
