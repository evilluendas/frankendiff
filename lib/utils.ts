import { ReactNode, createElement, Fragment } from 'react'

/**
 * Converts *italic* markdown spans in a string to <em> elements.
 * Everything else is returned as plain text.
 */
export function renderText(text: string): ReactNode {
  const parts = text.split(/(\*[^*]+\*)/)
  if (parts.length === 1) return text
  return createElement(
    Fragment,
    null,
    ...parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return createElement('em', { key: i }, part.slice(1, -1))
      }
      return part || null
    }),
  )
}
