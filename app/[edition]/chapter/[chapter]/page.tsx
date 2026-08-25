import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import ChapterNav from '@/components/ChapterNav'
import ChapterView from '@/components/ChapterView'
import CoverView from '@/components/CoverView'
import EditionSwitcher, { EditionLink } from '@/components/EditionSwitcher'
import InlineTitle from '@/components/InlineTitle'
import EditionCookieSync from '@/components/EditionCookieSync'
import ChapterNavFAB from '@/components/ChapterNavFAB'
import StickyReveal from '@/components/StickyReveal'
import {
  readChapterList,
  readChapterForEdition,
  readChapterMeta,
  readChapterStructure,
  getAdjacentChapters,
  getChapterFirstParagraph,
  ChapterStructureRow,
} from '@/lib/data'
import { Edition, EDITIONS } from '@/lib/types'
import { readHref } from '@/lib/routes'

interface PageProps {
  params: Promise<{ edition: string; chapter: string }>
}

/** Every edition × every section it contains — all prerendered. */
export async function generateStaticParams() {
  const chapters = readChapterList()
  return chapters.flatMap((ch) =>
    (ch.editions as Edition[]).map((edition) => ({ edition, chapter: ch.slug })),
  )
}

/** The edition segment must be a known edition that has this chapter. */
function resolveEdition(param: string, available: Edition[]): Edition | null {
  const edition = EDITIONS.find((e) => e === param)
  return edition && available.includes(edition) ? edition : null
}

const BOOK_TITLE: Record<Edition, string> = {
  '1818': 'Frankenstein; or, The Modern Prometheus (1818)',
  '1831': 'Frankenstein (1831)',
}

export async function generateMetadata({ params }: PageProps) {
  const { edition: editionParam, chapter } = await params
  const meta = readChapterMeta(chapter)

  const activeEdition: Edition =
    resolveEdition(editionParam, (meta?.editions ?? []) as Edition[]) ?? '1818'

  // Prefer the requested edition for the description snippet, then fall back
  const preferEditions: Edition[] =
    activeEdition === '1818' ? ['1818', '1831'] : ['1831', '1818']

  const firstParagraph = getChapterFirstParagraph(chapter, preferEditions)

  const chapterLabel = meta?.labelsByEdition?.[activeEdition] ?? meta?.title
  const title = chapterLabel
    ? `${chapterLabel.replace(/\*/g, '')} — ${BOOK_TITLE[activeEdition]} — Frankendiff`
    : 'Chapter — Frankendiff'

  return {
    title,
    ...(firstParagraph && { description: firstParagraph }),
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

export default async function ChapterPage({ params }: PageProps) {
  const { edition: editionParam, chapter: slug } = await params

  const meta = readChapterMeta(slug)
  if (!meta) notFound()

  const available = meta.editions as Edition[]
  const activeEdition = resolveEdition(editionParam, available)
  if (!activeEdition) notFound()

  const chapters  = readChapterList()
  const structure = readChapterStructure()
  const groups    = readChapterForEdition(slug, activeEdition)
  const { prev, next } = getAdjacentChapters(slug, activeEdition)

  // Build switcher links — each edition navigates to the correct corresponding chapter
  const editionLinks: EditionLink[] = EDITIONS.map((ed) => ({
    edition: ed,
    href: readHref(ed, getTargetSlug(slug, ed, structure.rows)),
  }))

  // Edition-appropriate labels for the heading and prev/next nav
  const chapterLabel = meta.labelsByEdition?.[activeEdition] ?? meta.title
  const prevLabel    = prev ? (prev.labelsByEdition?.[activeEdition] ?? prev.title) : null
  const nextLabel    = next ? (next.labelsByEdition?.[activeEdition] ?? next.title) : null

  // Hide the chapter H1 when the content opens with a book-title element (e.g. Cover)
  const hasBookTitle = groups.some(
    (g) => g.paragraphs[activeEdition]?.[0]?.elementType === 'book-title',
  )

  return (
    <>
      <SiteHeader mode="read" activeSlug={slug} activeEdition={activeEdition} />
      <EditionCookieSync edition={activeEdition} />
      <div className="view-read mx-auto pb-8">
        {/* Global edition switcher — spans full width above sidebar + content */}
        <StickyReveal>
          <EditionSwitcher activeEdition={activeEdition} links={editionLinks} />
        </StickyReveal>

        <div className="px-6 flex">
          <ChapterNavFAB>
            <ChapterNav
              chapters={chapters}
              structure={structure.rows}
              activeSlug={slug}
              activeEdition={activeEdition}
              mode="read"
              size="base"
            />
          </ChapterNavFAB>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex justify-center">
            <div className={hasBookTitle ? 'w-full max-w-md sm:max-w-3xl' : 'max-w-[68ch]'}>
              {hasBookTitle ? (
                <CoverView edition={activeEdition} />
              ) : (
                <>
                  <div className="mb-16">
                    <h1 className="pt-8 pb-16 font-display text-pretty text-3xl sm:text-5xl text-center font-medium uppercase leading-tight relative after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[1px] after:w-[100px] after:bg-fg"><InlineTitle text={chapterLabel} />.</h1>
                  </div>
                  <ChapterView groups={groups} edition={activeEdition} />
                </>
              )}

              {/* Prev / Next */}
              <nav className="flex justify-between items-center mt-14 pt-8 border-t border-border">
                {prev ? (
                  <Link
                    href={readHref(activeEdition, prev.slug)}
                    className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                  >
                    <ChevronLeft size={16} />
                    <InlineTitle text={prevLabel!} />
                  </Link>
                ) : (
                  <div />
                )}
                {next ? (
                  <Link
                    href={readHref(activeEdition, next.slug)}
                    className="flex items-center gap-1.5 font-sans text-sm text-muted hover:text-fg transition-colors"
                  >
                    <InlineTitle text={nextLabel!} />
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
