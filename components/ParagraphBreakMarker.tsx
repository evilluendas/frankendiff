import { DiffOpType } from '@/lib/types'

const LABEL: Record<DiffOpType, string> = {
  insert: 'New paragraph in 1831',
  delete: 'Paragraph break in 1818 only',
  equal: 'New paragraph in both editions',
}

/**
 * Marks a paragraph break inside a diffed row with a pilcrow at the head of
 * the paragraph it opens: an <ins> (green) when 1831 split the paragraph, a
 * <del> (red) when 1831 joined two paragraphs of 1818, a neutral <span> when
 * both editions break here. Same colours as the inline changes it belongs
 * with (.pilcrow in globals.css); the label is in the tooltip.
 */
export default function ParagraphBreakMarker({ type }: { type: DiffOpType }) {
  const label = LABEL[type]
  const props = { className: 'pilcrow', title: label, 'aria-label': label, role: 'img' as const }
  if (type === 'insert') return <ins {...props}>¶</ins>
  if (type === 'delete') return <del {...props}>¶</del>
  return <span {...props}>¶</span>
}
