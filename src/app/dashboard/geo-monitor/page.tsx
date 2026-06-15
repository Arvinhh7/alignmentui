'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Loader2, BarChart3, Tag, Compass } from 'lucide-react'
import { UnifiedProvider, useUnified, type TabKey } from './components/UnifiedContext'
import { DateRangeControls } from './components/ControlBar'

const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
  </div>
)

const PromptsTab  = dynamic(() => import('./components/tabs/PromptsTab').then(m => ({ default: m.PromptsTab })),   { loading: TabLoader })
const FanOutTab  = dynamic(() => import('./components/tabs/FanOutTab').then(m => ({ default: m.FanOutTab })),   { loading: TabLoader })

function PromptContent() {
  const ctx = useUnified()
  const router = useRouter()

  useEffect(() => {
    if (ctx.customerHydrating) return
    if (ctx.activeCustomerId && !ctx.isProfileComplete) {
      router.replace('/dashboard/brand-hub')
    }
  }, [ctx.activeCustomerId, ctx.customerHydrating, ctx.isProfileComplete, router])

  if (ctx.activeCustomerId && !ctx.customerHydrating && !ctx.isProfileComplete) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string; isBeta?: boolean }[] = [
    {
      key: 'prompts',
      label: 'Prompts',
      icon: <Tag className="w-4 h-4" />,
      badge: ctx.prompts.length ? `${ctx.prompts.filter(p => p.is_active).length}` : undefined,
    },
    {
      key: 'discover',
      label: 'Fan-Out',
      icon: <Compass className="w-4 h-4" />,
      badge: ctx.discoverResult ? `${ctx.discoverResult.unique_domains}` : undefined,
    },
  ]

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h1 className="heading-dash">Prompt</h1>
            <p className="text-sm text-ink-3">Manage prompts, run scans, and monitor visibility performance</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {ctx.scanError && (
          <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4">
            <span className="text-sm text-red-soft">{ctx.scanError}</span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-divider-light rounded-xl p-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => ctx.setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  ctx.activeTab === tab.key
                    ? 'bg-ink text-ink-inv shadow-sm'
                    : 'text-ink-2 hover:bg-surface-warm'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    ctx.activeTab === tab.key ? 'bg-[rgba(250,245,236,0.2)] text-ink-inv' : 'bg-surface-muted text-ink-3'
                  }`}>{tab.badge}</span>
                )}
                {tab.isBeta && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 bg-[rgba(100,180,255,0.1)] text-[rgba(100,180,255,0.75)] border border-[rgba(100,180,255,0.2)] rounded-full">
                    Beta
                  </span>
                )}
              </button>
            ))}
          </div>
          {ctx.activeTab === 'prompts' && (
            <div className="px-1">
              <DateRangeControls />
            </div>
          )}
        </div>

        {/* Tab content */}
        {ctx.activeTab === 'prompts'     && <PromptsTab />}
        {ctx.activeTab === 'discover'    && <FanOutTab />}
      </div>
    </div>
  )
}

export default function GeoMonitorPage() {
  return (
    <UnifiedProvider>
      <PromptContent />
    </UnifiedProvider>
  )
}
