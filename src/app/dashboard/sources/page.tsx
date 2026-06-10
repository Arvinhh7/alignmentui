'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SourcesRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/ai-search#sources-gap')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
    </div>
  )
}
