import { Edition, SectionStart } from '@/lib/types'

interface SectionStartMarkerProps {
  edition: Edition
  start: SectionStart
  /**
   * 'diff': "Chapter I ends here and Chapter II begins"; 'diff-within': the
   * same, when the other edition runs on in the same paragraph; 'read':
   * "Chapter II begins here" (shown in the other edition's text);
   * 'read-within': the same, when the break falls inside the paragraph that
   * follows.
   */
  variant: 'diff' | 'diff-within' | 'read' | 'read-within'
}

/** Stable anchor id so links can jump to where a section begins inside a diff unit. */
export function sectionAnchor(edition: Edition, slug: string): string {
  return `sec-${edition}-${slug}`
}

/**
 * A note marking where one edition starts a new chapter in the middle of the
 * other edition's chapter. Styled like the chapter-level notes (the former
 * "This chapter was created in 1831…" box) so it reads as the same device
 * (.section-note in globals.css). An <aside>, so that the Diff view's rules
 * for its paragraphs (`.diff-row > p`) leave it alone.
 */
export default function SectionStartMarker({ edition, start, variant }: SectionStartMarkerProps) {
  const other: Edition = edition === '1818' ? '1831' : '1818'
  const text =
    variant === 'diff'
      ? `In the ${edition} edition, ${start.afterLabel} ends here and ${start.label} begins.`
      : variant === 'diff-within'
      ? `In the ${edition} edition, ${start.afterLabel} ends here and ${start.label} begins; in ${other} the paragraph continues.`
      : variant === 'read-within'
      ? `In the ${edition} edition, ${start.label} begins within the following paragraph.`
      : `In the ${edition} edition, ${start.label} begins here.`

  return (
    <aside id={sectionAnchor(edition, start.slug)} role="note" className="section-note">
      {text}
    </aside>
  )
}
