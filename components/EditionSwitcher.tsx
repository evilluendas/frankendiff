import Link from 'next/link'
import { Edition } from '@/lib/types'

export interface EditionLink {
  edition: Edition
  href: string
}

interface EditionSwitcherProps {
  activeEdition: Edition
  links: EditionLink[]
}

const EDITION_SUBTITLE: Record<Edition, string> = {
  '1818': 'First Edition',
  '1831': 'Revised Edition',
}

export default function EditionSwitcher({ activeEdition, links }: EditionSwitcherProps) {
  return (
    <div className="flex items-stretch gap-8 mb-14 justify-center border-b border-border py-7">
      {links.map(({ edition, href }, i) => (
        <div key={edition} className="flex items-stretch gap-8">
          {i > 0 && (
            <div className="w-px bg-border self-stretch" />
          )}
          <Link
            href={href}
            className={[
              'flex gap-4 items-center transition-opacity',
              edition === '1818' ? 'flex-row-reverse' : '',
              activeEdition === edition
                ? 'opacity-100'
                : 'opacity-25 hover:opacity-50',
            ].join(' ')}
          >
            <span className="font-display text-4xl leading-none tracking-tight">
              {edition}
            </span>
            <span className="hidden sm:inline font-sans text-[10px] tracking-[0.18em] uppercase text-muted">
              {EDITION_SUBTITLE[edition]}
            </span>
          </Link>
        </div>
      ))}
    </div>
  )
}
