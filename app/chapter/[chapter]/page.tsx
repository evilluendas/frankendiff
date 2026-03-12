import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import ChapterNav from '@/components/ChapterNav'
import ChapterView from '@/components/ChapterView'
import {
  readChapterList,
  readChapter,
  readChapterMeta,
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
    title: meta ? `${meta.title} — Frankendiff` : 'Chapter — Frankendiff',
  }
}

export default async function ChapterPage({ params }: PageProps) {
  const { chapter: slug } = await params

  const meta = readChapterMeta(slug)
  if (!meta) notFound()

  const chapters = readChapterList()
  const groups = readChapter(slug)
  const { prev, next } = getAdjacentChapters(slug)

  const available = meta.editions as Edition[]

  return (
    <>
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block w-44 shrink-0 pt-2">
            <ChapterNav chapters={chapters} activeSlug={slug} mode="read" />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="mb-8 pb-6 border-b border-border">
              <p className="font-sans text-xs tracking-widest text-muted uppercase mb-2">
                Reading
              </p>
              <h1 className="font-serif text-3xl font-medium">{meta.title}</h1>
            </div>

            <ChapterView groups={groups} available={available} />

            {/* Prev / Next */}
            <nav className="flex justify-between items-center mt-12 pt-8 border-t border-border">
              {prev ? (
                <Link
                  href={`/chapter/${prev.slug}`}
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
                  href={`/chapter/${next.slug}`}
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
