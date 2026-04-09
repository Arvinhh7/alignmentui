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
      <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
    </div>
  )

  const configured = MODULES.filter(m => m.type in assets).length

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-soft-bg border border-red-soft/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-soft flex-shrink-0" />
          <span className="text-sm text-red-soft">{error}</span>
        </div>
      )}

      {/* Auto-fill success banner */}
      {autoFillResult && (
        <div className="flex items-start gap-3 bg-sage-bg border border-sage/20 rounded-2xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-sage">{autoFillResult.message}</div>
            <div className="text-xs text-sage mt-0.5">
              Modules filled: {autoFillResult.filled.map(m => m.replace(/_/g, ' ')).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar + Auto-fill button */}
      <div className="bg-surface border border-divider-light rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink-3">Modules configured</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-ink-2">{configured} / {MODULES.length}</span>
            <button
              onClick={handleAutoFill}
              disabled={autoFilling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {autoFilling
                ? <><Loader2 className="w-3 h-3 animate-spin" />AI 正在分析…</>
                : <><Sparkles className="w-3 h-3" />Auto-fill with AI</>
              }
            </button>
          </div>
        </div>
        <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-ink rounded-full transition-all"
            style={{ width: `${(configured / MODULES.length) * 100}%` }}
          />
        </div>
        {autoFilling && (
          <p className="text-xs text-ink-3 mt-2">
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
      <div className="bg-caution-bg border border-caution/20 rounded-2xl p-4 flex gap-3">
        <div className="text-sm text-caution">
          <div className="font-semibold mb-0.5">Remember to sync after saving</div>
          <div className="text-xs text-caution">
            Go to the <strong>Overview</strong> tab → <strong>Sync Now</strong> to push changes to the edge network. Takes effect within ~60 seconds.
          </div>
        </div>
      </div>
    </div>
  )
}
