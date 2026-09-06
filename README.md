# ALMEHWAR Social Intelligence

A social media intelligence dashboard for AlMehwar Hospital — performance analytics, content
and creative analysis, retention diagnosis, an insight engine, and a monthly action plan, built
as a single React + TypeScript app.

## Stack

React 19 · TypeScript · Tailwind CSS · Recharts · Lucide Icons · React Router

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build to dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  types/dashboard.ts        # every data shape in the app — the single contract UI and data agree on
  data/socialDashboard.ts   # THE DATA FILE — see "Where the data lives" below
  utils/
    selectors.ts             # query helpers (getContent, getPlatformPerformance, pillarSummary, ...)
    format.ts                 # number/percent/date formatting
    FilterContext.tsx         # global filter state (month, platform, organic/paid, pillar, format)
  components/
    layout/                   # Sidebar, MobileNav, FilterBar, Layout shell
    dashboard/                 # KpiCard, HealthScore, WhatChanged, PlatformCard, shared primitives
    charts/                     # MonthlyTrendChart, PlatformBarChart, FunnelView, RetentionCurve
    content/                     # ContentTable (ranking table)
    creative/                     # CreativeRadar, PerformanceMatrix
    insights/                      # InsightCard, ProblemCard
  pages/
    Overview.tsx, Performance.tsx, ContentIntelligence.tsx, VideoAnalysis.tsx,
    CreativeLab.tsx, Platforms.tsx, Comparisons.tsx, Insights.tsx, ActionPlan.tsx
scripts/
  generate-data.mjs          # the seeded generator that produced the current demo dataset
```

## Where the dashboard data lives

**Everything the UI shows comes from one file: `src/data/socialDashboard.ts`.**
No component hardcodes a KPI, a chart value, or a piece of copy that should come from data.
The file exports a single object, `socialDashboard`, typed as `SocialDashboardData`
(see `src/types/dashboard.ts`), with these top-level keys:

```
meta                 client name, month list, current/previous month, last updated
monthlyPerformance    organic / paid / total KPI totals per month
platformPerformance   per-platform, per-month metrics + status + one-line observation
contentPerformance    every individual post/reel/story with full metrics
videoAnalysis         per-video watch-time, retention curve, scores, hook type, diagnosis
creativeAnalysis      per-content creative scorecard (idea/hook/script/design/editing/brand/cta)
healthScores          the 0–100 health score + six-part breakdown, per month
insights              observation → data → interpretation → hypothesis → action cards
problems              detected problem patterns (e.g. "high visibility, low engagement")
actionPlan            problem/action/owner/priority/impact/status items
notes                 team notes by category
dataQuality           known gaps/caveats in the current month's data
```

The current data is a **realistic demo dataset for June–August 2026**, generated to be
internally consistent:
- Each platform's engagement rate uses the correct denominator for that platform (Facebook/
  Instagram ÷ Reach, TikTok/YouTube ÷ Views, LinkedIn ÷ Impressions) — `engagementDenominator`
  is stored alongside every rate so the UI can always show which basis was used.
- Organic and paid results are kept as separate fields everywhere, never summed silently.
- Creative and video scores are calculated per content item, then rolled up into monthly
  averages — no month is ever given a single hand-picked score.
- The month-over-month story (Instagram reach up / engagement down, TikTok's broad-based
  growth, Facebook's traffic-over-conversation shift, LinkedIn's conference-season spike) is
  intentional, so the Insights and Problem Detection pages have real signal to surface.

## Replacing the demo data with real data

You have two options:

**Option A — replace the file directly.** Export a `socialDashboard` object of type
`SocialDashboardData` from `src/data/socialDashboard.ts`. This is the simplest path if you're
pulling data with a separate script (e.g. a Google Sheets export job) and writing it out as
TypeScript or JSON.

**Option B — regenerate demo data with different assumptions.** Edit the baseline numbers,
month list, or narrative multipliers at the top of `scripts/generate-data.mjs`, then run:

```bash
node scripts/generate-data.mjs
```

This overwrites `src/data/socialDashboard.ts` from scratch — useful for producing a new demo
dataset, not for a live data connection.

For a live **Google Sheets sync**, the cleanest approach is a small build-time or scheduled
script that reads your sheet (via the Sheets API or a CSV export), maps each row into the
matching array in `SocialDashboardData`, and writes the result to
`src/data/socialDashboard.ts` (or fetches it at runtime and swaps the import for a fetch call
in `src/utils/selectors.ts` if you want the dashboard to update without a rebuild).

## Adding a new month

1. Add the month key (e.g. `"2026-09"`) to `meta.months`, and update `meta.currentMonth` /
   `meta.previousMonth`.
2. Add one entry per platform to `platformPerformance` for that month.
3. Add a `monthlyPerformance` entry (organic/paid/total roll-ups).
4. Add `contentPerformance`, `videoAnalysis`, and `creativeAnalysis` entries for that month's
   content.
5. Add a `healthScores` entry, plus any new `insights`, `problems`, `actionPlan`, `notes`, or
   `dataQuality` items relevant to the month.

No component needs to change — every page reads the month list and filter state from
`FilterContext` / `meta.months`, so a new month appears automatically in the month selector,
trend charts, and comparisons.

## Design notes

The visual language deliberately avoids the generic SaaS-dashboard look: a navy/warm-white
palette with a single mint accent (amber/coral reserved for warnings and negative deltas),
Fraunces for display numbers and headlines paired with Manrope for UI text, and asymmetric
card treatments (a dark hero health-score panel, editorial "what changed" cards, an inline
funnel) instead of a uniform grid of identical white cards.

## Known data-quality caveats (demo data)

The `dataQuality` array in the data file lists specific gaps in the current demo month
(e.g. estimated TikTok reach for a reporting-gap week, unseparated paid/organic figures early
in August). Keep this array current in your real dataset — the dashboard surfaces it directly
on the Overview page so the team never mistakes an estimate for a hard number.

## Deploying / pushing to GitHub

```bash
git init
git add .
git commit -m "Initial commit: ALMEHWAR Social Intelligence dashboard"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`node_modules/` and `dist/` are already excluded via `.gitignore`.
