'use client'

import { useEffect } from 'react'

/**
 * Keeps the frankendiff_chapter cookie in sync with whatever chapter
 * the user is currently reading or diffing. This allows the homepage
 * "Read" link to return to the last-visited chapter.
 */
export default function ChapterCookieSync({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `frankendiff_chapter=${slug}; path=/; max-age=31536000; SameSite=Lax`
  }, [slug])

  return null
}
