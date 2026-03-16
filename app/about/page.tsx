import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: 'About — Frankendiff',
  description:
    "About Frankendiff — a project comparing the 1818 and 1831 editions of Mary Shelley's Frankenstein.",
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main className="max-w-2xl mx-auto px-6 py-16">
        <p className="font-sans text-xs tracking-widest text-muted uppercase mb-4">
          About
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium leading-tight mb-10">
          Frankendiff
        </h1>

        {/* About the project */}
        <section className="mb-12">
          <p className="prose-serif text-fg mb-5">
            <em>Frankendiff</em> is a close-reading tool for Mary Shelley&apos;s{' '}
            <em>Frankenstein</em>. It places the novel&apos;s two major editions — 1818 and 1831 —
            side by side, paragraph by paragraph, so you can read either version in full or
            explore exactly how the text changed over thirteen years.
          </p>
          <p className="prose-serif text-fg">
            The diff view highlights every insertion and deletion, from a single reworded
            sentence to passages rewritten wholesale. The goal is to make the editorial
            history of the novel legible without requiring access to a university library or
            a collated scholarly edition.
          </p>
        </section>

        {/* The editions */}
        <section className="mb-12 pt-10 border-t border-border">
          <h2 className="font-serif text-2xl font-medium mb-6">The two editions</h2>

          <h3 className="font-sans text-xs tracking-widest text-muted uppercase mb-3">
            1818 — The original text
          </h3>
          <p className="prose-serif text-fg mb-8">
            The first edition was published anonymously in three volumes on 1 January 1818 by
            Lackington, Hughes, Harding, Mavor &amp; Jones, with a preface written by Percy
            Bysshe Shelley. It is widely regarded as the more radical version of the novel —
            politically sharper, more theologically irreverent, and closer in spirit to the
            Godwin–Wollstonecraft–Shelley circle in which it was conceived.
          </p>

          <h3 className="font-sans text-xs tracking-widest text-muted uppercase mb-3">
            1831 — The revised edition
          </h3>
          <p className="prose-serif text-fg">
            The 1831 edition was published as part of Bentley&apos;s Standard Novels series.
            Shelley revised it extensively: she softened some of the more provocative passages,
            expanded Victor Frankenstein&apos;s backstory and childhood, and shifted the
            novel&apos;s framing toward a more fatalistic, providential tone. She also added a
            new author&apos;s introduction — now almost as famous as the novel itself — describing
            how she came to write the story during the &ldquo;wet, ungenial summer&rdquo; at
            the Villa Diodati in 1816.
          </p>
        </section>

        {/* The 1823 edition */}
        <section className="mb-12 pt-10 border-t border-border">
          <h2 className="font-serif text-2xl font-medium mb-6">What about the 1823 edition?</h2>
          <p className="prose-serif text-fg mb-5">
            A second edition was published in two volumes in 1823 by G. and W.B. Whittaker.
            It has one notable distinction: it was the first edition to carry Shelley&apos;s
            name on the title page, rather than the anonymous attribution of the 1818 printing.
          </p>
          <p className="prose-serif text-fg">
            Beyond that, the 1823 edition introduced relatively few changes — mainly
            correcting typographical errors and some minor stylistic inconsistencies from the
            1818 text. It does not represent a significant editorial intervention in the way
            the 1831 revision does. For that reason it is not included in this project:
            the editorial story worth telling is the contrast between the raw 1818 first
            edition and the considered, heavily revised 1831 text.
          </p>
        </section>

        {/* Author */}
        <section className="mb-12 pt-10 border-t border-border">
          <h2 className="font-serif text-2xl font-medium mb-6">The author</h2>
          <p className="prose-serif text-fg mb-5">
            Frankendiff was built by{' '}
            <a
              href="https://github.com/evilluendas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted transition-colors"
            >
              evilluendas
            </a>
            . The source code is available on{' '}
            <a
              href="https://github.com/evilluendas/frankendiff"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted transition-colors"
            >
              GitHub
            </a>
            .
          </p>
          <p className="prose-serif text-fg">
            All texts are in the public domain. Source material from{' '}
            <a
              href="https://en.wikisource.org/wiki/Frankenstein,_or_the_Modern_Prometheus"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted transition-colors"
            >
              Wikisource
            </a>
            .
          </p>
        </section>
      </main>
    </>
  )
}
