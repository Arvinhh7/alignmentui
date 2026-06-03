'use client'

import { useState, useMemo } from 'react'
import { Settings, Save, X, ChevronDown, Trash2, AlertTriangle } from 'lucide-react'
import { useUnified } from './UnifiedContext'
import { TagInput } from './shared/ChartComponents'
import {
  isBrandSelfVariant,
  INDUSTRY_LIST,
  TARGET_COUNTRIES,
  EDU_INSTITUTION_TERMS,
  GOV_INSTITUTION_TERMS,
} from './shared/constants'

// ── Section divider ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-divider" />
    </div>
  )
}

// ── Styled select dropdown ─────────────────────────────────────────────────────
function SelectField({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 pr-8 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink bg-surface appearance-none cursor-pointer text-ink"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
    </div>
  )
}

// ── Text input with character counter ─────────────────────────────────────────
function CharInput({
  value,
  onChange,
  placeholder,
  maxLen,
  warnAt,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLen: number
  warnAt: number
}) {
  const len = value.length
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLen}
        className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink pr-16"
      />
      {len > 0 && (
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums pointer-events-none ${
            len > warnAt ? 'text-caution' : 'text-ink-3'
          }`}
        >
          {len}/{maxLen}
        </span>
      )}
    </div>
  )
}

export function BrandSetupPanel() {
  const ctx = useUnified()
  const [showRecentDropdown, setShowRecentDropdown] = useState(false)
  const [keywordInput, setKeywordInput]       = useState('')
  const [competitorInput, setCompetitorInput] = useState('')

  // ── P2: Competitor industry-mismatch warning ───────────────────────────────
  // Warn when a competitor tag looks like an educational/gov institution while
  // the brand's industry is something else (e.g. SaaS).
  const competitorMismatch = useMemo(() => {
    const ind = ctx.brandConfig.industry ?? ''
    if (!ind || ind === 'education_edtech' || ind === 'nonprofit_gov' || ind === 'other') return []
    return ctx.brandConfig.competitors.filter(c => {
      const lc = c.toLowerCase()
      return (
        EDU_INSTITUTION_TERMS.some(t => lc.includes(t)) ||
        GOV_INSTITUTION_TERMS.some(t => lc.includes(t))
      )
    })
  }, [ctx.brandConfig.competitors, ctx.brandConfig.industry])

  // Don't show the config panel while customer data is loading — prevents a
  // 1-2s flash of an empty form before the DB-hydrated config arrives.
  if (!ctx.showConfig || ctx.customerHydrating) return null

  return (
    <div className="bg-surface rounded-xl border border-divider overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-divider-light flex items-center justify-between bg-canvas">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-ink-3" />
          <h3 className="text-sm font-semibold text-ink">Brand Configuration</h3>
        </div>
        {ctx.isConfigured && (
          <button
            onClick={() => ctx.setShowConfig(false)}
            className="p-1 hover:bg-surface-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-ink-3" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">

        {/* ═══ IDENTITY ══════════════════════════════════════════════════════ */}
        <SectionLabel label="Identity" />

        {/* Brand Name + Recent */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Brand Name</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. EcoFlow"
              value={ctx.brandConfig.brand_name}
              onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, brand_name: e.target.value })}
              className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink pr-24"
            />
            {ctx.recentBrands.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                  className="flex items-center gap-1 px-2 py-1 bg-surface-warm hover:bg-surface-muted rounded text-xs text-ink-3 transition-colors"
                >
                  Recent <ChevronDown className="w-3 h-3" />
                </button>
                {showRecentDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-60 bg-surface border border-divider rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {ctx.recentBrands.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => { ctx.loadRecentBrand(r); setShowRecentDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-warm transition-colors"
                      >
                        <span className="font-medium text-ink">{r.brand_name}</span>
                        <span className="text-ink-3 ml-2">{r.domain}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => { ctx.clearRecentBrands(); setShowRecentDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-xs text-red-soft hover:bg-red-soft-bg border-t border-divider-light"
                    >
                      Clear history
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Domain */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Domain</label>
          <input
            type="text"
            placeholder="e.g. https://us.ecoflow.com/"
            value={ctx.brandConfig.domain}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, domain: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Industry</label>
          <SelectField
            value={ctx.brandConfig.industry ?? ''}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, industry: v })}
          >
            {INDUSTRY_LIST.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                {opt.label}
              </option>
            ))}
          </SelectField>
        </div>

        {/* ═══ BRAND DESCRIPTION ═════════════════════════════════════════════ */}
        <SectionLabel label="Brand Description" />

        {/* One-liner */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">One-liner</label>
          <CharInput
            value={ctx.brandConfig.one_liner ?? ''}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, one_liner: v })}
            placeholder="e.g. Portable power stations for outdoor and emergency use"
            maxLen={120}
            warnAt={100}
          />
        </div>

        {/* Differentiation */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Differentiation</label>
          <CharInput
            value={ctx.brandConfig.differentiation ?? ''}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, differentiation: v })}
            placeholder="e.g. LFP battery, faster solar recharge, 5-year warranty vs competitor 2-year"
            maxLen={250}
            warnAt={200}
          />
        </div>

        {/* ═══ TARGET MARKET ═════════════════════════════════════════════════ */}
        <SectionLabel label="Target Market" />

        {/* Target Country */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Target Country</label>
          <SelectField
            value={ctx.brandConfig.target_market ?? ''}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, target_market: v })}
          >
            <option value="" disabled>Select country...</option>
            {TARGET_COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </SelectField>
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Target Audience</label>
          <input
            type="text"
            placeholder="e.g. outdoor enthusiasts, RV owners, homeowners aged 30-55"
            value={ctx.brandConfig.target_audience ?? ''}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, target_audience: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        {/* ═══ SEARCH INTENT ═════════════════════════════════════════════════ */}
        <SectionLabel label="Search Intent" />

        {/* SEO Keywords */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">SEO Keywords</label>
          <TagInput
            value={ctx.brandConfig.keywords}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, keywords: v })}
            placeholder="Add keyword (comma to add multiple)..."
            inputValue={keywordInput}
            onInputChange={setKeywordInput}
          />
        </div>

        {/* Competitors */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Competitors</label>
          <TagInput
            value={ctx.brandConfig.competitors}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, competitors: v })}
            placeholder="Add competitor (comma to add multiple)..."
            inputValue={competitorInput}
            onInputChange={setCompetitorInput}
            validate={(tag) => !isBrandSelfVariant(tag, ctx.brandConfig.brand_name, ctx.brandConfig.domain)}
          />
          {competitorMismatch.length > 0 && (
            <div className="flex items-start gap-1.5 mt-1.5 text-caution text-xs">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                <strong>{competitorMismatch.join(', ')}</strong>{' '}
                look like educational or government institutions — are these the right competitors for your industry?
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {ctx.configError && <p className="text-xs text-red-soft">{ctx.configError}</p>}

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              ctx.handleSaveConfig(keywordInput, competitorInput)
              setKeywordInput('')
              setCompetitorInput('')
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          {ctx.isConfigured && (
            <button
              onClick={ctx.handleClearConfig}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-warm hover:bg-surface-muted text-ink-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
