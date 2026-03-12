import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import ChapterNav from '@/components/ChapterNav'
import DiffView from '@/components/DiffView'
import {
  readChapterList,
  readChapter,
  readChapterMeta,
  readChapterStructure,
  getAdjacentChapters,
} from '@/lib/data'
import { Edition } from '@/lib/types'

interface PageProps {
  params: Promise<{ chapter: string }>
}

export async function generateStaticParams() {
  const chapters = readChapterList()
  return chapters.map((ch) => ({ chapter: ch.slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { chapter } = await params
  const meta = readChapterMeta(chapter)
  return {
    title: meta ? `${meta.title} Diff — Frankendiff` : 'Diff — Frankendiff',
  }
}

export default async function DiffPage({ params }: PageProps) {
  const { chapter: slug } = await params

  const meta = readChapterMeta(slug)
  if (!meta) notFound()

  const chapters  = readChapterList()
  const structure = readChapterStructure()
  const groups    = readChapter(slug)
  const { prev, next } = getAdjacentChapters(slug)

  const available = meta.editions as Edition[]

  return (
    <>
      <SiteHeader mode="diff" activeSlug={slug} />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block w-44 shrink-0 pt-2">
            <ChapterNav
              chapters={chapters}
              structure={structure.rows}
              activeSlug={slug}
              activeEdition="1831"
              mode="diff"
            />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 max-w-2xl">
            <div className="mb-8 pb-6 border-b border-border">
              <p className="font-sans text-xs tracking-widest text-muted uppercase mb-2">
                Diff
              </p>
              <h1 className="font-serif text-3xl font-medium">{meta.title}</h1>
              {meta.labelsByEdition && (
                <p className="font-sans text-xs text-muted mt-1">
                  {meta.labelsByEdition['1818']} · {meta.labelsByEdition['1831']}
                </p>
              )}
            </div>

            <DiffView groups={groups} available={available} />

            {/* Prev / Next */}
            <nav className="flex justify-between items-center mt-12 pt-8 border-t border-border">
              {prev ? (
                <Link
                  href={`/diff/${prev.slug}`}
                  className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                >
                  <ChevronLeft size={16} />
                  {prev.title}
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`/diff/${next.slug}`}
                  className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                >
                  {next.title}
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <div />
              )}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}
