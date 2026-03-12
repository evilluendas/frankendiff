import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import ChapterNav from '@/components/ChapterNav'
import ChapterView from '@/components/ChapterView'
import EditionSwitcher, { EditionLink } from '@/components/EditionSwitcher'
import {
  readChapterList,
  readChapter,
  readChapterMeta,
  readChapterStructure,
  getAdjacentChapters,
  ChapterStructureRow,
} from '@/lib/data'
import { Edition, EDITIONS } from '@/lib/types'

interface PageProps {
  params: Promise<{ chapter: string }>
  searchParams: Promise<{ edition?: string }>
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

/**
 * Given the current slug and a target edition, find the best slug to navigate
 * to in that edition. If the slug exists in the target edition, return it as-is.
 * Otherwise, walk backward then forward through the structure to find the
 * nearest chapter that belongs to the target edition.
 */
function getTargetSlug(
  currentSlug: string,
  targetEdition: Edition,
  structure: ChapterStructureRow[],
): string {
  const labelKey = targetEdition === '1818' ? 'label1818' : 'label1831'
  const currentIdx = structure.findIndex((row) => row.slug === currentSlug)

  // Current slug exists in target edition — stay on it
  if (currentIdx >= 0 && structure[currentIdx][labelKey]) return currentSlug

  const searchFrom = currentIdx >= 0 ? currentIdx : structure.length

  // Walk backward first (prefer earlier chapters)
  for (let i = searchFrom - 1; i >= 0; i--) {
    if (structure[i][labelKey]) return structure[i].slug
  }

  // Then forward
  for (let i = searchFrom + 1; i < structure.length; i++) {
    if (structure[i][labelKey]) return structure[i].slug
  }

  return currentSlug
}

export default async function ChapterPage({ params, searchParams }: PageProps) {
  const { chapter: slug } = await params
  const { edition: editionParam } = await searchParams

  const meta = readChapterMeta(slug)
  if (!meta) notFound()

  const chapters  = readChapterList()
  const structure = readChapterStructure()
  const groups    = readChapter(slug)
  const { prev, next } = getAdjacentChapters(slug)

  const available = meta.editions as Edition[]

  // Resolve the active edition from the URL param, defaulting to 1831
  const activeEdition: Edition =
    EDITIONS.includes(editionParam as Edition) && available.includes(editionParam as Edition)
      ? (editionParam as Edition)
      : available.includes('1831') ? '1831' : available[0]

  // Build switcher links — each edition navigates to the correct corresponding chapter
  const editionLinks: EditionLink[] = EDITIONS.map((ed) => ({
    edition: ed,
    href: `/chapter/${getTargetSlug(slug, ed, structure.rows)}?edition=${ed}`,
  }))

  // Edition-appropriate labels for the heading and prev/next nav
  const chapterLabel = meta.labelsByEdition?.[activeEdition] ?? meta.title
  const prevLabel    = prev ? (prev.labelsByEdition?.[activeEdition] ?? prev.title) : null
  const nextLabel    = next ? (next.labelsByEdition?.[activeEdition] ?? next.title) : null

  return (
    <>
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Global edition switcher — spans full width above sidebar + content */}
        <EditionSwitcher activeEdition={activeEdition} links={editionLinks} />

        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block w-44 shrink-0">
            <ChapterNav
              chapters={chapters}
              structure={structure.rows}
              activeSlug={slug}
              activeEdition={activeEdition}
              mode="read"
            />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="max-w-[68ch]">
              <div className="mb-10 pb-7 border-b border-border">
                <p className="font-sans text-xs tracking-widest text-muted uppercase mb-3">
                  Reading
                </p>
                <h1 className="font-display text-4xl font-medium leading-tight">{chapterLabel}</h1>
              </div>

              <ChapterView groups={groups} edition={activeEdition} />

              {/* Prev / Next */}
              <nav className="flex justify-between items-center mt-14 pt-8 border-t border-border">
                {prev ? (
                  <Link
                    href={`/chapter/${prev.slug}?edition=${activeEdition}`}
                    className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                  >
                    <ChevronLeft size={16} />
                    {prevLabel}
                  </Link>
                ) : (
                  <div />
                )}
                {next ? (
                  <Link
                    href={`/chapter/${next.slug}?edition=${activeEdition}`}
                    className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                  >
                    {nextLabel}
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  <div />
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
