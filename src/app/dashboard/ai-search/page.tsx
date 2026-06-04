'use client'

import { UnifiedProvider } from '../geo-monitor/components/UnifiedContext'
import { AIResearchTab } from '../geo-monitor/components/tabs/AIResearchTab'
import { ControlBar } from '../geo-monitor/components/ControlBar'
import { BrandSetupPanel } from '../geo-monitor/components/BrandSetupPanel'
import { TrendingUp } from 'lucide-react'

function AISearchContent() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h1 className="heading-dash">AI Search</h1>
            <p className="text-sm text-ink-3">
              Deep Research simulation — see how AI investigates your category and where your brand ranks
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <BrandSetupPanel />
        <ControlBar />
        {/* The 5-block narrative: Brief → Dimension Map → Brand Coverage → Research Trail → Gap Playbook */}
        <AIResearchTab />
      </div>
    </div>
  )
}

export default function AISearchPage() {
  return (
    <UnifiedProvider>
      <AISearchContent />
    </UnifiedProvider>
  )
}
