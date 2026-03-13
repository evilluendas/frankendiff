'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, X } from 'lucide-react'

interface ChapterNavFABProps {
  children: React.ReactNode
}

export default function ChapterNavFAB({ children }: ChapterNavFABProps) {
  const [open, setOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const pathname = usePathname()

  // Close only when navigation has completed (pathname changed)
  useEffect(() => {
    if (open) {
      setOpen(false)
      setNavigating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

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

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open chapter navigation"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-13 h-13 rounded-full bg-fg text-bg shadow-lg hover:opacity-90 active:scale-95 transition-all"
      >
        <BookOpen size={22} />
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
              className="flex items-center justify-center w-8 h-8 rounded-md text-muted hover:text-fg hover:bg-subtle transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav list — mark as navigating when a link is tapped; overlay stays
              open until the pathname change confirms the new page is ready */}
          <div
            className={[
              'flex-1 overflow-y-auto px-3 py-3',
              navigating ? 'opacity-40 pointer-events-none' : '',
            ].join(' ')}
            onClick={() => setNavigating(true)}
          >
            {children}
          </div>
        </div>
      )}
    </>
  )
}
