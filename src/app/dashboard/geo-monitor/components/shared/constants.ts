// ─── Central route registry ────────────────────────────
// SINGLE SOURCE OF TRUTH for every internal sourcing/CTA link rendered in
// GEO Monitor panels. Adding a new dashboard page? Register it here so all
// downstream cards/maps/tabs route correctly. Never inline a /dashboard/...
// string elsewhere — it WILL drift and break (e.g. /optimize vs /geo-optimization).
export const DASHBOARD_ROUTES = {
  audit:        '/dashboard/geo-audit',
  optimize:     '/dashboard/geo-optimization',
  content:      '/dashboard/geo-content',
  distribute:   '/dashboard/geo-distribution',
  monitor:      '/dashboard/geo-monitor',
  monitorDiscover: '/dashboard/geo-monitor?tab=discover',
  monitorPrompts:  '/dashboard/geo-monitor?tab=prompts',
} as const

// Build a content URL for a given content type (definition / faq / comparison …).
export const contentRoute = (type: string) => `${DASHBOARD_ROUTES.content}?type=${type}`

// ─── localStorage keys ─────────────────────────────────
export const BRAND_CONFIG_KEY = 'alignment_monitor_brand_config'
export const SCAN_RESULTS_KEY = 'alignment_monitor_scan_results'
export const SCAN_HISTORY_KEY = 'alignment_monitor_scan_history'
export const GAP_RESULTS_KEY = 'alignment_monitor_gap_results'
export const ADV_MENTIONS_KEY = 'alignment_monitor_adv_mentions'
export const RECENT_BRANDS_KEY = 'geo_monitor_recent_brands'
export const DISCOVER_RESULT_KEY = 'alignment_geo_discover_result'
// Active customer for the Monitor dropdown switcher — survives page refresh
export const ACTIVE_CUSTOMER_KEY = 'alignment_monitor_active_customer'
// Same-tab pub/sub: dispatched on window whenever the active customer changes
// (from the sidebar switcher or from inside UnifiedContext). Lets the global
// sidebar switcher and the engine-page context stay in sync without a shared
// React provider. detail = the new customer id (string).
export const ACTIVE_CUSTOMER_EVENT = 'alignment:active-customer-changed'
// Customer name cache: {customerId → {brand_name, domain}} — pre-fills header instantly on new tab
export const CUSTOMER_CACHE_KEY = 'alignment_monitor_customer_cache'
// Frozen report snapshots — metrics locked at save time, never overwritten by new scans
export const SNAPSHOTS_KEY = 'alignment_monitor_report_snapshots'

export interface ReportSnapshot {
  id: string
  name: string
  brand_name: string
  domain: string
  created_at: string
  date_range: { preset: string; start: string; end: string }
  metrics: {
    visibility_score?: number
    mentions_found?: number
    total_prompts?: number
    citation_count?: number
    positive_pct?: number
  }
}

// ─── Color maps ────────────────────────────────────────
export const METRIC_COLORS = {
  visibility: { color: 'text-ink-2', bgColor: 'bg-surface-warm' },
  sov: { color: 'text-caution', bgColor: 'bg-caution-bg' },
  mentions: { color: 'text-sage', bgColor: 'bg-sage-bg' },
  citations: { color: 'text-ink-2', bgColor: 'bg-surface-warm' },
  sentiment: { color: 'text-sage', bgColor: 'bg-sage-bg' },
  position: { color: 'text-red-soft', bgColor: 'bg-red-soft-bg' },
}

export const CHART_COLORS = ['#000000', '#4A6FA5', '#4A7C59', '#B8860B', '#7B5E96', '#5E8B7E', '#0A0A0A', '#B5453A']

export const CATEGORY_COLORS: Record<string, string> = {
  info_cognition: 'bg-surface-warm text-ink-2',
  solution_explore: 'bg-sage-bg text-sage',
  comparison_decision: 'bg-caution-bg text-caution',
  action_choice: 'bg-red-soft-bg text-red-soft',
  recommendation: 'bg-red-soft-bg text-red-soft',
  comparison: 'bg-caution-bg text-caution',
  information: 'bg-surface-warm text-ink-2',
  review: 'bg-caution-bg text-caution',
  howto: 'bg-red-soft-bg text-red-soft',
}

export const MENTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  recommendation: { label: 'Recommended', color: 'bg-sage-bg text-sage' },
  comparison: { label: 'Compared', color: 'bg-surface-warm text-ink-2' },
  passing: { label: 'Passing', color: 'bg-caution-bg text-caution' },
  not_mentioned: { label: 'Not Mentioned', color: 'bg-red-soft-bg text-red-soft' },
}

export const DOMAIN_TYPE_LABELS: Record<string, { label: string; color: string; chartColor: string }> = {
  you: { label: 'You', color: 'bg-sage-bg text-sage', chartColor: '#4A7C59' },
  corporate: { label: 'Corporate', color: 'bg-sage-bg text-sage', chartColor: '#5E8B7E' },
  editorial: { label: 'Earned Media', color: 'bg-surface-warm text-ink-2', chartColor: '#4A6FA5' },
  pr_wire: { label: 'PR Wire', color: 'bg-purple-50 text-purple-600', chartColor: '#7C3AED' },
  ugc: { label: 'Social / UGC', color: 'bg-caution-bg text-caution', chartColor: '#B8860B' },
  competitor: { label: 'Competitor', color: 'bg-red-soft-bg text-red-soft', chartColor: '#B5453A' },
  reference: { label: 'Reference', color: 'bg-surface-warm text-ink-2', chartColor: '#7B5E96' },
  institutional: { label: 'Institution', color: 'bg-surface-warm text-ink-2', chartColor: '#0A0A0A' },
  coupon: { label: 'Coupon', color: 'bg-surface-muted text-ink-3', chartColor: '#9CA3AF' },
  other: { label: 'Other', color: 'bg-surface-muted text-ink-3', chartColor: '#2D2B27' },
}

export const SUB_TYPE_LABELS: Record<string, { label: string; icon: string; color: string; chartColor: string }> = {
  primary_recommendation: { label: 'Primary Recommendation', icon: '', color: 'bg-sage-bg text-sage', chartColor: '#4A7C59' },
  alternative_option: { label: 'Alternative Option', icon: '', color: 'bg-surface-warm text-ink-2', chartColor: '#4A6FA5' },
  feature_highlight: { label: 'Feature Highlight', icon: '', color: 'bg-caution-bg text-caution', chartColor: '#B8860B' },
  use_case: { label: 'Use Case', icon: '', color: 'bg-surface-warm text-ink-2', chartColor: '#7B5E96' },
  industry_context: { label: 'Industry Context', icon: '', color: 'bg-surface-warm text-ink-2', chartColor: '#0A0A0A' },
  warning_caution: { label: 'Warning / Caution', icon: '', color: 'bg-red-soft-bg text-red-soft', chartColor: '#B5453A' },
  historical: { label: 'Historical', icon: '', color: 'bg-surface-muted text-ink-3', chartColor: '#2D2B27' },
  passing_reference: { label: 'Passing Reference', icon: '', color: 'bg-caution-bg text-caution', chartColor: '#B8860B' },
  not_mentioned: { label: 'Not Mentioned', icon: '', color: 'bg-red-soft-bg text-red-soft', chartColor: '#B5453A' },
}

export const POSITIONING_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  leader: { label: 'Industry Leader', color: 'bg-sage-bg text-sage border-sage/30', icon: '' },
  challenger: { label: 'Strong Challenger', color: 'bg-surface-warm text-ink-2 border-divider', icon: '' },
  niche: { label: 'Niche Player', color: 'bg-surface-warm text-ink-2 border-divider', icon: '' },
  emerging: { label: 'Emerging', color: 'bg-caution-bg text-caution border-caution/30', icon: '' },
  unknown: { label: 'Unclear', color: 'bg-surface-muted text-ink-3 border-divider-light', icon: '' },
}

export const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  you: { label: 'Your Website', color: 'text-sage' },
  corporate: { label: 'Corporate', color: 'text-sage' },
  editorial: { label: 'Earned Media', color: 'text-ink-2' },
  pr_wire: { label: 'PR Wire', color: 'text-purple-600' },
  ugc: { label: 'Social / UGC', color: 'text-caution' },
  reference: { label: 'Reference', color: 'text-ink-2' },
  institutional: { label: 'Institution', color: 'text-ink-2' },
  coupon: { label: 'Coupon', color: 'text-ink-3' },
  other: { label: 'Other', color: 'text-ink-3' },
}

export const GAP_SEVERITY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  critical: { bg: 'bg-red-soft-bg', text: 'text-red-soft', ring: 'ring-red-soft/40' },
  high: { bg: 'bg-caution-bg', text: 'text-caution', ring: 'ring-caution/40' },
  medium: { bg: 'bg-caution-bg', text: 'text-caution', ring: 'ring-caution/30' },
  low: { bg: 'bg-sage-bg', text: 'text-sage', ring: 'ring-sage/40' },
}

export const RELATIONSHIP_COLORS: Record<string, { label: string; color: string; icon: string }> = {
  complementary: { label: 'Complementary', color: 'bg-sage-bg text-sage', icon: '' },
  competitive: { label: 'Competitive', color: 'bg-red-soft-bg text-red-soft', icon: '' },
  neutral: { label: 'Neutral', color: 'bg-surface-muted text-ink-3', icon: '' },
}

export const INTENT_COLORS: Record<string, { label: string; color: string; icon: string }> = {
  info_cognition: { label: 'Info Cognition', color: 'bg-surface-warm text-ink-2', icon: '' },
  solution_explore: { label: 'Solution Explore', color: 'bg-sage-bg text-sage', icon: '' },
  comparison_decision: { label: 'Comparison Decision', color: 'bg-caution-bg text-caution', icon: '' },
  action_choice: { label: 'Action Choice', color: 'bg-surface-warm text-ink-2', icon: '' },
}

export const INTENT_FUNNEL: Record<string, { stage: number; icon: string; color: string; bgColor: string }> = {
  info_cognition: { stage: 1, icon: '', color: 'text-ink-2', bgColor: 'bg-surface-warm' },
  solution_explore: { stage: 2, icon: '', color: 'text-sage', bgColor: 'bg-sage-bg' },
  comparison_decision: { stage: 3, icon: '', color: 'text-caution', bgColor: 'bg-caution-bg' },
  action_choice: { stage: 4, icon: '', color: 'text-red-soft', bgColor: 'bg-red-soft-bg' },
}

export const INTENT_CONTENT_MAP: Record<string, { type: string; label: string; url: string }[]> = {
  info_cognition: [
    { type: 'definition', label: 'Definition Article', url: contentRoute('definition') },
    { type: 'reference_source', label: 'Reference / Source', url: contentRoute('reference_source') },
  ],
  solution_explore: [
    { type: 'usecase_mapping', label: 'Use-case Mapping', url: contentRoute('usecase_mapping') },
    { type: 'faq', label: 'FAQ Article', url: contentRoute('faq') },
  ],
  comparison_decision: [
    { type: 'comparison', label: 'Comparison / Ranking', url: contentRoute('comparison') },
    { type: 'evaluation_risk', label: 'Evaluation & Risk', url: contentRoute('evaluation_risk') },
  ],
  action_choice: [
    { type: 'howto', label: 'How-to Guide', url: contentRoute('howto') },
    { type: 'faq', label: 'FAQ Article', url: contentRoute('faq') },
  ],
}

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  info_cognition: 'Info Cognition',
  solution_explore: 'Solution Explore',
  comparison_decision: 'Comparison Decision',
  action_choice: 'Action Choice',
  recommendation: 'Action Choice',
  comparison: 'Comparison Decision',
  information: 'Info Cognition',
  review: 'Comparison Decision',
  howto: 'Action Choice',
}

export const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  definition: { label: 'Definition', icon: '' },
  reference_source: { label: 'Reference/Source', icon: '' },
  usecase_mapping: { label: 'Use-case', icon: '' },
  faq: { label: 'FAQ', icon: '' },
  comparison: { label: 'Comparison', icon: '' },
  evaluation_risk: { label: 'Eval & Risk', icon: '' },
  howto: { label: 'How-to', icon: '' },
}

export const COMP_POSITION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  leading: { bg: 'bg-sage-bg', text: 'text-sage', label: 'Leading' },
  competitive: { bg: 'bg-surface-warm', text: 'text-ink-2', label: 'Competitive' },
  behind: { bg: 'bg-caution-bg', text: 'text-caution', label: 'Behind' },
  'at risk': { bg: 'bg-red-soft-bg', text: 'text-red-soft', label: 'At Risk' },
}

// ─── Auto-classify functions ───────────────────────────
const CATEGORY_RULES: Record<string, string[]> = {
  info_cognition: ['what is', 'what do you know', 'tell me about', 'explain', 'features', 'pricing', 'overview', 'describe', 'who is', 'define', 'meaning', 'history of', 'introduction'],
  solution_explore: ['what are the', 'which', 'options', 'solutions', 'tools', 'alternatives', 'suggest', 'list', 'explore', 'find', 'looking for', 'need a', 'any good'],
  comparison_decision: ['compare', 'vs', 'versus', 'difference', 'better than', 'instead of', 'pros and cons', 'review', 'good product', 'opinion', 'strengths', 'weaknesses', 'drawbacks', 'evaluation'],
  action_choice: ['recommend', 'best', 'top', 'should i use', 'worth', 'go-to', 'favorite', 'how to', 'how do', 'how can', 'tutorial', 'guide', 'step by step', 'setup', 'configure', 'get started'],
}

const INTENT_RULES: Record<string, string[]> = {
  info_cognition: ['what is', 'tell me about', 'explain', 'definition', 'overview', 'who is', 'describe', 'history', 'features', 'learn'],
  solution_explore: ['how to', 'how do', 'how can', 'guide', 'tutorial', 'recommend', 'best', 'top', 'tools', 'methods', 'strategy', 'solution', 'approach'],
  comparison_decision: ['compare', 'vs', 'versus', 'alternative', 'pros and cons', 'review', 'which should i', 'difference', 'better', 'ranking'],
  action_choice: ['buy', 'purchase', 'pricing', 'cost', 'price', 'plan', 'subscribe', 'sign up', 'get started', 'free trial', 'demo', 'order', 'worth'],
}

export function autoClassify(template: string): { category: string; intent: string } {
  const lower = template.toLowerCase()
  const scores: Record<string, number> = {}
  for (const [cat, keywords] of Object.entries(CATEGORY_RULES)) {
    scores[cat] = keywords.filter(kw => lower.includes(kw)).length
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  const category = best && best[1] > 0 ? best[0] : 'info_cognition'

  const intentScores: Record<string, number> = {}
  for (const [intent, keywords] of Object.entries(INTENT_RULES)) {
    intentScores[intent] = keywords.filter(kw => lower.includes(kw)).length
  }
  const bestIntent = Object.entries(intentScores).sort((a, b) => b[1] - a[1])[0]
  const intent = bestIntent && bestIntent[1] > 0 ? bestIntent[0] : 'info_cognition'

  return { category, intent }
}

const OLD_CAT_TO_INTENT: Record<string, string> = {
  recommendation: 'action_choice',
  comparison: 'comparison_decision',
  information: 'info_cognition',
  review: 'comparison_decision',
  howto: 'action_choice',
}

export function resolveIntent(category: string): string {
  return OLD_CAT_TO_INTENT[category] || category
}

// ─── Industry list (P0: Brand Configuration) ───────────
export const INDUSTRY_LIST = [
  { value: '',                    label: 'Select industry...' },
  { value: 'ecommerce_dtc',       label: 'E-commerce / DTC' },
  { value: 'saas_b2b',           label: 'SaaS / B2B Software' },
  { value: 'consumer_tech',       label: 'Consumer Tech / Hardware' },
  { value: 'healthcare',          label: 'Healthcare / Medtech' },
  { value: 'finance_fintech',     label: 'Finance / Fintech' },
  { value: 'food_beverage',       label: 'Food & Beverage' },
  { value: 'fashion_apparel',     label: 'Fashion & Apparel' },
  { value: 'travel_hospitality',  label: 'Travel & Hospitality' },
  { value: 'education_edtech',    label: 'Education / Edtech' },
  { value: 'media_entertainment', label: 'Media & Entertainment' },
  { value: 'real_estate',         label: 'Real Estate' },
  { value: 'automotive',          label: 'Automotive' },
  { value: 'energy_cleantech',    label: 'Energy / Cleantech' },
  { value: 'manufacturing',       label: 'Manufacturing / Industrial' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'nonprofit_gov',       label: 'Non-profit / Government' },
  { value: 'other',               label: 'Other' },
] as const

// ─── Target countries (P0: Brand Configuration) ─────────
export const TARGET_COUNTRIES = [
  'Worldwide',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Japan',
  'China',
  'Singapore',
  'India',
  'Brazil',
  'South Korea',
  'Netherlands',
  'Sweden',
  'Spain',
  'Italy',
  'Mexico',
  'UAE',
  'New Zealand',
  'Other',
] as const

// ─── Competitor industry-mismatch terms ─────────────────
// Used to warn when a competitor tag looks like an institution outside the brand's industry.
export const EDU_INSTITUTION_TERMS = ['university', 'college', 'polytechnic', 'institute', 'academy', 'hochschule', 'école']
export const GOV_INSTITUTION_TERMS = ['government', 'ministry', 'municipality', 'department of ', 'national agency']

// ─── Types ─────────────────────────────────────────────
export interface BrandConfig {
  brand_name: string
  domain: string
  keywords: string[]
  competitors: string[]
  industry?: string        // e.g. "saas_b2b", "ecommerce_dtc" — from INDUSTRY_LIST
  product_space?: string
  one_liner?: string
  target_audience?: string
  target_market?: string   // displayed as "Target Country"; key kept for backward compat
  differentiation?: string
  source_domains?: string[]
}

export interface ScanHistoryEntry {
  scan_id: string
  date: string
  visibility_score: number
  mentions_found: number
  total_prompts: number
  citation_count: number
  positive_pct: number
  prominence_score?: number
  citation_share?: number
  sov_pct?: number
  citation_authority?: number
  engines_used?: string[]
}

// ─── Tag input helpers ─────────────────────────────────
// Auto-split on common separators when user pastes/types multi-value strings.
// Space is intentionally excluded — "Goal Zero" must stay one competitor.
export const TAG_SEPARATORS = /[,;，；\n\t]+/

export function splitTagInput(s: string): string[] {
  return s.split(TAG_SEPARATORS).map(p => p.trim()).filter(Boolean)
}

// ─── Brand-self detection ──────────────────────────────
// Extracts a comparable stem from brand name/domain so we can detect when a
// "competitor" entry is really just a variant of the brand itself.
export function brandSelfStem(brandName: string, brandDomain: string): string {
  const nameStem = (brandName || '').toLowerCase().replace(/[\s&.,\-_'']/g, '')
  if (nameStem.length >= 4) return nameStem

  const cleaned = (brandDomain || '').toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
  // For "us.ecoflow.com" / "ecoflow.co.uk" pick the longest alphabetic part
  // that isn't a common TLD piece.
  const TLD_LIKE = new Set(['com', 'net', 'org', 'co', 'uk', 'us', 'io', 'app', 'ai', 'dev', 'shop'])
  const parts = cleaned.split('.').filter(p => p && !TLD_LIKE.has(p))
  return parts.sort((a, b) => b.length - a.length)[0] ?? ''
}

export function isBrandSelfVariant(
  candidate: string,
  brandName: string,
  brandDomain: string,
): boolean {
  const stem = brandSelfStem(brandName, brandDomain)
  if (!stem || stem.length < 4) return false
  const candSlug = (candidate || '').toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .replace(/[\s&.,\-_'']/g, '')
  return candSlug.includes(stem)
}

export interface BrandConfigLike {
  brand_name: string
  domain: string
  keywords?: string[]
  competitors?: string[]
  source_domains?: string[]
}

// Clean a brand config in-place: split any stuck-together comma values and
// drop brand-self variants from competitors. Idempotent.
export function sanitizeBrandConfig<T extends BrandConfigLike>(cfg: T): T {
  const expandTags = (arr?: string[]) =>
    Array.from(new Set(
      (arr ?? []).flatMap(t => splitTagInput(String(t ?? '')))
    ))
  const keywords = expandTags(cfg.keywords)
  const competitorsRaw = expandTags(cfg.competitors)
  const competitors = competitorsRaw.filter(c => !isBrandSelfVariant(c, cfg.brand_name, cfg.domain))
  const source_domains = expandTags(cfg.source_domains)
  return { ...cfg, keywords, competitors, source_domains }
}

export interface RecentBrandRecord {
  brand_name: string
  domain: string
  keywords: string[]
  competitors: string[]
  industry?: string
  product_space?: string
  one_liner?: string
  target_audience?: string
  target_market?: string
  differentiation?: string
  source_domains?: string[]
  usedAt: string
}
