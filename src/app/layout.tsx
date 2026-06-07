import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { GA_ID } from '@/lib/gtag'

export const metadata: Metadata = {
  title: 'Alignment AI - GEO Platform',
  description: 'Make your brand visible and cited across 58 AI platforms — no code changes needed.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      style={{
        ['--font-inter' as string]: 'Inter',
        ['--font-mono' as string]: 'JetBrains Mono',
        ['--font-serif' as string]: 'DM Serif Display',
      }}
    >
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>

        {/* GA4 — only injected when Measurement ID is configured */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { send_page_view: true });
              window._ga4MeasurementId = '${GA_ID}';
            `}</Script>
            {/* AI traffic attribution tracker — detects ChatGPT/Perplexity/Gemini referrals */}
            <Script
              src="/alignment-ga4-tracker.js"
              strategy="afterInteractive"
            />
          </>
        )}
      </body>
    </html>
  )
}
