'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, GitCompare } from 'lucide-react'
import { Edition } from '@/lib/types'
import { ChapterStructureRow } from '@/lib/data'
import SiteHeader from './SiteHeader'
import EditionBrowser from './EditionBrowser'

interface HomepageContentProps {
  structure: ChapterStructureRow[]
  initialEdition: Edition
}

export default function HomepageContent({ structure, initialEdition }: HomepageContentProps) {
  const [edition, setEdition] = useState<Edition>(initialEdition)

  useEffect(() => {
    document.cookie = `frankendiff_edition=${edition}; path=/; max-age=31536000; SameSite=Lax`
  }, [edition])

  return (
    <>
      <SiteHeader activeEdition={edition} />

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <section className="mb-8">
          <p className="font-sans text-xs tracking-widest text-muted uppercase mb-4">
            A textual comparison
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium leading-tight mb-6">
            Frankenstein
            <br />
            <span className="text-muted font-normal">Two Editions Compared</span>
          </h1>
          <p className="font-serif text-xl text-muted leading-relaxed max-w-2xl mb-8">
            Mary Shelley&apos;s <em>Frankenstein</em> exists in two major versions: the original
            1818 text, and an extensively revised 1831 edition. This project lets you read both
            of them and explore how the novel changed over time, from small wording changes to
            substantial rewrites.
          </p>
        </section>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 mb-20">
          <Link
            href={`/chapter/cover?edition=${edition}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-fg text-bg rounded-md font-sans text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <BookOpen size={15} />
            Start reading
          </Link>
          <Link
            href="/diff/cover"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-subtle text-fg rounded-md font-sans text-sm font-medium hover:bg-border transition-colors"
          >
            <GitCompare size={15} />
            Explore differences
          </Link>
        </div>

        {/* Interactive edition browser */}
        <EditionBrowser structure={structure} edition={edition} onEditionChange={setEdition} />

        {/* Footer note */}
        <footer className="mt-20 pt-8 border-t border-border flex items-center justify-between gap-4 flex-wrap">
          <p className="font-sans text-xs text-muted leading-relaxed">
            All texts are in the public domain. Source texts from{' '}
            <a
              href="https://en.wikisource.org/wiki/Frankenstein,_or_the_Modern_Prometheus"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-fg transition-colors"
            >
              Wikisource
            </a>
            .
          </p>
          <Link
            href="/about"
            className="font-sans text-xs text-muted hover:text-fg transition-colors shrink-0"
          >
            About
          </Link>
        </footer>
      </main>
    </>
  )
}
