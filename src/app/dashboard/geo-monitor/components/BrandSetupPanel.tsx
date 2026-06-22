'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Settings, Save, X, ChevronDown, Trash2, Pencil, CheckCircle2, Search } from 'lucide-react'
import { useUnified } from './UnifiedContext'
import { TagInput } from './shared/ChartComponents'
import { BrandLogo } from '@/components/BrandLogo'
import {
  INDUSTRY_LIST,
  WORLD_COUNTRIES,
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

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-ink-2 mb-1.5">
      {children}
      {required && <span className="ml-1 text-red-soft">*</span>}
    </label>
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

// ── Searchable country dropdown ────────────────────────────────────────────────
function CountrySelectField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = WORLD_COUNTRIES.find(c => c.name === value)
  const filtered = WORLD_COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30)
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="flex w-full items-center gap-2 rounded-lg border border-divider bg-surface px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="flex-1 text-ink">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-ink-3">Select country...</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-divider-light bg-surface shadow-lg shadow-surface-muted/40">
          <div className="flex items-center gap-2 border-b border-divider-light px-2.5 py-2">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search countries…"
              className="flex-1 bg-transparent text-sm text-ink placeholder-ink-3 focus:outline-none"
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setSearch('') }
                if (e.key === 'Enter' && filtered.length > 0) {
                  onChange(filtered[0].name); setOpen(false); setSearch('')
                }
              }}
            />
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-ink-3">No results</p>
            ) : filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.name); setOpen(false); setSearch('') }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-warm ${
                  value === c.name ? 'bg-surface-warm font-medium text-ink' : 'text-ink-2'
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
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

export function BrandSetupPanel({ forceOpen = false }: { forceOpen?: boolean }) {
  const ctx = useUnified()
  const [showRecentDropdown, setShowRecentDropdown] = useState(false)
  const [keywordInput, setKeywordInput]       = useState('')
  // Brand identity (name + domain) is set once at onboarding and is immutable for
  // customers — one account == one brand. Only internal admin/staff, who manage
  // many tenant brands, can edit identity or switch between brands here.
  const isAdminOrStaff = ctx.userRole === 'admin' || ctx.userRole === 'staff'
  // Only Target Country is required here — Industry / Product Space are optional
  // refinements (the scan infers category from the brand + domain otherwise).
  const missingRequired = [
    !String(ctx.brandConfig.target_market ?? '').trim() ? 'Target Country' : null,
    // Identity is onboarding-guaranteed; only enforce it where it can be edited.
    isAdminOrStaff && !ctx.brandConfig.brand_name.trim() ? 'Brand Name' : null,
    isAdminOrStaff && !ctx.brandConfig.domain.trim() ? 'Domain' : null,
  ].filter(Boolean) as string[]
  const canSaveProfile = missingRequired.length === 0

  // Don't show the config panel while customer data is loading — prevents a
  // 1-2s flash of an empty form before the DB-hydrated config arrives.
  if (ctx.customerHydrating && !forceOpen) return null

  if (!forceOpen && !ctx.showConfig && ctx.isConfigured) {
    // Single readiness = AI Research readiness (same source the AI Research page
    // uses), so every surface shows one consistent %.
    const researchReady = ctx.isResearchReady
    const readiness = researchReady ? 100 : Math.round(((5 - ctx.researchMissingFields.length) / 5) * 100)
    const productSpace = ctx.brandConfig.product_space || ctx.brandConfig.keywords[0] || 'Product space not set'
    const market = ctx.brandConfig.target_market || 'Market not set'
    // Fields that actually feed PROMPT GENERATION (monitor_service builds prompts
    // from brand_name + one_liner + target_audience + keywords). Richer prompts →
    // richer scans, which is what AI Research aggregates. AI Research itself only
    // reads product_space/brand/domain/market, so we don't overclaim here.
    const missingEnrich = [
      !String(ctx.brandConfig.target_audience ?? '').trim() && 'a target audience',
      !String(ctx.brandConfig.one_liner ?? '').trim() && 'a one-liner',
    ].filter(Boolean) as string[]
    return (
      <div className="bg-surface border border-divider rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo domain={ctx.brandConfig.domain} name={ctx.brandConfig.brand_name} size={36} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Brand Profile</h3>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${researchReady ? 'bg-sage-bg text-sage' : 'bg-caution-bg text-caution'}`}>
                <CheckCircle2 className="w-3 h-3" />
                {readiness}% ready
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
              <span className="font-semibold text-ink-2">{ctx.brandConfig.brand_name}</span>
              <span>{ctx.brandConfig.domain || 'No domain'}</span>
              <span>·</span>
              <span>{market}</span>
              <span>·</span>
              <span>{productSpace}</span>
              <span>·</span>
              <span>{ctx.brandConfig.keywords.length} keywords</span>
            </div>
            {!researchReady ? (
              <p className="mt-1.5 text-[11px] text-caution">Needed for AI Research: {ctx.researchMissingFields.join(', ')}</p>
            ) : missingEnrich.length > 0 ? (
              <p className="mt-1.5 text-[11px] text-ink-3">Tip: add {missingEnrich.join(' and ')} — they sharpen the prompts we generate, which feeds richer scans.</p>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => ctx.setShowConfig(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-ink-inv rounded-xl text-base font-semibold hover:bg-ink/80 transition-colors"
        >
          <Pencil className="w-5 h-5" />
          Edit Profile
        </button>
      </div>
    )
  }

  if (!forceOpen && !ctx.showConfig) return null

  return (
    <div className="bg-surface rounded-xl border border-divider overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-divider-light flex items-center justify-between bg-canvas">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-ink-3" />
          <h3 className="text-sm font-semibold text-ink">Brand Profile</h3>
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

        {/* ═══ IDENTITY (admin/staff only) ═══════════════════════════════════
            One account == one brand. Brand Name + Domain are set at onboarding and
            are immutable for customers; only internal staff (who manage many tenant
            brands) can edit identity or switch brands via the Recent picker. */}
        {isAdminOrStaff && (
          <>
            <SectionLabel label="Identity" />

            {/* Brand Name + Recent */}
            <div>
              <FieldLabel required>Brand Name</FieldLabel>
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
              <FieldLabel required>Domain</FieldLabel>
              <input
                type="text"
                placeholder="e.g. https://us.ecoflow.com/"
                value={ctx.brandConfig.domain}
                onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, domain: e.target.value })}
                className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
              />
            </div>
          </>
        )}

        {/* ═══ CATEGORY ══════════════════════════════════════════════════════ */}
        <SectionLabel label="Category" />

        {/* Industry */}
        <div>
          <FieldLabel>Industry</FieldLabel>
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

        <div>
          <FieldLabel>Product Space</FieldLabel>
          <input
            type="text"
            placeholder="e.g. Portable power stations, gaming phones, projectors"
            value={ctx.brandConfig.product_space ?? ''}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, product_space: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        {/* ═══ BRAND DESCRIPTION ═════════════════════════════════════════════ */}
        <SectionLabel label="Brand Description" />

        {/* One-liner */}
        <div>
          <FieldLabel>One-liner</FieldLabel>
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
          <FieldLabel>Differentiation</FieldLabel>
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
          <FieldLabel required>Target Country</FieldLabel>
          <CountrySelectField
            value={ctx.brandConfig.target_market ?? ''}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, target_market: v })}
          />
        </div>

        {/* Target Audience */}
        <div>
          <FieldLabel>Target Audience</FieldLabel>
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
          <FieldLabel>SEO Keywords</FieldLabel>
          <TagInput
            value={ctx.brandConfig.keywords}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, keywords: v })}
            placeholder="Add keyword (comma to add multiple)..."
            inputValue={keywordInput}
            onInputChange={setKeywordInput}
          />
        </div>

        {/* Competitors are NOT configured here — they are an output of measurement.
            The scan auto-discovers every rival the AI names; to analyze a specific
            competitor's own visibility, that competitor registers their own account. */}

        {/* Error */}
        {ctx.configError && <p className="text-xs text-red-soft">{ctx.configError}</p>}
        {!canSaveProfile && !ctx.configError && (
          <p className="text-xs text-ink-3">
            Complete required fields to save: {missingRequired.join(', ')}
          </p>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={!canSaveProfile}
            onClick={() => {
              ctx.handleSaveConfig(keywordInput, '', '')
              setKeywordInput('')
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink"
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
