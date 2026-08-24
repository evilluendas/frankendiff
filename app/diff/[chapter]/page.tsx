import { notFound, redirect } from 'next/navigation'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import SiteHeader from '@/components/SiteHeader'
import ChapterNav from '@/components/ChapterNav'
import DiffView from '@/components/DiffView'
import InlineTitle from '@/components/InlineTitle'
import ChapterNavFAB from '@/components/ChapterNavFAB'
import StickyChapterNav from '@/components/StickyChapterNav'
import { sectionAnchor } from '@/components/SectionStartMarker'
import {
  readChapterList,
  readChapter,
  readChapterMeta,
  readChapterStructure,
  getAdjacentDiffUnits,
} from '@/lib/data'
import { ChapterMeta, Edition, EDITIONS } from '@/lib/types'

interface PageProps {
  params: Promise<{ chapter: string }>
}

export async function generateStaticParams() {
  const chapters = readChapterList()
  // Chapters diffed inside another unit redirect there; no page to build
  return chapters.filter((ch) => !ch.diffUnit).map((ch) => ({ chapter: ch.slug }))
}

/** Diff-view heading per edition, e.g. "Volume I, Chapter I" → "Chapters I–II". */
function diffLabel(meta: ChapterMeta, edition: Edition, fallback: string | null | undefined): string | null {
  return meta.diffLabelsByEdition?.[edition] ?? meta.labelsByEdition?.[edition] ?? fallback ?? null
}

/** Where a chapter absorbed into a diff unit should send the reader. */
function unitHref(meta: ChapterMeta): string {
  const unit = readChapterMeta(meta.diffUnit!)
  const edition = EDITIONS.find((e) => unit?.unitSections?.[e]?.includes(meta.slug))
  return edition ? `/diff/${meta.diffUnit}#${sectionAnchor(edition, meta.slug)}` : `/diff/${meta.diffUnit}`
}

export async function generateMetadata({ params }: PageProps) {
  const { chapter } = await params
  const meta = readChapterMeta(chapter)
  if (!meta) return { title: 'Diff — Frankendiff' }

  const structure = readChapterStructure()
  const row = structure.rows.find((r) => r.slug === chapter)
  const label1818 = diffLabel(meta, '1818', row?.label1818)
  const label1831 = diffLabel(meta, '1831', row?.label1831)

  let description: string
  if (!label1818 && label1831) {
    description = `${meta.title} was added to Frankenstein in the 1831 revised edition — read the full text and see how it fits into the new structure.`
  } else if (label1818 && label1831 && label1818 !== label1831) {
    description = `Compare "${label1818}" from the 1818 edition with "${label1831}" from the 1831 edition — explore every addition, deletion, and rewrite Shelley made to this chapter of Frankenstein.`
  } else {
    description = `Explore every addition and deletion in ${meta.title} between the original 1818 and revised 1831 editions of Mary Shelley's Frankenstein.`
  }

  return {
    title: `${meta.title.replace(/\*/g, '')} Diff — Frankendiff`,
    description,
  }
}

export default async function DiffPage({ params }: PageProps) {
  const { chapter: slug } = await params

  const meta = readChapterMeta(slug)
  if (!meta) notFound()
  if (meta.diffUnit) redirect(unitHref(meta))

  const chapters  = readChapterList()
  const structure = readChapterStructure()
  const groups    = readChapter(slug)
  const { prev, next } = getAdjacentDiffUnits(slug)

  const available = meta.editions as Edition[]
  const structureRow = structure.rows.find((r) => r.slug === slug)
  const splitNote = structureRow?.splitNote

  const label1818 = diffLabel(meta, '1818', structureRow?.label1818)
  const label1831 = diffLabel(meta, '1831', structureRow?.label1831)

  const cookieStore = await cookies()
  const rawEdition = cookieStore.get('frankendiff_edition')?.value
  const activeEdition: Edition = rawEdition === '1818' || rawEdition === '1831' ? rawEdition : '1818'

  return (
    <>
      <SiteHeader mode="diff" activeSlug={slug} activeEdition={activeEdition} />
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex">
          {/* Sidebar */}
          <StickyChapterNav className="hidden lg:block w-54 shrink-0 py-14 pr-5 border-r border-border">
            <ChapterNav
              chapters={chapters}
              structure={structure.rows}
              activeSlug={slug}
              activeEdition="1831"
              mode="diff"
            />
          </StickyChapterNav>

          {/* FAB chapter nav — visible below lg */}
          <div className="lg:hidden">
            <ChapterNavFAB>
              <ChapterNav
                chapters={chapters}
                structure={structure.rows}
                activeSlug={slug}
                activeEdition="1831"
                mode="diff"
                size="base"
              />
            </ChapterNavFAB>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 max-w-2xl py-8 sm:px-6 lg:pl-14">
            <div className="mb-8 pb-6 border-b border-border">
              <p className="font-sans text-xs tracking-widest text-muted uppercase mb-2">
                Diff
              </p>
              <h1 className="font-serif text-3xl font-medium"><InlineTitle text={meta.title} /></h1>
              <div className="flex gap-3 justify-start sm:justify-between items-start sm:items-center mt-3">
                {label1818 && label1831 ? (
                  <p className="font-sans text-xs text-muted flex-1 shrink-0 whitespace-nowrap">
                    <span className="inline-block align-middle bg-subtle px-2 py-1 rounded">{label1818} (1818)</span> <ArrowRight size={12} className="inline-block align-middle" /> <span className="inline-block align-middle bg-subtle px-2 py-1 rounded">{label1831} (1831)</span>
                  </p>
                ) : !label1818 && label1831 ? (
                  <p className="font-sans text-xs text-muted">
                    <span className="inline-block align-middle bg-subtle px-2 py-1 rounded">New in 1831</span>
                  </p>
                ) : null}
                {/* Legend */}
                <div className="flex items-center gap-4 font-sans text-xs text-muted hidden sm:flex">
                  <span className="flex items-center gap-1.5 text-nowrap">
                    <span className="inline-block w-3 h-3 rounded-sm bg-ins-bg shrink-0" />
                    Added in 1831
                  </span>
                  <span className="flex items-center gap-1.5 text-nowrap">
                    <span className="inline-block w-3 h-3 rounded-sm bg-del-bg shrink-0" />
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
                  <InlineTitle text={prev.diffLabelsByEdition?.['1831'] ?? prev.title} />
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`/diff/${next.slug}`}
                  className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                >
                  <InlineTitle text={next.diffLabelsByEdition?.['1831'] ?? next.title} />
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
