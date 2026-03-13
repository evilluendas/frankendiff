import { ReactNode, createElement, Fragment } from 'react'
import type { DiffOp } from './types'

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

/**
 * Renders a list of diff ops as React nodes, handling *italic* markdown spans
 * across op boundaries.
 *
 * Two italic cursors (one per edition) are tracked independently. A `*` in an
 * `equal` op toggles both; a `*` in a `delete` op toggles only 1818; a `*` in
 * an `insert` op toggles only 1831. The `*` character is never rendered.
 *
 * When italic status differs between editions on an equal-op segment, the text
 * is emitted as a del/ins pair — consistent with how content changes are shown:
 *   - italic removed  → <del><em>word</em></del> <ins>word</ins>
 *   - italic added    → <del>word</del> <ins><em>word</em></ins>
 */
export function renderDiffOps(ops: DiffOp[]): ReactNode {
  let i1818 = false
  let i1831 = false
  const nodes: ReactNode[] = []
  let key = 0

  const DEL_CLS = 'bg-del-bg text-del-text rounded-sm px-0.5'
  const INS_CLS = 'no-underline bg-ins-bg text-ins-text rounded-sm px-0.5'

  for (const op of ops) {
    const parts = op.text.split('*')

    for (let i = 0; i < parts.length; i++) {
      // Every split point represents a `*` we crossed — toggle italic state(s)
      if (i > 0) {
        if (op.type === 'equal')        { i1818 = !i1818; i1831 = !i1831 }
        else if (op.type === 'delete')  { i1818 = !i1818 }
        else                            { i1831 = !i1831 }
      }

      const text = parts[i]
      if (!text) continue

      if (op.type === 'equal') {
        if (i1818 && i1831) {
          // Italic in both — plain <em>
          nodes.push(<span key={key++}><em>{text}</em></span>)
        } else if (i1818 && !i1831) {
          // Italic removed in 1831 — del/ins pair
          nodes.push(<del key={key++} className={DEL_CLS} title="Italicised in 1818"><em>{text}</em></del>)
          nodes.push(<ins key={key++} className={INS_CLS} title="Plain in 1831">{text}</ins>)
        } else if (!i1818 && i1831) {
          // Italic added in 1831 — del/ins pair
          nodes.push(<del key={key++} className={DEL_CLS} title="Plain in 1818">{text}</del>)
          nodes.push(<ins key={key++} className={INS_CLS} title="Italicised in 1831"><em>{text}</em></ins>)
        } else {
          nodes.push(<span key={key++}>{text}</span>)
        }
      } else if (op.type === 'insert') {
        nodes.push(
          <ins key={key++} className={INS_CLS} title="Added in 1831">
            {i1831 ? <em>{text}</em> : text}
          </ins>,
        )
      } else {
        nodes.push(
          <del key={key++} className={DEL_CLS} title="Removed in 1831">
            {i1818 ? <em>{text}</em> : text}
          </del>,
        )
      }
    }
  }

  return <>{nodes}</>
}
