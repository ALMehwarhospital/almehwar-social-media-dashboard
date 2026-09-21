# AlMehwar Social Media Intelligence Dashboard

Decision dashboard for AlMehwar Hospital social, content, creative, and website performance.

## Data architecture

The dashboard follows one source-of-truth pipeline:

1. Official platform APIs and approved source exports feed the platform **Raw** sheets.
2. Google Sheets is the canonical curated layer:
   - Monthly Overview
   - Content Performance
   - Video Analysis
   - Creative Analysis
   - Recommendations
   - Action Plan
3. The Social Dashboard Apps Script exposes one canonical JSON contract.
4. The UI uses the API when available and the checked-in snapshot only as a cache/fallback.
5. A cached snapshot is labelled **SNAPSHOT**, never **LIVE API**.

Closed historical months are fixed reporting periods. The current month is MTD. Partial sources (for example TikTok coverage beginning 17 Sep 2026) must retain their coverage label. Pending integrations (currently LinkedIn) remain API PENDING.

## Metric rules

- Missing/unavailable is `null` / N/A, never a synthetic zero.
- A numeric zero is kept only when the source actually reports zero.
- Engagement Rate uses the approved platform denominator:
  - Facebook / Instagram: Reach
  - TikTok: Views
  - YouTube: Impressions
  - LinkedIn: Impressions while the historical definition remains in force
- Canonical rate unit is a ratio from 0–1. The UI converts ratios to percentages for display.
- If the required numerator or denominator is unavailable, Engagement Rate is N/A.
- N/A values are excluded from rankings and peer comparisons.
- Creative scores are evidence-based only. Pending Review content is never auto-scored from performance.

The workbook tabs **Data Dictionary** and **Data Quality & N-A** document metric definitions, availability rules, known gaps, and N/A-reduction work.

## Decision flow

Overview → Performance / Platform → Content Intelligence → Video / Creative → Findings & Recommendations → Action Plan.

The purpose is to move from **what happened** to **where**, **which content**, **why**, **what we recommend**, and finally **what we execute and measure**.

## Development

```bash
npm install
npm run dev
npm run build
```

The production GitHub Pages workflow is intentionally separate from this cleanup branch. Validate changes before merging to `main`, because `main` is the production deployment source.
