import Link from 'next/link'
import { BookOpen, GitCompare } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Edition } from '@/lib/types'

interface SiteHeaderProps {
  mode?: 'read' | 'diff'
  activeSlug?: string
  activeEdition?: Edition
}

export default function SiteHeader({ mode, activeSlug, activeEdition = '1831' }: SiteHeaderProps) {
  const readHref  = activeSlug ? `/chapter/${activeSlug}?edition=${activeEdition}` : '/chapter/preface?edition=1818'
  const diffHref  = activeSlug ? `/diff/${activeSlug}` : '/diff/preface'

  return (
    <header className="border-b border-border bg-bg sticky top-0 z-10 h-14">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-lg font-medium flex items-center leading-tight hover:opacity-75 transition-opacity no-wrap"
        >
          <span className="z-1">Franken</span><ins className="inline no-underline bg-ins-bg text-ins-text rounded-sm pl-0.5 pr-1 -ml-0.5">diff</ins>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={readHref}
              className={[
                'flex items-center gap-2 px-3 h-8 rounded-md font-sans transition-colors',
                mode === 'read'
                  ? 'bg-subtle text-fg font-medium'
                  : 'text-muted hover:text-fg hover:bg-subtle',
              ].join(' ')}
            >
              <BookOpen size={14} />
              <span className="hidden sm:inline">Read</span>
            </Link>
            <Link
              href={diffHref}
              className={[
                'flex items-center gap-2 px-3 h-8 rounded-md font-sans transition-colors',
                mode === 'diff'
                  ? 'bg-subtle text-fg font-medium'
                  : 'text-muted hover:text-fg hover:bg-subtle',
              ].join(' ')}
            >
              <GitCompare size={14} />
              <span className="hidden sm:inline">Compare editions</span>
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
