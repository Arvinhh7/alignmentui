'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, CreditBalance } from '@/lib/api'
import { useAuth } from './useAuth'

export function useCredits() {
  const { user } = useAuth()
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await api.getCredits(user.id)
      setCredits(res.data ?? null)
    } catch {
      setCredits(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    refresh()
  }, [user?.id, refresh])

  return { credits, loading, refresh }
}
