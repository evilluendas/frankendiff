import type { Metadata } from 'next'
import { Lora, Inter, Manufacturing_Consent, Pinyon_Script } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const manufacturingConsent = Manufacturing_Consent({
  variable: '--font-manufacturing-consent',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
})

const pinyonScript = Pinyon_Script({
  variable: '--font-pinyon',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Frankendiff — Frankenstein Editions Compared',
  description:
    "Read and compare the 1818 and 1831 editions of Mary Shelley\'s Frankenstein.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark-mode flash before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');if(s==='dark'||(s===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${lora.variable} ${inter.variable} ${manufacturingConsent.variable} ${pinyonScript.variable} bg-bg text-fg`}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
