'use client'

import dynamic from 'next/dynamic'

// Dynamically import ECharts component (no SSR — canvas needs DOM)
const EChartsWorldMap = dynamic(() => import('@/components/EChartsWorldMap'), { ssr: false })

// Demo data — simulates real analytics.geo_distribution
const DEMO_GEO_DATA = [
  { country: 'FR', visit_count: 42, bot_count: 38, referral_count: 4 },
  { country: 'US', visit_count: 42, bot_count: 20, referral_count: 22 },
  { country: 'JP', visit_count: 2,  bot_count: 2,  referral_count: 0 },
  { country: 'NL', visit_count: 2,  bot_count: 1,  referral_count: 1 },
  { country: 'SG', visit_count: 2,  bot_count: 2,  referral_count: 0 },
  { country: 'CA', visit_count: 2,  bot_count: 0,  referral_count: 2 },
  { country: 'VN', visit_count: 2,  bot_count: 1,  referral_count: 1 },
  { country: 'IN', visit_count: 1,  bot_count: 1,  referral_count: 0 },
  { country: 'LT', visit_count: 1,  bot_count: 1,  referral_count: 0 },
  { country: 'DE', visit_count: 8,  bot_count: 5,  referral_count: 3 },
  { country: 'GB', visit_count: 6,  bot_count: 4,  referral_count: 2 },
  { country: 'AU', visit_count: 3,  bot_count: 2,  referral_count: 1 },
  { country: 'KR', visit_count: 4,  bot_count: 3,  referral_count: 1 },
  { country: 'BR', visit_count: 3,  bot_count: 1,  referral_count: 2 },
  { country: 'CN', visit_count: 5,  bot_count: 4,  referral_count: 1 },
]

export default function DemoMapPage() {
  return (
    <div className="min-h-screen bg-canvas p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-ink mb-2">ECharts Map Demo</h1>
        <p className="text-ink-2 mb-8">
          Replacement for the current SVG world map in Visibility Proxy analytics.
        </p>

        <EChartsWorldMap geoData={DEMO_GEO_DATA} />
      </div>
    </div>
  )
}
