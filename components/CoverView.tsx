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

      <div className="mx-auto w-full max-w-[400px] mb-12">
        <Image
          src="/cover-1831-01.jpg"
          alt="1831 edition cover"
          width={500}
          height={652}
          className="w-full h-auto"
        />
      </div>

      <h1
        className="font-display font-medium uppercase leading-none text-fg mb-12"
        style={{ fontSize: 'clamp(1.2rem, 7vw, 2.8rem)', letterSpacing: '0.12em' }}
      >
        Frankenstein.
      </h1>

      <blockquote className="leading-tightest mb-12">
        <p className="font-calligraphic text-center text-base leading-[1.2] text-fg"
        style={{ fontSize: 'clamp(1.5rem, 4vw, 1.9rem)' }}>
          "By the glimmer of the half-extinguished <br/>
          light, I saw the dull, yellow eye of the <br />
          creature open; it breathed hard, and a <br />
          convulsive motion agitated its limbs. <br />
          ... I rushed out of the room."
        </p>
        <span className="inline-block w-full font-serif italic text-[14px] text-right text-muted">Page 43.</span>
      </blockquote>

      <p className="font-serif tracking-wider italic mb-12 text-pretty">London, Published by H Colburn and R Bentley, 1831.</p>

      <Ornament className="my-8" symbol=""/>

      <div className="mt-12 mb-12">
        <h1
          className="font-display font-medium uppercase leading-none text-fg"
          style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)', letterSpacing: '0.12em' }}
        >
          Frankenstein,
        </h1>
        <p className="font-display text-lg font-normal mt-6 uppercase"
          style={{ fontSize: 'clamp(0.8rem, 2.2vw, 1.1rem)', letterSpacing: '0.35em' }}
        >
          by
        </p>
        <p className="font-display text-2xl font-normal mt-6 uppercase"
          style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)', letterSpacing: '0.35em' }}
        >
          Mary W. Shelley.
        </p>
      </div>

      <div className="mx-auto w-full max-w-[400px] mb-12">
        <Image
          src="/cover-1831-02.png"
          alt="1831 edition cover"
          width={500}
          height={652}
          className="w-full h-auto"
        />
      </div>

      <blockquote className="leading-tightest mb-12">
        <p className="font-calligraphic text-left text-base leading-[1.2] text-fg"
        style={{ fontSize: 'clamp(1.5rem, 4vw, 1.9rem)' }}>
            The day of my departure <br />
            at length arrived.
        </p>
        <span className="inline-block w-full font-serif italic text-[14px] text-right text-muted">Page 31.</span>
      </blockquote>

      <div>
        <p className="font-serif text mb-4 tracking-[0.3em] uppercase">London:</p>
        <p className="font-serif text-2xl mb-4 font-semibold uppercase tracking-widest">
          Colburn and Bentley.
        </p>
        <p className="font-serif uppercase tracking-[0.3em] mb-4">
          New Burlington Street
        </p>
      </div>

      <p className="font-serif tracking-[0.2em]">1831.</p>
    </div>
  )
}
