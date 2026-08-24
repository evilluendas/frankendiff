'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { Edition, EDITIONS, EDITION_LABELS } from '@/lib/types'

interface EditionSelectProps {
  value: Edition
  /** Short caption rendered above the control, e.g. "Chapters as in". */
  caption?: string
  className?: string
}

/**
 * Dropdown that picks which edition's chapter structure the navigation shows.
 * Stores the choice in the same cookie the Read view keeps in sync, then
 * refreshes the server-rendered page so the chapter list follows.
 */
export default function EditionSelect({ value, caption = 'Chapters as in', className = '' }: EditionSelectProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Edition
    document.cookie = `frankendiff_edition=${next}; path=/; max-age=31536000; SameSite=Lax`
    startTransition(() => router.refresh())
  }

  return (
    <label className={`block ${className}`}>
      <span className="block px-3 mb-1.5 font-sans text-[10px] tracking-widest uppercase text-muted/60 select-none">
        {caption}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={onChange}
          disabled={pending}
          aria-label="Edition whose chapters to list"
          className={[
            // A border (not a background) so it reads as a control, distinct from the
            // selected chapter's filled row below. Focus is shown by darkening the
            // border rather than a ring: the sidebar is a scroll container and would
            // clip anything painted outside the box.
            'w-full appearance-none cursor-pointer rounded-md border border-border bg-transparent pl-3 pr-8 py-2',
            'font-sans text-sm text-fg hover:border-muted focus:outline-none focus-visible:border-fg transition-colors',
            pending ? 'opacity-50' : '',
          ].join(' ')}
        >
          {EDITIONS.map((edition) => (
            <option key={edition} value={edition}>
              {edition} — {EDITION_LABELS[edition]}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  )
}
