# Apps Script integration helpers

These files are source-level helpers for the bound Apps Script project behind the Social Dashboard API.

They are kept in GitHub because the currently connected Drive/GitHub tools can reach the spreadsheet and dashboard repo, but cannot edit the bound Apps Script project directly.

## YouTube Reach Reporting

File: `YouTubeReachReporting.gs`

What it does:

1. Reuses or creates the official YouTube Reporting API job `channel_reach_basic_a1`.
2. Downloads available bulk reports.
3. Aggregates `video_thumbnail_impressions` by `Period Month + Video ID`.
4. Computes an impressions-weighted `video_thumbnail_impressions_ctr`.
5. Writes:
   - YouTube Raw column T = Thumbnail Impressions
   - YouTube Raw column U = Thumbnail CTR as canonical ratio 0–1

Run order inside the bound Apps Script project:

1. Add the OAuth scope below to `appsscript.json` if it is not already present.
2. Paste/import `YouTubeReachReporting.gs`.
3. Run `testYouTubeReachReportingAccess()` once and approve OAuth if prompted.
4. Run `syncYouTubeReachReporting()`.
5. Verify YouTube Raw T:U against the downloaded report before using Impressions as the YouTube Engagement Rate denominator.
6. Add `syncYouTubeReachReporting()` to the existing scheduled social sync only after reconciliation passes.

Required scope:

```json
"https://www.googleapis.com/auth/yt-analytics.readonly"
```

A typical bound-script manifest will also keep its existing Sheets / external-request scopes, for example:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/yt-analytics.readonly"
  ]
}
```

Do not replace the real manifest wholesale with the snippet above; merge the required scope into the project's existing scopes.

## Metric semantics

- YouTube Engagement Rate remains `Interactions / Impressions`.
- Do not divide YouTube interactions by Views.
- Reporting API CTR is a percentage in the source report; the helper writes it to the sheet as a ratio 0–1.
- The helper uses an impressions-weighted CTR when combining daily rows.
- Report dates follow YouTube reporting boundaries, not the dashboard's Cairo calendar semantics. Keep the reporting-period note documented when reconciling MTD.

## Other outstanding source integrations

- Facebook Reach: use an approved Meta metric/window only; do not sum daily unique viewers.
- Facebook canonical Interactions: keep N/A until a metric comparable to the historical KPI is validated.
- Instagram profile/link actions: test current User Insights fields before mapping them to Link Clicks.
- TikTok Reach/Impressions: current Display API does not expose them; test the already-authorized Business Insights scopes before changing N/A.
- LinkedIn: wait for API approval, then reconcile Organization Share Statistics against the historical definition.


## Historical Monthly Overview parser hardening

File: `HistoricalParserUtils.gs`

Use this to repair the historical Overview nulls caused by locale-formatted numeric strings.

Preferred integration:

1. In the existing dashboard API builder, replace numeric reads based on `getDisplayValues()` with `getValues()`.
2. Reuse `normalizeMonthlyOverviewRow_()` or the same effective-value approach when mapping Monthly Overview rows.
3. Run `testLocaleNumberParser_()` before rollout.
4. Reconcile all 15 closed-month platform rows for June–August against Monthly Overview.
5. Only after that reconciliation passes should historical Overview switch fully from the verified static fallback to the Apps Script API.

Do not create a second historical truth layer. This helper is intended to harden the existing Apps Script normalization path.


## LinkedIn Organization Share Statistics

File: `LinkedInShareStatistics.gs`

Prepared for use after LinkedIn approves the app and organization reporting access.

Required Script Properties:

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_ORGANIZATION_URN`
- `LINKEDIN_VERSION` in `YYYYMM` format using a currently supported Marketing API version

Run order:

1. Confirm the authenticated member is an organization administrator and the app has the required organization reporting permission.
2. Set the three Script Properties above.
3. Run `testLinkedInShareStatisticsAccess()`.
4. Run `syncLinkedInCurrentMonthShareStatistics()`.
5. Reconcile the generated LinkedIn Raw row against LinkedIn native analytics before enabling scheduled sync.

Canonical mapping intentionally matches the historical workbook definition:

- Impressions = `impressionCount`
- Likes = `likeCount`
- Comments = `commentCount`
- Shares = `shareCount`
- Interactions = Likes + Comments + Shares
- Engagement Rate = Interactions / Impressions
- Link Clicks = `clickCount`

`uniqueImpressionsCount` is collected only as a diagnostic and is not silently mapped to Reach because historical LinkedIn Reach is N/A.
