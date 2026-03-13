'use client'

import { useEffect } from 'react'
import { Edition } from '@/lib/types'

/**
 * Keeps the frankendiff_edition cookie in sync with whatever edition
 * the user is currently reading. This allows other pages (e.g. the diff
 * page) to know which edition to link back to.
 */
export default function EditionCookieSync({ edition }: { edition: Edition }) {
  useEffect(() => {
    document.cookie = `frankendiff_edition=${edition}; path=/; max-age=31536000; SameSite=Lax`
  }, [edition])

  return null
}
