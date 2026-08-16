# PSS Dashboard — Repository Context

> **Agent Orientation Guide** · Read this before touching any file in this project.

---

## 1. What This Project Is

**PageSpeed Monitor** is a Next.js 14 (App Router) web dashboard that tracks Google PageSpeed / Core Web Vitals metrics over time for the [IndiaMart Export](https://export.indiamart.com/) website. Data is pulled from a **Google Sheets spreadsheet** (where an automation script writes PSS test results) and visualized as interactive time-series charts. The app lives at:

```
/Users/ankulrajapatel/Desktop/Pss_Dashboard
```

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | `^14.2.5` |
| Language | TypeScript | `^5.5.4` |
| UI Library | React | `^18.3.1` |
| Charting | Recharts | `^2.12.7` |
| Styling | TailwindCSS | `^3.4.7` |
| Icons | Lucide React | `^0.417.0` |
| CSS utilities | clsx + tailwind-merge | latest |
| Runtime | Node.js (via Next.js server) | — |
| Data Source | Google Sheets API v4 | — |

> **Tailwind is used here.** Do NOT switch to plain CSS. Use TailwindCSS utility classes.

---

## 3. Project Structure

```
Pss_Dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — sets page title/meta, applies global font & transitions
│   │   ├── page.tsx                # MAIN PAGE — all state, filters, data fetching, rendering orchestration
│   │   ├── globals.css             # Tailwind directives + CSS custom properties (colours, scrollbar)
│   │   └── api/
│   │       └── pagespeed/
│   │           └── route.ts        # THE ONLY API ROUTE — fetches & normalizes data from Google Sheets
│   │
│   ├── components/
│   │   ├── MetricChart.tsx         # Line chart card for a single metric (Recharts + delta pill)
│   │   ├── HeaderSummary.tsx       # Info card: current URL, device, last checked, error banners
│   │   ├── PerformanceIssues.tsx   # Bottom section: lists Score_Reason audit opportunities
│   │   ├── DeviceSelector.tsx      # Toggle: Mobile / Desktop
│   │   ├── PageSelector.tsx        # Toggle: Homepage / Search Page / PDP / Company Page
│   │   ├── TimeRangeSelector.tsx   # Toggle: 6H / 12H / 24H / 7D / 30D
│   │   └── ThemeToggle.tsx         # Light / Dark mode button (persisted in localStorage)
│   │
│   ├── lib/
│   │   └── pagespeed.ts            # Pure utility functions (parsing, normalizing, filtering, formatting)
│   │
│   └── types/
│       └── pagespeed.ts            # All TypeScript interfaces and type aliases
│
├── .env.local                      # Secrets (Google service account credentials) — NEVER commit
├── crested-lexicon-504317-s5-595755e4a777.json  # Google service account JSON key file (reference only)
├── test-gsheet.js                  # One-off Node.js script to test Google Sheets auth manually
├── next.config.mjs                 # Next.js config (reactStrictMode: true, minimal)
├── tailwind.config.ts              # Tailwind config
├── postcss.config.mjs              # PostCSS config
├── tsconfig.json                   # TypeScript config (@/ alias maps to src/)
└── package.json                    # Dependencies & scripts
```

---

## 4. Data Flow (End to End)

```
Google Sheets Spreadsheet
        │
        │  (written by an external automation/bot)
        ▼
GET /api/pagespeed  (route.ts)
        │
        │  Auth strategy (tried in order):
        │  1. Service Account JWT → Google OAuth2 → Sheets API v4 (JSON rows)
        │  2. API Key            → Sheets API v4 (JSON rows)
        │  3. Direct CSV export  → parse CSV manually
        │
        │  normalizeRecord() → ProcessedRecord[]
        │  sorted chronologically ascending
        ▼
page.tsx  (client side, 'use client')
        │
        │  Cached in sessionStorage (key: PAGESPEED_DASHBOARD_CACHE)
        │  Filtered in-memory by: device + page + time range
        ▼
Components render charts & summaries
```

---

## 5. Key Files Deep-Dive

### `src/app/page.tsx` — Main Dashboard Page
- **Client component** (`'use client'`).
- Manages all top-level state: `device`, `page`, `timeRange`, `theme`, `allRecords`, `meta`, `loading`, `refreshing`, `error`.
- Defines the `METRICS` array (6 metrics: Performance Score, LCP, FCP, TBT, SI, CLS) — single source of truth for which charts are shown.
- Calls `/api/pagespeed` on mount; caches response in `sessionStorage`.
- Filters `allRecords` in-memory client-side via `useMemo` — no extra API calls when switching device/page/time-range.
- Theme persisted in `localStorage` (key: `PAGESPEED_DASHBOARD_THEME`).

### `src/app/api/pagespeed/route.ts` — API Route
- `force-dynamic`, `revalidate = 0` — always fetches fresh, never uses Next.js cache.
- Three-tier auth fallback:
  1. **Service Account** — crafts RS256 JWT, exchanges for OAuth2 token, fetches via Sheets API v4.
  2. **API Key** — direct Sheets API v4 call.
  3. **CSV Export** — two URL patterns tried (`/export?format=csv` and `/gviz/tq?tqx=out:csv`).
- Calls `normalizeRecord()` from `lib/pagespeed.ts` to convert raw rows → `ProcessedRecord`.
- Returns `PageSpeedApiResponse` JSON.

### `src/lib/pagespeed.ts` — Pure Utilities

| Function | Purpose |
|---|---|
| `parseDateTimeToEpoch(date, time)` | Converts `DD/MM/YYYY` + `HH:mm` → epoch ms |
| `formatDateTime(timestamp)` | Epoch ms → `"02 Aug 2026 • 14:30"` |
| `normalizeRecord(raw, index)` | Maps raw sheet row → typed `ProcessedRecord`; handles column name variations via `getRawField()` |
| `filterRecordsByTimeRange(records, range)` | Filters relative to the max timestamp in the dataset |
| `formatMetricDisplay(value, unit)` | Human-readable metric formatting |
| `formatDeltaDisplay(delta, unit)` | Delta badge formatting |
| `generateFallbackDataset()` | Generates realistic mock data (exists but not currently called) |

### `src/types/pagespeed.ts` — Types

```typescript
RawPageSpeedRecord    // Raw Google Sheets row (string values, all optional)
ProcessedRecord       // Normalized record with typed number | null fields + epoch timestamp
ScoreReason           // { reason: string; estimated_savings?: string }
MetricDefinition      // Chart configuration object (key, title, unit, higherIsBetter, formatters)
PageSpeedApiResponse  // API response shape: { records: ProcessedRecord[], meta: {...} }
DeviceType            // 'mobile' | 'desktop'
PageType              // 'Homepage' | 'Search Page' | 'PDP' | 'Company Page'
TimeRangeType         // '6H' | '12H' | '24H' | '7D' | '30D'
```

---

## 6. Environment Variables (`.env.local`)

| Variable | Description |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email (`pss-bot@crested-lexicon-504317-s5.iam.gserviceaccount.com`) |
| `GOOGLE_PRIVATE_KEY` | RSA private key PEM — `\n` escaped as `\\n` |
| `GOOGLE_SHEET_ID` | Google Sheets spreadsheet ID |
| `GOOGLE_SHEET_GID` | Sheet tab GID (numeric string) |
| `GOOGLE_API_KEY` | *(Optional)* API key fallback |

> **Default hardcoded values** in `route.ts` (used if env vars not set):
> - `DEFAULT_SHEET_ID = '1lPQb5P7JXLRfj0eMBpPrzxqZDRd4C2ukszK9Ew79MsA'`
> - `DEFAULT_SHEET_GID = '1292258845'`

---

## 7. Google Sheets Column Schema

The spreadsheet is expected to have these columns (flexible matching handles minor name differences):

| Column | Format / Notes |
|---|---|
| `date` | `DD/MM/YYYY` |
| `time` | `HH:mm` |
| `page` | `Homepage`, `Search Page`, `PDP`, `Company Page` |
| `url` | Full URL of the tested page |
| `device` | `mobile` or `desktop` |
| `Performance_Score` | 0–100 |
| `Accessibility_Score` | 0–100 |
| `Best_Practices_Score` | 0–100 |
| `LCP` | Milliseconds (displayed as seconds in UI) |
| `FCP` | Milliseconds (displayed as seconds in UI) |
| `TBT` | Milliseconds |
| `SI` | Milliseconds (Speed Index, displayed as seconds) |
| `CLS` | Unitless decimal |
| `Score_Reason` | JSON string: `[{ "reason": "...", "estimated_savings": "..." }]` |

---

## 8. Component Props Summary

| Component | Key Props |
|---|---|
| `MetricChart` | `definition: MetricDefinition`, `records: ProcessedRecord[]`, `theme` |
| `HeaderSummary` | `device`, `page`, `url`, `lastChecked`, `isMock`, `credentialsConfigured`, `errorMsg`, `theme` |
| `PerformanceIssues` | `reasons: ScoreReason[]`, `pageName`, `deviceName`, `theme` |
| `DeviceSelector` | `selected: DeviceType`, `onChange`, `theme` |
| `PageSelector` | `selected: PageType`, `onChange`, `theme` |
| `TimeRangeSelector` | `selected: TimeRangeType`, `onChange`, `theme` |
| `ThemeToggle` | `theme: 'dark' | 'light'`, `onToggle` |

---

## 9. Theme System

- **Two themes**: `light` (default on first load) and `dark`.
- **Implementation**: CSS custom properties in `globals.css` (`--background`, `--foreground`, `--primary-teal`, `--secondary-blue`) + `html.dark` class toggle.
- **Persistence**: `localStorage` key `PAGESPEED_DASHBOARD_THEME`.
- **No Tailwind `dark:` variant used** — the `theme` prop is passed explicitly from `page.tsx` down to every component. Components use `const isLight = theme === 'light'` and build class strings conditionally.
- **Light brand colours**: Teal `#1d8480` / `#166a67`, Navy `#2e3192`.
- **Dark brand colours**: `blue-600`, `indigo-600`, `emerald-600`.

---

## 10. Running Locally

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Test Google Sheets authentication manually
node test-gsheet.js
```

---

## 11. Conventions & Patterns

- **All components are client components** (`'use client'` at the top of every `.tsx` file).
- **Path alias**: `@/` → `src/` (set in `tsconfig.json`).
- **No `useEffect` for filtering** — all filtering is done with `useMemo` in `page.tsx`.
- **Metric time values are stored raw in ms** — UI formatters (in `MetricDefinition.formatValue`) divide by 1000 for display in seconds.
- **`getRawField()` in `lib/pagespeed.ts`** does fuzzy column matching: exact → case-insensitive → prefix (up to 10 chars). This handles Google Sheets truncating long column headers.
- **Chart dots**: only rendered when `chartData.length < 15`; hidden on dense datasets.
- **Error state**: rose-coloured banner replaces the chart grid. A separate amber banner in `HeaderSummary` shows non-fatal sheet connection warnings.
- **Loading state**: 6 skeleton pulse cards (matching the metric grid layout).
- **Session cache**: API response is stored in `sessionStorage` for the lifetime of the tab to avoid redundant fetches on navigation.

---

## 12. Architecture Notes & Gotchas

- **No database** — Google Sheets is the only data store.
- **No app-level auth** — this is an internal dashboard; no login required.
- **`generateFallbackDataset()`** in `lib/pagespeed.ts` exists but is **not called from `route.ts`**. If all Google Sheets strategies fail the API returns empty records + an error message. The mock data function was used historically.
- **`crested-lexicon-504317-s5-595755e4a777.json`** is the raw service account JSON key file. It is NOT read by the app directly — credentials are loaded from `.env.local`. It's a reference/backup copy.
- **`test-gsheet.js`** is a standalone debugging script; not part of the app, not imported anywhere.
- **`Accessibility_Score` and `Best_Practices_Score`** are stored in `ProcessedRecord` but are **not charted** on the dashboard (only the 6 METRICS in `page.tsx` are shown). They could be added.
- The `isMock` field in `PageSpeedApiResponse.meta` is always `false` in the current API route — it was a legacy flag from when mock data was returned.

---

*Last updated: August 2026*
