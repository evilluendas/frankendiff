import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { BookOpen, GitCompare } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import EditionBrowser from '@/components/EditionBrowser'
import { readChapterStructure } from '@/lib/data'
import { Edition } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Frankendiff — Frankenstein Editions Compared',
  description:
    "Mary Shelley's Frankenstein exists in two major versions: the original 1818 text, and an extensively revised 1831 edition. Read both and explore how the novel changed over time.",
}

export default async function HomePage() {
  const structure = readChapterStructure()
  const cookieStore = await cookies()
  const raw = cookieStore.get('frankendiff_edition')?.value
  const initialEdition: Edition = raw === '1818' || raw === '1831' ? raw : '1818'
  const lastChapter = cookieStore.get('frankendiff_chapter')?.value ?? undefined

  return (
    <>
      <SiteHeader activeEdition={initialEdition} activeSlug={lastChapter} />

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
            Mary Shelley’s <em>Frankenstein</em> exists in two major versions: the original 1818 text, and an extensively revised 1831 edition. This project lets you read both of them and explore how the novel changed over time, from small wording changes to substantial rewrites.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/chapter/cover?edition=1818"
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
        </section>

        {/* Interactive edition browser */}
        <EditionBrowser structure={structure.rows} initialEdition={initialEdition} />

        {/* Footer note */}
        <footer className="mt-20 pt-8 border-t border-border">
          <p className="font-sans text-xs text-muted leading-relaxed max-w-lg">
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
        </footer>
      </main>
    </>
  )
}
