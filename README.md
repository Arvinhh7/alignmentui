# Alignment AI — GEO Platform Frontend

Next.js 14 frontend for the Alignment AI GEO Platform (`alignmenttech.ai`).

## Quick Start

```bash
npm install
cp env.example.txt .env.local   # fill in your values
npm run dev                      # http://localhost:3000
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API (prod: `https://api.alignmenttech.ai`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   ├── login/                        # Auth: login
│   ├── signup/                       # Auth: signup
│   ├── onboarding/                   # New user onboarding (3-step)
│   ├── pricing/                      # Pricing page
│   ├── unauthorized/                 # Paywall / no subscription
│   │
│   ├── dashboard/                    # Main product (auth-gated)
│   │   ├── layout.tsx                # Sidebar + top bar shell
│   │   ├── page.tsx                  # /dashboard redirect
│   │   │
│   │   ├── analysis/                 # INSIGHTS: AI visibility overview
│   │   ├── geo-monitor/              # INSIGHTS: Brand monitoring
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── shared/
│   │   │       │   ├── ChartComponents.tsx   # ECharts trend charts
│   │   │       │   └── MentionCard.tsx
│   │   │       └── tabs/             # VisibilityTab, CompetitorsTab, PromptsTab ...
│   │   ├── explore/                  # INSIGHTS: Market explore (beta)
│   │   ├── sources/                  # INSIGHTS: Source domains
│   │   ├── ai-search/                # INSIGHTS: AI research (new)
│   │   ├── shopping/                 # INSIGHTS: Shopping signals (new)
│   │   │
│   │   ├── geo-audit/                # ACTIONS: GEO audit
│   │   ├── geo-optimization/         # ACTIONS: Content optimization
│   │   ├── geo-content/              # ACTIONS: Content generation
│   │   ├── geo-distribution/         # ACTIONS: Distribution
│   │   ├── prompts/                  # ACTIONS: Prompt management
│   │   │
│   │   ├── brand-hub/                # ASSISTANT: Brand profile
│   │   ├── settings/                 # ASSISTANT: Account settings
│   │   ├── refer/                    # ASSISTANT: Refer & earn
│   │   │
│   │   ├── visibility-proxy/         # Cloudflare Worker proxy management
│   │   ├── agentic-commerce/         # Agentic Commerce module
│   │   ├── ga4-attribution/          # GA4 Attribution (coming soon)
│   │   │
│   │   └── admin/                    # Admin-only
│   │       ├── customers/            # Customer management
│   │       ├── team/                 # Team / staff access
│   │       └── domain-checker/
│   │
│   ├── ai-visibility-check/          # Public: free GEO check tool
│   ├── blog/
│   ├── docs/
│   ├── roi-simulator/
│   └── ...
│
├── components/
│   ├── Sidebar.tsx                   # Left nav (collapse/expand)
│   ├── DashboardGlobalSearch.tsx     # Cmd+K search
│   ├── FeatureGate.tsx               # Permission-gated wrapper
│   ├── EChartsWorldMap.tsx           # World map (ECharts)
│   ├── SidebarCustomerSwitcher.tsx   # Admin customer switcher
│   ├── SubscriptionBanner.tsx        # Plan upgrade banner
│   ├── Toast.tsx                     # Toast notifications
│   ├── tour/ProductTour.tsx          # Onboarding product tour
│   └── ...
│
├── hooks/
│   ├── useAuth.ts                    # Auth + role + permissions
│   └── useSubscription.ts            # Plan access check
│
└── lib/
    ├── api.ts                        # API client
    ├── supabase.ts                   # Supabase client
    └── LanguageContext.tsx           # i18n (zh/en)
```

## Key Conventions

- **Tailwind** for all styling; design tokens in `tailwind.config.ts`
- **i18n**: every new UI string needs both `zh` and `en` translations
- **Sidebar** collapse state persisted in `localStorage` (`sidebar_expanded`)
- **Charts**: use ECharts via `echarts-for-react` tree-shaking pattern (see `ChartComponents.tsx`)
- **Auth roles**: `admin` / `staff` / `user` / `demo` — use `hasFeatureAccess()` for feature gates, never `role === 'admin'`

## Branch Workflow (Intern)

1. Make UI changes on this branch (`intern/ui-redesign`)
2. `npm run dev` to preview locally — connects to production API (read-only)
3. Open a PR for UI review
4. After approval, changes will be merged into `alignment-workspace`

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
tsc --noEmit         # type-check (run before committing)
next lint
```

## Tech Stack

- **Framework**: Next.js 14 (static export via `next.config.js`)
- **Styling**: Tailwind CSS + CSS custom properties (design tokens)
- **Language**: TypeScript
- **Charts**: ECharts 6 via echarts-for-react
- **Icons**: Lucide React
- **Auth**: Supabase Auth
- **DB**: Supabase (PostgreSQL)
