'use client'

import { useEffect, useRef, useState } from 'react'

// Matches h-14 on SiteHeader
const HEADER_HEIGHT = 56
// Minimum scroll distance (px) in one direction before reveal/hide triggers
const SCROLL_THRESHOLD = 40

// Tailwind's sm breakpoint
const SM_BREAKPOINT = 640

export default function StickyReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`).matches
  )
  const docTop = useRef(0)
  const stickyThreshold = useRef(0) // scrollY at which CSS sticky activates
  const lastY = useRef(0)
  const isRevealed = useRef(false)
  // Accumulated signed scroll (positive = up) since last direction change or action
  const scrollDelta = useRef(0)

  // Measure element geometry once on mount
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const h = el.offsetHeight
    // getBoundingClientRect().top is viewport-relative; adding scrollY gives document-relative
    const top = el.getBoundingClientRect().top + window.scrollY
    setHeight(h)
    docTop.current = top
    stickyThreshold.current = top + h
    lastY.current = window.scrollY
  }, [])

  // Track mobile breakpoint; reset any in-progress transform when crossing it
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`)
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      const el = ref.current
      if (el) {
        isRevealed.current = false
        scrollDelta.current = 0
        el.style.transition = 'none'
        el.style.transform = 'translateY(0)'
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Scroll-driven reveal/hide — desktop only
  useEffect(() => {
    if (!height || isMobile) return
    const el = ref.current
    if (!el) return

    const onScroll = () => {
      const y = window.scrollY
      const dy = lastY.current - y // positive = scrolling up
      const goingUp = dy > 0
      lastY.current = y

      if (y > stickyThreshold.current) {
        // Sticky range: CSS has parked the element above the viewport.
        // Accumulate scroll distance; only reveal/hide after SCROLL_THRESHOLD px.
        if (Math.sign(dy) !== Math.sign(scrollDelta.current)) scrollDelta.current = 0
        scrollDelta.current += dy

        if (scrollDelta.current > SCROLL_THRESHOLD && !isRevealed.current) {
          isRevealed.current = true
          scrollDelta.current = 0
          el.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
          el.style.transform = `translateY(${height + HEADER_HEIGHT}px)`
        } else if (scrollDelta.current < -SCROLL_THRESHOLD && isRevealed.current) {
          isRevealed.current = false
          scrollDelta.current = 0
          el.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
          el.style.transform = 'translateY(0)'
        }
      } else if (isRevealed.current) {
        // Non-sticky range (near top of page) while still revealed.
        if (!goingUp) {
          // Scrolling back down: animate hide.
          isRevealed.current = false
          el.style.transition = 'transform 300ms ease-in-out'
          el.style.transform = 'translateY(0)'
        } else {
          // Scrolling up toward the very top: scroll-follow to hold the element at
          // exactly HEADER_HEIGHT, so it lands seamlessly on its natural position.
          // ty = HEADER_HEIGHT when y = stickyThreshold (continuous with sticky range).
          // ty = 0 when y = docTop - HEADER_HEIGHT (natural position = HEADER_HEIGHT).
          const ty = HEADER_HEIGHT - docTop.current + y
          if (ty <= 0) {
            // Natural position has reached HEADER_HEIGHT — hand off without a jump.
            isRevealed.current = false
            el.style.transition = 'none'
            el.style.transform = 'translateY(0)'
          } else {
            el.style.transition = 'none'
            el.style.transform = `translateY(${ty}px)`
          }
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [height, isMobile])

  return (
    <div
      ref={ref}
      className="sticky bg-bg"
      style={{
        // Mobile: always pinned just below the header.
        // Desktop: parked above the viewport until revealed by scroll-up.
        // Use -9999 before height is measured so it scrolls naturally (no premature sticking).
        top: isMobile ? HEADER_HEIGHT : height > 0 ? -height : -9999,
        willChange: 'transform',
        zIndex: 9,
      }}
    >
      {children}
    </div>
  )
}
