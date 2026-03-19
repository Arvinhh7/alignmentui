'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectClient({ projectId }: { projectId: string }) {
  const router = useRouter()

  useEffect(() => {
    if (projectId && projectId !== '_') {
      router.replace(`/dashboard/ops?id=${projectId}`)
    } else {
      router.replace('/dashboard/ops')
    }
  }, [projectId, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
    </div>
  )
}
