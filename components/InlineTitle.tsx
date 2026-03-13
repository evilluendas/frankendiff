import React from 'react'

/**
 * Renders a title string with inline markdown italic syntax (*...*) converted
 * to <em> elements. Handles a single level of asterisk-delimited spans.
 */
export default function InlineTitle({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('*') && part.endsWith('*') ? (
          <em key={i}>{part.slice(1, -1)}</em>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  )
}
