'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi, ModuleType } from '@/lib/api'
import { Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import { MODULES, ModulePanel } from './assets/module-forms'

export default function BrandDataTab({ domainId }: { domainId: string }) {
  const { user } = useAuth()
  const [assets, setAssets] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [savingModule, setSavingModule] = useState<ModuleType | null>(null)
  const [savedModules, setSavedModules] = useState<Set<ModuleType>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoFillResult, setAutoFillResult] = useState<{ filled: string[]; message: string } | null>(null)

  const loadAssets = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await proxyApi.getAssets(domainId, user.id)
      setAssets(data.assets as Record<string, unknown>)
    } catch { /* empty state ok */ }
    finally { setLoading(false) }
  }, [domainId, user?.id])

  useEffect(() => { loadAssets() }, [loadAssets])

  const saveModule = async (type: ModuleType, content: unknown) => {
    if (!user?.id) throw new Error('Not authenticated')
    setSavingModule(type)
    setError(null)
    try {
      await proxyApi.updateAsset(domainId, type, content as Record<string, unknown>, user.id)
      setSavedModules(prev => new Set(prev).add(type))
      setAssets(prev => ({ ...prev, [type]: content }))
      setTimeout(() => setSavedModules(prev => {
        const s = new Set(prev); s.delete(type); return s
      }), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      throw e // re-throw so ModulePanel stays open on error
    } finally {
      setSavingModule(null)
    }
  }

  const handleAutoFill = async () => {
    if (!user?.id) return
    setAutoFilling(true)
    setAutoFillResult(null)
    setError(null)
    try {
      const result = await proxyApi.autoFill(domainId, user.id)
      setAutoFillResult({ filled: result.filled_modules, message: result.message })
      // Reload assets to show newly filled data
      await loadAssets()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auto-fill failed')
    } finally {
      setAutoFilling(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  )

  const configured = MODULES.filter(m => m.type in assets).length

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Auto-fill success banner */}
      {autoFillResult && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-emerald-800">{autoFillResult.message}</div>
            <div className="text-xs text-emerald-600 mt-0.5">
              Modules filled: {autoFillResult.filled.map(m => m.replace(/_/g, ' ')).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar + Auto-fill button */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">Modules configured</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-700">{configured} / {MODULES.length}</span>
            <button
              onClick={handleAutoFill}
              disabled={autoFilling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {autoFilling
                ? <><Loader2 className="w-3 h-3 animate-spin" />AI 正在分析…</>
                : <><Sparkles className="w-3 h-3" />Auto-fill with AI</>
              }
            </button>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all"
            style={{ width: `${(configured / MODULES.length) * 100}%` }}
          />
        </div>
        {autoFilling && (
          <p className="text-xs text-gray-400 mt-2">
            Crawling your site and extracting brand data with AI… this takes 15-30 seconds.
          </p>
        )}
      </div>

      {/* Module panels */}
      {MODULES.map(m => (
        <ModulePanel
          key={m.type}
          {...m}
          initialContent={assets[m.type] ?? null}
          onSave={content => saveModule(m.type, content)}
          isSaving={savingModule === m.type}
          saved={savedModules.has(m.type)}
        />
      ))}

      {/* Sync reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <div className="text-sm text-amber-800">
          <div className="font-semibold mb-0.5">Remember to sync after saving</div>
          <div className="text-xs text-amber-700">
            Go to the <strong>Overview</strong> tab → <strong>Sync Now</strong> to push changes to the edge network. Takes effect within ~60 seconds.
          </div>
        </div>
      </div>
    </div>
  )
}
