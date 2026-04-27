// Public audit API response types — mirrors PublicAuditResponse in public_audit.py

export interface AuditDimension {
  id: string      // "d1" – "d5"
  name: string
  score: number
  level: string   // "Poor" | "Needs Work" | "Good" | "Excellent"
}

export interface AuditCheck {
  id: string
  name: string
  status: 'pass' | 'fail' | 'warning'
  dimension: string  // "d1" – "d5"
}

export interface AuditIssue {
  title: string
  severity: 'critical' | 'high' | 'medium'
  dimension: string
}

export interface AuditPainMetrics {
  missing_agent_card_fields: string  // e.g. "7/9"
  ai_readable_pct: number            // 0–100
  estimated_monthly_lost_mentions: number
}

export interface AuditResult {
  audit_id: string
  domain: string
  overall_score: number
  level: string   // "Poor" | "Needs Work" | "Good" | "Excellent"
  dimensions: AuditDimension[]
  checks_by_dimension: Record<string, AuditCheck[]>  // keyed by "d1"–"d5"
  top_issues: AuditIssue[]
  pain_metrics: AuditPainMetrics
  detected_stack: Record<string, unknown>
  next_steps: {
    primary_cta: {
      label: string
      url: string
      type: string
    }
  }
  full_report_url: string
}
