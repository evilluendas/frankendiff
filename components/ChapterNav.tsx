import Link from 'next/link'
import { ChapterMeta, Edition } from '@/lib/types'
import { ChapterStructureRow } from '@/lib/data'
import InlineTitle from '@/components/InlineTitle'

interface ChapterNavProps {
  chapters: ChapterMeta[]
  structure: ChapterStructureRow[]
  activeSlug?: string
  activeEdition?: Edition
  mode?: 'read' | 'diff'
  size?: 'sm' | 'base'
}

export default function ChapterNav({
  chapters,
  structure,
  activeSlug,
  activeEdition = '1831',
  mode = 'read',
  size = 'sm',
}: ChapterNavProps) {
  const chapterBySlug = new Map(chapters.map((ch) => [ch.slug, ch]))

  return (
    <nav aria-label="Chapters">
      <ul className="space-y-0.5">
        {structure.map((row) => {
          // Only show rows available in the active edition
          const label = activeEdition === '1818' ? row.label1818 : row.label1831
          if (!label) return null

          const ch = chapterBySlug.get(row.slug)
          if (!ch) return null

          const href = mode === 'diff'
            ? `/diff/${ch.slug}`
            : `/chapter/${ch.slug}?edition=${activeEdition}`
          const isActive = ch.slug === activeSlug

          return (
            <li key={ch.slug}>
              {/* Volume break dividers are meaningful only when reading 1818 */}
              {row.volBreak && activeEdition === '1818' && (
                <p className={[
                  'px-3 font-sans tracking-widest uppercase text-muted/60 select-none',
                  size === 'base'
                    ? 'mt-6 mb-2 text-xs relative flex gap-6 items-center text-nowrap text-center before:content-[" "] before:block before:h-[1px] before:w-full before:bg-border/50 after:content-[" "] after:block after:h-[1px] after:w-full after:bg-border/50'
                    : 'mt-3 mb-1 text-[10px]',
                ].join(' ')}>
                  {row.volBreak}
                </p>
              )}
              <Link
                href={href}
                className={[
                  'block px-3 rounded-md transition-colors',
                  size === 'base' ? 'py-4 text-xl font-serif text-center' : 'py-2 text-sm',
                  isActive
                    ? 'bg-subtle text-fg font-medium'
                    : 'text-muted hover:text-fg hover:bg-subtle',
                ].join(' ')}
              >
                <InlineTitle text={label} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
