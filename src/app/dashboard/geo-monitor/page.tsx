'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Loader2, BarChart3, Eye, MessageSquare, Link2, ThumbsUp, Users, Target, Tag, ShoppingCart, UserCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { UnifiedProvider, useUnified, type TabKey } from './components/UnifiedContext'
import { ControlBar } from './components/ControlBar'
import { BrandSetupPanel } from './components/BrandSetupPanel'
import { VisibilityTab } from './components/tabs/VisibilityTab'

const TabLoader = () => <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

const MentionsTab = dynamic(() => import('./components/tabs/MentionsTab').then(m => ({ default: m.MentionsTab })), { loading: TabLoader })
const CitationsTab = dynamic(() => import('./components/tabs/CitationsTab').then(m => ({ default: m.CitationsTab })), { loading: TabLoader })
const SentimentTab = dynamic(() => import('./components/tabs/SentimentTab').then(m => ({ default: m.SentimentTab })), { loading: TabLoader })
const CompetitorsTab = dynamic(() => import('./components/tabs/CompetitorsTab').then(m => ({ default: m.CompetitorsTab })), { loading: TabLoader })
const GapAnalysisTab = dynamic(() => import('./components/tabs/GapAnalysisTab').then(m => ({ default: m.GapAnalysisTab })), { loading: TabLoader })
const PromptsTab = dynamic(() => import('./components/tabs/PromptsTab').then(m => ({ default: m.PromptsTab })), { loading: TabLoader })
const ShoppingTab = dynamic(() => import('./components/tabs/ShoppingTab').then(m => ({ default: m.ShoppingTab })), { loading: TabLoader })
const PersonasTab = dynamic(() => import('./components/tabs/PersonasTab').then(m => ({ default: m.PersonasTab })), { loading: TabLoader })

function DashboardContent() {
  const { t } = useLanguage()
  const ctx = useUnified()

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'visibility', label: 'Visibility', icon: <Eye className="w-4 h-4" /> },
    { key: 'prompts', label: 'Prompts', icon: <Tag className="w-4 h-4" />, badge: ctx.prompts.length ? `${ctx.prompts.filter(p => p.is_active).length}` : undefined },
    { key: 'mentions', label: 'Mentions', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'citations', label: 'Citations', icon: <Link2 className="w-4 h-4" /> },
    { key: 'sentiment', label: 'Sentiment', icon: <ThumbsUp className="w-4 h-4" /> },
    { key: 'competitors', label: 'Competitors', icon: <Users className="w-4 h-4" />, badge: ctx.scanResult?.suggested_brands?.length ? `${ctx.scanResult.suggested_brands.length}` : undefined },
    { key: 'gap_analysis', label: 'Gap Analysis', icon: <Target className="w-4 h-4" />, badge: ctx.gapResult ? `${ctx.gapResult.overall_gap_score}` : undefined },
    { key: 'shopping', label: 'Shopping', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'personas', label: 'Personas', icon: <UserCircle2 className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.dashboard.geoMonitor}</h1>
            <p className="text-sm text-gray-400">{t.dashboard.geoMonitorDesc}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Brand Setup */}
        <BrandSetupPanel />

        {/* Control Bar */}
        <ControlBar />

        {/* Error */}
        {ctx.scanError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-sm text-red-700">{ctx.scanError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => ctx.setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                ctx.activeTab === tab.key ? 'bg-red-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {tab.icon}
              {tab.label}
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  ctx.activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {ctx.activeTab === 'visibility' && <VisibilityTab />}
        {ctx.activeTab === 'prompts' && <PromptsTab />}
        {ctx.activeTab === 'mentions' && <MentionsTab />}
        {ctx.activeTab === 'citations' && <CitationsTab />}
        {ctx.activeTab === 'sentiment' && <SentimentTab />}
        {ctx.activeTab === 'competitors' && <CompetitorsTab />}
        {ctx.activeTab === 'gap_analysis' && <GapAnalysisTab />}
        {ctx.activeTab === 'shopping' && <ShoppingTab />}
        {ctx.activeTab === 'personas' && <PersonasTab />}
      </div>
    </div>
  )
}

export default function GeoMonitorPage() {
  return (
    <UnifiedProvider>
      <DashboardContent />
    </UnifiedProvider>
  )
}
