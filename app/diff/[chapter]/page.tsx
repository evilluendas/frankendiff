import { notFound } from 'next/navigation'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import SiteHeader from '@/components/SiteHeader'
import ChapterNav from '@/components/ChapterNav'
import DiffView from '@/components/DiffView'
import InlineTitle from '@/components/InlineTitle'
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
  const structureRow = structure.rows.find((r) => r.slug === slug)
  const splitNote = structureRow?.splitNote

  const label1818 = meta.labelsByEdition?.['1818'] ?? structureRow?.label1818 ?? null
  const label1831 = meta.labelsByEdition?.['1831'] ?? structureRow?.label1831 ?? null

  const cookieStore = await cookies()
  const rawEdition = cookieStore.get('frankendiff_edition')?.value
  const activeEdition: Edition = rawEdition === '1818' || rawEdition === '1831' ? rawEdition : '1831'

  return (
    <>
      <SiteHeader mode="diff" activeSlug={slug} activeEdition={activeEdition} />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-14">
          {/* Sidebar */}
          <aside className="hidden lg:block w-54 shrink-0 pt-2 pr-4 border-r border-border">
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
              <h1 className="font-serif text-3xl font-medium"><InlineTitle text={meta.title} /></h1>
              <div className="flex justify-between items-center mt-3">
                {label1818 && label1831 ? (
                  <p className="font-sans text-xs text-muted">
                    <span className="inline-block align-middle bg-subtle px-2 py-1 rounded">{label1818} (1818)</span> <ArrowRight size={12} className="inline-block align-middle" /> <span className="inline-block align-middle bg-subtle px-2 py-1 rounded">{label1831} (1831)</span>
                  </p>
                ) : !label1818 && label1831 ? (
                  <p className="font-sans text-xs text-muted">
                    <span className="inline-block align-middle bg-subtle px-2 py-1 rounded">New in 1831</span>
                  </p>
                ) : null}
                {/* Legend */}
                <div className="flex items-center gap-4 font-sans text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-ins-bg" />
                    Added in 1831
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-del-bg" />
                    Removed from 1818
                  </span>
                </div>
              </div>
            </div>

            {splitNote && (
              <div className="mb-6 px-4 py-3 rounded-md border border-border bg-subtle">
                <p className="font-sans text-muted leading-relaxed">{splitNote}</p>
              </div>
            )}

            <DiffView groups={groups} available={available} />

            {/* Prev / Next */}
            <nav className="flex justify-between items-center mt-12 pt-8 border-t border-border">
              {prev ? (
                <Link
                  href={`/diff/${prev.slug}`}
                  className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                >
                  <ChevronLeft size={16} />
                  <InlineTitle text={prev.title} />
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`/diff/${next.slug}`}
                  className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                >
                  <InlineTitle text={next.title} />
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
