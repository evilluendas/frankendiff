import Link from 'next/link'
import { BookOpen, GitCompare } from 'lucide-react'
import { ChapterMeta } from '@/lib/types'

interface ChapterNavProps {
  chapters: ChapterMeta[]
  activeSlug?: string
  mode?: 'read' | 'diff'
}

export default function ChapterNav({
  chapters,
  activeSlug,
  mode = 'read',
}: ChapterNavProps) {
  return (
    <nav aria-label="Chapters">
      <ul className="space-y-0.5">
        {chapters.map((ch) => {
          const href =
            mode === 'diff' ? `/diff/${ch.slug}` : `/chapter/${ch.slug}`
          const isActive = ch.slug === activeSlug

          return (
            <li key={ch.slug}>
              <Link
                href={href}
                className={[
                  'block px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-subtle text-fg font-medium'
                    : 'text-muted hover:text-fg hover:bg-subtle',
                ].join(' ')}
              >
                {ch.title}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Mode switcher */}
      {activeSlug && (
        <div className="mt-6 pt-4 border-t border-border space-y-0.5">
          <Link
            href={`/chapter/${activeSlug}`}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              mode === 'read'
                ? 'bg-subtle text-fg font-medium'
                : 'text-muted hover:text-fg hover:bg-subtle',
            ].join(' ')}
          >
            <BookOpen size={14} />
            Read side-by-side
          </Link>
          <Link
            href={`/diff/${activeSlug}`}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              mode === 'diff'
                ? 'bg-subtle text-fg font-medium'
                : 'text-muted hover:text-fg hover:bg-subtle',
            ].join(' ')}
          >
            <GitCompare size={14} />
            Diff view
          </Link>
        </div>
      )}
    </nav>
  )
}
