'use client'

/**
 * Phase 5 — localStorage → Backend Migration Tool
 *
 * Reads the current user's localStorage GEO Monitor data (latest scan,
 * discover result, brand config) and lets an admin associate it with a
 * customer record, then pushes it to the backend via the import-scans and
 * customer-update endpoints.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Database, ArrowRight, CheckCircle2, AlertCircle, Loader2,
  BarChart3, Globe, FileSearch, Sparkles, ChevronDown,
} from 'lucide-react'
import { customersApi, CustomerSummary } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

// ── localStorage key constants (must match UnifiedContext) ──────────────────
const BRAND_CONFIG_KEY   = 'alignment_monitor_brand_config'
const SCAN_RESULTS_KEY   = 'alignment_monitor_scan_results'
const SCAN_HISTORY_KEY   = 'alignment_monitor_scan_history'
const DISCOVER_RESULT_KEY = 'alignment_monitor_discover_result'

// ── Types ───────────────────────────────────────────────────────────────────
interface LocalData {
  brandConfig: Record<string, unknown> | null
  scanResult:  Record<string, unknown> | null
  scanHistory: unknown[]
  discover:    Record<string, unknown> | null
}

type MigrateStep = 'idle' | 'running' | 'done' | 'error'

interface MigrateResult {
  scansImported: number
  configUpdated: boolean
  error?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function readLocalData(): LocalData {
  const safe = (key: string) => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  return {
    brandConfig: safe(BRAND_CONFIG_KEY),
    scanResult:  safe(SCAN_RESULTS_KEY),
    scanHistory: safe(SCAN_HISTORY_KEY) ?? [],
    discover:    safe(DISCOVER_RESULT_KEY),
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MigratePage() {
  const { user, role } = useAuth()
  const router = useRouter()

  const [localData, setLocalData]     = useState<LocalData | null>(null)
  const [customers, setCustomers]     = useState<CustomerSummary[]>([])
  const [selectedId, setSelectedId]   = useState<string>('')
  const [step, setStep]               = useState<MigrateStep>('idle')
  const [result, setResult]           = useState<MigrateResult | null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-[rgba(250,245,236,0.4)] text-sm">Admin access required.</p>
      </div>
    )
  }

  // ── Load data ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setLocalData(readLocalData())
  }, [])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!user?.id) return
    setLoadingCustomers(true)
    customersApi.list(user.id, false)
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false))
  }, [user?.id])

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasScan     = !!localData?.scanResult
  const hasDiscover = !!localData?.discover
  const hasBrand    = !!(localData?.brandConfig as Record<string, unknown> | null)?.brand_name

  const nothingToMigrate = !hasScan && !hasDiscover && !hasBrand

  const selectedCustomer = customers.find(c => c.id === selectedId)

  // ── Migration handler ─────────────────────────────────────────────────────
  const handleMigrate = async () => {
    if (!selectedId || !user?.id || !localData) return
    setStep('running')
    setResult(null)

    let scansImported = 0
    let configUpdated = false
    let error: string | undefined

    try {
      // 1. Import latest scan (importScans accepts a list of full scan JSON objects)
      if (hasScan && localData.scanResult) {
        const res = await customersApi.importScans(selectedId, user.id, [localData.scanResult])
        scansImported = res.imported
      }

      // 2. Update customer config_json + domain from brandConfig
      if (hasBrand && localData.brandConfig) {
        const cfg = localData.brandConfig as Record<string, unknown>
        await customersApi.update(selectedId, user.id, {
          domain: (cfg.domain as string) ?? '',
          config_json: cfg,
        })
        configUpdated = true
      }

      setStep('done')
      setResult({ scansImported, configUpdated })
    } catch (err) {
      error = err instanceof Error ? err.message : 'Migration failed.'
      setStep('error')
      setResult({ scansImported, configUpdated, error })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Database className="w-5 h-5 text-caution" />
            <h1 className="text-xl font-bold text-ink-inv">Data Migration</h1>
          </div>
          <p className="text-sm text-[rgba(250,245,236,0.4)]">
            Import your browser&apos;s cached GEO Monitor data into a customer record on the backend.
          </p>
        </div>

        {/* ── Step 1: What's in localStorage ──────────────────────────────── */}
        <section className="bg-[rgba(250,245,236,0.03)] border border-[rgba(250,245,236,0.07)] rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-inv mb-3">Step 1 — Local cache snapshot</h2>

          {localData === null ? (
            <div className="flex items-center gap-2 text-[rgba(250,245,236,0.4)] text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading localStorage…
            </div>
          ) : nothingToMigrate ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.08)] text-sm text-[rgba(250,245,236,0.4)]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              No cached data found. Run a scan in GEO Monitor first.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Brand config */}
              <DataRow
                icon={<Globe className="w-4 h-4 text-sage" />}
                label="Brand config"
                available={hasBrand}
                detail={hasBrand
                  ? `${(localData.brandConfig as Record<string,unknown>).brand_name} · ${(localData.brandConfig as Record<string,unknown>).domain || 'no domain'}`
                  : undefined
                }
              />

              {/* Latest scan */}
              <DataRow
                icon={<BarChart3 className="w-4 h-4 text-[rgba(100,180,255,0.8)]" />}
                label="Latest scan"
                available={hasScan}
                detail={hasScan
                  ? `Score ${Math.round((localData.scanResult as Record<string,unknown>).visibility_score as number)} · scanned ${formatDate((localData.scanResult as Record<string,unknown>).scanned_at as string)}`
                  : undefined
                }
              />

              {/* Discover result */}
              <DataRow
                icon={<FileSearch className="w-4 h-4 text-caution" />}
                label="Discover result"
                available={hasDiscover}
                detail={hasDiscover
                  ? `Generated ${formatDate((localData.discover as Record<string,unknown>).generated_at as string)}`
                  : undefined
                }
              />

              {/* Scan history note */}
              {localData.scanHistory.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[rgba(250,245,236,0.04)] text-xs text-[rgba(250,245,236,0.35)]">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[rgba(250,245,236,0.25)]" />
                  <span>
                    {localData.scanHistory.length} compact history entries are stored locally — these are chart summaries
                    only and won&apos;t be imported (only the full latest scan is imported).
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Step 2: Choose target customer ──────────────────────────────── */}
        {!nothingToMigrate && step !== 'done' && (
          <section className="bg-[rgba(250,245,236,0.03)] border border-[rgba(250,245,236,0.07)] rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink-inv mb-3">Step 2 — Choose target customer</h2>

            {loadingCustomers ? (
              <div className="flex items-center gap-2 text-sm text-[rgba(250,245,236,0.4)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading customers…
              </div>
            ) : customers.length === 0 ? (
              <div className="text-sm text-[rgba(250,245,236,0.4)]">
                No customers yet.{' '}
                <button
                  onClick={() => router.push('/dashboard/admin/customers')}
                  className="underline underline-offset-2 hover:text-ink-inv transition-colors"
                >
                  Create one first →
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full appearance-none bg-[rgba(250,245,236,0.05)] border border-[rgba(250,245,236,0.1)] rounded-xl px-4 py-3 pr-10 text-sm text-ink-inv focus:outline-none focus:border-[rgba(250,245,236,0.25)] transition-colors"
                >
                  <option value="">Select a customer…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.brand_name}{c.domain ? ` (${c.domain})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(250,245,236,0.3)] pointer-events-none" />
              </div>
            )}

            {/* What will happen */}
            {selectedCustomer && (
              <div className="mt-3 p-3 bg-[rgba(250,245,236,0.04)] rounded-xl border border-[rgba(250,245,236,0.06)] space-y-1.5 text-xs text-[rgba(250,245,236,0.45)]">
                <p className="font-semibold text-[rgba(250,245,236,0.6)] mb-2">
                  Will import into: <span className="text-ink-inv">{selectedCustomer.brand_name}</span>
                </p>
                {hasScan && <p>✓ Latest scan result → stored in Supabase, linked to this customer</p>}
                {hasBrand && <p>✓ Brand config (keywords, competitors, etc.) → saved to customer record</p>}
                {!hasDiscover && !hasScan && <p className="text-[rgba(250,245,236,0.3)]">Nothing new to import for this selection.</p>}
              </div>
            )}
          </section>
        )}

        {/* ── Step 3: Migrate button ──────────────────────────────────────── */}
        {!nothingToMigrate && step !== 'done' && (
          <section>
            <button
              onClick={handleMigrate}
              disabled={!selectedId || step === 'running' || nothingToMigrate}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold bg-ink-inv text-ink hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {step === 'running'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Migrating…</>
                : <><ArrowRight className="w-4 h-4" /> Run Migration</>
              }
            </button>
            <p className="text-center text-[10px] text-[rgba(250,245,236,0.25)] mt-2">
              This is non-destructive — your local cache is not deleted and can be migrated multiple times.
            </p>
          </section>
        )}

        {/* ── Result ─────────────────────────────────────────────────────── */}
        {step === 'done' && result && (
          <section className="p-5 bg-[rgba(100,200,130,0.06)] border border-[rgba(100,200,130,0.2)] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-sage" />
              <h2 className="text-sm font-semibold text-sage">Migration successful</h2>
            </div>
            <ul className="space-y-1.5 text-sm text-[rgba(250,245,236,0.6)]">
              {result.scansImported > 0 && (
                <li>✓ {result.scansImported} scan{result.scansImported !== 1 ? 's' : ''} imported</li>
              )}
              {result.configUpdated && (
                <li>✓ Customer config updated with brand settings</li>
              )}
            </ul>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => router.push('/dashboard/admin/customers')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-ink-inv text-ink hover:bg-surface-muted transition-colors"
              >
                View Customers →
              </button>
              <button
                onClick={() => {
                  setStep('idle')
                  setResult(null)
                  setSelectedId('')
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[rgba(250,245,236,0.5)] border border-[rgba(250,245,236,0.1)] hover:text-ink-inv hover:border-[rgba(250,245,236,0.2)] transition-colors"
              >
                Migrate more
              </button>
            </div>
          </section>
        )}

        {step === 'error' && result?.error && (
          <section className="p-4 bg-[rgba(201,86,75,0.08)] border border-[rgba(201,86,75,0.2)] rounded-2xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-soft flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-soft">Migration failed</p>
                <p className="text-xs text-[rgba(250,245,236,0.5)] mt-1">{result.error}</p>
              </div>
            </div>
            <button
              onClick={() => { setStep('idle'); setResult(null) }}
              className="mt-3 text-xs text-[rgba(250,245,236,0.4)] hover:text-ink-inv underline underline-offset-2 transition-colors"
            >
              Try again
            </button>
          </section>
        )}

      </div>
    </div>
  )
}

// ── Reusable data row ─────────────────────────────────────────────────────────

function DataRow({
  icon, label, available, detail,
}: {
  icon: React.ReactNode
  label: string
  available: boolean
  detail?: string
}) {
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${
      available
        ? 'bg-[rgba(250,245,236,0.03)] border-[rgba(250,245,236,0.06)]'
        : 'bg-transparent border-[rgba(250,245,236,0.04)] opacity-50'
    }`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[rgba(250,245,236,0.7)]">{label}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            available
              ? 'bg-[rgba(100,200,130,0.12)] text-sage'
              : 'bg-[rgba(250,245,236,0.06)] text-[rgba(250,245,236,0.3)]'
          }`}>
            {available ? 'FOUND' : 'MISSING'}
          </span>
        </div>
        {detail && <p className="text-[11px] text-[rgba(250,245,236,0.35)] mt-0.5 truncate">{detail}</p>}
      </div>
    </div>
  )
}
