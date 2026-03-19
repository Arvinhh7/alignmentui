// ─── localStorage keys ─────────────────────────────────
export const BRAND_CONFIG_KEY = 'alignment_monitor_brand_config'
export const SCAN_RESULTS_KEY = 'alignment_monitor_scan_results'
export const SCAN_HISTORY_KEY = 'alignment_monitor_scan_history'
export const GAP_RESULTS_KEY = 'alignment_monitor_gap_results'
export const ADV_MENTIONS_KEY = 'alignment_monitor_adv_mentions'
export const RECENT_BRANDS_KEY = 'geo_monitor_recent_brands'

// ─── Color maps ────────────────────────────────────────
export const METRIC_COLORS = {
  visibility: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  sov: { color: 'text-orange-600', bgColor: 'bg-orange-50' },
  mentions: { color: 'text-green-600', bgColor: 'bg-green-50' },
  citations: { color: 'text-purple-600', bgColor: 'bg-purple-50' },
  sentiment: { color: 'text-teal-600', bgColor: 'bg-teal-50' },
  position: { color: 'text-red-600', bgColor: 'bg-red-50' },
}

export const CHART_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#6366f1', '#ec4899']

export const CATEGORY_COLORS: Record<string, string> = {
  info_cognition: 'bg-blue-100 text-blue-700',
  solution_explore: 'bg-teal-100 text-teal-700',
  comparison_decision: 'bg-orange-100 text-orange-700',
  action_choice: 'bg-red-100 text-red-700',
  recommendation: 'bg-red-100 text-red-700',
  comparison: 'bg-orange-100 text-orange-700',
  information: 'bg-blue-100 text-blue-700',
  review: 'bg-orange-100 text-orange-700',
  howto: 'bg-red-100 text-red-700',
}

export const MENTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  recommendation: { label: '🎯 Recommended', color: 'bg-green-100 text-green-800' },
  comparison: { label: '⚖️ Compared', color: 'bg-blue-100 text-blue-800' },
  passing: { label: '💬 Passing', color: 'bg-yellow-100 text-yellow-800' },
  not_mentioned: { label: '❌ Not Mentioned', color: 'bg-red-100 text-red-800' },
}

export const DOMAIN_TYPE_LABELS: Record<string, { label: string; color: string; chartColor: string }> = {
  you: { label: 'You', color: 'bg-green-100 text-green-700', chartColor: '#22c55e' },
  corporate: { label: 'Corporate', color: 'bg-teal-100 text-teal-700', chartColor: '#14b8a6' },
  editorial: { label: 'Editorial', color: 'bg-blue-100 text-blue-700', chartColor: '#3b82f6' },
  ugc: { label: 'UGC', color: 'bg-yellow-100 text-yellow-700', chartColor: '#eab308' },
  competitor: { label: 'Competitor', color: 'bg-red-100 text-red-700', chartColor: '#ef4444' },
  reference: { label: 'Reference', color: 'bg-purple-100 text-purple-700', chartColor: '#a855f7' },
  institutional: { label: 'Institutional', color: 'bg-indigo-100 text-indigo-700', chartColor: '#6366f1' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700', chartColor: '#9ca3af' },
}

export const SUB_TYPE_LABELS: Record<string, { label: string; icon: string; color: string; chartColor: string }> = {
  primary_recommendation: { label: 'Primary Recommendation', icon: '🏆', color: 'bg-green-100 text-green-800', chartColor: '#22c55e' },
  alternative_option: { label: 'Alternative Option', icon: '🔄', color: 'bg-blue-100 text-blue-800', chartColor: '#3b82f6' },
  feature_highlight: { label: 'Feature Highlight', icon: '⭐', color: 'bg-amber-100 text-amber-800', chartColor: '#f59e0b' },
  use_case: { label: 'Use Case', icon: '🎯', color: 'bg-purple-100 text-purple-800', chartColor: '#a855f7' },
  industry_context: { label: 'Industry Context', icon: '🏢', color: 'bg-indigo-100 text-indigo-800', chartColor: '#6366f1' },
  warning_caution: { label: 'Warning / Caution', icon: '⚠️', color: 'bg-red-100 text-red-800', chartColor: '#ef4444' },
  historical: { label: 'Historical', icon: '📜', color: 'bg-gray-100 text-gray-800', chartColor: '#6b7280' },
  passing_reference: { label: 'Passing Reference', icon: '💬', color: 'bg-yellow-100 text-yellow-800', chartColor: '#eab308' },
  not_mentioned: { label: 'Not Mentioned', icon: '❌', color: 'bg-red-50 text-red-700', chartColor: '#dc2626' },
}

export const POSITIONING_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  leader: { label: 'Industry Leader', color: 'bg-green-100 text-green-800 border-green-300', icon: '👑' },
  challenger: { label: 'Strong Challenger', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '🚀' },
  niche: { label: 'Niche Player', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🎯' },
  emerging: { label: 'Emerging', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: '🌱' },
  unknown: { label: 'Unclear', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '❓' },
}

export const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  you: { label: 'Your Website', color: 'text-green-700' },
  corporate: { label: 'Corporate', color: 'text-teal-700' },
  editorial: { label: 'Media / Editorial', color: 'text-blue-700' },
  ugc: { label: 'Community / UGC', color: 'text-yellow-700' },
  reference: { label: 'Reference', color: 'text-purple-700' },
  institutional: { label: 'Institutional', color: 'text-indigo-700' },
  other: { label: 'Other', color: 'text-gray-600' },
}

export const GAP_SEVERITY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-400' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', ring: 'ring-orange-400' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-400' },
  low: { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-400' },
}

export const RELATIONSHIP_COLORS: Record<string, { label: string; color: string; icon: string }> = {
  complementary: { label: 'Complementary', color: 'bg-green-100 text-green-700', icon: '🤝' },
  competitive: { label: 'Competitive', color: 'bg-red-100 text-red-700', icon: '⚔️' },
  neutral: { label: 'Neutral', color: 'bg-gray-100 text-gray-600', icon: '↔️' },
}

export const INTENT_COLORS: Record<string, { label: string; color: string; icon: string }> = {
  info_cognition: { label: 'Info Cognition', color: 'bg-blue-100 text-blue-700', icon: '🧠' },
  solution_explore: { label: 'Solution Explore', color: 'bg-green-100 text-green-700', icon: '🔍' },
  comparison_decision: { label: 'Comparison Decision', color: 'bg-orange-100 text-orange-700', icon: '⚖️' },
  action_choice: { label: 'Action Choice', color: 'bg-purple-100 text-purple-700', icon: '🎯' },
}

export const INTENT_FUNNEL: Record<string, { stage: number; icon: string; color: string; bgColor: string }> = {
  info_cognition: { stage: 1, icon: '🧠', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  solution_explore: { stage: 2, icon: '🔍', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  comparison_decision: { stage: 3, icon: '⚖️', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  action_choice: { stage: 4, icon: '🚀', color: 'text-red-600', bgColor: 'bg-red-50' },
}

export const INTENT_CONTENT_MAP: Record<string, { type: string; label: string; url: string }[]> = {
  info_cognition: [
    { type: 'definition', label: 'Definition Article', url: '/dashboard/geo-content?type=definition' },
    { type: 'reference_source', label: 'Reference / Source', url: '/dashboard/geo-content?type=reference_source' },
  ],
  solution_explore: [
    { type: 'usecase_mapping', label: 'Use-case Mapping', url: '/dashboard/geo-content?type=usecase_mapping' },
    { type: 'faq', label: 'FAQ Article', url: '/dashboard/geo-content?type=faq' },
  ],
  comparison_decision: [
    { type: 'comparison', label: 'Comparison / Ranking', url: '/dashboard/geo-content?type=comparison' },
    { type: 'evaluation_risk', label: 'Evaluation & Risk', url: '/dashboard/geo-content?type=evaluation_risk' },
  ],
  action_choice: [
    { type: 'howto', label: 'How-to Guide', url: '/dashboard/geo-content?type=howto' },
    { type: 'faq', label: 'FAQ Article', url: '/dashboard/geo-content?type=faq' },
  ],
}

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  info_cognition: '🧠 Info Cognition',
  solution_explore: '🔍 Solution Explore',
  comparison_decision: '⚖️ Compare & Decide',
  action_choice: '🚀 Action Choice',
  recommendation: '🚀 Action Choice',
  comparison: '⚖️ Compare & Decide',
  information: '🧠 Info Cognition',
  review: '⚖️ Compare & Decide',
  howto: '🚀 Action Choice',
}

export const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  definition: { label: 'Definition', icon: '📖' },
  reference_source: { label: 'Reference/Source', icon: '📚' },
  usecase_mapping: { label: 'Use-case', icon: '🎯' },
  faq: { label: 'FAQ', icon: '❓' },
  comparison: { label: 'Comparison', icon: '⚖️' },
  evaluation_risk: { label: 'Eval & Risk', icon: '🔬' },
  howto: { label: 'How-to', icon: '🔧' },
}

export const COMP_POSITION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  leading: { bg: 'bg-green-500', text: 'text-white', label: '🏆 Leading' },
  competitive: { bg: 'bg-blue-500', text: 'text-white', label: '⚡ Competitive' },
  behind: { bg: 'bg-orange-500', text: 'text-white', label: '⚠️ Behind' },
  'at risk': { bg: 'bg-red-500', text: 'text-white', label: '🚨 At Risk' },
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

// ─── Types ─────────────────────────────────────────────
export interface BrandConfig {
  brand_name: string
  domain: string
  keywords: string[]
  competitors: string[]
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

export interface RecentBrandRecord {
  brand_name: string
  domain: string
  keywords: string[]
  competitors: string[]
  usedAt: string
}
