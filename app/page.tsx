import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import HomepageContent from '@/components/HomepageContent'
import { readChapterStructure } from '@/lib/data'
import { Edition } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Frankendiff — Frankenstein Editions Compared',
  description:
    "Mary Shelley's Frankenstein exists in two major versions: the original 1818 text, and an extensively revised 1831 edition. Read both and explore how the novel changed over time.",
}

export default async function HomePage() {
  const structure = readChapterStructure()
  const cookieStore = await cookies()
  const raw = cookieStore.get('frankendiff_edition')?.value
  const initialEdition: Edition = raw === '1818' || raw === '1831' ? raw : '1831'

  return <HomepageContent structure={structure.rows} initialEdition={initialEdition} />
}
