'use client'

import { useState } from 'react'
import { Settings, Save, X, ChevronDown, Trash2 } from 'lucide-react'
import { useUnified } from './UnifiedContext'
import { TagInput } from './shared/ChartComponents'

export function BrandSetupPanel() {
  const ctx = useUnified()
  const [showRecentDropdown, setShowRecentDropdown] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [competitorInput, setCompetitorInput] = useState('')

  if (!ctx.showConfig) return null

  return (
    <div className="bg-surface rounded-xl border border-divider overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-divider-light flex items-center justify-between bg-canvas">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-ink-3" />
          <h3 className="text-sm font-semibold text-ink">Brand Configuration</h3>
        </div>
        {ctx.isConfigured && (
          <button onClick={() => ctx.setShowConfig(false)} className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
            <X className="w-4 h-4 text-ink-3" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Brand Name + Recent Brands */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Brand Name</label>
          <div className="relative">
            <input type="text" placeholder="e.g. STAYREAL"
              value={ctx.brandConfig.brand_name}
              onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, brand_name: e.target.value })}
              className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink pr-24"
            />
            {ctx.recentBrands.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                  className="flex items-center gap-1 px-2 py-1 bg-surface-warm hover:bg-surface-muted rounded text-xs text-ink-3 transition-colors">
                  Recent <ChevronDown className="w-3 h-3" />
                </button>
                {showRecentDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-60 bg-surface border border-divider rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {ctx.recentBrands.map((r, i) => (
                      <button key={i} onClick={() => { ctx.loadRecentBrand(r); setShowRecentDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-warm transition-colors">
                        <span className="font-medium text-ink">{r.brand_name}</span>
                        <span className="text-ink-3 ml-2">{r.domain}</span>
                      </button>
                    ))}
                    <button onClick={() => { ctx.clearRecentBrands(); setShowRecentDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-xs text-red-soft hover:bg-red-soft-bg border-t border-divider-light">
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
          <input type="text" placeholder="e.g. istayreal.com"
            value={ctx.brandConfig.domain}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, domain: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Keywords</label>
          <TagInput
            value={ctx.brandConfig.keywords}
            onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, keywords: v })}
            placeholder="Add keyword..."
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
            placeholder="Add competitor..."
            inputValue={competitorInput}
            onInputChange={setCompetitorInput}
          />
        </div>

        {/* One-liner */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Brand One-liner</label>
          <input type="text" placeholder="e.g. Dissolvable tea drops, no steeping required"
            value={ctx.brandConfig.one_liner ?? ''}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, one_liner: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Target Audience</label>
          <input type="text" placeholder="e.g. health-conscious US consumers aged 25-45"
            value={ctx.brandConfig.target_audience ?? ''}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, target_audience: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        {/* Target Market */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Target Market</label>
          <input type="text" placeholder="e.g. United States"
            value={ctx.brandConfig.target_market ?? ''}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, target_market: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        {/* Differentiation */}
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Brand Differentiation</label>
          <input type="text" placeholder="e.g. sugar-free, zero waste, single-serve format"
            value={ctx.brandConfig.differentiation ?? ''}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, differentiation: e.target.value })}
            className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
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
            className="flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Save
          </button>
          {ctx.isConfigured && (
            <button onClick={ctx.handleClearConfig}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-warm hover:bg-surface-muted text-ink-2 rounded-xl text-sm font-medium transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
