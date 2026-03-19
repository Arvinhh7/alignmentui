'use client'

// ─── Base Skeleton ─────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200/80 rounded-lg ${className ?? ''}`} />
  )
}

// ─── KPI Card Skeleton ─────────────────────────────────────────────────────────
export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <Skeleton className="w-16 h-4" />
      </div>
      <Skeleton className="w-20 h-7 mb-2" />
      <Skeleton className="w-32 h-3" />
    </div>
  )
}

// ─── Table Row Skeleton ────────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className={`h-4 ${i === 0 ? 'w-full max-w-xs' : 'w-12 mx-auto'}`} />
        </td>
      ))}
    </tr>
  )
}

// ─── Overview Skeleton ─────────────────────────────────────────────────────────
export function OverviewSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="w-48 h-7 mb-2" />
          <Skeleton className="w-72 h-4" />
        </div>
        <Skeleton className="w-32 h-10 rounded-xl" />
      </div>

      {/* Health Score row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col items-center">
          <Skeleton className="w-24 h-24 rounded-full mb-3" />
          <Skeleton className="w-20 h-4" />
        </div>
        <div className="md:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <Skeleton className="w-40 h-5" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['Topic', 'AI Rank', 'Visibility', 'Citations', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3">
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map(i => <TableRowSkeleton key={i} cols={5} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Prompts Table Skeleton ────────────────────────────────────────────────────
export function PromptsTableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <Skeleton className="w-40 h-8 rounded-lg" />
        <Skeleton className="w-32 h-8 rounded-lg" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/60">
            {['', 'Prompt', 'Visible', 'Sentiment', 'Intent', 'Competitors', 'Added', ''].map((h, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-12 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1,2,3,4,5,6].map(i => <TableRowSkeleton key={i} cols={8} />)}
        </tbody>
      </table>
    </div>
  )
}

// ─── Brand Hub Skeleton ────────────────────────────────────────────────────────
export function BrandHubSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-pulse">
      <div className="flex items-start justify-between mb-8">
        <div>
          <Skeleton className="w-32 h-7 mb-2" />
          <Skeleton className="w-64 h-4" />
        </div>
        <Skeleton className="w-28 h-10 rounded-xl" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div>
            <Skeleton className="w-32 h-4 mb-1.5" />
            <Skeleton className="w-48 h-3" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          {[1,2,3,4].map(i => (
            <div key={i}>
              <Skeleton className="w-20 h-3 mb-2" />
              <Skeleton className="w-full h-10 rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {[1,2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <Skeleton className="w-32 h-5 mb-4" />
            <div className="flex flex-wrap gap-2">
              {[1,2,3].map(j => <Skeleton key={j} className="w-20 h-7 rounded-lg" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
