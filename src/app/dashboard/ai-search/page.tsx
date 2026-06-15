'use client'

import { UnifiedProvider } from '../geo-monitor/components/UnifiedContext'
import { useUnified } from '../geo-monitor/components/UnifiedContext'
import { AIResearchTab } from '../geo-monitor/components/tabs/AIResearchTab'
import { BrandLogo } from '@/components/BrandLogo'
import { CheckCircle2, Loader2, TrendingUp } from 'lucide-react'

function ProfileSnapshot() {
  const ctx = useUnified()
  const missing = ctx.profileMissingFields
  const isReady = ctx.isProfileComplete
  const productSpace = ctx.brandConfig.product_space || ctx.brandConfig.keywords[0] || 'Product space not set'
  const market = ctx.brandConfig.target_market || 'Market not set'

  if (ctx.customerHydrating && !ctx.brandConfig.brand_name && !ctx.brandConfig.domain) {
    return (
      <div className="rounded-2xl border border-divider-light bg-surface p-5">
        <div className="flex items-center gap-3 text-[13px] font-semibold text-ink-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Customer Intelligence Profile...
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border p-5 ${isReady ? 'border-sage/25 bg-surface' : 'border-caution/30 bg-caution-bg/45'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo domain={ctx.brandConfig.domain} name={ctx.brandConfig.brand_name || 'Brand'} size={40} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-bold text-ink">Customer Intelligence Profile</h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isReady ? 'bg-sage-bg text-sage' : 'bg-caution-bg text-caution'}`}>
                <CheckCircle2 className="h-3 w-3" />
                {isReady ? 'Ready' : `${missing.length} fields missing`}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-ink-3">
              <span className="font-semibold text-ink-2">{ctx.brandConfig.brand_name || 'Brand not set'}</span>
              <span>{ctx.brandConfig.domain || 'Domain not set'}</span>
              <span>·</span>
              <span>{market}</span>
              <span>·</span>
              <span>{productSpace}</span>
              <span>·</span>
              <span>{ctx.brandConfig.competitors.length} competitors</span>
            </p>
            {!isReady && <p className="mt-2 text-[12px] text-caution">Complete in Brand Hub: {missing.join(', ')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function AISearchContent() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h1 className="heading-dash">AI Research</h1>
            <p className="text-sm text-ink-3">
              Start from the customer profile, diagnose source and prompt gaps, then send actions into Prompt
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <ProfileSnapshot />
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
