'use client'

import { useEffect } from 'react'

// Clean public share target for referral links (/signup?refer=CODE). Forwards to
// the login page in signup mode, preserving the referral code so it can be
// captured into localStorage there.
export default function SignupRedirect() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const refer = p.get('refer')
    const qs = new URLSearchParams({ signup: 'true' })
    if (refer) qs.set('refer', refer)
    window.location.replace(`/login?${qs.toString()}`)
  }, [])

  return null
}
