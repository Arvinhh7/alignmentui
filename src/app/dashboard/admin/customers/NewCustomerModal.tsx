'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { customersApi, CustomerCreate } from '@/lib/api'

interface NewCustomerModalProps {
  userId: string
  onClose: () => void
  onCreated: () => void
}

export default function NewCustomerModal({ userId, onClose, onCreated }: NewCustomerModalProps) {
  const [form, setForm] = useState<CustomerCreate>({
    brand_name: '',
    domain: '',
    notes: '',
    config_json: {},
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand_name.trim()) {
      setError('Brand name is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await customersApi.create(userId, {
        brand_name: form.brand_name.trim(),
        domain: form.domain?.trim() || '',
        notes: form.notes?.trim() || '',
        config_json: {},
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create customer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-ink border border-[rgba(250,245,236,0.1)] rounded-2xl shadow-elevation-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(250,245,236,0.08)]">
          <h2 className="text-base font-semibold text-ink-inv">New Customer</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[rgba(250,245,236,0.4)] hover:text-ink-inv hover:bg-[rgba(250,245,236,0.08)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Brand Name */}
          <div>
            <label className="block text-xs font-medium text-[rgba(250,245,236,0.5)] mb-1.5">
              Brand Name <span className="text-red-soft">*</span>
            </label>
            <input
              type="text"
              value={form.brand_name}
              onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
              placeholder="e.g. EcoFlow"
              autoFocus
              className="w-full bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.1)] rounded-xl px-3.5 py-2.5 text-sm text-ink-inv placeholder-[rgba(250,245,236,0.25)] focus:outline-none focus:border-[rgba(250,245,236,0.25)] transition-colors"
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-xs font-medium text-[rgba(250,245,236,0.5)] mb-1.5">
              Domain
            </label>
            <input
              type="text"
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              placeholder="e.g. ecoflow.com"
              className="w-full bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.1)] rounded-xl px-3.5 py-2.5 text-sm text-ink-inv placeholder-[rgba(250,245,236,0.25)] focus:outline-none focus:border-[rgba(250,245,236,0.25)] transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[rgba(250,245,236,0.5)] mb-1.5">
              Notes <span className="text-[rgba(250,245,236,0.25)] font-normal">(internal)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional: tier, contact, source, etc."
              rows={3}
              className="w-full bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.1)] rounded-xl px-3.5 py-2.5 text-sm text-ink-inv placeholder-[rgba(250,245,236,0.25)] focus:outline-none focus:border-[rgba(250,245,236,0.25)] transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-soft bg-[rgba(201,86,75,0.08)] border border-[rgba(201,86,75,0.2)] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[rgba(250,245,236,0.5)] border border-[rgba(250,245,236,0.1)] hover:border-[rgba(250,245,236,0.2)] hover:text-ink-inv transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.brand_name.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-ink-inv text-ink hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Creating…' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
