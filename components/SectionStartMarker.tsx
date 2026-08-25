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
 * "This chapter was created in 1831…" box) so it reads as the same device.
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
    <div
      id={sectionAnchor(edition, start.slug)}
      role="note"
      className="scroll-mt-24 my-6 px-4 py-3 rounded-md border border-note-border bg-note-bg"
    >
      <p className="font-sans text-note-text leading-relaxed">{text}</p>
    </div>
  )
}
