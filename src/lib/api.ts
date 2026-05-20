/**
 * API client for Alignment AI Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Dispatch a browser event to notify the SubscriptionBanner to refresh credits.
 * Call this after any operation that consumes credits.
 */
export function notifyCreditUsed() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('creditsUsed'))
  }
}

// API Response types
export interface APIResponse<T> {
  data: T | null;
  error: string | null;
}

export interface BrandWithStats {
  id: string;
  user_id: string;
  name: string;
  domain?: string;
  keywords: string[];
  industry?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  mention_count: number;
  aigvr_score: number;
  citation_count: number;
  sentiment_score: number;
  last_scanned_at?: string;
}

export interface AIGVRScore {
  overall_score: number;
  mention_rate: number;
  sentiment_score: number;
  position_score: number;
  citation_rate: number;
  trend: number;
}

export interface BrandStats {
  brand_id: string;
  brand_name: string;
  total_mentions: number;
  aigvr_score: AIGVRScore;
  positive_mentions: number;
  neutral_mentions: number;
  negative_mentions: number;
  total_citations: number;
  unique_citation_urls: string[];
  mentions_by_platform: Record<string, number>;
  mentions_last_7_days: number;
  mentions_last_30_days: number;
  trend_7_days: number;
  trend_30_days: number;
  first_mention_at?: string;
  last_mention_at?: string;
  last_scanned_at?: string;
}

export interface ScanResult {
  message: string;
  brand_id: string;
  prompts_tested: number;
  mentions_found: number;
  results: MentionResult[];
}

export interface MentionResult {
  mentioned: boolean;
  response_text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
  position?: number;
  position_score: number;
  citation_url?: string;
}

export interface TimelineData {
  date: string;
  mentions: number;
  aigvr_score: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface PlatformData {
  platform: string;
  mention_count: number;
}

// GEO Audit types
export interface DimensionScore {
  name: string;
  score: number;
  status: 'excellent' | 'good' | 'needs_work' | 'poor';
  description: string;
  details: string[];
  recommendations: string[];
}

// Layer 1 Zone Breakdown types
export interface ZoneCheck {
  id: string;
  name: string;
  zone: 'green' | 'yellow' | 'red';
  status: 'pass' | 'warning' | 'fail';
  detail: string;
  fix_available: boolean;
  fix_type: 'auto' | 'ai_draft' | 'manual_required';
  fix_suggestion?: string | null;
  // Phase 1 — Audit accuracy & scientific basis
  confidence_score: number;       // 0–100: certainty of check result
  evidence_basis: string;         // concrete HTML element / count that produced this result
  standard_ref?: string | null;   // industry standard or specification citation
}

export interface ZoneBreakdown {
  green_checks: ZoneCheck[];
  yellow_checks: ZoneCheck[];
  red_checks: ZoneCheck[];
  green_pass: number;
  green_fail: number;
  yellow_pass: number;
  yellow_fail: number;
  red_pass: number;
  red_fail: number;
  fix_effort_hours_low: number;
  fix_effort_hours_high: number;
}

export interface AuditResult {
  url: string;
  overall_score: number;
  overall_status: 'excellent' | 'good' | 'needs_work' | 'poor';
  grade: string;
  // 5 Dimensions (v2)
  ai_accessibility: DimensionScore;
  semantic_structure: DimensionScore;
  content_citability: DimensionScore;
  risk_boundary: DimensionScore;
  reusability: DimensionScore;
  total_checks: number;
  passed_checks: number;
  warnings: number;
  critical_issues: number;
  top_recommendations: string[];
  // Layer 1 Zone Breakdown (34 checks)
  zone_breakdown?: ZoneBreakdown | null;
  audited_at: string;
  audit_duration_seconds: number;
  page_title?: string;
  meta_description?: string;
  favicon_url?: string;
}

// GEO Optimization types
export interface OptimizationFix {
  title: string;
  description: string;
  impact_points: number;
  effort: 'low' | 'medium' | 'high';
  is_permanent: boolean;
  requires_maintenance: boolean;
  code_snippet?: string;
  implementation_guide: string;
}

export interface DimensionOptimization {
  dimension_key: string;
  dimension_name: string;
  current_score: number;
  projected_score: number;
  stability_type: 'structural' | 'content' | 'hybrid';
  stability_description: string;
  total_impact: number;
  fixes: OptimizationFix[];
  findings_summary: string[];
}

export interface OptimizationResult {
  url: string;
  current_overall_score: number;
  projected_overall_score: number;
  dimensions: DimensionOptimization[];
  quick_wins_count: number;
  total_fixes: number;
  permanent_fixes: number;
  maintenance_fixes: number;
  generated_at: string;
  optimization_duration_seconds: number;
}

export interface ApplyOptimizationResult {
  url: string;
  dimension_key: string;
  fixes_applied: number;
  optimized_content?: string;
  implementation_steps: string[];
  estimated_new_score: number;
  generated_at: string;
}

// GEO Performance Monitor types
export interface MonitorPrompt {
  id: string;
  template: string;
  category: string;
  description: string;
  is_active: boolean;
  created_at: string;
  // Phase 4.2: Prompt intent
  intent: 'commercial' | 'informational' | 'navigational' | 'transactional';
  // Per-prompt latest scan metrics
  last_mentioned?: boolean | null;
  last_sentiment?: string | null;
  last_sentiment_score: number;
  last_position_score: number;
  last_mention_count: number;
  last_quality_score: number;
  last_sub_type: string;
  last_competitors_mentioned: string[];
  last_scanned_at?: string | null;
  // Historical metrics
  scan_count: number;
  mention_rate: number;   // Visibility % over scan history
  // Prompt metadata
  tags: string[];
  location: string;
}

export interface ReferencedSource {
  name: string;
  source_type: string;
  context: string;
  frequency: number;
}

export interface SentimentTheme {
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  context: string;
}

export interface ScanMention {
  prompt_text: string;
  response_text: string;
  mentioned: boolean;
  sentiment: string;
  sentiment_score: number;
  position?: number;
  position_score: number;
  mention_type: 'recommendation' | 'comparison' | 'passing' | 'not_mentioned';
  cited_urls: string[];
  competitors_mentioned: string[];
  platform: string; // Engine that produced this result (chatgpt, perplexity, gemini, claude)
  // Phase 2 enrichments
  mention_sub_type: string;
  mention_context: string;
  mention_quality_score: number;
  key_phrases: string[];
  referenced_sources: ReferencedSource[];
  brand_positioning: string;
  mention_count_in_response: number;
  // Metric improvements
  ordinal_rank?: number | null;
  sentiment_themes?: SentimentTheme[];
}

export interface SourceDomainInfo {
  domain: string;
  url_count: number;
  urls: string[];
  domain_type: 'you' | 'corporate' | 'editorial' | 'ugc' | 'competitor' | 'reference' | 'institutional' | 'other';
  frequency_pct: number;
  citation_share?: number;  // % of this domain's citations vs total cited URLs
}

export interface CompetitorVisibility {
  name: string;
  visibility_pct: number;
  mentions_count: number;
  avg_sentiment_score: number;
  // Phase 2 enhancements
  mention_types: Record<string, number>;
  avg_position_score: number;
  key_phrases: string[];
  positioning: string;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

// Phase 4.2: Suggested Brands
export interface SuggestedBrand {
  name: string;
  co_occurrence_count: number;
  co_occurrence_rate: number;
  relationship: 'complementary' | 'competitive' | 'neutral';
  avg_sentiment_when_paired: number;
  contexts: string[];
  is_competitor: boolean;
}

// Phase 4.2: URL-level Analysis
export interface URLAnalysisItem {
  url: string;
  domain: string;
  domain_type: string;
  title: string;
  citation_count: number;
  prompts_citing: string[];
  avg_sentiment: number;
  first_seen: string;
  is_own: boolean;
}

// Phase 4.2: Multi-brand Trend
export interface BrandTrendPoint {
  date: string;
  brand_name: string;
  visibility_score: number;
  mention_quality_avg: number;
  sentiment_avg: number;
  mention_count: number;
}

export interface MultiBrandTrendData {
  brands: string[];
  data_points: BrandTrendPoint[];
  scan_count: number;
}

// Phase 5: Per-engine metrics
export interface EngineMetrics {
  platform: string;
  visibility_score: number;
  mentions_found: number;
  total_prompts: number;
  sentiment_breakdown: SentimentBreakdown;
  prominence_avg: number;
}

// Phase 5: AEO Content Score
export interface AEOContentScore {
  url: string;
  overall_score: number;
  readability_score: number;
  structure_score: number;
  information_density: number;
  word_count: number;
  heading_count: number;
  list_count: number;
  has_faq_schema: boolean;
  has_howto_schema: boolean;
  recommendations: string[];
}

// Source-first GEO Discovery
export interface DiscoverSourceItem {
  domain: string;
  domain_type: string;
  url_count: number;
  prompt_count: number;
  intent_coverage: number;
  citation_share: number;
  frequency_pct: number;
}

export interface DiscoverResult {
  run_id: string;
  total_prompts: number;
  total_grounded_urls: number;
  unique_domains: number;
  hallucination_rate: number;
  engine_used: string;
  source_domains: DiscoverSourceItem[];
}

// ─── Dev Mode: EMA Policy Optimization ────────────────────────────────────

export interface DevOptimizationConfig {
  alpha: number;           // EMA learning rate 0.1-1.0
  iterations: number;      // EMA iterations to simulate
  static_weight: number;   // blend ratio for static vs policy score
  estimated_minutes: number;
  estimated_cost_usd: number;
}

export interface CTMCounts {
  gaps: number;
  threats: number;
  amplifying: number;
  bonus: number;
  f1_alignment: number;    // F1@20 between discover top-20 and scan top-20
}

export interface PolicyEntry {
  domain: string;
  f_t: number;             // current EMA policy weight
  reward: number;          // scan-derived reward signal
  delta: number;           // f_t - reward (positive = over-estimated)
  delta_pct: number;       // delta as % of f_t
}

export interface DevOptimizationRequest {
  discover: DiscoverResult;
  scan: MonitorScanResult;
  config?: DevOptimizationConfig;
}

export interface DevOptimizationResult {
  success: boolean;
  iterations_run: number;
  before: CTMCounts;
  after: CTMCounts;
  improvement_pct: number;       // F1@20 relative improvement %
  gap_reduction_pct: number;
  policy_entries: PolicyEntry[];  // top-30 domains sorted by |delta|
  new_source_domains: DiscoverSourceItem[];  // re-ranked discover
  reasoning: string;
  applied: boolean;
}

// ─── Smart Prompts ─────────────────────────────────────────────────────────

export interface SmartPromptEngineSource {
  domain: string;
  prompt_count: number;
  intent_coverage: number;
}

export interface SmartPromptProvenance {
  target_domain: string | null;
  engines: string[];
  why: string;
}

export interface SmartPrompt {
  template: string;
  intent: 'info_cognition' | 'solution_explore' | 'comparison_decision' | 'action_choice';
  layer: 'foundation' | 'universal' | 'chatgpt_dominant' | 'cross_diverse' | 'gap';
  provenance: SmartPromptProvenance;
}

export interface SmartPromptGenerateRequest {
  brand_name: string;
  domain?: string;
  keywords?: string[];
  competitors?: string[];
  target_audience?: string;
  engine_snapshots: Record<string, SmartPromptEngineSource[]>;
  gap_domains?: string[];
  force_regenerate?: boolean;
}

export interface SmartPromptGenerateResponse {
  prompts: SmartPrompt[];
  generated_at: string;
  cache_hit: boolean;
  engines_used: string[];
  fallback: boolean;
}

// ─── Monitor scan result ───────────────────────────────────────────────────

export interface MonitorScanResult {
  scan_id: string;
  brand_name: string;
  visibility_score: number;
  total_prompts: number;
  mentions_found: number;
  citation_count: number;
  sentiment_breakdown: SentimentBreakdown;
  mention_results: ScanMention[];
  source_domains: SourceDomainInfo[];
  competitor_comparison: CompetitorVisibility[];
  scanned_at: string;
  scan_duration_seconds: number;
  // Phase 2 aggregated analytics
  all_referenced_sources: ReferencedSource[];
  mention_quality_avg: number;
  sub_type_distribution: Record<string, number>;
  brand_positioning_summary: string;
  share_of_voice: Record<string, number>;
  per_prompt_metrics: Record<string, PromptMetrics>;
  // Phase 4.2
  suggested_brands: SuggestedBrand[];
  url_analyses: URLAnalysisItem[];
  intent_distribution: Record<string, number>;
  // Phase 4.3
  discovered_topics?: DiscoveredTopic[];
  brand_groups?: BrandGroupingResult;
  source_influence?: SourceInfluenceItem[];
  citation_usage?: CitationUsageResult;
  // Phase 5: Multi-engine alignment
  engines_used?: string[];
  per_engine_metrics?: EngineMetrics[];
  citation_authority_score?: number;
  // Metric improvements
  total_executions?: number;
  avg_ordinal_rank?: number | null;
}

export interface PromptMetrics {
  prompt_id: string;
  prompt_template: string;
  visibility: boolean;
  sentiment_score: number;
  quality_score: number;
  position_score: number;
  mention_count: number;
  scan_duration_seconds: number;
}

export interface CompetitorScanResult {
  competitor_name: string;
  visibility_pct: number;
  mentions_count: number;
  total_prompts: number;
  avg_sentiment_score: number;
  avg_quality_score: number;
  positioning: string;
  mention_sub_types: Record<string, number>;
  key_phrases: string[];
  mention_results: ScanMention[];
  scan_duration_seconds: number;
}

// ═══ Phase 3: Gap Analysis ═══════════════════════════

export interface PromptGap {
  prompt_text: string;
  brand_mentioned: boolean;
  brand_quality: number;
  brand_sub_type: string;
  competitors_mentioned: string[];
  top_competitor: string;
  top_competitor_quality: number;
  gap_severity: 'critical' | 'high' | 'medium' | 'low';
  suggested_action: string;
}

export interface CategoryGap {
  category: string;
  brand_visibility_pct: number;
  avg_competitor_visibility_pct: number;
  gap_pct: number;
  brand_avg_quality: number;
  competitor_avg_quality: number;
  quality_gap: number;
  prompt_count: number;
  brand_mentioned_count: number;
  status: 'ahead' | 'even' | 'behind' | 'critical';
}

export interface PriorityAction {
  intent: string;
  title: string;
  description: string;
  content_types: string[];
  action_url: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  prompt_examples: string[];
}

export interface GapAnalysisResult {
  brand_name: string;
  competitors: string[];
  overall_gap_score: number;
  blind_spots: PromptGap[];
  category_gaps: CategoryGap[];
  priority_actions: PriorityAction[];
  generated_at: string;
}

// ═══ Phase 3: Advanced Mentions ═════════════════════

export interface PromptEffectiveness {
  prompt_text: string;
  prompt_category: string;
  mentioned: boolean;
  quality_score: number;
  sentiment_score: number;
  sub_type: string;
  effectiveness_score: number;
  recommendation_strength: 'strong' | 'moderate' | 'weak' | 'none';
  competitive_context: string;
  improvement_suggestions: string[];
}

export interface MentionTrend {
  date: string;
  visibility_score: number;
  quality_avg: number;
  sentiment_avg: number;
  mention_count: number;
  total_prompts: number;
}

export interface ContextCluster {
  topic: string;
  mention_count: number;
  avg_sentiment: number;
  sample_phrases: string[];
  is_positive_topic: boolean;
}

export interface AdvancedMentionAnalysis {
  brand_name: string;
  total_mentions: number;
  total_prompts: number;
  prompt_effectiveness: PromptEffectiveness[];
  best_prompt_category: string;
  worst_prompt_category: string;
  recommendation_rate: number;
  primary_rec_rate: number;
  recommendation_strength_distribution: Record<string, number>;
  context_clusters: ContextCluster[];
  mention_trends: MentionTrend[];
  ai_insights: string[];
  content_optimization_tips: string[];
  generated_at: string;
}

// ═══ Phase 3: Competitive Intelligence Report ═══════

export interface SWOTItem {
  title: string;
  description: string;
  evidence: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CompetitorProfile {
  name: string;
  visibility_pct: number;
  mention_quality_avg: number;
  sentiment_avg: number;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  key_differentiators: string[];
  mention_sub_types: Record<string, number>;
  top_prompts: string[];
}

export interface StrategicRecommendation {
  priority: number;
  title: string;
  description: string;
  category: string;
  effort: 'low' | 'medium' | 'high';
  expected_impact: 'low' | 'medium' | 'high';
  action_items: string[];
}

export interface CompetitiveIntelReport {
  brand_name: string;
  report_id: string;
  generated_at: string;
  executive_summary: string;
  overall_competitive_position: 'leading' | 'competitive' | 'behind' | 'at risk';
  competitive_score: number;
  swot_strengths: SWOTItem[];
  swot_weaknesses: SWOTItem[];
  swot_opportunities: SWOTItem[];
  swot_threats: SWOTItem[];
  competitor_profiles: CompetitorProfile[];
  positioning_map: Record<string, Record<string, number>>;
  strategic_recommendations: StrategicRecommendation[];
  metrics_comparison: Record<string, Record<string, number>>;
  share_of_voice: Record<string, number>;
}

// ═══ Phase 4.3: Topic Auto-Discovery ═══════

export interface DiscoveredTopic {
  topic: string;
  frequency: number;
  frequency_pct: number;
  avg_sentiment: number;
  avg_quality: number;
  brand_mentioned_pct: number;
  sample_contexts: string[];
  related_prompts: string[];
  is_positive: boolean;
  keywords: string[];
}

export interface TopicDiscoveryResult {
  brand_name: string;
  total_prompts: number;
  total_topics: number;
  topics: DiscoveredTopic[];
  top_positive_topics: string[];
  top_negative_topics: string[];
  topic_coverage_score: number;
  generated_at: string;
}

// ═══ Phase 4.3: Brand Grouping ═══════

export interface GroupedBrand {
  name: string;
  group: 'anchor' | 'alternative' | 'mindshare' | 'unknown';
  confidence: number;
  mentions_count: number;
  avg_position: number;
  recommendation_rate: number;
  primary_rec_count: number;
  alternative_count: number;
  avg_sentiment: number;
  is_user_brand: boolean;
}

export interface BrandGroupingResult {
  brand_name: string;
  anchor_brands: GroupedBrand[];
  alternative_brands: GroupedBrand[];
  mindshare_brands: GroupedBrand[];
  user_brand_group: string;
  user_brand_analysis: string;
  total_brands_detected: number;
  generated_at: string;
}

// ═══ Phase 4.3: Source Influence ═══════

export interface SourceInfluenceItem {
  name: string;
  source_type: string;
  influence_score: number;
  authority_score: number;
  frequency_score: number;
  sentiment_impact: number;
  reach_score: number;
  citation_count: number;
  prompts_citing: number;
  avg_sentiment_when_cited: number;
  is_own: boolean;
  sample_contexts: string[];
}

export interface SourceInfluenceResult {
  brand_name: string;
  total_sources: number;
  sources: SourceInfluenceItem[];
  top_influencers: string[];
  own_source_rank: number;
  own_source_influence: number;
  avg_influence: number;
  influence_gap: string;
  generated_at: string;
}

// ═══ Phase 4.3: Citation Usage ═══════

export interface CitationItem {
  url_or_name: string;
  domain: string;
  is_url: boolean;
  is_used: boolean;
  citation_count: number;
  source_type: string;
  prompts_citing: string[];
  avg_sentiment_when_cited: number;
  reason_unused?: string;
  optimization_hint?: string;
}

export interface CitationUsageResult {
  brand_name: string;
  domain: string;
  total_urls_cited: number;
  total_sources_cited: number;
  own_urls_cited: number;
  own_urls_known: number;
  citation_rate: number;
  used_citations: CitationItem[];
  unused_opportunities: CitationItem[];
  recommendations: string[];
  generated_at: string;
}

// ═══ GEO Content Distribution Types ═══════════════════

export interface DistributionChannelData {
  id: string;
  name: string;
  source_category: string;
  platform_type: string;
  url: string;
  icon: string;
  chatgpt_citation_weight: number;
  perplexity_citation_weight: number;
  google_overview_citation_weight: number;
  grok_citation_weight: number;
  estimated_ingestion_days: number;
  content_longevity: string;
  best_for_industries: string[];
  best_for_content_types: string[];
  difficulty: string;
  requires_account: boolean;
  moderation_level: string;
  supports_reply: boolean;
  tips: string[];
  description: string;
}

export interface ChannelRecommendationData {
  channel: DistributionChannelData;
  priority: string;
  priority_score: number;
  reason: string;
  action_items: string[];
  current_presence: string;
  gap_opportunity: number;
  content_type_match: string[];
}

export interface SourceCoverageData {
  category: string;
  label: string;
  coverage_pct: number;
  channels_active: number;
  channels_total: number;
  top_channel: string;
  status: string;
}

export interface ChannelStrategyResultData {
  brand_name: string;
  industry: string;
  target_platforms: string[];
  recommendations: ChannelRecommendationData[];
  source_coverage: SourceCoverageData[];
  top_3_actions: string[];
  total_channels: number;
  high_priority_count: number;
  // Content type matches (when content_types provided)
  content_type_matches: ContentChannelMatchData[];
  // Phase 3: Monitor integration
  monitor_data_available: boolean;
  monitor_cited_channels: number;
  monitor_total_citations: number;
  generated_at: string;
}

export interface SubredditRecommendationData {
  name: string;
  url: string;
  subscribers: string;
  relevance_score: number;
  post_type: string;
  title_template: string;
  content_guidelines: string[];
  risks: string[];
  best_posting_times: string;
  self_promo_rules: string;
  // Phase 4: Enhanced
  ai_citation_likelihood: string;
  competitor_activity: string;
  content_saturation: string;
  recommended_frequency: string;
  engagement_strategy: string;
}

export interface CompetitorRedditPresenceData {
  competitor_name: string;
  estimated_subreddits: string[];
  activity_level: string;
  content_types_used: string[];
  estimated_post_frequency: string;
  strengths: string[];
  weaknesses: string[];
  opportunity_gaps: string[];
}

export interface RedditPostTemplateData {
  id: string;
  template_name: string;
  target_subreddit: string;
  post_type: string;
  title_template: string;
  body_template: string;
  cta_style: string;
  ai_optimization_tips: string[];
  estimated_engagement: string;
  best_time_to_post: string;
  content_type: string;
}

export interface RedditCalendarItemData {
  week: number;
  day: string;
  subreddit: string;
  post_type: string;
  topic_suggestion: string;
  content_type: string;
  priority: string;
  notes: string;
}

export interface RedditMonitorSyncData {
  reddit_cited: boolean;
  reddit_citation_count: number;
  reddit_urls_cited: string[];
  subreddits_cited: string[];
  reddit_sentiment: number;
  competitor_reddit_citations: Record<string, number>;
}

export interface RedditStrategyResultData {
  brand_name: string;
  industry: string;
  subreddit_recommendations: SubredditRecommendationData[];
  general_tips: string[];
  risk_warnings: string[];
  reddit_importance_score: number;
  // Phase 4: Enhanced
  competitor_reddit_insights: CompetitorRedditPresenceData[];
  post_templates: RedditPostTemplateData[];
  content_calendar: RedditCalendarItemData[];
  monitor_reddit_data: RedditMonitorSyncData | null;
  generated_at: string;
}

export interface StatusHistoryEntryData {
  from_status: string;
  to_status: string;
  changed_at: string;
  note: string;
}

export interface ContentQueueItemData {
  id: string;
  title: string;
  content_type: string;
  content_preview: string;
  source_module: string;
  source_tab: string;
  content_file_name: string;
  target_channel: string;
  target_channel_id: string;
  target_url: string | null;
  status: string;
  geo_score: number;
  brand_name: string;
  industry: string;
  priority: string;
  scheduled_at: string | null;
  verified_at: string | null;
  verification_url: string | null;
  status_history: StatusHistoryEntryData[];
  // Phase 7: Publish tracking
  publish_platform: string;
  publish_status: string;
  publish_error: string;
  subreddit: string;
  reddit_template_id: string;
  // Phase 8: Post type
  post_type: string;           // "post" or "reply"
  target_thread_url: string;   // URL of thread being replied to
  created_at: string;
  updated_at: string;
  published_at: string | null;
  notes: string;
}

export interface QueueStatsData {
  total: number;
  by_status: Record<string, number>;
  by_channel: Record<string, number>;
  by_content_type: Record<string, number>;
  by_priority: Record<string, number>;
  published_this_week: number;
  verified_count: number;
  avg_days_to_publish: number;
}

export interface ContentChannelMatchData {
  content_type: string;
  content_type_label: string;
  recommended_channels: ChannelRecommendationData[];
}

// Phase 3: Monitor Data Sync Types
export interface MonitorChannelCitationData {
  channel_id: string;
  channel_name: string;
  source_category: string;
  citation_count: number;
  url_count: number;
  avg_sentiment: number;
  last_cited_at: string;
  sample_urls: string[];
  presence_level: string;
}

export interface MonitorSyncResultData {
  brand_name: string;
  monitor_data_available: boolean;
  last_scan_at: string;
  total_citations: number;
  total_sources: number;
  channel_citations: MonitorChannelCitationData[];
  source_category_breakdown: Record<string, number>;
  top_cited_channels: string[];
  uncited_channels: string[];
  recommendations: string[];
}

export interface DistributionMapItemData {
  channel_id: string;
  channel_name: string;
  source_category: string;
  icon: string;
  chatgpt_citation_weight: number;
  is_cited: boolean;
  citation_count: number;
  presence_level: string;
  priority: string;
  priority_score: number;
  gap_opportunity: number;
  status: string;
}

export interface DistributionMapResultData {
  brand_name: string;
  channels: DistributionMapItemData[];
  cited_count: number;
  planned_count: number;
  gap_count: number;
  total_count: number;
  overall_coverage_pct: number;
  generated_at: string;
}

// ─── GEO Content types ─────────────────────────────────

export interface ContentGenerateRequest {
  brand_name: string;
  topic: string;
  content_type: string;
  output_channel: string;
  target_platforms: string[];
  forbidden_claims: string;
  extra_instructions: string;
}

export interface QualityCheck {
  key: string;
  label: string;
  passed: boolean;
  score: number;
  note: string;
}

export interface ContentGenerateResult {
  id: string;
  brand_name: string;
  topic: string;
  content_type: string;
  output_channel: string;
  ai_prompt: string;
  title_options: string[];
  title: string;
  tldr: string;
  main_content_md: string;
  faq: { q: string; a: string }[];
  quality_checks: QualityCheck[];
  geo_score: number;
  target_platforms: string[];
  created_at: string;
  word_count: number;
  template_version: string;
}

export interface ContentValidateResult {
  passed: boolean;
  violations_count: number;
  violations: { module: string; rule: string; text_snippet: string; severity: string }[];
  summary: string;
  geo_score: number;
}

export interface ContentTemplate {
  content_type: string;
  structural_contract: Record<string, unknown>;
  risk_boundary: Record<string, unknown>;
  geo_compliance: Record<string, unknown>;
}

// API Client class
class APIClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      
      // Merge with any existing headers
      if (options.headers) {
        const existingHeaders = options.headers as Record<string, string>;
        Object.assign(headers, existingHeaders);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        // detail can be a string OR a structured object (e.g. credit exhaustion returns
        // { error, message, cost, credits_remaining, upgrade_url, ... }).
        // Always coerce to a string so React can render it safely.
        let errorMessage: string;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (detail && typeof detail === 'object') {
          errorMessage = (detail as Record<string, unknown>).message as string
            || (detail as Record<string, unknown>).error as string
            || JSON.stringify(detail);
        } else {
          errorMessage = `HTTP error ${response.status}`;
        }
        return { data: null, error: errorMessage };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      // Detect AbortError to return a specific message
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { data: null, error: '__ABORTED__' };
      }
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, companyName?: string) {
    return this.request<{ access_token: string; user: any }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, company_name: companyName }),
    });
  }

  async getCurrentUser() {
    return this.request<{ id: string; email: string }>('/api/auth/me');
  }

  // Brand endpoints — always use trailing slash to avoid CORS-breaking 307 redirects
  async getBrands(userId?: string) {
    const params = userId ? `?user_id=${userId}` : '';
    return this.request<BrandWithStats[]>(`/api/brands/${params}`);
  }

  async getBrand(brandId: string) {
    return this.request<BrandWithStats>(`/api/brands/${brandId}`);
  }

  async createBrand(brand: {
    name: string;
    domain?: string;
    keywords?: string[];
    industry?: string;
    description?: string;
  }, userId: string) {
    return this.request<BrandWithStats>(`/api/brands/?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(brand),
    });
  }

  async updateBrand(brandId: string, updates: Partial<{
    name: string;
    domain: string;
    keywords: string[];
    industry: string;
    description: string;
    is_active: boolean;
  }>) {
    return this.request<BrandWithStats>(`/api/brands/${brandId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteBrand(brandId: string) {
    return this.request<void>(`/api/brands/${brandId}`, {
      method: 'DELETE',
    });
  }

  async scanBrand(brandId: string) {
    return this.request<ScanResult>(`/api/brands/${brandId}/scan`, {
      method: 'POST',
    });
  }

  async getBrandStats(brandId: string) {
    return this.request<BrandStats>(`/api/brands/${brandId}/stats`);
  }

  // Mention endpoints
  async getMentions(params: {
    brand_id?: string;
    platform?: string;
    mentioned?: boolean;
    days?: number;
    limit?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return this.request<any[]>(`/api/mentions?${searchParams.toString()}`);
  }

  async getMentionTimeline(brandId: string, days: number = 30) {
    return this.request<TimelineData[]>(`/api/mentions/brand/${brandId}/timeline?days=${days}`);
  }

  async getPlatformBreakdown(brandId: string) {
    return this.request<PlatformData[]>(`/api/mentions/brand/${brandId}/platforms`);
  }

  async getRecentMentions(brandId: string, limit: number = 10) {
    return this.request<any[]>(`/api/mentions/brand/${brandId}/recent?limit=${limit}`);
  }

  // Prompt endpoints
  async getPrompts() {
    return this.request<any[]>('/api/prompts');
  }

  // GEO Audit endpoints
  async runGEOAudit(url: string, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<AuditResult>(`/api/audit/${qs}`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // GEO Optimization endpoints
  async generateOptimization(url: string, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<OptimizationResult>(`/api/optimization/${qs}`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async applyOptimization(url: string, dimensionKey: string, fixIndices?: number[], userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<ApplyOptimizationResult>(`/api/optimization/apply${qs}`, {
      method: 'POST',
      body: JSON.stringify({
        url,
        dimension_key: dimensionKey,
        fix_indices: fixIndices,
      }),
    });
  }

  // ─── GEO Performance Monitor endpoints ─────────────

  async getMonitorPrompts(activeOnly: boolean = false) {
    return this.request<MonitorPrompt[]>(`/api/monitor/prompts?active_only=${activeOnly}`);
  }

  async createMonitorPrompt(data: { template: string; category?: string; description?: string }) {
    return this.request<MonitorPrompt>('/api/monitor/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateSmartPrompts(req: SmartPromptGenerateRequest) {
    return this.request<SmartPromptGenerateResponse>('/api/monitor/prompts/generate-smart', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async updateMonitorPrompt(id: string, data: { template?: string; category?: string; description?: string; is_active?: boolean }) {
    return this.request<MonitorPrompt>(`/api/monitor/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMonitorPrompt(id: string) {
    return this.request<void>(`/api/monitor/prompts/${id}`, {
      method: 'DELETE',
    });
  }

  async batchDeleteMonitorPrompts(ids: string[]) {
    return this.request<{ deleted: number }>(`/api/monitor/prompts/batch-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async toggleMonitorPrompt(id: string) {
    return this.request<MonitorPrompt>(`/api/monitor/prompts/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  async runMonitorScan(data: {
    brand_name: string;
    domain?: string;
    keywords?: string[];
    competitors?: string[];
    prompt_ids?: string[];
    engines?: string[];
    customer_id?: string;
  }, signal?: AbortSignal, userId?: string, isOnboarding?: boolean) {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId);
    if (isOnboarding) params.set('is_onboarding', 'true');
    const qs = params.toString();
    return this.request<MonitorScanResult>(`/api/monitor/scan${qs ? '?' + qs : ''}`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  async runAEOScore(url: string, userId?: string) {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId);
    const qs = params.toString();
    return this.request<AEOContentScore>(`/api/monitor/aeo-score${qs ? '?' + qs : ''}`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getMonitorHistory(brandName: string = '', timeRange: string = 'all') {
    const params = new URLSearchParams();
    if (brandName) params.set('brand_name', brandName);
    if (timeRange !== 'all') params.set('time_range', timeRange);
    const qs = params.toString();
    return this.request<MonitorScanResult[]>(`/api/monitor/history${qs ? '?' + qs : ''}`);
  }

  async scanCompetitor(data: {
    brand_name: string;
    competitor_name: string;
    domain?: string;
    keywords?: string[];
    competitors?: string[];
  }, signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<CompetitorScanResult>(`/api/monitor/competitor-scan${qs}`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  // ═══ Phase 3: Advanced ═════════════════════════════

  async runGapAnalysis(data: {
    brand_name: string;
    domain?: string;
    keywords?: string[];
    competitors: string[];
  }, signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<GapAnalysisResult>(`/api/monitor/gap-analysis${qs}`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  async runAdvancedMentionAnalysis(data: {
    brand_name: string;
    domain?: string;
    keywords?: string[];
    competitors?: string[];
  }, signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<AdvancedMentionAnalysis>(`/api/monitor/advanced-mentions${qs}`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  async generateIntelReport(data: {
    brand_name: string;
    domain?: string;
    keywords?: string[];
    competitors: string[];
  }, signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<CompetitiveIntelReport>(`/api/monitor/intel-report${qs}`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  // ═══ Phase 4.2: Multi-brand Trends ═════════════════

  async getMultiBrandTrends(brandName: string, competitors: string[], timeRange: string = 'all') {
    const params = new URLSearchParams();
    params.set('brand_name', brandName);
    if (competitors.length > 0) params.set('competitors', competitors.join(','));
    if (timeRange !== 'all') params.set('time_range', timeRange);
    return this.request<MultiBrandTrendData>(`/api/monitor/multi-brand-trends?${params.toString()}`);
  }

  // ─── Phase 4.3: Advanced Analysis ────────────────────

  async runTopicDiscovery(brandName: string, domain: string = '', keywords: string[] = [], competitors: string[] = [], signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<TopicDiscoveryResult>(`/api/monitor/topic-discovery${qs}`, {
      method: 'POST',
      body: JSON.stringify({ brand_name: brandName, domain, keywords, competitors }),
      signal,
    });
  }

  async getBrandGrouping(brandName: string, domain: string = '', keywords: string[] = [], competitors: string[] = [], signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<BrandGroupingResult>(`/api/monitor/brand-grouping${qs}`, {
      method: 'POST',
      body: JSON.stringify({ brand_name: brandName, domain, keywords, competitors }),
      signal,
    });
  }

  async runSourceInfluence(brandName: string, domain: string = '', keywords: string[] = [], competitors: string[] = [], signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<SourceInfluenceResult>(`/api/monitor/source-influence${qs}`, {
      method: 'POST',
      body: JSON.stringify({ brand_name: brandName, domain, keywords, competitors }),
      signal,
    });
  }

  async getCitationUsage(brandName: string, domain: string = '', keywords: string[] = [], competitors: string[] = [], signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<CitationUsageResult>(`/api/monitor/citation-usage${qs}`, {
      method: 'POST',
      body: JSON.stringify({ brand_name: brandName, domain, keywords, competitors }),
      signal,
    });
  }

  async runDiscover(
    payload: {
      brand_name: string;
      domain?: string;
      industry?: string;
      one_liner?: string;
      target_audience?: string;
      target_market?: string;
      differentiation?: string;
      keywords?: string[];
      competitors?: string[];
      engines?: string[];
      deep?: boolean;
    },
    signal?: AbortSignal,
    userId?: string,
    role?: string,
  ) {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId);
    if (role) params.set('role', role);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<DiscoverResult>(`/api/monitor/discover${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  }

  async getAvailableEngines() {
    return this.request<{
      engines: string[]
      models?: Record<string, { quick: string; deep: string }>
    }>('/api/monitor/engines');
  }

  // ─── Dev Mode: EMA Policy Optimization ───────────────

  async devOptimize(req: DevOptimizationRequest) {
    return this.request<DevOptimizationResult>('/api/monitor/dev/optimize', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async devSuggestConfig(req: DevOptimizationRequest) {
    return this.request<DevOptimizationConfig>('/api/monitor/dev/optimize/config', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // ─── Phase 4.4: Export endpoints ─────────────────────

  getExportCSVUrl(type: 'overview' | 'mentions' | 'prompts' | 'sources' | 'competitors' | 'full-report', brandName: string): string {
    if (type === 'prompts') {
      return `${this.baseUrl}/api/monitor/export/csv/prompts`;
    }
    return `${this.baseUrl}/api/monitor/export/csv/${type}?brand_name=${encodeURIComponent(brandName)}`;
  }

  getExportPDFUrl(brandName: string): string {
    return `${this.baseUrl}/api/monitor/export/pdf/report?brand_name=${encodeURIComponent(brandName)}`;
  }

  // ═══ GEO Content Distribution ═══════════════════════

  async getDistributionChannels() {
    return this.request<DistributionChannelData[]>('/api/distribution/channels');
  }

  async generateDistributionStrategy(data: {
    brand_name: string;
    domain?: string;
    industry?: string;
    brand_description?: string;
    competitors?: string[];
    target_platforms?: string[];
    content_types?: string[];
  }, signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<ChannelStrategyResultData>(`/api/distribution/strategy${qs}`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  async matchContentToChannels(data: {
    brand_name: string;
    industry?: string;
    content_types?: string[];
  }) {
    return this.request<ContentChannelMatchData[]>('/api/distribution/match-content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateRedditStrategy(data: {
    brand_name: string;
    industry?: string;
    brand_description?: string;
    content_type?: string;
    competitors?: string[];
    domain?: string;
  }, signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<RedditStrategyResultData>(`/api/distribution/reddit-strategy${qs}`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  /**
   * Phase 11: Progressive Reddit Strategy via SSE.
   * Calls onStaticSubreddits (instant) → onSubreddits → onTemplates → onCompetitors → onComplete
   */
  async generateRedditStrategyProgressive(
    data: {
      brand_name: string;
      industry?: string;
      brand_description?: string;
      content_type?: string;
      competitors?: string[];
      domain?: string;
    },
    callbacks: {
      onStaticSubreddits?: (subs: SubredditRecommendationData[]) => void;
      onSubreddits?: (subs: SubredditRecommendationData[]) => void;
      onTemplates?: (tpls: RedditPostTemplateData[]) => void;
      onCompetitors?: (comps: CompetitorRedditPresenceData[]) => void;
      onComplete?: (result: RedditStrategyResultData) => void;
      onError?: (err: string) => void;
    },
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/distribution/reddit-strategy-progressive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal,
      });
      if (!res.ok) {
        callbacks.onError?.(`HTTP ${res.status}`);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { callbacks.onError?.('No stream'); return; }
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (eventType === 'static_subreddits') callbacks.onStaticSubreddits?.(parsed);
              else if (eventType === 'subreddits') callbacks.onSubreddits?.(parsed);
              else if (eventType === 'templates') callbacks.onTemplates?.(parsed);
              else if (eventType === 'competitors') callbacks.onCompetitors?.(parsed);
              else if (eventType === 'complete') callbacks.onComplete?.(parsed);
            } catch { /* skip parse errors */ }
            eventType = '';
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      callbacks.onError?.(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  async getDistributionQueue(filters?: {
    brand_name?: string;
    status?: string;
    channel?: string;
    priority?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.brand_name) params.set('brand_name', filters.brand_name);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.channel) params.set('channel', filters.channel);
    if (filters?.priority) params.set('priority', filters.priority);
    const qs = params.toString();
    return this.request<ContentQueueItemData[]>(`/api/distribution/queue${qs ? '?' + qs : ''}`);
  }

  async getQueueStats(brandName: string = '') {
    const params = new URLSearchParams();
    if (brandName) params.set('brand_name', brandName);
    const qs = params.toString();
    return this.request<QueueStatsData>(`/api/distribution/queue/stats${qs ? '?' + qs : ''}`);
  }

  async addToDistributionQueue(data: {
    title: string;
    content_type?: string;
    content_preview?: string;
    target_channel?: string;
    target_channel_id?: string;
    target_url?: string;
    notes?: string;
    brand_name?: string;
    industry?: string;
    priority?: string;
    scheduled_at?: string;
    source_tab?: string;
    content_file_name?: string;
    subreddit?: string;
    reddit_template_id?: string;
    post_type?: string;
    target_thread_url?: string;
  }) {
    return this.request<ContentQueueItemData>('/api/distribution/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQueueItem(itemId: string, data: {
    title?: string;
    target_channel?: string;
    target_url?: string;
    status?: string;
    notes?: string;
    priority?: string;
    scheduled_at?: string;
    verification_url?: string;
  }) {
    return this.request<ContentQueueItemData>(`/api/distribution/queue/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async batchUpdateQueueStatus(itemIds: string[], newStatus: string, note: string = '') {
    return this.request<ContentQueueItemData[]>('/api/distribution/queue/batch-status', {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds, new_status: newStatus, note }),
    });
  }

  async deleteQueueItem(itemId: string) {
    return this.request<void>(`/api/distribution/queue/${itemId}`, {
      method: 'DELETE',
    });
  }

  // ─── Phase 3: Monitor Data Sync ─────────────────────

  async getMonitorSync(brandName: string, domain: string = '') {
    const params = new URLSearchParams({ brand_name: brandName });
    if (domain) params.set('domain', domain);
    return this.request<MonitorSyncResultData>(`/api/distribution/monitor-sync?${params.toString()}`);
  }

  async getDistributionMap(brandName: string, domain: string = '') {
    const params = new URLSearchParams({ brand_name: brandName });
    if (domain) params.set('domain', domain);
    return this.request<DistributionMapResultData>(`/api/distribution/distribution-map?${params.toString()}`);
  }

  // ─── GEO Content ─────────────────────────────────────

  async generateContent(body: ContentGenerateRequest, signal?: AbortSignal, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<ContentGenerateResult>(`/api/content/generate${qs}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal,
    });
  }

  async validateContent(body: { content_type: string; article_content: string }, userId?: string) {
    const qs = userId ? `?user_id=${userId}` : '';
    return this.request<ContentValidateResult>(`/api/content/validate${qs}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async getContentHistory(contentType?: string, outputChannel?: string) {
    const params = new URLSearchParams();
    if (contentType) params.set('content_type', contentType);
    if (outputChannel) params.set('output_channel', outputChannel);
    return this.request<ContentGenerateResult[]>(`/api/content/history?${params.toString()}`);
  }

  async getContentTemplates() {
    return this.request<ContentTemplate[]>('/api/content/templates');
  }

  async updateContentTemplate(contentType: string, template: ContentTemplate) {
    return this.request<ContentTemplate>(`/api/content/templates/${contentType}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
  }

  // ═══ Onboarding ══════════════════════════════════════

  async onboardingSuggestTopics(data: { brand_name: string; domain?: string; industry?: string }) {
    return this.request<{ topics: { topic: string; description: string }[] }>('/api/onboarding/suggest-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async onboardingGeneratePrompts(data: { brand_name: string; topics: string[] }) {
    return this.request<{ topic_prompts: Record<string, { prompt_text: string; intent: string }[]>; total_count: number }>('/api/onboarding/generate-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async onboardingSuggestCompetitors(data: { brand_name: string; domain?: string; topics?: string[] }) {
    return this.request<{ competitors: { brand_name: string; domain: string; reason: string }[] }>('/api/onboarding/suggest-competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // ---- ROI Simulator ----
  async roiGetModels() {
    return this.request<{ models: { code: string; name: string; name_zh: string; conversion_rate: number; gross_margin: number; ai_multiplier: number }[] }>('/api/roi/models');
  }

  async roiCalculate(data: { aov: number; industry: string; email?: string; company?: string }) {
    return this.request<{
      aov: number;
      industry_code: string;
      industry_name: string;
      industry_name_zh: string;
      geo_investment: number;
      revenue_low: number;
      revenue_high: number;
      roi_low: number;
      roi_high: number;
      benchmark_roi_low: number;
      benchmark_roi_high: number;
      result_explanation: string;
    }>('/api/roi/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // ── Stripe Subscription Methods ─────────────────────────────────────────

  async createCheckoutSession(params: {
    user_id: string;
    user_email: string;
    plan: string;
    billing_interval: 'month' | 'year';
  }) {
    return this.request<{ checkout_url: string }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  async createPortalSession(user_id: string) {
    return this.request<{ portal_url: string }>('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });
  }

  async getSubscription(user_id: string) {
    return this.request<{ subscription: SubscriptionStatus | null }>(`/api/stripe/subscription/${user_id}`);
  }

  async getUsage(user_id: string) {
    return this.request<{ usage: UsageData }>(`/api/stripe/usage/${user_id}`);
  }

  async getCredits(user_id: string) {
    return this.request<CreditBalance>(`/api/stripe/credits/${user_id}`);
  }

  async cancelSubscription(user_id: string) {
    return this.request<{ success: boolean; cancel_at_period_end: boolean; current_period_end: string | null }>(
      '/api/stripe/cancel-subscription',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id }),
      }
    );
  }

  async reactivateSubscription(user_id: string) {
    return this.request<{ success: boolean; cancel_at_period_end: boolean }>(
      '/api/stripe/reactivate-subscription',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id }),
      }
    );
  }

  async adminResetCredits(user_id: string) {
    return this.request<CreditBalance>('/api/stripe/admin/reset-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });
  }

  async adminGrantCredits(user_id: string, amount: number) {
    return this.request<CreditBalance>('/api/stripe/admin/grant-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, amount }),
    });
  }

  async adminResetUser(user_id: string) {
    return this.request<{ success: boolean; message: string }>('/api/stripe/admin/reset-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });
  }

  // ── GA4 Attribution methods ────────────────────────────────────────────────

  async ga4Connect(params: { brand_id: string; ga4_property_id: string; service_account_json: string }) {
    return this.request<{ success: boolean; connection_id: string }>('/api/ga4/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  async ga4Disconnect(connectionId: string) {
    return this.request<{ success: boolean }>(`/api/ga4/connect/${connectionId}`, { method: 'DELETE' });
  }

  async ga4ListConnections(brandId?: string) {
    const q = brandId ? `?brand_id=${brandId}` : '';
    return this.request<{ connections: Array<{ id: string; brand_id: string; ga4_property_id: string; status: string; last_synced_at: string | null; error_message: string | null }> }>(`/api/ga4/connections${q}`);
  }

  async ga4Sync(connectionId: string) {
    return this.request<{ success: boolean; synced_rows: number }>(`/api/ga4/sync/${connectionId}`, { method: 'POST' });
  }

  async ga4GetSummary(brandId: string, days = 30) {
    return this.request<{ summary: Array<{ ai_platform: string; sessions: number; users: number; conversions: number; revenue: number; conversion_rate_pct: number; avg_order_value: number }>; days: number }>(`/api/ga4/summary?brand_id=${brandId}&days=${days}`);
  }

  async ga4GetTrend(brandId: string, aiPlatform?: string, days = 30) {
    const q = aiPlatform ? `&ai_platform=${encodeURIComponent(aiPlatform)}` : '';
    return this.request<{ trend: Array<{ date: string; sessions: number; conversions: number; revenue: number }>; ai_platform: string | null; days: number }>(`/api/ga4/trend?brand_id=${brandId}&days=${days}${q}`);
  }

  async ga4GetPromptROI(brandId: string, aiPlatform = 'ChatGPT', days = 30) {
    return this.request<{ prompt_roi: Array<{
      id: string; brand_id: string; prompt_id: string; ai_platform: string;
      date_range_start: string; date_range_end: string;
      visibility_score: number | null;
      attributed_sessions: number; attributed_conversions: number;
      attributed_revenue: number; roi_value: number | null;
    }>; ai_platform: string; days: number }>(`/api/ga4/prompt-roi?brand_id=${brandId}&ai_platform=${encodeURIComponent(aiPlatform)}&days=${days}`);
  }

  async ga4ComputeAttribution(brandId: string, aiPlatform = 'ChatGPT', days = 30) {
    return this.request<{ success: boolean; attributed_prompts: number; ai_platform: string }>(
      `/api/ga4/compute-attribution?brand_id=${brandId}&ai_platform=${encodeURIComponent(aiPlatform)}&days=${days}`,
      { method: 'POST' },
    );
  }

  async ga4GetOptimizationEvents(brandId: string) {
    return this.request<{ events: Array<{
      id: string; brand_id: string; event_type: string;
      event_date: string; description: string | null; created_at: string;
    }> }>(`/api/ga4/optimization-events?brand_id=${brandId}`);
  }

  async ga4LogOptimizationEvent(params: { brand_id: string; event_type: string; event_date: string; description?: string }) {
    return this.request<{ success: boolean }>('/api/ga4/optimization-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  async ga4GetRealROI(brandId: string, geoMonthlyCost = 3999, days = 30) {
    return this.request<{
      real_roi: { ai_revenue: number; geo_cost: number; roi_pct: number; roi_label: string; total_sessions: number; total_conversions: number; days: number };
      has_data: boolean;
    }>(`/api/ga4/real-roi?brand_id=${brandId}&geo_monthly_cost=${geoMonthlyCost}&days=${days}`);
  }

  // ── ROI Estimate: store & compare ─────────────────────────────────────────

  async ga4SaveROIEstimate(estimate: {
    aov: number; industry_code: string; industry_name: string;
    revenue_low: number; revenue_high: number; roi_low: number; roi_high: number; geo_investment: number;
  }) {
    return this.request<{ success: boolean }>('/api/ga4/roi-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estimate),
    });
  }

  async ga4GetROIEstimate() {
    return this.request<{ estimate: ROIEstimate | null }>('/api/ga4/roi-estimate');
  }

  async ga4GetROIVsEstimate(brandId: string, days = 90) {
    return this.request<{
      estimate: ROIEstimate | null;
      real_revenue: number;
      real_sessions: number;
      real_conversions: number;
      real_roi_pct: number | null;
      realization_pct: number | null;
      has_ga4_data: boolean;
      days: number;
    }>(`/api/ga4/roi-vs-estimate?brand_id=${brandId}&days=${days}`);
  }

}

// ── Credit Types ────────────────────────────────────────────────────────────

export interface CreditBalance {
  plan: string;
  credits_used: number;
  credits_limit: number;
  credits_bonus: number;
  credits_total: number;
  credits_remaining: number;
}

// ── ROI Estimate Type ────────────────────────────────────────────────────────

export interface ROIEstimate {
  aov: number;
  industry_code: string;
  industry_name: string;
  revenue_low: number;
  revenue_high: number;
  roi_low: number;
  roi_high: number;
  geo_investment: number;
  saved_at: string;
}

// ── Subscription Types ──────────────────────────────────────────────────────

export interface PlanLimits {
  credits_per_month: number;
  team_seats: number;
  brands_allowed: number;
  competitor_tracking: boolean;
  api_access: boolean;
  custom_reports: boolean;
}

export interface SubscriptionStatus {
  plan: 'starter' | 'growth' | 'enterprise';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete';
  billing_interval: 'month' | 'year';
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  pause_resumes_at: string | null;
  limits: PlanLimits;
}

export interface UsageData {
  prompts_used: number;
  answers_analyzed: number;
  credits_used: number;
  credits_bonus: number;
  team_seats_used: number;
  brands_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Operation Console Types (P1)
// ═══════════════════════════════════════════════════════════════════════════

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type PromptIntentType = 'info_cognition' | 'solution_explore' | 'comparison_decision' | 'action_choice'
export type PromptAnswerability = 'A' | 'B' | 'C' | 'D'
export type PromptTier = 'top20' | 'core60' | 'longtail'
export type PromptStatus = 'active' | 'failed' | 'paused'
export type ContentType = 'CT1' | 'CT2' | 'CT3' | 'CT4' | 'CT5' | 'CT6' | 'CT7'
export type ContentChannel = 'reddit' | 'linkedin' | 'client_website' | 'self_built' | 'github'
export type ContentStatus = 'draft' | 'qa_pending' | 'qa_pass' | 'qa_conditional' | 'qa_fail' | 'published' | 'taken_down'
export type StageGateDecision = 'continue' | 'correct' | 'stop_loss' | 'upsell'

export interface ManagedProject {
  id: string
  client_name: string
  client_domain?: string
  industry?: string
  contact_email?: string
  start_date?: string
  end_date?: string
  stage: number
  status: ProjectStatus
  notes?: string
  created_at: string
  updated_at?: string
  // aggregated
  prompt_count?: number
  top20_count?: number
  content_count?: number
  visibility_rate?: number
}

export interface ManagedProjectCreate {
  client_name: string
  client_domain?: string
  industry?: string
  contact_email?: string
  start_date?: string
  stage?: number
  status?: ProjectStatus
  notes?: string
}

export interface OpsPrompt {
  id: string
  project_id: string
  text: string
  intent_type?: PromptIntentType
  answerability: PromptAnswerability
  tier: PromptTier
  status: PromptStatus
  visibility_pct: number
  brand_mentioned: boolean
  fail_reason?: string
  notes?: string
  last_checked_at?: string
  created_at: string
  updated_at?: string
  bound_content_count?: number
}

export interface OpsPromptCreate {
  project_id: string
  text: string
  intent_type?: PromptIntentType
  answerability?: PromptAnswerability
  tier?: PromptTier
  notes?: string
}

export interface OpsContent {
  id: string
  project_id: string
  prompt_id?: string
  title: string
  content_type: ContentType
  channel: ContentChannel
  content?: string
  status: ContentStatus
  trust_score?: number
  cite_score?: number
  qa_notes?: string
  published_url?: string
  ai_draft: boolean
  created_at: string
  updated_at?: string
}

export interface OpsContentCreate {
  project_id: string
  prompt_id?: string
  title: string
  content_type: ContentType
  channel: ContentChannel
  content?: string
  ai_draft?: boolean
}

export interface StageGate {
  id: string
  project_id: string
  week: number
  visibility_rate?: number
  target_rate?: number
  decision?: StageGateDecision
  notes?: string
  completed_at?: string
  created_at: string
}

export interface OpsStats {
  total_projects: number
  active_projects: number
  total_prompts: number
  top20_prompts: number
  total_content: number
  qa_pending_content: number
  published_content: number
  avg_visibility_rate: number
}

// ── Ops API methods ──────────────────────────────────────────────────────────

// (These are added as standalone functions since they call the admin-only /api/ops endpoints)
const OPS_BASE = `${API_BASE_URL}/api/ops`

async function opsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${OPS_BASE}${path}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function opsPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${OPS_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function opsPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${OPS_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function opsDelete(path: string): Promise<void> {
  const res = await fetch(`${OPS_BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ── Scan types (P2) ─────────────────────────────────────────────────────────

export type ScanRunStatus = 'running' | 'completed' | 'failed'
export type ScanTrigger = 'manual' | 'openclaw_daily' | 'openclaw_weekly'
export type AIPlatform = 'chatgpt' | 'perplexity' | 'gemini' | 'grok'
export type ScanMentionType = 'primary_recommendation' | 'comparison' | 'passing' | 'not_mentioned'

export interface ScanRun {
  id: string
  project_id: string
  client_brand: string
  status: ScanRunStatus
  prompts_total: number
  prompts_done: number
  mentioned_count: number
  visibility_rate: number
  error_msg?: string
  triggered_by: string
  started_at: string
  completed_at?: string
  credits_cost: number
}

export interface ScanRunProgress {
  run_id: string
  status: ScanRunStatus
  prompts_total: number
  prompts_done: number
  mentioned_count: number
  visibility_rate: number
  pct: number
  error_msg?: string
}

export interface ScanResult {
  id: string
  run_id: string
  project_id: string
  prompt_id: string
  prompt_text: string
  ai_platform: AIPlatform
  brand_mentioned: boolean
  mention_type?: ScanMentionType
  response_text?: string
  response_excerpt?: string
  position_rank?: number
  sentiment?: string
  cited_urls: string[]
  tokens_used: number
  scanned_at: string
}

export interface ScanTrendPoint {
  run_id: string
  date: string
  visibility_rate: number
  mentioned_count: number
  prompts_total: number
  triggered_by: string
}

export interface PromptVisibilitySummary {
  prompt_id: string
  prompt_text: string
  tier: string
  intent_type?: string
  runs_count: number
  mentioned_count: number
  visibility_rate: number
  last_mentioned?: string
  trend?: string
}

export const opsApi = {
  // Stats
  getStats: () => opsGet<OpsStats>('/stats'),

  // Projects
  listProjects: (status?: ProjectStatus) =>
    opsGet<ManagedProject[]>('/projects' + (status ? `?status=${status}` : '')),
  createProject: (data: ManagedProjectCreate) =>
    opsPost<ManagedProject>('/projects', data),
  getProject: (id: string) =>
    opsGet<ManagedProject & { stage_gates: StageGate[] }>(`/projects/${id}`),
  updateProject: (id: string, data: Partial<ManagedProjectCreate & { status: ProjectStatus; stage: number }>) =>
    opsPatch<ManagedProject>(`/projects/${id}`, data),
  deleteProject: (id: string) => opsDelete(`/projects/${id}`),

  // Prompts
  listPrompts: (projectId: string, tier?: PromptTier) =>
    opsGet<OpsPrompt[]>(`/projects/${projectId}/prompts` + (tier ? `?tier=${tier}` : '')),
  createPrompt: (projectId: string, data: OpsPromptCreate) =>
    opsPost<OpsPrompt>(`/projects/${projectId}/prompts`, data),
  createPromptsBatch: (projectId: string, items: OpsPromptCreate[]) =>
    opsPost<OpsPrompt[]>(`/projects/${projectId}/prompts/batch`, items),
  updatePrompt: (projectId: string, promptId: string, data: Partial<OpsPrompt>) =>
    opsPatch<OpsPrompt>(`/projects/${projectId}/prompts/${promptId}`, data),
  deletePrompt: (projectId: string, promptId: string) =>
    opsDelete(`/projects/${projectId}/prompts/${promptId}`),

  // Content
  listContent: (projectId: string, status?: ContentStatus) =>
    opsGet<OpsContent[]>(`/projects/${projectId}/content` + (status ? `?status=${status}` : '')),
  createContent: (projectId: string, data: OpsContentCreate) =>
    opsPost<OpsContent>(`/projects/${projectId}/content`, data),
  updateContent: (projectId: string, contentId: string, data: Partial<OpsContent>) =>
    opsPatch<OpsContent>(`/projects/${projectId}/content/${contentId}`, data),
  deleteContent: (projectId: string, contentId: string) =>
    opsDelete(`/projects/${projectId}/content/${contentId}`),

  // Stage Gates
  listStageGates: (projectId: string) =>
    opsGet<StageGate[]>(`/projects/${projectId}/stage-gates`),
  createStageGate: (projectId: string, data: Partial<StageGate>) =>
    opsPost<StageGate>(`/projects/${projectId}/stage-gates`, data),
  updateStageGate: (projectId: string, gateId: string, data: Partial<StageGate>) =>
    opsPatch<StageGate>(`/projects/${projectId}/stage-gates/${gateId}`, data),

  // AI Visibility Scan (P2)
  triggerScan: (projectId: string, body: {
    client_brand: string
    triggered_by?: ScanTrigger
    tier_filter?: PromptTier | null
  }) => opsPost<{ message: string; project_id: string }>(`/projects/${projectId}/scan`, {
    project_id: projectId,
    ...body,
  }),
  listScanRuns: (projectId: string, limit = 20) =>
    opsGet<ScanRun[]>(`/projects/${projectId}/scan-runs?limit=${limit}`),
  getScanProgress: (runId: string) =>
    opsGet<ScanRunProgress>(`/scan-runs/${runId}/progress`),
  getScanResults: (runId: string, mentionedOnly = false) =>
    opsGet<ScanResult[]>(`/scan-runs/${runId}/results${mentionedOnly ? '?mentioned_only=true' : ''}`),
  getVisibilityTrend: (projectId: string, limit = 10) =>
    opsGet<{ trend: ScanTrendPoint[] }>(`/projects/${projectId}/visibility-trend?limit=${limit}`),
  getPromptVisibility: (projectId: string) =>
    opsGet<{ prompts: PromptVisibilitySummary[] }>(`/projects/${projectId}/prompt-visibility`),
}

// ── MCP Token API (user self-service) ────────────────────────────────────────
// 每个付费用户自助管理自己的 MCP Token
// 需要在 Authorization 头中携带 Supabase JWT

const MCP_BASE = `${API_BASE_URL}/api/mcp`

export interface MCPToken {
  id: string
  label: string
  token_prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export interface MCPTokenCreated {
  id: string
  label: string
  token: string
  token_prefix: string
  created_at: string
  note: string
}

function _mcpHeaders(jwt?: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (jwt) h['Authorization'] = `Bearer ${jwt}`
  return h
}

export const mcpApi = {
  listTokens: (jwt?: string | null) =>
    fetch(`${MCP_BASE}/tokens`, { headers: _mcpHeaders(jwt) }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text())
      return r.json() as Promise<MCPToken[]>
    }),
  createToken: (label: string, jwt?: string | null) =>
    fetch(`${MCP_BASE}/tokens`, {
      method: 'POST',
      headers: _mcpHeaders(jwt),
      body: JSON.stringify({ label }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text())
      return r.json() as Promise<MCPTokenCreated>
    }),
  revokeToken: (tokenId: string, jwt?: string | null) =>
    fetch(`${MCP_BASE}/tokens/${tokenId}`, {
      method: 'DELETE',
      headers: _mcpHeaders(jwt),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text())
    }),
}

// ─── Website Connections API (Phase 3) ───────────────────────────────────────

export type ConnectionPlatform = 'shopify' | 'wordpress' | 'github' | 'custom'
export type ConnectionScope = 'read_only' | 'read_write'
export type ConnectionStatus = 'connected' | 'error' | 'pending'

export interface DetectedInfo {
  platform_version?: string | null
  shop_name?: string | null
  wp_version?: string | null
  github_repo_name?: string | null
  pages_count?: number | null
  is_private_repo?: boolean | null
}

export interface WebsiteConnection {
  id: string
  user_id: string
  platform: ConnectionPlatform
  display_name?: string | null
  site_url: string
  scope: ConnectionScope
  status: ConnectionStatus
  status_message?: string | null
  token_preview?: string | null
  detected_info?: DetectedInfo | null
  readable_paths: string[]
  writable_paths: string[]
  verify_count: number
  last_verified_at?: string | null
  created_at: string
}

export interface ConnectionTestResult {
  success: boolean
  platform: ConnectionPlatform
  site_url: string
  status_message: string
  detected_info?: DetectedInfo | null
  readable_paths: string[]
  writable_paths: string[]
  scope_warnings: string[]
}

export interface CreateConnectionRequest {
  platform: ConnectionPlatform
  site_url: string
  display_name?: string
  scope?: ConnectionScope
  shopify_access_token?: string
  wp_username?: string
  wp_app_password?: string
  github_token?: string
  github_repo?: string
  api_key?: string
  api_endpoint?: string
}

export interface TestConnectionRequest {
  platform: ConnectionPlatform
  site_url: string
  shopify_access_token?: string
  wp_username?: string
  wp_app_password?: string
  github_token?: string
  github_repo?: string
  api_key?: string
  api_endpoint?: string
}

export const connectionsApi = {
  test: async (req: TestConnectionRequest): Promise<ConnectionTestResult> => {
    const r = await fetch(`${API_BASE_URL}/api/connections/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  create: async (req: CreateConnectionRequest, userId: string): Promise<WebsiteConnection> => {
    const r = await fetch(`${API_BASE_URL}/api/connections?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  list: async (userId: string): Promise<WebsiteConnection[]> => {
    const r = await fetch(`${API_BASE_URL}/api/connections?user_id=${encodeURIComponent(userId)}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  remove: async (connectionId: string, userId: string): Promise<void> => {
    const r = await fetch(
      `${API_BASE_URL}/api/connections/${connectionId}?user_id=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    )
    if (!r.ok) throw new Error(await r.text())
  },

  reverify: async (connectionId: string, userId: string): Promise<WebsiteConnection> => {
    const r = await fetch(
      `${API_BASE_URL}/api/connections/${connectionId}/verify?user_id=${encodeURIComponent(userId)}`,
      { method: 'POST' }
    )
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
}

// ─── Fix Pipeline Types (Phase 4) ─────────────────────────────────────────────

export type FixZone = 'green' | 'yellow' | 'red'

export type ApplyMethod =
  | 'github_commit'
  | 'shopify_asset'
  | 'wordpress_update'
  | 'file_create'
  | 'code_snippet'
  | 'manual_only'

export type FixStatus =
  | 'preview'
  | 'approved'
  | 'applying'
  | 'applied'
  | 'verified'
  | 'failed'
  | 'rolled_back'

export interface FixStep {
  step_number: number
  title: string
  action: string
  note?: string
}

export interface FixPlan {
  id: string
  check_id: string
  check_name: string
  zone: FixZone
  site_url: string
  fix_title: string
  fix_description: string
  fix_code?: string
  fix_filename?: string
  fix_language: string
  engineer_guide?: string
  apply_method: ApplyMethod
  apply_steps: FixStep[]
  can_auto_apply: boolean
  requires_connection: boolean
  requires_approval: boolean
  risk_note?: string
  estimated_minutes: number
  model_used?: string
  status: FixStatus
  created_at: string
}

export interface GenerateFixRequest {
  check_id: string
  check_name: string
  zone: FixZone
  site_url: string
  detail: string
  evidence_basis?: string
  standard_ref?: string
  fix_type?: string
  connection_id?: string
  user_id: string
}

export interface ApplyFixRequest {
  plan_id: string
  user_id: string
  connection_id?: string
  approved?: boolean
}

export interface FixResult {
  plan_id: string
  check_id: string
  success: boolean
  status: FixStatus
  message: string
  apply_method: ApplyMethod
  applied_at?: string
  rollback_available: boolean
}

export interface FixVerifyResult {
  plan_id: string
  check_id: string
  resolved: boolean
  new_status: string
  detail: string
  verified_at: string
}

export interface FixHistoryEntry {
  id: string
  check_id: string
  check_name: string
  zone: FixZone
  site_url: string
  status: FixStatus
  fix_title: string
  can_auto_apply: boolean
  apply_method: ApplyMethod
  created_at: string
  applied_at?: string
  verified: boolean
}

export interface RollbackResult {
  plan_id: string
  check_id: string
  success: boolean
  message: string
  rolled_back_at?: string
}

export const fixApi = {
  /** Generate a fix plan for one failing check (calls Claude) */
  generatePlan: async (req: GenerateFixRequest): Promise<FixPlan> => {
    const r = await fetch(
      `${API_BASE_URL}/api/fixes/plan?user_id=${encodeURIComponent(req.user_id)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }
    )
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  /** Apply a generated fix plan to the website */
  applyFix: async (req: ApplyFixRequest): Promise<FixResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/fixes/apply?user_id=${encodeURIComponent(req.user_id)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }
    )
    if (!r.ok) {
      const errText = await r.text()
      // Surface the detail message for 403/422 (zone guard errors)
      let detail = errText
      try { detail = JSON.parse(errText).detail ?? errText } catch { /* noop */ }
      throw new Error(detail)
    }
    return r.json()
  },

  /** Re-run a check after applying a fix */
  verifyFix: async (
    planId: string,
    checkId: string,
    siteUrl: string,
    userId: string,
  ): Promise<FixVerifyResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/fixes/verify?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, check_id: checkId, site_url: siteUrl, user_id: userId }),
      }
    )
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  /** List fix history for the current user */
  getHistory: async (
    userId: string,
    siteUrl?: string,
    zone?: FixZone,
    limit = 20,
  ): Promise<FixHistoryEntry[]> => {
    const params = new URLSearchParams({ user_id: userId, limit: String(limit) })
    if (siteUrl) params.set('site_url', siteUrl)
    if (zone) params.set('zone', zone)
    const r = await fetch(`${API_BASE_URL}/api/fixes/history?${params.toString()}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  /** Roll back a previously applied fix to restore the before-state */
  rollback: async (planId: string, userId: string): Promise<RollbackResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/fixes/${encodeURIComponent(planId)}/rollback?user_id=${encodeURIComponent(userId)}`,
      { method: 'POST' }
    )
    if (!r.ok) {
      const errText = await r.text()
      let detail = errText
      try { detail = JSON.parse(errText).detail ?? errText } catch { /* noop */ }
      throw new Error(detail)
    }
    return r.json()
  },
}

// Export singleton instance
export const api = new APIClient(API_BASE_URL);

// Helper function to set auth token from Supabase session
export const setAuthFromSession = (session: { access_token: string } | null) => {
  if (session?.access_token) {
    api.setToken(session.access_token);
  } else {
    api.setToken(null);
  }
};

// ─────────────────────────────────────────────────────────────
// Visibility Proxy — Types & API Client
// ─────────────────────────────────────────────────────────────

export type DomainStatus = 'pending' | 'dns_verifying' | 'ssl_provisioning' | 'active' | 'paused' | 'error'

export type ModuleType =
  | 'brand_identity'
  | 'products_services'
  | 'faq_knowledge'
  | 'data_authority'
  | 'competitive_positioning'
  | 'content_summaries'
  | 'ai_discovery_files'
  | 'technical_config'
  | 'html_enhancement'
  | 'agent_skills'       // D1-09: V2 structured agent skills (optional, auto-derived when empty)
  | 'mcp_capabilities'   // D1-08: MCP server tools/resources/prompts (optional, auto-derived when empty)

export interface ProxyDomain {
  id: string
  user_id: string
  domain: string
  origin_url: string
  status: DomainStatus
  proxy_mode?: 'full' | 'sidecar'
  cf_custom_hostname_id?: string
  ssl_status?: string
  dns_verified_at?: string
  activated_at?: string
  strip_noindex: boolean
  bypass_paywall: boolean
  inject_canonical: boolean
  prerender_csr: boolean
  robots_allow_all_ai: boolean
  custom_robots_rules: string
  date_modified_auto: boolean
  // Phase 1 V2: D1-10 Content-Signal (hardcoded default on backend when not set)
  content_signal?: string
  created_at: string
  updated_at?: string
}

export interface ProxyDomainStatus {
  domain: string
  status: DomainStatus
  ssl_status?: string
  dns_verified: boolean
  dns_cname_target: string
  instructions: string
}

export interface ProxyBrandAsset {
  id: string
  domain_id: string
  module_type: ModuleType
  content: Record<string, unknown> | unknown[]
  version: number
  is_active: boolean
  last_compiled_at?: string
  created_at: string
  updated_at?: string
}

export interface ProxyAllAssets {
  domain_id: string
  assets: Record<string, Record<string, unknown> | unknown[]>
}

export interface ProxySyncResult {
  success: boolean
  domain: string
  synced_keys: string[]
  message: string
}

export interface ProxyBotStat {
  bot_name: string
  bot_org?: string
  visit_count: number
}

export interface ProxyPathStat {
  path: string
  visit_count: number
}

export interface ProxyAutoFillResult {
  domain: string
  filled_modules: string[]
  skipped_modules: string[]
  pages_crawled: number
  message: string
}

export interface ProxyDailyTrend {
  date: string
  total: number
  ai_visits: number
  ai_referrals: number
}

export interface ProxyDiscoveryHits {
  llms_txt: number
  robots_txt: number
  agent_json: number
}

export interface ProxyReferralSource {
  source: string
  visit_count: number
}

export interface ProxyAnalytics {
  domain: string
  date_range_days: number           // actual days queried (backend auto-fills when days=0)
  total_requests: number
  total_ai_visits: number
  ai_referral_visits: number
  ai_ratio: number
  /** P1: confirmed = Layer1 UA精确匹配（高可信度）*/
  confirmed_ai_visits: number
  /** P1: suspected = Layer2 行为启发式（低可信度，UnknownBot）*/
  suspected_ai_visits: number
  by_bot: ProxyBotStat[]
  by_path: ProxyPathStat[]
  daily_trend: ProxyDailyTrend[]
  discovery_hits: ProxyDiscoveryHits
  ai_referral_sources: ProxyReferralSource[]
  top_referral_landing_pages: { path: string; visit_count: number }[]
  geo_distribution: { country: string; visit_count: number; bot_count: number; referral_count: number }[]
  recent_visits: Record<string, unknown>[]
  data_source: string
  /** SDK-detected referrals (document.referrer, more accurate than Worker HTTP Referer) */
  sdk_ai_referrals?: number
  sdk_referral_sources?: ProxyReferralSource[]
}

export const proxyApi = {
  listDomains: async (userId: string): Promise<ProxyDomain[]> => {
    const r = await fetch(`${API_BASE_URL}/api/proxy/domains?user_id=${encodeURIComponent(userId)}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  createDomain: async (userId: string, domain: string, originUrl: string, proxyMode: 'full' | 'sidecar' = 'full'): Promise<ProxyDomain> => {
    const r = await fetch(`${API_BASE_URL}/api/proxy/domains?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, origin_url: originUrl, proxy_mode: proxyMode }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(err.detail ?? 'Request failed')
    }
    return r.json()
  },

  getDomain: async (domainId: string, userId: string): Promise<ProxyDomain> => {
    const r = await fetch(`${API_BASE_URL}/api/proxy/domains/${domainId}?user_id=${encodeURIComponent(userId)}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  updateDomain: async (domainId: string, userId: string, updates: Partial<ProxyDomain>): Promise<ProxyDomain> => {
    const r = await fetch(`${API_BASE_URL}/api/proxy/domains/${domainId}?user_id=${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  deleteDomain: async (domainId: string, userId: string): Promise<void> => {
    const r = await fetch(`${API_BASE_URL}/api/proxy/domains/${domainId}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    })
    if (!r.ok && r.status !== 204) throw new Error(await r.text())
  },

  getDomainStatus: async (domainId: string, userId: string): Promise<ProxyDomainStatus> => {
    const r = await fetch(`${API_BASE_URL}/api/proxy/domains/${domainId}/status?user_id=${encodeURIComponent(userId)}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  getAssets: async (domainId: string, userId: string): Promise<ProxyAllAssets> => {
    const r = await fetch(`${API_BASE_URL}/api/proxy/domains/${domainId}/assets?user_id=${encodeURIComponent(userId)}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  updateAsset: async (
    domainId: string,
    moduleType: ModuleType,
    content: Record<string, unknown> | unknown[],
    userId: string,
  ): Promise<ProxyBrandAsset> => {
    const r = await fetch(
      `${API_BASE_URL}/api/proxy/domains/${domainId}/assets/${moduleType}?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      },
    )
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  sync: async (domainId: string, userId: string): Promise<ProxySyncResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/proxy/domains/${domainId}/sync?user_id=${encodeURIComponent(userId)}`,
      { method: 'POST' },
    )
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  getAnalytics: async (domainId: string, userId: string, days = 30): Promise<ProxyAnalytics> => {
    const r = await fetch(
      `${API_BASE_URL}/api/proxy/domains/${domainId}/analytics?user_id=${encodeURIComponent(userId)}&days=${days}`,
    )
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  exportAnalyticsCSV: (domainId: string, userId: string, days = 30, eventFilter = 'all'): string => {
    return `${API_BASE_URL}/api/proxy/domains/${domainId}/analytics/export?user_id=${encodeURIComponent(userId)}&days=${days}&event_filter=${eventFilter}`
  },

  autoFill: async (domainId: string, userId: string): Promise<ProxyAutoFillResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/proxy/domains/${domainId}/auto-fill?user_id=${encodeURIComponent(userId)}`,
      { method: 'POST' },
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Auto-fill failed' }))
      throw new Error(err.detail ?? 'Auto-fill failed')
    }
    return r.json()
  },

  verifyDomain: async (domainId: string, userId: string, quick = false): Promise<ProxyVerifyResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/proxy/domains/${domainId}/verify?user_id=${encodeURIComponent(userId)}&quick=${quick}`,
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Verification failed' }))
      throw new Error(err.detail ?? 'Verification failed')
    }
    return r.json()
  },
}

export interface ProxyVerifyCheck {
  name: string
  passed: boolean
  detail: string
  url: string
}

export interface ProxyVerifyResult {
  domain: string
  checks: ProxyVerifyCheck[]
  passed: number
  total: number
  all_passed: boolean
  quick: boolean
}

// ─────────────────────────────────────────────────────────────
// Domain Compatibility Checker — Types & API Client (Admin only)
// ─────────────────────────────────────────────────────────────

export interface DomainCheckPlatform {
  platform: string     // "shopify" | "wix" | "squarespace" | "wordpress" | "unknown"
  confidence: number   // 0.0 – 1.0
  signals: string[]
}

export interface DomainCheckDns {
  provider: string
  is_behind_cloudflare: boolean
  a_records: string[]
  cname_records: string[]
  ns_records: string[]
}

export interface DomainCheckDetail {
  name: string
  passed: boolean
  detail: string
}

export interface DomainCheckResult {
  domain: string
  verdict: 'compatible' | 'caution' | 'blocked'
  verdict_reason: string
  platform: DomainCheckPlatform
  dns: DomainCheckDns
  https_ok: boolean
  reachable: boolean
  waf_detected: boolean
  is_behind_cloudflare: boolean
  origin_url_guess: string | null
  recommendations: string[]
  checks_detail: DomainCheckDetail[]
}

export interface ProxyTokenInfo {
  token: string
  shop: string
  tier: string
  status: 'active' | 'revoked'
  label?: string
  created_at: string
  revoked_at?: string | null
}

export interface ThemeProbeResult {
  installed: boolean
  shop_id_present: boolean
  token_present: boolean
  shop_id_value: string | null
  token_preview: string | null
  url: string
  host: string
  status_code: number
  error?: string
}

export const adminApi = {
  checkDomain: async (domain: string, userId: string): Promise<DomainCheckResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/domain-check?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      },
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: '检测请求失败' }))
      throw new Error(err.detail ?? '检测请求失败')
    }
    return r.json()
  },

  listProxyTokens: async (shop?: string): Promise<ProxyTokenInfo[]> => {
    const url = shop
      ? `${API_BASE_URL}/api/admin/proxy-tokens?shop=${encodeURIComponent(shop)}`
      : `${API_BASE_URL}/api/admin/proxy-tokens`
    const r = await fetch(url)
    if (!r.ok) throw new Error('Failed to list proxy tokens')
    const data = await r.json()
    return data.tokens ?? []
  },

  createProxyToken: async (
    shop: string,
    tier: 'build' | 'optimize' | 'insight' = 'optimize',
    label?: string,
  ): Promise<ProxyTokenInfo> => {
    const r = await fetch(`${API_BASE_URL}/api/admin/proxy-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, tier, label: label ?? '' }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Failed to create token' }))
      throw new Error(err.detail ?? 'Failed to create token')
    }
    return r.json()
  },

  probeTheme: async (domain: string): Promise<ThemeProbeResult> => {
    const r = await fetch(
      `${API_BASE_URL}/api/admin/probe-theme?domain=${encodeURIComponent(domain)}`,
    )
    if (!r.ok) throw new Error('Failed to probe theme')
    return r.json()
  },
}

// ─── Customer Management ───────────────────────────────────────────────────────

export interface CustomerSummary {
  id: string
  owner_user_id: string
  brand_name: string
  domain: string
  notes: string
  last_scan_at: string | null
  total_scans: number
  is_archived: boolean
  created_at: string
  updated_at: string
  latest_visibility_score: number | null
  latest_scanned_at: string | null
  latest_mentions_found: number | null
  latest_citation_count: number | null
}

export interface CustomerDetail extends CustomerSummary {
  config_json: Record<string, unknown>
  recent_scans: Array<{
    scan_id: string
    scanned_at: string
    visibility_score: number
    mentions_found: number
  }>
}

export interface CustomerLatest {
  customer: CustomerDetail
  latest_scan: Record<string, unknown> | null
  latest_discover: Record<string, unknown> | null
  scan_history_summary: Array<Record<string, unknown>>
}

export interface CustomerCreate {
  brand_name: string
  domain?: string
  config_json?: Record<string, unknown>
  notes?: string
}

export interface CustomerUpdate {
  brand_name?: string
  domain?: string
  config_json?: Record<string, unknown>
  notes?: string
  is_archived?: boolean
}

export const customersApi = {
  list: async (userId: string, includeArchived = false): Promise<CustomerSummary[]> => {
    const r = await fetch(
      `${API_BASE_URL}/api/customers?user_id=${encodeURIComponent(userId)}&include_archived=${includeArchived}`,
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Failed to load customers' }))
      throw new Error(err.detail ?? 'Failed to load customers')
    }
    const data = await r.json()
    // Backend wraps list in { customers: [...] }
    return Array.isArray(data) ? data : (data.customers ?? [])
  },

  create: async (userId: string, data: CustomerCreate): Promise<CustomerDetail> => {
    const r = await fetch(
      `${API_BASE_URL}/api/customers?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Failed to create customer' }))
      throw new Error(err.detail ?? 'Failed to create customer')
    }
    return r.json()
  },

  get: async (customerId: string, userId: string): Promise<CustomerDetail> => {
    const r = await fetch(
      `${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}?user_id=${encodeURIComponent(userId)}`,
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Customer not found' }))
      throw new Error(err.detail ?? 'Customer not found')
    }
    return r.json()
  },

  update: async (customerId: string, userId: string, data: CustomerUpdate): Promise<CustomerDetail> => {
    const r = await fetch(
      `${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Failed to update customer' }))
      throw new Error(err.detail ?? 'Failed to update customer')
    }
    return r.json()
  },

  archive: async (customerId: string, userId: string): Promise<{ ok: boolean }> => {
    const r = await fetch(
      `${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}?user_id=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Failed to archive customer' }))
      throw new Error(err.detail ?? 'Failed to archive customer')
    }
    return r.json()
  },

  getLatest: async (customerId: string, userId: string): Promise<CustomerLatest> => {
    const r = await fetch(
      `${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}/latest?user_id=${encodeURIComponent(userId)}`,
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Failed to load customer data' }))
      throw new Error(err.detail ?? 'Failed to load customer data')
    }
    return r.json()
  },

  importScans: async (customerId: string, userId: string, scans: unknown[]): Promise<{ imported: number }> => {
    const r = await fetch(
      `${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}/import-scans?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scans }),
      },
    )
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Import failed' }))
      throw new Error(err.detail ?? 'Import failed')
    }
    return r.json()
  },
}
