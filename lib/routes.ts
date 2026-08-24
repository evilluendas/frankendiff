import type { Edition } from './types'

/**
 * URL builders. Read pages carry the edition in the path
 * (/1818/chapter/22); the diff is edition-less (/diff/22).
 * Every link to a Read page goes through readHref so the shape lives in one place.
 */
export function readHref(edition: Edition, slug: string): string {
  return `/${edition}/chapter/${slug}`
}

export function diffHref(slug: string): string {
  return `/diff/${slug}`
}
