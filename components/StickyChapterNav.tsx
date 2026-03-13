'use client'

import { useRef, useLayoutEffect } from 'react'

interface StickyChapterNavProps {
  children: React.ReactNode
  className?: string
}

// Persists across React unmount/remount during client-side navigation
let savedScrollTop = 0

export default function StickyChapterNav({ children, className = '' }: StickyChapterNavProps) {
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = savedScrollTop
    return () => {
      if (ref.current) savedScrollTop = ref.current.scrollTop
    }
  }, [])

  return (
    <aside
      ref={ref}
      className={`sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] ${className}`}
    >
      {children}
    </aside>
  )
}
