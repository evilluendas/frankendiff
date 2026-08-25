import { DiffOpType } from '@/lib/types'

const STYLE: Record<DiffOpType, { cls: string; label: string }> = {
  insert: { cls: 'bg-ins-bg text-ins-text', label: 'New paragraph in 1831' },
  delete: { cls: 'bg-del-bg text-del-text', label: 'Paragraph break in 1818 only' },
  equal: { cls: 'bg-subtle text-muted', label: 'New paragraph in both editions' },
}

/**
 * Marks a paragraph break inside a diffed row with a pilcrow at the head of
 * the paragraph it opens: green when 1831 split the paragraph, red when 1831
 * joined two paragraphs of 1818, neutral when both editions break here. Same
 * colours as the inline changes it belongs with; the label is in the tooltip.
 */
export default function ParagraphBreakMarker({ type }: { type: DiffOpType }) {
  const { cls, label } = STYLE[type]
  const className = `${cls} rounded-sm px-1 mr-1.5 select-none no-underline`
  const props = { className, title: label, 'aria-label': label, role: 'img' as const }
  if (type === 'insert') return <ins {...props}>¶</ins>
  if (type === 'delete') return <del {...props}>¶</del>
  return <span {...props}>¶</span>
}
