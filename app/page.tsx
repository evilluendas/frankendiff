import Link from 'next/link'
import { BookOpen, GitCompare, ArrowRight } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import { readChapterList } from '@/lib/data'
import { EDITION_LABELS } from '@/lib/types'

export default function HomePage() {
  const chapters = readChapterList()

  return (
    <>
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <section className="mb-20">
          <p className="font-sans text-xs tracking-widest text-muted uppercase mb-4">
            A textual comparison
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium leading-tight mb-6">
            Frankenstein
            <br />
            <span className="text-muted font-normal">Two Editions Compared</span>
          </h1>
          <p className="font-serif text-xl text-muted leading-relaxed max-w-2xl mb-8">
            Frankenstein exists in two major editions — the original 1818 text and Mary Shelley’s extensively revised 1831 version. This project lets you read them side by side and examine how the novel changed over time.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/chapter/${chapters[0]?.slug ?? '1'}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-fg text-bg rounded-md font-sans text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <BookOpen size={15} />
              Start reading
            </Link>
            <Link
              href={`/diff/${chapters[0]?.slug ?? '1'}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-subtle text-fg rounded-md font-sans text-sm font-medium hover:bg-border transition-colors"
            >
              <GitCompare size={15} />
              Explore differences
            </Link>
          </div>
        </section>

        {/* Edition timeline */}
        <section className="mb-20">
          <h2 className="font-sans text-xs tracking-widest text-muted uppercase mb-6">
            The two editions
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {(Object.entries(EDITION_LABELS) as [string, string][]).map(
              ([year, label]) => (
                <Link
                  key={year}
                  href={`/chapter/${chapters[0]?.slug ?? '1'}?editions=${year}`}
                  className="p-5 rounded-lg border border-border bg-subtle hover:border-muted transition-colors block"
                >
                  <p className="font-serif text-3xl font-medium mb-1">{year}</p>
                  <p className="font-sans text-xs text-muted mb-3">{label}</p>
                  <p className="font-serif text-sm text-muted leading-relaxed">
                    {year === '1818' &&
                      'Published anonymously. Dedicated to William Godwin. Percy Shelley contributed the preface.'}
                    {year === '1831' &&
                      'Substantially revised. Mary Shelley added a new preface and rewrote significant passages throughout.'}
                  </p>
                </Link>
              ),
            )}
          </div>
        </section>

        {/* Chapter list */}
        <section>
          <h2 className="font-sans text-xs tracking-widest text-muted uppercase mb-6">
            Chapters
          </h2>
          <div className="divide-y divide-border border-y border-border">
            {chapters.map((ch) => (
              <div
                key={ch.slug}
                className="flex items-center justify-between py-4 gap-4"
              >
                <div>
                  <p className="font-serif text-base">{ch.title}</p>
                  <p className="font-sans text-xs text-muted mt-0.5">
                    {ch.editions.join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/chapter/${ch.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs text-muted hover:text-fg hover:bg-subtle transition-colors border border-transparent hover:border-border"
                  >
                    <BookOpen size={12} />
                    Read
                  </Link>
                  <Link
                    href={`/diff/${ch.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs text-muted hover:text-fg hover:bg-subtle transition-colors border border-transparent hover:border-border"
                  >
                    <GitCompare size={12} />
                    Diff
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <footer className="mt-20 pt-8 border-t border-border">
          <p className="font-sans text-xs text-muted leading-relaxed max-w-lg">
            All texts are in the public domain. Source texts from{' '}
            <a
              href="https://www.gutenberg.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-fg transition-colors"
            >
              Project Gutenberg
            </a>
            . Paragraph alignment is currently positional; manual overrides can
            be added via{' '}
            <code className="font-mono text-[0.8em]">
              content/alignment-overrides.json
            </code>
            .
          </p>
        </footer>
      </main>
    </>
  )
}
