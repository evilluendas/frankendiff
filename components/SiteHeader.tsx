import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function SiteHeader() {
  return (
    <header className="border-b border-border bg-bg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-tight hover:opacity-75 transition-opacity"
        >
          Frankendiff
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              href="/chapter/1"
              className="px-3 py-1.5 rounded-md text-muted hover:text-fg hover:bg-subtle transition-colors font-sans"
            >
              Read
            </Link>
            <Link
              href="/diff/1"
              className="px-3 py-1.5 rounded-md text-muted hover:text-fg hover:bg-subtle transition-colors font-sans"
            >
              Diff
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
