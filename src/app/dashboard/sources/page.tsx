'use client'

import dynamic from 'next/dynamic'
import { Loader2, Link2 } from 'lucide-react'
import { UnifiedProvider, useUnified } from '../geo-monitor/components/UnifiedContext'
import { ControlBar } from '../geo-monitor/components/ControlBar'
import { BrandSetupPanel } from '../geo-monitor/components/BrandSetupPanel'

const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
  </div>
)

const DiscoverTab = dynamic(
  () => import('../geo-monitor/components/tabs/DiscoverTab').then(m => ({ default: m.DiscoverTab })),
  { loading: TabLoader },
)

function SourcesContent() {
  const ctx = useUnified()

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
            <Link2 className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h1 className="heading-dash">Sources</h1>
            <p className="text-sm text-ink-3">
              Discover grounded URLs, sourcing strategy, and domain reach across AI platforms
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <BrandSetupPanel />
        <ControlBar />

        {ctx.scanError && (
          <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4">
            <span className="text-sm text-red-soft">{ctx.scanError}</span>
          </div>
        )}

        {/* Discover tab renders the full sourcing strategy map */}
        <DiscoverTab />
      </div>
    </div>
  )
}

export default function SourcesPage() {
  return (
    <UnifiedProvider>
      <SourcesContent />
    </UnifiedProvider>
  )
}
