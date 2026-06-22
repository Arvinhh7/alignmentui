'use client'

import { useState } from 'react'
import Link from 'next/link'
import FeatureLink from '@/components/FeatureLink'
import {
  Bot, Plus, Calendar, Search,
  Sparkles, FileText, BarChart3, MessageSquare,
  TrendingUp, Zap, Globe, Clock, Activity,
  ArrowRight, Lock, Layers, Star,
} from 'lucide-react'

// ─── Agent Template types ──────────────────────────────────────────────────────
interface AgentTemplate {
  id: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  tags: string[]
  estimatedTime: string
  isPreset: boolean
  comingSoon?: boolean
  /** Direct route for agents that are actually functional */
  href?: string
}

// ─── Preset Agent Templates ────────────────────────────────────────────────────
const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'geo-diagnostic',
    icon: BarChart3,
    iconColor: 'text-red-soft',
    iconBg: 'bg-red-soft-bg',
    title: 'GEO Diagnostic Report',
    description: 'Generate a complete GEO diagnostic report for your brand — covering AI visibility, citation sources, platform coverage, and optimization recommendations.',
    tags: ['Visibility', 'Analysis', 'Report'],
    estimatedTime: '~3 min',
    isPreset: true,
    href: '/dashboard/geo-monitor',
  },
  {
    id: 'content-optimizer',
    icon: Zap,
    iconColor: 'text-caution',
    iconBg: 'bg-caution-bg',
    title: 'AEO Content Optimizer',
    description: 'Analyze your existing content and generate AI-optimized FAQ, how-to, and comparison content that AI engines are more likely to cite.',
    tags: ['Content', 'FAQ', 'Optimization'],
    estimatedTime: '~2 min',
    isPreset: true,
    href: '/dashboard/geo-content',
  },
  {
    id: 'competitor-insights',
    icon: TrendingUp,
    iconColor: 'text-sage',
    iconBg: 'bg-sage-bg',
    title: 'Competitor AI Analysis',
    description: 'Compare your brand\'s AI visibility against competitors. Find where competitors outrank you and discover content gaps to close.',
    tags: ['Competitors', 'Strategy'],
    estimatedTime: '~5 min',
    isPreset: true,
  },
  {
    id: 'weekly-health',
    icon: Activity,
    iconColor: 'text-ink-2',
    iconBg: 'bg-surface-muted',
    title: 'Weekly Brand Health Report',
    description: 'Automatically generate a weekly summary of your brand\'s AI visibility trends, top performing topics, and recommended actions.',
    tags: ['Monitoring', 'Trends', 'Weekly'],
    estimatedTime: '~2 min',
    isPreset: true,
  },
  {
    id: 'reddit-insights',
    icon: MessageSquare,
    iconColor: 'text-ink-2',
    iconBg: 'bg-surface-warm',
    title: 'Reddit Insights Generator',
    description: 'Find the best subreddits, post templates, and discussion threads to distribute your content for maximum AI citation potential.',
    tags: ['Reddit', 'Distribution', 'UGC'],
    estimatedTime: '~3 min',
    isPreset: true,
  },
  {
    id: 'faq-generator',
    icon: FileText,
    iconColor: 'text-ink-2',
    iconBg: 'bg-surface-warm',
    title: 'AEO Optimized FAQ Generator',
    description: 'Generate structured FAQ content optimized for AI Answer Engines. Based on real prompts users are asking about your brand.',
    tags: ['FAQ', 'Content', 'AEO'],
    estimatedTime: '~2 min',
    isPreset: true,
  },
  {
    id: 'llms-txt',
    icon: Globe,
    iconColor: 'text-sage',
    iconBg: 'bg-sage-bg',
    title: 'llms.txt File Generator',
    description: 'Auto-generate an llms.txt file for your website — the new standard for helping AI models understand and cite your brand content.',
    tags: ['Technical', 'SEO', 'AI Readability'],
    estimatedTime: '~1 min',
    isPreset: true,
    comingSoon: true,
  },
  {
    id: 'aeo-research',
    icon: Search,
    iconColor: 'text-red-soft',
    iconBg: 'bg-red-soft-bg',
    title: 'AEO + GEO Research Report',
    description: 'Deep research report combining Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) insights for your industry.',
    tags: ['Research', 'AEO', 'GEO'],
    estimatedTime: '~8 min',
    isPreset: true,
    comingSoon: true,
  },
]

// ─── Upcoming features ─────────────────────────────────────────────────────────
const UPCOMING_FEATURES = [
  { icon: Calendar, label: 'Scheduled Reports', desc: 'Auto-run agents on a schedule (daily, weekly, monthly)' },
  { icon: Layers, label: 'Custom Workflows', desc: 'Combine multiple agents into one automated pipeline' },
  { icon: Globe, label: 'Third-party Integrations', desc: 'Connect Slack, Notion, Google Sheets, and more' },
]

// ─── Agent Card ────────────────────────────────────────────────────────────────
function AgentCard({ agent, onOpen }: { agent: AgentTemplate; onOpen: (id: string) => void }) {
  const Icon = agent.icon
  return (
    <div className={`bg-surface rounded-2xl border border-divider-light p-5 shadow-sm hover:shadow-md transition-all hover:border-divider group relative ${agent.comingSoon ? 'opacity-70' : ''}`}>
      {agent.isPreset && (
        <span className="absolute top-4 right-4 text-[8px] font-bold px-2 py-0.5 bg-surface-warm text-ink-3 rounded-full tracking-wide">PRESET</span>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${agent.iconBg}`}>
        <Icon className={`w-5 h-5 ${agent.iconColor}`} strokeWidth={2} />
      </div>
      <h3 className="text-[14px] font-bold text-ink mb-1.5 pr-8">{agent.title}</h3>
      <p className="text-[12px] text-ink-3 leading-relaxed mb-4 line-clamp-2">{agent.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.tags.map(tag => (
          <span key={tag} className="text-[10px] font-medium px-2 py-0.5 bg-surface-warm text-ink-2 rounded-full">{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-ink-3">
          <Clock className="w-3 h-3" />
          <span>{agent.estimatedTime}</span>
        </div>
        {agent.comingSoon ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-3 bg-surface-warm px-3 py-1.5 rounded-xl">
            <Lock className="w-3 h-3" />
            Coming Soon
          </span>
        ) : agent.href ? (
          <Link
            href={agent.href}
            className="flex items-center gap-1 text-[12px] font-semibold text-ink-2 group-hover:gap-2 transition-all bg-surface-warm hover:bg-surface-muted px-3 py-1.5 rounded-xl"
          >
            Open Agent <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={() => onOpen(agent.id)}
            className="flex items-center gap-1 text-[12px] font-semibold text-ink-2 group-hover:gap-2 transition-all bg-surface-warm hover:bg-surface-muted px-3 py-1.5 rounded-xl"
          >
            Open Agent <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Coming Soon Modal ─────────────────────────────────────────────────────────
function AgentComingSoonModal({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const agent = AGENT_TEMPLATES.find(a => a.id === agentId)
  if (!agent) return null
  const Icon = agent.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${agent.iconBg}`}>
          <Icon className={`w-7 h-7 ${agent.iconColor}`} strokeWidth={2} />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">{agent.title}</h2>
        <p className="text-ink-3 text-sm mb-6 leading-relaxed">{agent.description}</p>

        <div className="bg-canvas rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-caution" />
            <span className="text-[12px] font-bold text-ink-2">This agent will:</span>
          </div>
          <ul className="space-y-2">
            {['Analyze your brand\'s AI visibility data', 'Generate actionable recommendations', 'Create a shareable report'].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-ink-2">
                <span className="w-4 h-4 bg-sage-bg text-sage rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-caution-bg border border-caution/30 rounded-xl p-3 mb-6">
          <p className="text-[11px] text-caution font-medium">
            🚀 Agent functionality is coming very soon! Run a GEO Monitor scan first to enable agents.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-divider text-ink-2 font-semibold text-sm rounded-xl hover:bg-surface-warm transition-colors"
          >
            Close
          </button>
          <FeatureLink
            feature="geo-monitor"
            className="flex-1 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold text-sm rounded-xl transition-colors text-center"
            onPreNav={onClose}
          >
            Run a Scan First →
          </FeatureLink>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'schedules'>('all')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = AGENT_TEMPLATES.filter(agent =>
    !searchQuery || agent.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ────────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-ink">Agents</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-warm text-ink-2 border border-divider rounded-full">BETA</span>
            </div>
            <p className="text-ink-3 text-sm">Automated GEO workflows powered by Alignment AI data + LLMs</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-ink-3 bg-surface border border-divider px-3 py-1.5 rounded-xl">
              <Sparkles className="w-3.5 h-3.5 text-caution" />
              <span className="font-semibold text-ink-2">0</span>
              <span>/100 runs used</span>
            </div>
            <button
              disabled
              className="flex items-center gap-1.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New Agent
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-surface border border-divider rounded-xl p-1 w-fit">
          {(['all', 'schedules'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-ink text-ink-inv shadow-sm'
                  : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {tab === 'all' ? 'All' : 'Schedules'}
              {tab === 'schedules' && (
                <span className="ml-1.5 text-[9px] font-bold text-ink-3">SOON</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'all' && (
          <>
            {/* ── Templates Section ──────────────────────────────────────────────── */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-ink">Start from a template</h2>
                <span className="text-[12px] text-ink-3">{AGENT_TEMPLATES.length} templates</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {AGENT_TEMPLATES.slice(0, 8).map(agent => (
                  <AgentCard key={agent.id} agent={agent} onOpen={id => setSelectedAgent(id)} />
                ))}
              </div>
            </div>

            {/* ── My Agents Section ─────────────────────────────────────────────── */}
            <div className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider-light">
                <h2 className="text-[15px] font-bold text-ink">My Agents</h2>
                <div className="flex items-center gap-3">
                  <div className="flex bg-surface-warm rounded-lg p-0.5">
                    {['Created by anyone', 'Created by me'].map(filter => (
                      <button
                        key={filter}
                        className="px-3 py-1 text-[11px] font-medium text-ink-2 hover:text-ink rounded-md transition-colors first:bg-surface first:shadow-sm first:text-ink"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search agents"
                      className="pl-8 pr-3 py-1.5 text-[12px] border border-divider rounded-lg focus:outline-none focus:border-ink bg-surface"
                    />
                  </div>
                </div>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-4 px-6 py-2.5 bg-canvas border-b border-divider-light">
                {['Name', 'Status', 'Creator', 'Last Modified'].map(col => (
                  <span key={col} className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">{col}</span>
                ))}
              </div>

              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 bg-surface-warm rounded-2xl flex items-center justify-center mb-4">
                  <Bot className="w-7 h-7 text-ink-3" />
                </div>
                <h3 className="text-[15px] font-bold text-ink mb-2">Create an agent</h3>
                <p className="text-[13px] text-ink-3 mb-6 max-w-sm">
                  Combine Alignment data, LLMs, and third-party integrations to create custom marketing automations.
                </p>
                <button
                  disabled
                  className="flex items-center gap-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Create new
                </button>
                <p className="text-[11px] text-ink-3 mt-3">Custom agent creation coming soon</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'schedules' && (
          <div className="bg-surface rounded-2xl border border-divider-light shadow-sm p-12 text-center">
            <div className="w-14 h-14 bg-surface-warm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-ink-3" />
            </div>
            <h3 className="text-[16px] font-bold text-ink mb-2">Scheduled Agents</h3>
            <p className="text-[13px] text-ink-3 mb-6 max-w-sm mx-auto">
              Set up agents to run automatically on a schedule — daily reports, weekly health checks, and more.
            </p>
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-caution bg-caution-bg border border-caution/30 px-4 py-2 rounded-xl">
              <Star className="w-3.5 h-3.5" />
              Coming Soon
            </span>
          </div>
        )}

        {/* ── Upcoming capabilities ──────────────────────────────────────────── */}
        <div className="mt-8 bg-ink rounded-2xl p-6 text-ink-inv">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-caution" />
            <span className="text-[13px] font-semibold text-ink-3">Upcoming agent capabilities</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {UPCOMING_FEATURES.map(feat => (
              <div key={feat.label} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feat.icon className="w-4 h-4 text-ink-3" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink-inv">{feat.label}</p>
                  <p className="text-[11px] text-ink-3 mt-0.5 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent modal */}
      {selectedAgent && (
        <AgentComingSoonModal agentId={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  )
}
