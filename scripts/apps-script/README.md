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
