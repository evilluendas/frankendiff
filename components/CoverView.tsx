import Image from 'next/image'
import { Edition } from '@/lib/types'
import Ornament from './Ornament'

interface CoverViewProps {
  edition: Edition
}

export default function CoverView({ edition }: CoverViewProps) {
  return edition === '1818' ? <Cover1818 /> : <Cover1831 />
}

function Cover1818() {
  return (
    <div className="flex flex-col items-center text-center min-h-[60vh] pt-10 pb-4">

      <div className="mb-6">
        <h1
          className="font-display font-medium uppercase leading-none text-fg"
          style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)', letterSpacing: '0.12em' }}
        >
          Frankenstein;
        </h1>
        <p className="font-display text-lg font-normal mt-6 uppercase"
          style={{ fontSize: 'clamp(0.8rem, 2.2vw, 1.1rem)', letterSpacing: '0.35em' }}
        >
          or,
        </p>
        <p className="font-display text-2xl font-normal mt-6 uppercase"
          style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)', letterSpacing: '0.35em' }}
        >
          the Modern Prometheus.
        </p>
      </div>

      <Ornament className="my-8" />

      <p className="font-serif uppercase tracking-widest">
        In Three Volumes.
      </p>

      <Ornament className="my-8" />

      <blockquote className="font-serif italic text-left text-fg leading-relaxed text-sm sm:text-base">
        Did I request thee, Maker, from my clay<br />
        To mould me Man, did I solicit thee<br />
        From darkness to promote me?——<br />
        <em className="text-right inline-block w-full font-bold [font-style:normal] [font-variant:small-caps] mt-2">Paradise Lost.</em>
      </blockquote>

      <Ornament className="my-8" symbol="" />

      <p className="font-serif text-xl uppercase tracking-widest">Vol. I.</p>

      <Ornament className="my-8 w-56" symbol="" ruleWidth="w-full"/>

      <div>
        <p className="font-gothic text-[24px] mb-2">London:</p>
        <p className="font-display text-fg text-sm uppercase italic font-semibold [font-variant:small-caps] mb-2">
          Printed for
        </p>
        <p className="font-serif uppercase tracking-widest">
          Lackington, Hughes, Harding, Mayor, & Jones,<br />
          Finsbury Square.
        </p>
      </div>

      <Ornament className="my-8" symbol="" />

      <p className="font-serif">1818.</p>

    </div>
  )
}

function Cover1831() {
  return (
    <div className="flex flex-col items-center text-center min-h-[60vh] pt-10 pb-4">

      <div className="mb-8">
        <h1
          className="font-display font-medium uppercase leading-none text-fg"
          style={{ fontSize: 'clamp(2.4rem, 7vw, 4.5rem)', letterSpacing: '0.12em' }}
        >
          Frankenstein
        </h1>
        <p
          className="font-display font-normal mt-4 uppercase"
          style={{ fontSize: 'clamp(0.8rem, 2.2vw, 1.1rem)', letterSpacing: '0.35em' }}
        >
          or, the Modern Prometheus
        </p>
      </div>

      <Ornament className="my-8" />

      <figure className="max-w-[26ch] mx-auto">
        <blockquote className="font-serif italic text-fg leading-relaxed text-sm sm:text-base">
          Did I request thee, Maker, from my clay<br />
          To mould me Man, did I solicit thee<br />
          From darkness to promote me?—<br />
          <em>Paradise Lost.</em>
        </blockquote>
      </figure>

      {/* ── Cover image — drop your file in public/ and update the src ── */}
      <div className="mt-10 w-48">
        <Image
          src="/cover-1831.jpg"
          alt="1831 edition cover"
          width={400}
          height={560}
          className="w-full h-auto"
        />
      </div>

      <div className="flex-1 min-h-12" />

      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="font-display text-fg uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.3em' }}>
          Mary W. Shelley
        </p>
        <p className="font-sans text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.2em' }}>
          London, 1831
        </p>
      </div>

    </div>
  )
}
