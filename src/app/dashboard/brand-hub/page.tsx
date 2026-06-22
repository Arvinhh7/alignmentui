'use client'

import Link from 'next/link'
import type { ElementType, ReactNode } from 'react'
import { useEffect } from 'react'
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Database,
  Info,
  Sparkles,
  Target,
} from 'lucide-react'
import { UnifiedProvider, useUnified } from '../geo-monitor/components/UnifiedContext'
import { BrandSetupPanel } from '../geo-monitor/components/BrandSetupPanel'

function SectionCard({ title, subtitle, icon: Icon, iconColor, children }: {
  title: string
  subtitle?: string
  icon: ElementType
  iconColor: string
  children: ReactNode
}) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-divider-light flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-3 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function CompletionCard() {
  const ctx = useUnified()
  // Two readiness tiers:
  //  • core (3 fields)  → Prompt scans / monitoring
  //  • research (5)     → AI Research (needs Industry + Product Space)
  const coreReady = ctx.isProfileComplete
  const researchReady = ctx.isResearchReady
  const researchMissing = ctx.researchMissingFields
  const TOTAL = 5 // RESEARCH_PROFILE_FIELDS.length
  const pct = researchReady ? 100 : Math.round(((TOTAL - researchMissing.length) / TOTAL) * 100)

  // Headline reflects what's ACTUALLY ready, not the loose core-only definition.
  const headline = researchReady
    ? 'Profile ready for AI Research and Prompt scans'
    : coreReady
      ? 'Prompt scans ready — add Industry + Product Space to unlock AI Research'
      : 'Complete your core profile to start scanning'

  // Green only when fully research-ready; amber while AI Research is still gated.
  const tone = researchReady
    ? 'border-sage/25 bg-sage-bg/40'
    : 'border-caution/30 bg-caution-bg/45'

  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Customer Intelligence Profile</div>
          <h2 className="mt-1 text-[18px] font-bold text-ink">{headline}</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Brand Hub is the single source of truth for your market, brand profile, and prompt generation. Competitors are auto-detected from your scans — nothing to configure.
          </p>
        </div>
        <div className="rounded-2xl border border-divider-light bg-surface px-4 py-3 text-right">
          <div className="text-[24px] font-bold text-ink">{pct}%</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Ready</div>
        </div>
      </div>
      {!researchReady && (
        <p className="mt-3 text-[12px] text-caution">
          {coreReady ? 'Needed for AI Research' : 'Missing'}: {researchMissing.join(', ')}
        </p>
      )}
    </div>
  )
}

function BrandHubContent() {
  const ctx = useUnified()
  const { customerHydrating, isProfileComplete, setShowConfig, showConfig } = ctx

  useEffect(() => {
    if (!customerHydrating && !isProfileComplete && !showConfig) {
      setShowConfig(true)
    }
  }, [customerHydrating, isProfileComplete, setShowConfig, showConfig])

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="heading-dash">Brand Hub</h1>
            <p className="text-ink-3 text-sm mt-1">
              Customer Intelligence Profile — the foundation for AI Research, Prompt, and Analysis.
            </p>
          </div>
          <Link
            href="/dashboard/ai-search"
            className="inline-flex items-center gap-2 rounded-xl border border-divider bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-warm"
          >
            Open AI Research
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-6">
          <CompletionCard />
          <BrandSetupPanel forceOpen={!ctx.isProfileComplete} />

          {ctx.isProfileComplete && (
            <div className="rounded-2xl border border-divider-light bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sage">Next step</div>
                  <h3 className="mt-1 text-[16px] font-bold text-ink">Run AI Research, then turn gaps into Prompt scans</h3>
                  <p className="mt-1 text-[12px] text-ink-3">
                    After profile setup, AI Research diagnoses Sources Map and Design Prompts. Prompt then runs the daily measurement loop.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/dashboard/ai-search" className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-[12px] font-semibold text-ink-inv hover:bg-ink/80">
                    <Sparkles className="h-3.5 w-3.5" />
                    Run AI Research
                  </Link>
                  <Link href="/dashboard/prompts" className="inline-flex items-center gap-2 rounded-xl border border-divider-light bg-canvas px-4 py-2 text-[12px] font-semibold text-ink hover:bg-surface-warm">
                    <Target className="h-3.5 w-3.5" />
                    Manage Prompt
                  </Link>
                </div>
              </div>
            </div>
          )}

          <SectionCard title="Knowledge Base" subtitle="AI-readable context about your brand — helps AI engines cite you correctly" icon={Cpu} iconColor="bg-surface-warm text-ink-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'llms.txt',
                  desc: 'Machine-readable brand context file for AI crawlers',
                  action: 'Generate',
                  href: '/dashboard/geo-audit',
                  icon: Database,
                },
                {
                  title: 'FAQ Content',
                  desc: 'Structured Q&A that AI engines can directly cite',
                  action: 'Create',
                  href: '/dashboard/geo-content',
                  icon: BookOpen,
                },
                {
                  title: 'Structured Data',
                  desc: 'Schema.org markup for AI-readable entity recognition',
                  action: 'Audit',
                  href: '/dashboard/geo-audit',
                  icon: Target,
                },
              ].map(item => (
                <Link key={item.title} href={item.href} className="rounded-xl border border-divider-light bg-surface-warm p-4 hover:border-divider hover:bg-surface-muted transition-colors">
                  <div className="mb-2 flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-ink-3" />
                    <span className="text-[12px] font-bold text-ink-2">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-ink-3 mb-3 leading-relaxed">{item.desc}</p>
                  <span className="text-[11px] font-semibold text-ink-2 inline-flex items-center gap-1">
                    {item.action} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-4 bg-caution-bg border border-caution/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-caution flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-caution leading-relaxed">
                <strong>Knowledge Base is the AI era&apos;s SEO foundation.</strong> Structured, machine-readable content makes it easier for AI systems to understand, cite, and recommend your brand.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default function BrandHubPage() {
  return (
    <UnifiedProvider>
      <BrandHubContent />
    </UnifiedProvider>
  )
}
