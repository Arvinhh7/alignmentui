'use client'

import { useState } from 'react'
import { Settings, Save, X, ChevronDown, Trash2 } from 'lucide-react'
import { useUnified } from './UnifiedContext'
import { TagInput } from './shared/ChartComponents'

export function BrandSetupPanel() {
  const ctx = useUnified()
  const [showRecentDropdown, setShowRecentDropdown] = useState(false)

  if (!ctx.showConfig) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Brand Configuration</h3>
        </div>
        {ctx.isConfigured && (
          <button onClick={() => ctx.setShowConfig(false)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Brand Name + Recent Brands */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Brand Name</label>
          <div className="relative">
            <input type="text" placeholder="e.g. STAYREAL"
              value={ctx.brandConfig.brand_name}
              onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, brand_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 pr-24"
            />
            {ctx.recentBrands.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-500 transition-colors">
                  Recent <ChevronDown className="w-3 h-3" />
                </button>
                {showRecentDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {ctx.recentBrands.map((r, i) => (
                      <button key={i} onClick={() => { ctx.loadRecentBrand(r); setShowRecentDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-gray-800">{r.brand_name}</span>
                        <span className="text-gray-400 ml-2">{r.domain}</span>
                      </button>
                    ))}
                    <button onClick={() => { ctx.clearRecentBrands(); setShowRecentDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-t border-gray-100">
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
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Domain</label>
          <input type="text" placeholder="e.g. istayreal.com"
            value={ctx.brandConfig.domain}
            onChange={e => ctx.setBrandConfig({ ...ctx.brandConfig, domain: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Keywords</label>
          <TagInput value={ctx.brandConfig.keywords} onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, keywords: v })} placeholder="Add keyword..." />
        </div>

        {/* Competitors */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Competitors</label>
          <TagInput value={ctx.brandConfig.competitors} onChange={v => ctx.setBrandConfig({ ...ctx.brandConfig, competitors: v })} placeholder="Add competitor..." />
        </div>

        {/* Error */}
        {ctx.configError && <p className="text-xs text-red-500">{ctx.configError}</p>}

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={ctx.handleSaveConfig}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Save
          </button>
          {ctx.isConfigured && (
            <button onClick={ctx.handleClearConfig}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
