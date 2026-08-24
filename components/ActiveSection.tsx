'use client'

import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Lets the chapter list follow the reader's scroll position inside a diff
 * unit that spans several chapters of one edition (e.g. 1818 Chapter I vs
 * 1831 Chapters I–II). The provider holds the slug that should currently be
 * highlighted; `SectionScrollSpy` updates it as section markers scroll past;
 * `ChapterNav` reads it and falls back to its `activeSlug` prop when there is
 * no provider (the Read view) or nothing has been observed yet.
 */

interface ActiveSectionState {
  activeSlug: string | null
  setActiveSlug: (slug: string | null) => void
}

const ActiveSectionContext = createContext<ActiveSectionState | null>(null)

export function ActiveSectionProvider({ children }: { children: React.ReactNode }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  return (
    <ActiveSectionContext.Provider value={{ activeSlug, setActiveSlug }}>
      {children}
    </ActiveSectionContext.Provider>
  )
}

/** The slug to highlight: the observed one if any, else the page's own. */
export function useActiveSlug(fallback?: string): string | undefined {
  const ctx = useContext(ActiveSectionContext)
  return ctx?.activeSlug ?? fallback
}

export interface SpiedSection {
  slug: string
  /** DOM id of the marker where this section begins. */
  anchorId: string
}

interface SectionScrollSpyProps {
  /** Slug highlighted before the first marker is reached. */
  unitSlug: string
  /** Markers to watch, in document order. */
  sections: SpiedSection[]
}

/**
 * A section counts as reached once its marker has scrolled into the upper
 * part of the viewport. The threshold sits below where an anchor jump lands
 * the marker (`scroll-mt-24`), so following a "Chapter II" link highlights
 * Chapter II straight away.
 */
export default function SectionScrollSpy({ unitSlug, sections }: SectionScrollSpyProps) {
  const ctx = useContext(ActiveSectionContext)
  const setActiveSlug = ctx?.setActiveSlug
  const key = sections.map((s) => `${s.slug}:${s.anchorId}`).join('|')

  useEffect(() => {
    if (!setActiveSlug) return
    if (sections.length === 0) {
      setActiveSlug(null)
      return
    }

    let frame = 0
    const update = () => {
      frame = 0
      const threshold = Math.max(120, window.innerHeight * 0.3)
      let current = unitSlug
      for (const section of sections) {
        const el = document.getElementById(section.anchorId)
        if (el && el.getBoundingClientRect().top <= threshold) current = section.slug
      }
      setActiveSlug(current)
    }
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('hashchange', schedule)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('hashchange', schedule)
      setActiveSlug(null)
    }
    // `key` stands in for `sections`, which is a fresh array on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitSlug, key, setActiveSlug])

  return null
}
