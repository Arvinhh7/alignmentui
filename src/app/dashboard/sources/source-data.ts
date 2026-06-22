export type SourceType =
  | 'UGC'
  | 'Editorial'
  | 'Official'
  | 'Corporate'
  | 'Reference'
  | 'Commerce'
  | 'Affiliate'
  | 'Institutional'
  | 'Other'

export interface SourceSummary {
  source_domains: number
  citations: number
  featured_sources: number
  top_source: {
    name: string
    domain: string
    citations: number
    share_pct: number
  }
}

export interface SourceDistributionItem {
  source_type: SourceType
  source_count: number
  citation_count: number
  domain_share_pct: number
  citation_share_pct: number
}

export interface PublicSourceDomain {
  id: string
  rank: number
  name: string
  domain: string
  source_type: SourceType
  raw_source_type?: string | null
  citation_count: number
  answer_count: number
  topic_count: number
  fact_row_count?: number
  sample_topics: string[]
  avg_position?: number | null
  last_observed_at?: string | null
}

export interface SourcesResponse {
  summary: SourceSummary
  distribution: SourceDistributionItem[]
  sources: PublicSourceDomain[]
  pagination: {
    limit: number
    offset: number
    total: number
    returned: number
    has_next: boolean
    has_previous: boolean
  }
}

export const SOURCE_TYPES: SourceType[] = [
  'UGC',
  'Editorial',
  'Official',
  'Corporate',
  'Reference',
  'Commerce',
  'Affiliate',
  'Institutional',
  'Other',
]

export const SOURCE_TYPE_STYLES: Record<SourceType, { badge: string; bar: string }> = {
  UGC: { badge: 'bg-[#DDF7FA] text-[#0B8EA0] border-[#B8EDF2]', bar: 'bg-[#17B8C8]' },
  Editorial: { badge: 'bg-[#E7F0FF] text-[#2D6CDF] border-[#C7DAFF]', bar: 'bg-[#3B82F6]' },
  Official: { badge: 'bg-[#E7F7E8] text-[#2E7D4F] border-[#C7E8D2]', bar: 'bg-[#43A66D]' },
  Corporate: { badge: 'bg-[#FFF0E2] text-[#E05E16] border-[#FFD3AA]', bar: 'bg-[#F97316]' },
  Reference: { badge: 'bg-[#F1E8FF] text-[#7C3AED] border-[#DCC9FF]', bar: 'bg-[#8B5CF6]' },
  Commerce: { badge: 'bg-[#FFF1DE] text-[#C7661C] border-[#FFD7A3]', bar: 'bg-[#F59E0B]' },
  Affiliate: { badge: 'bg-[#FFEDE6] text-[#D15F2A] border-[#FFD0BA]', bar: 'bg-[#FB7185]' },
  Institutional: { badge: 'bg-[#E1F8F3] text-[#0F8F7B] border-[#BDEDE3]', bar: 'bg-[#14B8A6]' },
  Other: { badge: 'bg-surface-muted text-ink-3 border-divider-light', bar: 'bg-ink-3' },
}

export function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
}
