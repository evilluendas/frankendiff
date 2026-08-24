import { Edition, SectionStart } from '@/lib/types'

interface SectionStartMarkerProps {
  edition: Edition
  start: SectionStart
  /** 'diff': "Chapter I ends here and Chapter II begins"; 'read': "Chapter II begins here" (shown in the other edition's text). */
  variant: 'diff' | 'read'
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
  const text =
    variant === 'diff'
      ? `In the ${edition} edition, ${start.afterLabel} ends here and ${start.label} begins.`
      : `In the ${edition} edition, ${start.label} begins here.`

  return (
    <div
      id={sectionAnchor(edition, start.slug)}
      role="note"
      className="scroll-mt-24 my-6 px-4 py-3 rounded-md border border-border bg-subtle"
    >
      <p className="font-sans text-muted leading-relaxed">{text}</p>
    </div>
  )
}
