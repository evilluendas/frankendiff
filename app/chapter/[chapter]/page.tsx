import { permanentRedirect } from 'next/navigation'
import { EDITIONS } from '@/lib/types'
import { readHref } from '@/lib/routes'

/**
 * Legacy Read URLs: /chapter/<slug>?edition=<edition>.
 * Read pages now live at /<edition>/chapter/<slug>. Redirect permanently (308),
 * dropping the query string. The bare form always meant 1818, so it still does —
 * deliberately not cookie-dependent, since browsers cache permanent redirects.
 */
export default async function LegacyChapterRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ chapter: string }>
  searchParams: Promise<{ edition?: string }>
}) {
  const { chapter } = await params
  const { edition } = await searchParams
  const target = EDITIONS.find((e) => e === edition) ?? '1818'
  permanentRedirect(readHref(target, chapter))
}
