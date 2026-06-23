'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase'
import { normalizePath } from '@/lib/path'
import { TOUR_STEPS, TOUR_UI, fillBrand } from './tourSteps'

const TOUR_DONE_KEY = 'alignment_tour_done'   // + ':' + userId
const START_EVENT = 'alignment:start-tour'    // manual replay trigger

// The tour auto-starts only here (the post-onboarding landing). Manual replay
// (the START_EVENT) can fire from any dashboard page. Compared trailing-slash
// agnostically via normalizePath — usePathname() returns a trailing slash under
// next.config trailingSlash:true, but this literal must not depend on that.
const AUTOSTART_PATH = '/dashboard/analysis'

const POPOVER_W = 320

type Rect = { top: number; left: number; width: number; height: number }

export function ProductTour() {
  const { lang } = useLanguage()
  const { user, role } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [brand, setBrand] = useState('')
  const [rect, setRect] = useState<Rect | null>(null)
  const startedRef = useRef(false)

  const step = active ? TOUR_STEPS[stepIdx] : null
  const isLast = stepIdx === TOUR_STEPS.length - 1

  const lsKey = user?.id ? `${TOUR_DONE_KEY}:${user.id}` : null

  // ── Persist completion (server is source of truth; localStorage = fast path) ──
  const markDone = useCallback(() => {
    if (lsKey) {
      try { localStorage.setItem(lsKey, '1') } catch {}
    }
    if (user?.id) {
      const supabase = getSupabase()
      supabase
        ?.from('profiles')
        .update({ onboarding_tour_completed_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {}, () => {})
    }
  }, [lsKey, user?.id])

  const start = useCallback(() => {
    setStepIdx(0)
    setActive(true)
  }, [])

  const close = useCallback((navigate: boolean) => {
    setActive(false)
    markDone()
    if (navigate) router.push('/dashboard/brand-hub?setup=1')
  }, [markDone, router])

  // ── Auto-start: real customers, post-onboarding landing, not yet completed ──
  useEffect(() => {
    if (startedRef.current) return
    if (role !== 'user' || !user?.id) return
    if (normalizePath(pathname) !== AUTOSTART_PATH) return
    if (lsKey && (() => { try { return localStorage.getItem(lsKey) === '1' } catch { return false } })()) return

    let cancelled = false
    ;(async () => {
      const supabase = getSupabase()
      if (!supabase) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('onboarding_tour_completed_at')
        .eq('id', user.id)
        .single()
      if (cancelled) return
      if (prof?.onboarding_tour_completed_at) {
        if (lsKey) { try { localStorage.setItem(lsKey, '1') } catch {} }
        return
      }
      // Personalize the welcome step with the brand name.
      const { data: cust } = await supabase
        .from('customers')
        .select('brand_name')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      setBrand(cust?.brand_name || '')
      startedRef.current = true
      // Let the page paint before the overlay appears.
      setTimeout(() => { if (!cancelled) start() }, 650)
    })()
    return () => { cancelled = true }
  }, [role, user?.id, pathname, lsKey, start])

  // ── Manual replay (Take a tour) ──
  useEffect(() => {
    const onStart = () => {
      const supabase = getSupabase()
      if (user?.id) {
        supabase?.from('customers').select('brand_name').eq('owner_user_id', user.id).limit(1).maybeSingle()
          .then(({ data }) => setBrand(data?.brand_name || ''), () => {})
      }
      start()
    }
    window.addEventListener(START_EVENT, onStart)
    return () => window.removeEventListener(START_EVENT, onStart)
  }, [start, user?.id])

  // ── Measure the anchored nav item each step (and on resize/scroll/animation) ──
  useEffect(() => {
    if (!active || !step) return
    if (!step.anchor) { setRect(null); return }

    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.anchor}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      } else {
        setRect(null) // anchor not present (permissions/collapsed) → centered fallback
      }
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    // Sidebar hover-expands with a transition; keep the spotlight synced briefly.
    const id = window.setInterval(measure, 250)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.clearInterval(id)
    }
  }, [active, step, stepIdx])

  const next = useCallback(() => {
    if (isLast) close(true)
    else setStepIdx(i => Math.min(TOUR_STEPS.length - 1, i + 1))
  }, [isLast, close])

  const back = useCallback(() => setStepIdx(i => Math.max(0, i - 1)), [])

  // ── Keyboard: Esc = skip, →/Enter = next, ← = back ──
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, next, back, close])

  if (!active || !step) return null

  const centered = !rect
  const title = step.title[lang]
  const body = fillBrand(step.body[lang], brand, lang)

  // ── Popover position ──
  // Reserve enough vertical space that the whole card (incl. the footer button)
  // stays on-screen even when the anchored nav item sits near the viewport
  // bottom. The beak then tracks the anchor's centre independently of the clamp.
  const POPOVER_EST_H = 300
  let popStyle: React.CSSProperties
  let beakTop = 26
  if (centered) {
    popStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: POPOVER_W }
  } else {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const left = rect.left + rect.width + 16
    const top = Math.min(Math.max(rect.top - 8, 12), Math.max(12, vh - POPOVER_EST_H - 12))
    const anchorCenter = rect.top + rect.height / 2
    beakTop = Math.min(Math.max(anchorCenter - top - 6, 12), POPOVER_EST_H - 48)
    popStyle = { top, left, width: POPOVER_W }
  }

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Scrim — block interaction with the app behind the tour. */}
      <div className="absolute inset-0 bg-ink/55" />

      {/* Spotlight cutout over the anchored nav item. */}
      {!centered && rect && (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-200"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 2px rgba(120,170,255,0.9), 0 0 0 9999px rgba(28,28,26,0.55)',
          }}
        />
      )}

      {/* Popover card */}
      <div
        className="absolute rounded-2xl border border-divider bg-surface shadow-xl p-5"
        style={popStyle}
      >
        {/* Beak (only when anchored to the left-hand sidebar) */}
        {!centered && (
          <div
            className="absolute w-3 h-3 bg-surface border-l border-b border-divider"
            style={{ left: -7, top: beakTop, transform: 'rotate(45deg)' }}
          />
        )}

        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12px] text-ink-3 tabular-nums">
            {TOUR_UI.stepOf[lang](stepIdx + 1, TOUR_STEPS.length)}
          </span>
          <button
            onClick={() => close(false)}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-2 transition-colors"
          >
            {TOUR_UI.skip[lang]}
            <X className="w-3 h-3" />
          </button>
        </div>

        <h3 className="text-[16px] font-bold text-ink mb-1.5">{title}</h3>
        <p className="text-[13px] leading-relaxed text-ink-3 mb-4">{body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {TOUR_STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx ? 'w-4 bg-ink' : 'w-1.5 bg-divider'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={stepIdx === 0}
            className="text-[13px] text-ink-3 hover:text-ink-2 transition-colors disabled:opacity-0 disabled:cursor-default"
          >
            {TOUR_UI.back[lang]}
          </button>
          <button
            onClick={next}
            className="px-4 py-2 rounded-xl bg-ink text-ink-inv text-[13px] font-semibold hover:bg-ink/80 transition-colors"
          >
            {isLast ? TOUR_UI.start[lang] : TOUR_UI.next[lang]}
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper for any "Take a tour" button to trigger a replay.
export function startProductTour() {
  window.dispatchEvent(new CustomEvent('alignment:start-tour'))
}
