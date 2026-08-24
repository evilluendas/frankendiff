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
 * A quiet editorial divider marking where one edition starts a new chapter
 * in the middle of the other edition's chapter.
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
      className="scroll-mt-24 my-4 flex items-center gap-4 font-sans text-xs tracking-widest uppercase text-muted select-none before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border"
    >
      <span className="text-center text-balance shrink">{text}</span>
    </div>
  )
}
