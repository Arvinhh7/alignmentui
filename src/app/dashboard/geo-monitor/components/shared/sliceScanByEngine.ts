// ── Per-engine scan slice ─────────────────────────────────────────────────────
// Re-derive a full MonitorScanResult for a single engine from the raw per-mention
// data (every ScanMention carries `platform`). Authoritative per-engine numbers
// (visibility / mentions / sentiment) come from backend per_engine_metrics; the
// rest are count-based re-aggregations. Competitor soft fields (sentiment /
// position) that can't be derived per-engine are carried from the aggregate.
//
// This is the single source of truth for engine scoping on the Analysis page.
// Every tab (Overview / Mentions / Citations / Sentiment / Competitors) consumes
// the sliced scan via UnifiedContext.scopedScanResult so switching the model pill
// re-slices ALL tabs consistently — not just the Overview.
import type { MonitorScanResult, ScanMention, SentimentBreakdown } from '@/lib/api'

function _domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function _recomputeSentiment(mentioned: ScanMention[]): SentimentBreakdown {
  const pos = mentioned.filter(m => m.sentiment === 'positive').length
  const neu = mentioned.filter(m => m.sentiment === 'neutral').length
  const neg = mentioned.filter(m => m.sentiment === 'negative').length
  const tm = pos + neu + neg
  return {
    positive: pos, neutral: neu, negative: neg,
    positive_pct: tm ? Math.round(pos / tm * 1000) / 10 : 0,
    neutral_pct: tm ? Math.round(neu / tm * 1000) / 10 : 0,
    negative_pct: tm ? Math.round(neg / tm * 1000) / 10 : 0,
  }
}

export function sliceScanByEngine(scan: MonitorScanResult, engine: string): MonitorScanResult {
  const eng = engine.toLowerCase()
  const mentions = (scan.mention_results ?? []).filter(m => (m.platform || '').toLowerCase() === eng)
  if (mentions.length === 0) return scan
  const mentioned = mentions.filter(m => m.mentioned)
  const total = mentions.length
  const found = mentioned.length
  const pem = (scan.per_engine_metrics ?? []).find(e => (e.platform || '').toLowerCase() === eng)

  // ── SSOT fast-path ──────────────────────────────────────────────────────────
  // When the backend computed the full per-engine slice (_attach_per_engine_slices),
  // read it directly — competitor ranking, SOV, source domains and citations are
  // already scoped to this engine using the LLM-extracted response_brands (the SOV
  // source of truth), not fuzzy substring matching. This is authoritative and
  // reconciles with the trend chart (which reads the same slice). The legacy
  // client-side re-derivation below is kept only for older scans persisted before
  // this field existed.
  if (pem && pem.competitor_comparison !== undefined) {
    return {
      ...scan,
      visibility_score: pem.visibility_score,
      total_prompts: total,
      mentions_found: pem.mentions_found,
      citation_count: pem.citation_count ?? 0,
      sentiment_breakdown: pem.sentiment_breakdown,
      mention_results: mentions,
      source_domains: pem.source_domains ?? [],
      share_of_voice: pem.share_of_voice ?? {},
      competitor_comparison: pem.competitor_comparison ?? [],
      avg_ordinal_rank: pem.avg_ordinal_rank ?? null,
    }
  }

  // ── Legacy fallback (scans persisted before per-engine SSOT) ─────────────────
  // Brand universe = own brand + every brand the aggregate knows about.
  // CRITICAL: auto-discovered competitors (brands the user never configured)
  // live ONLY in scan.competitor_comparison — the backend's discovery pass
  // (_enrich_with_discovered_brands) substring-matches them against response_text
  // and never writes them back into per-mention competitors_mentioned. If we
  // counted from competitors_mentioned alone, a single-engine plan's per-engine
  // slice would collapse to just the own brand while "All Models" shows the full
  // ranking — the exact mismatch this guards against. Mirror the backend: count a
  // competitor as present in a mention if it's tagged in competitors_mentioned OR
  // its name appears in that mention's response_text (case-insensitive).
  const competitorAppearances = (name: string): number => {
    const lc = name.toLowerCase()
    return mentions.filter(m =>
      (m.competitors_mentioned ?? []).some(c => c.toLowerCase() === lc) ||
      (m.response_text ?? '').toLowerCase().includes(lc),
    ).length
  }
  const ownLc = scan.brand_name.toLowerCase()
  const universe = new Set<string>(
    (scan.competitor_comparison ?? [])
      .map(c => c.name)
      .filter(n => n.toLowerCase() !== ownLc),
  )
  for (const m of mentions) for (const c of (m.competitors_mentioned ?? [])) {
    if (c.toLowerCase() !== ownLc) universe.add(c)
  }

  // Count-based share of voice: own brand vs each competitor's appearances
  const counts: Record<string, number> = {}
  if (found > 0) counts[scan.brand_name] = found
  for (const name of Array.from(universe)) {
    const c = competitorAppearances(name)
    if (c > 0) counts[name] = c
  }
  const totalCounts = Object.values(counts).reduce((a, b) => a + b, 0)
  const share_of_voice: Record<string, number> = {}
  for (const [b, c] of Object.entries(counts)) share_of_voice[b] = totalCounts ? Math.round(c / totalCounts * 1000) / 10 : 0

  // Source domains scoped to this engine; domain_type carried from the aggregate
  const aggDom = new Map((scan.source_domains ?? []).map(d => [d.domain, d]))
  const domUrls: Record<string, Set<string>> = {}
  for (const m of mentions) for (const u of (m.cited_urls ?? [])) { const d = _domainOf(u); if (d) (domUrls[d] ??= new Set<string>()).add(u) }
  const totalUrls = Object.values(domUrls).reduce((s, set) => s + set.size, 0)
  const source_domains = Object.entries(domUrls).map(([domain, set]) => ({
    domain, url_count: set.size, urls: Array.from(set),
    domain_type: aggDom.get(domain)?.domain_type ?? 'other' as const,
    frequency_pct: total ? Math.round(set.size / total * 1000) / 10 : 0,
    citation_share: totalUrls ? Math.round(set.size / totalUrls * 1000) / 10 : 0,
  })).sort((a, b) => b.url_count - a.url_count)

  // Competitor comparison: per-engine visibility/mentions; soft fields from aggregate
  const aggComp = new Map((scan.competitor_comparison ?? []).map(c => [c.name.toLowerCase(), c]))
  const names = new Set<string>([scan.brand_name, ...Object.keys(counts)])
  const competitor_comparison = Array.from(names).map(name => {
    const isOwn = name.toLowerCase() === scan.brand_name.toLowerCase()
    const appearances = isOwn ? found : competitorAppearances(name)
    const agg = aggComp.get(name.toLowerCase())
    const sents = isOwn ? mentioned.map(m => m.sentiment_score) : []
    const poss = isOwn ? mentioned.map(m => m.position_score) : []
    const ranks = isOwn ? mentioned.map(m => m.ordinal_rank).filter((r): r is number => r != null) : []
    return {
      name: agg?.name ?? name,
      visibility_pct: total ? Math.round(appearances / total * 1000) / 10 : 0,
      mentions_count: appearances,
      avg_sentiment_score: isOwn ? (sents.length ? Math.round(sents.reduce((a, b) => a + b, 0) / sents.length * 100) / 100 : 0) : (agg?.avg_sentiment_score ?? 0),
      mention_types: agg?.mention_types ?? {},
      avg_position_score: isOwn ? (poss.length ? Math.round(poss.reduce((a, b) => a + b, 0) / poss.length * 1000) / 1000 : 0) : (agg?.avg_position_score ?? 0),
      avg_ordinal_position: isOwn ? (ranks.length ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length * 10) / 10 : null) : (agg?.avg_ordinal_position ?? null),
      domain: agg?.domain,
      key_phrases: agg?.key_phrases ?? [],
      positioning: agg?.positioning ?? '',
      is_discovered: agg?.is_discovered,
    }
  }).sort((a, b) => b.visibility_pct - a.visibility_pct)

  const ranks = mentioned.map(m => m.ordinal_rank).filter((r): r is number => r != null)
  const avg_ordinal_rank = ranks.length ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length * 10) / 10 : null

  return {
    ...scan,
    visibility_score: pem ? pem.visibility_score : (total ? Math.round(found / total * 1000) / 10 : 0),
    total_prompts: total,
    mentions_found: pem ? pem.mentions_found : found,
    citation_count: totalUrls,
    sentiment_breakdown: pem ? pem.sentiment_breakdown : _recomputeSentiment(mentioned),
    mention_results: mentions,
    source_domains,
    share_of_voice,
    competitor_comparison,
    avg_ordinal_rank,
  }
}
