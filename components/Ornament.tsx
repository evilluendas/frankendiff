interface OrnamentProps {
  /** The central glyph. Defaults to the asterism ⁂. */
  symbol?: string
  /** Tailwind width class for each rule arm. Defaults to 'w-12'. */
  ruleWidth?: string
  /** Extra classes on the outer wrapper (e.g. for margin). */
  className?: string
}

/**
 * A typographic ornament: two horizontal rules flanking a central symbol.
 * Use it as a section divider anywhere you need a decorative break.
 *
 *   <Ornament />                        — default ⁂
 *   <Ornament symbol="✦" />             — star
 *   <Ornament symbol="·" ruleWidth="w-8" className="my-4" />
 */
export default function Ornament({ symbol = '⁂', ruleWidth = 'w-12', className = '' }: OrnamentProps) {
  return (
    <div className={`flex items-center py-4 ${symbol ? 'gap-3' : ''} ${className}`} aria-hidden>
      <span className={`block h-px bg-border ${ruleWidth}`} />
      {symbol && <span className="font-serif text-muted text-xs leading-none">{symbol}</span>}
      <span className={`block h-px bg-border ${ruleWidth}`} />
    </div>
  )
}
