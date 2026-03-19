# Alignment Agent — 5 Core Modules: Functions & Metrics

**Version:** 2.0  
**Last Updated:** 2026-02-11  
**Verified Against:** Latest codebase (geo-audit, geo-optimization, geo-content, geo-distribution, geo-monitor page.tsx)

---

## Summary Table

| Module | Sub-Tabs / Sections | Core Functions | Key Metrics / Outputs |
|--------|---------------------|----------------|----------------------|
| **GEO Audit** | Single page (no tabs) | URL input → 5-dimension AI readiness scoring → Radar chart → Dimension detail cards → Quick insights → Top recommendations → Next Steps CTA (Optimize Now / Create Content / Monitor) | Overall Score (0-100), Letter Grade (A+–F), 5 Dimension Scores (D1-D5), Passed/Warning/Critical check counts, Top 5 Recommendations |
| **GEO Optimization** | Single page (no tabs) | URL input (auto-triggered from Audit) → 5-dimension optimization plan → Stability classification (Structural/Content/Hybrid) → Fix cards with impact & effort → Code generation per dimension → Baseline snapshot | Current vs Projected scores, Quick Wins count, Permanent vs Maintenance fixes, Code snippets (robots.txt, HTML, JS, CSS), Implementation guides |
| **GEO Content** | Generate \| Validator \| History \| Admin | **Generate:** Content type + output channel → AI article generation with 3 title options, TL;DR, FAQ, quality checklist. **Validator:** 3-layer validation (Structural/Risk/GEO Compliance). **History:** Filter/browse/reuse past generations. **Admin:** Inline-editable content rules per type. | Generated article (Markdown), 3 title options, Quality checklist pass/fail, Validation score (pass/fail per layer), Content history records, Editable rule templates |
| **GEO Distribution** | AI Visibility Channel \| AI Visibility Coverage \| AI Content Deployment Hub \| Reddit Strategy Engine | **Channel:** Platform-specific ranked channel recommendations with push-to-queue. **Coverage:** Channel grid with gap analysis. **Hub:** Unified content queue (Pending/Published/AI Verified). **Reddit:** Subreddit recommendations + competitor intel + push buttons. | Channel scores (0-100 per AI platform), Coverage %, Gap count, Queue stats (total/by-status/by-channel), Subreddit relevance scores |
| **GEO Monitor** | Overview \| Mentions \| Citations & Sources \| Competitors \| Gap Analysis \| Prompts | **Overview:** Scan + trend charts + metric cards + brand ranking + Intel Report. **Mentions:** Prompt effectiveness by intent + detailed mentions. **Citations:** Source domains + URL-level citations with favicons. **Competitors:** Brand co-mention + SOV. **Gap Analysis:** Intent-based gaps + priority actions. **Prompts:** CRUD + batch delete + sorting + brand avatars. | Visibility %, Mention count, Citation count, Recommendation Rate, Sentiment breakdown, SOV %, Trend deltas (7d/30d/90d), Per-prompt metrics (visibility/sentiment/position/mentions/AI responses) |

---

## Detailed Module Breakdown

### 1. GEO Audit — AI Readiness Check

**Purpose:** Diagnose whether a website is optimized for AI platform citation.

| Feature | Detail |
|---------|--------|
| URL Input & Validation | Accepts with/without protocol, recent URLs from localStorage |
| 5-Dimension Scoring | D1: AI Accessibility (15%), D2: Semantic Structure (20%), D3: Content Citability (30%), D4: Risk Boundary (20%), D5: Reusability/Memory (15%) |
| Overall Score & Grade | Weighted score 0-100, letter grade A+ to F, percentile benchmark |
| Radar Chart | SVG pentagon with color-coded dimension points |
| Quick Insights | "Strongest Dimension" + "Priority to Fix" cards |
| Dimension Detail Cards | Expandable: findings (✅/⚠️/❌), recommendations |
| Audit Summary | Total checks, passed, warnings, critical counts |
| Next Steps CTA | 3 cards linking to Optimization, Content, Monitor |
| State Persistence | localStorage saves URL + results across navigation |

---

### 2. GEO Optimization — Code Generation

**Purpose:** Generate ready-to-use code snippets to fix audit issues.

| Feature | Detail |
|---------|--------|
| URL Input | Receives URL from Audit CTA (auto-triggers optimization) |
| 5-Dimension Optimization Plans | Current → Projected score, stability type per dimension |
| Stability Classification | Structural (permanent), Content (ongoing), Hybrid (mixed) |
| Fix Cards | Title, description, impact points, effort level, permanent/ongoing badge |
| Code Generation | Per-dimension "Generate" button → robots.txt, HTML meta, FAQ schema, etc. |
| Code Preview Modal | Syntax-highlighted code + copy-to-clipboard + implementation steps |
| Content/Hybrid Links | Content and Hybrid type dimensions link to GEO Content |
| Baseline Snapshot | Save/clear baseline in localStorage for regression tracking |
| State Persistence | localStorage saves URL + results across navigation |

---

### 3. GEO Content — Article Generation & Validation

**Purpose:** Generate and validate AI-optimized content articles.

#### Tab: Generate
| Feature | Detail |
|---------|--------|
| Content Type (7 types) | Definition, Comparison/Ranking, How-to, FAQ, Evaluation & Risk, Use-case Mapping, Reference/Source |
| Output Channel (5 channels) | Reddit/Community, LinkedIn/Professional, Medium/Blog, Docs/Wiki, Company Blog/PR |
| Brand + Product Input | Brand (required) + Product (optional), concatenated for LLM |
| Content Guardrails | Optional forbidden claims / compliance notes |
| AI Generation | LLM generates: 3 title options, TL;DR, main body (Markdown), FAQ section |
| Editable AI Prompt | View/modify the system prompt sent to LLM |
| Quality Checklist | Structural checks: word count, TL;DR present, H2 headings, data points, etc. |
| Push to Distribution | CTA links to GEO Distribution queue |

#### Tab: Validator
| Feature | Detail |
|---------|--------|
| Content Input | Drag & drop file upload (.txt, .md) or paste text + select content type |
| 3-Layer Validation | Structural Contract (word count, headers, sections), Risk Boundary (superlatives, claims), GEO Compliance (citations, fact units) |
| Collapsible Results | Expandable sections per validation layer with pass/fail per rule |
| Submit for Review | Enabled only when validation passes → links to Distribution |

#### Tab: History
| Feature | Detail |
|---------|--------|
| Filter Bar | Filter by content type, output channel |
| History Table | Date, type, channel, brand, title, actions |
| View Output Modal | Full article preview in modal |
| Reuse Structure | Pre-fill Generate tab with previous settings |

#### Tab: Admin
| Feature | Detail |
|---------|--------|
| Template Browser | Left sidebar: 7 content types |
| Rule Sections | 3 collapsible sections: Structural Contract, Risk Boundary, GEO Compliance |
| Inline Editing | Add/delete/modify rules per section with Edit/Save/Cancel |
| Backend Persistence | Saves via PUT /api/content/templates/{type} |

---

### 4. GEO Distribution — Channel Strategy & Content Deployment

**Purpose:** Find optimal channels for AI citation and manage content deployment pipeline.

#### Tab: AI Visibility Channel (Strategy)
| Feature | Detail |
|---------|--------|
| Strategy Inputs | Brand Name, Domain, Industry, Competitors (tags), Target AI Platform (single-select: ChatGPT/Perplexity/Google AI/Grok), Content Type (single-select) |
| Channel Recommendations | Ranked list of 20+ channels by blended AI citation score |
| Push Content Button | Per-channel CTA → opens Push Content Modal → adds to queue |
| Reddit Linking | Reddit channels show "View Reddit Strategy" → switches to Reddit tab |
| Monitor Data Sync | Optionally enriched with GEO Monitor citation data |
| Recent Records | Inline suggestions for brand/domain from localStorage |

#### Tab: AI Visibility Coverage (Map)
| Feature | Detail |
|---------|--------|
| Channel Grid | All channels with citation status, priority, presence, gap opportunity |
| Gap Analysis | Highlights uncovered high-value channels |
| Push to Gaps | Push content directly to gap channels |
| AI Citation Gap | % gap opportunity per channel |
| AI Indexing Retention | Content longevity metric per channel |
| Coverage % | Overall brand coverage percentage |

#### Tab: AI Content Deployment Hub (Queue)
| Feature | Detail |
|---------|--------|
| Queue Table | All content items with source tab badge, channel, status, priority |
| Status Pipeline | Pending → Published → AI Verified (3 stages) |
| Source Tab Badges | Color-coded: blue (strategy), green (map), orange (reddit), gray (manual) |
| Batch Operations | Multi-select, batch status update |
| CRUD | Add, edit, delete items; edit modal for title, type, priority, channel, notes |
| Queue Stats | Total, by status, by channel summary |

#### Tab: Reddit Strategy Engine
| Feature | Detail |
|---------|--------|
| Subreddit Recommendations | AI-powered subreddit suggestions with relevance scoring |
| Competitor Intel | Competitor Reddit presence analysis |
| Push to Subreddit | Per-subreddit push with Post Type (Main Post / Reply) |
| Progressive Loading | Static subreddits first, AI data streams in |
| Cache | 10-min TTL for Reddit strategy results |

---

### 5. GEO Monitor — AI Visibility Monitoring

**Purpose:** Monitor brand AI visibility based on user-designed prompt list.

**Core Design Philosophy:** All monitoring and analysis is based on the user's configured prompt list.

#### Tab: Overview
| Feature | Detail |
|---------|--------|
| Brand Configuration | Brand name, domain, keywords, competitors |
| Scan Execution | Queries AI (OpenAI Responses API + web_search) for each active prompt |
| Time Range Filter | 7d / 30d / 90d / All with "X/Y scans" indicator |
| Model Filter | AI model selector (UI, for future multi-model) |
| Metric Cards | Visibility %, Mentions, Citations, Recommendation Rate — with trend deltas |
| Multi-brand Trend Chart | Silk-smooth Catmull-Rom spline curves, brand hover highlighting, end-point values only |
| Brand Visibility Ranking | Table: Brand, Visibility %, Position, Sentiment |
| Intel Report | LLM-generated: Executive Summary, Brand AI Recommendation by Intent, Metrics Comparison, Share of Voice, Strategic Recommendations |
| Export | CSV (overview, mentions, sources, competitors, prompts) + PDF |
| Cross-Module CTAs | "Re-Audit" → GEO Audit, "Optimize" → GEO Optimization, "Distribute" → GEO Distribution |

#### Tab: Mentions
| Feature | Detail |
|---------|--------|
| Prompt Effectiveness Ranking | Grouped by 4 intents, radar chart per intent, linked to GEO Content for weak prompts |
| Detailed Mentions | Grouped by "Not Mentioned" vs "Mentioned", cited URLs, competitor info, improvement suggestions |
| Sentiment Analysis | Overall + topic-level sentiment breakdown |

#### Tab: Citations & Sources
| Feature | Detail |
|---------|--------|
| Sources Overview | Unique domains count, total citations, source type distribution |
| URL-level Citation Analysis | Individual URLs with citation count, domain, dynamic favicon (Google API) |

#### Tab: Competitors
| Feature | Detail |
|---------|--------|
| Brand Co-Mention & Relationship | Brands co-mentioned with yours, filter by promoted/alternative |
| Competitor Share of Voice | SOV comparison chart across monitored brands |

#### Tab: Gap Analysis
| Feature | Detail |
|---------|--------|
| Intent-Based Gap Visualization | Visual comparison per intent category: brand vs competitor presence |
| Blind Spots | Prompts where competitors mentioned but you're not |
| Priority Action Cards | Grouped by intent, linked to GEO Content 7 article types |
| localStorage Persistence | Gap analysis results persist across tab navigation |

#### Tab: Prompts
| Feature | Detail |
|---------|--------|
| Prompt List Table | Checkbox, Prompt text, Visibility, Sentiment, Position, Mentions, AI Responses (battery bar), Tags, Added date |
| Topic/Intent Filter | Filter by 4 intents: info_cognition, solution_explore, comparison_decision, action_choice |
| Sorted by Visibility | Auto-sorted descending by mention_rate |
| CRUD Operations | Add (with uniqueness check), edit, delete |
| Batch Select & Delete | Multi-select checkboxes, select-all, inline two-step confirmation |
| Brand Mentions Column | Mentioned brand avatars with +N overflow |
| {brand} Replacement | Display and AI query use actual brand name |

---

## 6. Four Prompt Intent Categories (Used Across Modules)

| Key | Name (中文) | Description |
|-----|------------|-------------|
| `info_cognition` | 信息认知 | What is X? Tell me about X. Basic information and understanding queries. |
| `solution_explore` | 方案探索 | How to do X? Best tools for Y. Exploring solutions and approaches. |
| `comparison_decision` | 对比决策 | X vs Y. Best X for Z. Comparison and decision-making queries. |
| `action_choice` | 行动选择 | Should I use X? Where to buy Y. Action-oriented decision queries. |

## 7. Seven GEO Content Article Types

| Key | Name | Purpose |
|-----|------|---------|
| `definition` | Definition | Build AI's stable understanding of a concept |
| `comparison_ranking` | Comparison / Ranking | Help users make choices (Best / VS / Top) |
| `how_to` | How-to | Step-by-step guidance |
| `faq` | FAQ | Answer specific questions |
| `evaluation_risk` | Evaluation & Risk | Explain risks, limitations |
| `use_case_mapping` | Use-case Mapping | Illustrate product applications |
| `reference_source` | Reference / Source | Official policy, research content |

---

**End of Document**
