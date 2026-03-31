'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi, ProxyDomain } from '@/lib/api'
import {
  Globe, Plus, ExternalLink, RefreshCw, CheckCircle,
  Clock, AlertCircle, XCircle, Loader2, BarChart3,
  ArrowRight, Layers, Pause, Trash2,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; dot: string }> = {
  active:            { label: 'Active',            color: 'text-green-600 bg-green-50 border-green-200',  icon: CheckCircle,  dot: 'bg-green-500' },
  pending:           { label: 'Pending DNS',        color: 'text-amber-600 bg-amber-50 border-amber-200',  icon: Clock,        dot: 'bg-amber-400' },
  dns_verifying:     { label: 'Verifying DNS',      color: 'text-blue-600 bg-blue-50 border-blue-200',     icon: RefreshCw,    dot: 'bg-blue-400' },
  ssl_provisioning:  { label: 'Provisioning SSL',   color: 'text-purple-600 bg-purple-50 border-purple-200', icon: RefreshCw,  dot: 'bg-purple-400' },
  paused:            { label: 'Paused',             color: 'text-gray-500 bg-gray-50 border-gray-200',     icon: Pause,        dot: 'bg-gray-400' },
  error:             { label: 'Error',              color: 'text-red-600 bg-red-50 border-red-200',        icon: XCircle,      dot: 'bg-red-500' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function DeleteConfirmModal({
  domain, onConfirm, onCancel, loading,
}: {
  domain: ProxyDomain
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Delete Domain</h3>
        <p className="text-sm text-gray-500 text-center mb-1">
          Are you sure you want to delete
        </p>
        <p className="text-sm font-semibold text-gray-900 text-center mb-4">
          {domain.domain}
        </p>
        <p className="text-xs text-gray-400 text-center mb-6">
          This will remove the KV config and stop serving AI discovery files. DNS records in your registrar are not affected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DomainCard({ domain, onDelete }: { domain: ProxyDomain; onDelete: (id: string) => void }) {
  const isActive = domain.status === 'active'
  return (
    <div className="relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-red-300 hover:shadow-md transition-all group">
      <Link
        href={`/dashboard/visibility-proxy/${domain.id}?id=${domain.id}`}
        className="block"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-green-50' : 'bg-gray-100'}`}>
              <Globe className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{domain.domain}</h3>
                {isActive && <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">{domain.origin_url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={domain.status} />
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors" />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            {domain.robots_allow_all_ai ? 'AI bots: allowed' : 'AI bots: restricted'}
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </span>
          <span className="ml-auto">
            Added {new Date(domain.created_at).toLocaleDateString()}
          </span>
        </div>
      </Link>

      {/* Delete button — sits outside the Link to avoid nested anchors */}
      <button
        onClick={e => { e.preventDefault(); onDelete(domain.id) }}
        className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Delete domain"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function VisibilityProxyPage() {
  const { user } = useAuth()
  const [domains, setDomains] = useState<ProxyDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)   // domain id pending confirm
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadDomains = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await proxyApi.listDomains(user.id)
      setDomains(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load domains')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadDomains() }, [loadDomains])

  const handleDeleteConfirm = async () => {
    if (!deletingId || !user?.id) return
    setDeleteLoading(true)
    try {
      await proxyApi.deleteDomain(deletingId, user.id)
      setDomains(prev => prev.filter(d => d.id !== deletingId))
      setDeletingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete domain')
      setDeletingId(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const deletingDomain = domains.find(d => d.id === deletingId) ?? null

  return (
    <div className="min-h-screen bg-gray-50/50">
      {deletingDomain && (
        <DeleteConfirmModal
          domain={deletingDomain}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
          loading={deleteLoading}
        />
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Visibility Proxy</h1>
              <p className="text-sm text-gray-400">Add a DNS CNAME — AI sees your brand perfectly, zero code changes</p>
            </div>
          </div>
          <Link
            href="/dashboard/visibility-proxy/add"
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Stats strip */}
        {!loading && domains.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Domains', value: domains.length, color: 'text-gray-900' },
              { label: 'Active', value: domains.filter(d => d.status === 'active').length, color: 'text-green-600' },
              { label: 'Pending Setup', value: domains.filter(d => d.status !== 'active' && d.status !== 'error').length, color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && domains.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No domains yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Add your first domain and get a CNAME record to point at our proxy edge network.
            </p>
            <Link
              href="/dashboard/visibility-proxy/add"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Domain
            </Link>
          </div>
        )}

        {/* Domain list */}
        {!loading && domains.length > 0 && (
          <div className="grid gap-3">
            {domains.map(d => <DomainCard key={d.id} domain={d} onDelete={setDeletingId} />)}
          </div>
        )}

        {/* How it works */}
        {!loading && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">How Visibility Proxy Works</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { step: '1', title: 'Add CNAME', desc: 'Point your domain CNAME to our edge network — takes 30 seconds.' },
                { step: '2', title: 'Upload Brand Data', desc: 'Fill in 9 brand asset modules — or we do it after your onboarding call.' },
                { step: '3', title: 'AI Sees Everything', desc: 'AI bots get structured JSON-LD, llms.txt, and rich content automatically.' },
              ].map(item => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
