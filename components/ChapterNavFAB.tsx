'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, X } from 'lucide-react'

interface ChapterNavFABProps {
  children: React.ReactNode
}

export default function ChapterNavFAB({ children }: ChapterNavFABProps) {
  const [open, setOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [fabVisible, setFabVisible] = useState(true)
  const [atBottom, setAtBottom] = useState(false)
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Close only when navigation has completed (pathname changed)
  useEffect(() => {
    if (open) {
      setOpen(false)
      setNavigating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Scroll active chapter into view when overlay opens
  useEffect(() => {
    if (!open) return
    const container = scrollRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[aria-current="page"]')
    if (!active) return
    const containerMid = container.clientHeight / 2
    const itemMid = active.offsetTop + active.offsetHeight / 2
    container.scrollTop = itemMid - containerMid
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setNavigating(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Hide FAB on scroll down, show on scroll up (mobile only — JS runs always,
  // but the visibility classes are only applied below the sm breakpoint).
  // Uses a 20px dead zone so small jitters don't trigger the toggle.
  useEffect(() => {
    const THRESHOLD = 100
    let anchorY = window.scrollY
    let visible = true
    const onScroll = () => {
      const currentY = window.scrollY
      setAtBottom(currentY + window.innerHeight >= document.documentElement.scrollHeight - 32)
      const delta = currentY - anchorY
      if (delta > THRESHOLD && currentY > 60) {
        anchorY = currentY
        if (visible) { visible = false; setFabVisible(false) }
      } else if (delta < -THRESHOLD) {
        anchorY = currentY
        if (!visible) { visible = true; setFabVisible(true) }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* FAB */}
      {/* On desktop the pill is a circle that widens on hover/focus to reveal
          its label; on mobile the label is always shown. The label's max-width
          is what animates — the button's width simply follows its content. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open chapter navigation"
        className={[
          'group fixed bottom-4 sm:bottom-6 will-change-transform right-1/2 translate-x-1/2 sm:right-6 sm:translate-x-0 z-40 flex items-center justify-center h-14 px-5 sm:h-13 sm:px-[15px] rounded-full bg-fg text-bg shadow-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-250 ease-in-out',
          atBottom ? 'opacity-0 pointer-events-none' : !fabVisible ? 'max-sm:opacity-0 scale-90 max-sm:pointer-events-none' : '',
        ].join(' ')}
      >
        <BookOpen size={22} className="shrink-0" />
        <span className="overflow-hidden whitespace-nowrap sm:max-w-0 sm:opacity-0 sm:group-hover:max-w-32 sm:group-hover:opacity-100 sm:group-focus-visible:max-w-32 sm:group-focus-visible:opacity-100 transition-[max-width,opacity] duration-300 ease-spring">
          <span className="block pl-2 text-sm font-medium">Chapters</span>
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-bg"
          role="dialog"
          aria-modal="true"
          aria-label="Chapter navigation"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <span className="font-sans text-xs tracking-widest uppercase pl-1 text-muted">Chapters</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chapter navigation"
              className="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer text-muted hover:text-fg hover:bg-subtle transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav list — mark as navigating when a link is tapped; overlay stays
              open until the pathname change confirms the new page is ready */}
          <div
            ref={scrollRef}
            className={[
              'flex-1 overflow-y-auto px-3 py-3',
              navigating ? 'opacity-40 pointer-events-none' : '',
            ].join(' ')}
            onClick={(e) => {
              const anchor = (e.target as HTMLElement).closest('a')
              if (!anchor) return
              const href = anchor.getAttribute('href')
              if (href && new URL(href, window.location.origin).pathname === pathname) {
                setOpen(false)
              } else {
                setNavigating(true)
              }
            }}
          >
            {children}
          </div>
        </div>
      )}
    </>
  )
}
