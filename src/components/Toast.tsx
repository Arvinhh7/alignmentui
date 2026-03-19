'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void
    error:   (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
    info:    (title: string, message?: string) => void
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

// ─── Config per type ──────────────────────────────────────────────────────────
const CONFIG: Record<ToastType, { icon: React.ElementType; accent: string; bg: string; iconColor: string }> = {
  success: { icon: CheckCircle2, accent: 'border-l-emerald-500', bg: 'bg-white',   iconColor: 'text-emerald-500' },
  error:   { icon: XCircle,      accent: 'border-l-red-500',     bg: 'bg-white',   iconColor: 'text-red-500'     },
  warning: { icon: AlertTriangle, accent: 'border-l-amber-500',  bg: 'bg-white',   iconColor: 'text-amber-500'   },
  info:    { icon: Info,          accent: 'border-l-blue-500',   bg: 'bg-white',   iconColor: 'text-blue-500'    },
}

// ─── Single Toast Component ───────────────────────────────────────────────────
function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const { icon: Icon, accent, bg, iconColor } = CONFIG[item.type]

  return (
    <div
      className={`
        flex items-start gap-3 w-80 ${bg} rounded-2xl shadow-lg border-l-4 ${accent}
        border border-gray-100 p-4 animate-[slideInRight_0.25s_ease-out]
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`w-4.5 h-4.5 flex-shrink-0 mt-0.5 ${iconColor}`} strokeWidth={2.5} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 leading-snug">{item.title}</p>
        {item.message && <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(item.id)}
        className="p-0.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-gray-400" />
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `toast-${++counter.current}`
    setItems(prev => [...prev.slice(-4), { id, type, title, message, duration }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const toast = {
    success: (title: string, message?: string) => add('success', title, message),
    error:   (title: string, message?: string) => add('error',   title, message),
    warning: (title: string, message?: string) => add('warning', title, message),
    info:    (title: string, message?: string) => add('info',    title, message),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
        aria-label="Notifications"
      >
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <Toast item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
