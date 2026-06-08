# SkyWeb Analytics Chart Strategy — Optimized for Post-.NET Migration

**Purpose:** Optimize the existing SkyWeb Analytics chart migration plan so it executes cleanly _after_ the SkyWeb .NET transition plan.

**Preceding plan:** `SkyWeb_DotNet_Transition_Plan.md`  
**Original chart plan:** `SkyWeb_Analytics_Chart_Strategy_Migration_Plan.md`  
**Optimized target:** React/Vite client + ASP.NET Core/C# API + PostgreSQL + Apache ECharts + D3 specialty visuals.

---

## 1. Executive Summary

The original chart strategy is still correct:

```text
Apache ECharts = primary production chart engine
D3.js           = specialty/custom visualization layer
```

However, because SkyWeb is now planned to move through a parallel `.NET` implementation first, the chart migration should **not** be performed inside the current legacy `apps/web` app unless needed for a temporary hotfix.

The optimized execution path is now underway:

```text
1. Complete the SkyWeb .NET transition first.
2. Stabilize apps/web-dotnet/SkyWeb.Api and apps/web-dotnet/SkyWeb.Client.
3. Migrate charting inside SkyWeb.Client, not the legacy apps/web app.
4. Use C# DTO/API contracts to produce chart-friendly JSON.
5. Add ECharts abstraction layer.
6. Replace current SVG sparkline/chart panels progressively.
7. Use D3 for specialty helpers once ECharts is stable.

DN-9.1 begins this work by replacing the copied `.NET-lane` `Sparkline.jsx` and `MultiSeriesSparkline.jsx` internals with ECharts renderers while keeping their existing public props stable for parent components. DN-9.2 then extracts that first pass into reusable chart architecture folders so future chart work can target stable ECharts components rather than page-level rendering code. DN-9.3 polishes the runtime and chart UX so the extracted components are safer under real dashboard/page conditions.
```

This avoids doing the same chart migration twice.

---

## 2. Key Adjustment From the Original Chart Plan

### Original assumption

The original chart migration assumed the current SkyWeb app remained the main app:

```text
React / Vite frontend
        ↓
Chart abstraction layer
        ↓
Node/Express API now
ASP.NET Core API proof-of-concept later
```

### Updated assumption after the .NET transition plan

The chart migration should target the new parallel .NET implementation:

```text
apps/web-dotnet/
  SkyWeb.Api/       ASP.NET Core / C# / PostgreSQL
  SkyWeb.Client/    React / Vite / ECharts / D3
```

Final target:

```text
Browser
  ↓
SkyWeb.Client
React / Vite / Apache ECharts / D3
  ↓ HTTP JSON
SkyWeb.Api
ASP.NET Core / C# / Dapper / PostgreSQL
  ↓
PostgreSQL
```

SkyServer remains Node.js and continues to own:

```text
- database migrations/seeds/build tooling
- ingestion
- worker/scheduler/listener runtime
- admin/control-plane APIs
- future Temporal orchestration
```

---

## 3. Current Chart Findings From the Existing SkyWeb Repo

The current SkyWeb frontend does **not** appear to use a third-party chart library yet.

Current `package.json` dependencies include React, Axios, Bootstrap, React Bootstrap, React Router, and Vite, but not:

```text
- echarts
- d3
- recharts
- chart.js
- react-chartjs
```

Current charting appears to be custom React/SVG components.

Important existing chart-related files:

```text
apps/web/src/components/Sparkline.jsx
apps/web/src/components/MultiSeriesSparkline.jsx
apps/web/src/components/ChartPanel.jsx
apps/web/src/components/DashboardItemVisualization.jsx
apps/web/src/components/MetricQuickCard.jsx
apps/web/src/components/TrendMetricCard.jsx
apps/web/src/utils/charting.js
apps/web/src/constants/dashboardModes.js
```

Current usage found:

```text
ChartPanel.jsx imports:
  Sparkline.jsx
  MultiSeriesSparkline.jsx

DashboardItemVisualization.jsx imports:
  Sparkline.jsx

Sparkline.jsx and MultiSeriesSparkline.jsx render SVG directly.
```

This is actually good news. The migration is not from one chart vendor to another. It is from **custom lightweight SVG sparklines** to a professional charting layer.

---

## 4. Optimized Strategic Decision

Do **not** migrate charts in legacy `apps/web` first.

Instead:

```text
Legacy apps/web:
  preserve as rollback baseline

New apps/web-dotnet/SkyWeb.Client:
  receive the ECharts/D3 migration
```

The chart migration becomes part of the portfolio-grade `.NET + React analytics application` proof-of-work.

---

## 5. Updated Folder Structure

Inside the new .NET implementation:

```text
apps/web-dotnet/
  SkyWeb.Api/
    Controllers/
    Services/
    Models/
    DTOs/
    Data/
    Program.cs
    appsettings.json

  SkyWeb.Client/
    src/
      components/
        charts/
          adapters/
            indicatorSeriesAdapter.js
            viewSeriesAdapter.js
            dashboardChartAdapter.js
            alertOverlayAdapter.js

          echarts/
            EChartBase.jsx
            MacroLineChart.jsx
            MultiSeriesMacroChart.jsx
            DashboardEChartCard.jsx
            AlertOverlayChart.jsx

          d3/
            YieldCurveVisualizer.jsx
            MacroRegimeMap.jsx
            RecessionTimeline.jsx
            CorrelationHeatmap.jsx

          shared/
            chartTheme.js
            chartOptions.js
            chartUtils.js
            chartTypes.js

      pages/
      services/
      utils/
```

Recommended naming change from the original plan:

```text
chartAdapters/ → adapters/
```

Reason: shorter path, still clear, and less visually noisy.

---

## 6. Important API Contract Principle

Because SkyWeb.Api will be built in C#, we should use this opportunity to return chart-friendly DTOs from the API.

The original chart plan relied heavily on frontend adapters because it assumed raw API responses might be inconsistent.

After the .NET migration, the cleaner approach is:

```text
C# API returns stable chart-friendly JSON.
React adapters normalize only small differences.
ECharts components receive predictable chart-ready objects.
```

### Recommended C# response shape for single indicator series

```json
{
  "indicatorCode": "CA_CPI_YOY",
  "title": "Canada CPI YoY",
  "subtitle": "Consumer Price Index, year-over-year",
  "unit": "%",
  "frequency": "Monthly",
  "source": "Statistics Canada",
  "latestValue": 2.9,
  "latestDate": "2026-05-01",
  "series": [
    { "date": "2024-01-01", "value": 3.1 },
    { "date": "2024-02-01", "value": 2.9 }
  ]
}
```

### Recommended C# response shape for multi-series charts

```json
{
  "title": "Inflation Comparison",
  "subtitle": "Canada vs United States",
  "unit": "%",
  "frequency": "Monthly",
  "series": [
    {
      "key": "CA_CPI_YOY",
      "name": "Canada CPI YoY",
      "data": [
        { "date": "2024-01-01", "value": 3.1 },
        { "date": "2024-02-01", "value": 2.9 }
      ]
    },
    {
      "key": "US_CPI_YOY",
      "name": "US CPI YoY",
      "data": [
        { "date": "2024-01-01", "value": 3.4 },
        { "date": "2024-02-01", "value": 3.2 }
      ]
    }
  ]
}
```

### Recommended C# response shape for alert overlays

```json
{
  "indicatorCode": "CA_UNEMPLOYMENT_RATE",
  "thresholds": [
    {
      "label": "Warning threshold",
      "operator": ">=",
      "value": 7.0,
      "severity": "warning"
    }
  ],
  "events": [
    {
      "date": "2026-04-01",
      "value": 7.1,
      "severity": "warning",
      "message": "Unemployment rate crossed threshold"
    }
  ]
}
```

This reduces chart-component complexity and makes the API itself more professional.

---

## 7. Revised Execution Order

The original chart plan had 13 phases. The optimized version compresses and reorders those phases around the .NET transition.

---

# Phase 0 — Preconditions After .NET Migration

## Goal

Do not start chart migration until the new `.NET + React` SkyWeb lane has a stable heartbeat.

## Required preconditions

```text
apps/web-dotnet/SkyWeb.Api builds successfully
apps/web-dotnet/SkyWeb.Client builds successfully
SkyWeb.Client can call SkyWeb.Api
At least one macro endpoint is working through C#
Authentication/session strategy is stable enough for authenticated pages
Legacy apps/web remains available as rollback reference
```

## Minimum endpoint heartbeat

```text
GET /api/health
GET /api/public/macro/indicators
GET /api/public/macro/indicators/{indicatorCode}/series
```

## Deliverable

```text
docs/SkyWeb_DotNet_Cutover_Baseline.md
```

Include:

```text
- current working .NET routes
- known gaps
- frontend pages confirmed working
- build/test commands
- rollback notes
```

---

# Phase 1 — Chart Audit in the New Client

## Goal

Confirm which chart-related legacy components were copied into `SkyWeb.Client` and where they are still used.

## Audit target

```text
apps/web-dotnet/SkyWeb.Client/src/
```

## Search terms

```text
Sparkline
MultiSeriesSparkline
ChartPanel
DashboardItemVisualization
svg
charting
trend
metric
```

## Expected current chart components

```text
components/Sparkline.jsx
components/MultiSeriesSparkline.jsx
components/ChartPanel.jsx
components/DashboardItemVisualization.jsx
components/MetricQuickCard.jsx
components/TrendMetricCard.jsx
utils/charting.js
```

## Deliverable

```text
docs/SkyWeb_Chart_Audit_PostDotNet.md
```

Include:

```text
Current chart components:
Pages/components using charts:
Current data shapes:
Current API routes used:
Replacement priority:
Migration risk:
```

---

# Phase 2 — Lock Chart API Contracts in C#

## Goal

Before building ECharts components, make sure the C# API returns stable chart-friendly data.

## Target API routes

Keep route names close to current SkyServer routes where possible:

```text
GET /api/public/macro/indicators/{indicatorCode}/series
GET /api/public/macro/views/{viewKey}
GET /api/public/macro/views/{viewKey}/columns
GET /api/skyweb/dashboards/{dashboardKey}
GET /api/skyweb/alerts/{alertKey}/events
```

## Recommended service layer

```text
SkyWeb.Api/
  DTOs/
    MacroSeriesDto.cs
    MultiSeriesChartDto.cs
    ChartPointDto.cs
    AlertOverlayDto.cs

  Services/
    MacroChartService.cs
    DashboardChartService.cs
    AlertOverlayService.cs
```

## Acceptance criteria

```text
- C# returns predictable date/value series data.
- Dates are ISO strings or consistently serialized DateTime values.
- Null values are allowed but explicit.
- Metadata is included with the series.
- React does not need to guess source/unit/frequency.
```

---

# Phase 3 — Install Apache ECharts in SkyWeb.Client

## Goal

Add the main chart engine only to the new client.

## Command

From the client project folder:

```powershell
cd apps/web-dotnet/SkyWeb.Client
npm install echarts echarts-for-react
```

If the new client still uses the root-level SkyWeb `package.json`, install from the appropriate package root and confirm `package-lock.json` updates in the correct location.

## Deliverable

```text
Root package.json updated
Root package-lock.json updated
apps/web-dotnet/SkyWeb.Client chart components migrated first
```

---

# Phase 4 — Build the ECharts Foundation

## Goal

Create reusable base components and shared chart defaults before touching pages.

## Files

```text
apps/web-dotnet/SkyWeb.Client/src/components/charts/echarts/EChartBase.jsx
apps/web-dotnet/SkyWeb.Client/src/components/charts/shared/chartTheme.js
apps/web-dotnet/SkyWeb.Client/src/components/charts/shared/chartOptions.js
apps/web-dotnet/SkyWeb.Client/src/components/charts/shared/chartUtils.js
```

## `EChartBase.jsx` responsibilities

```text
- Accept ECharts option object
- Responsive rendering
- Loading state
- Empty state
- Error state
- Height prop
- Shared theme defaults
- Safe no-data handling
```

## Acceptance criteria

```text
- One test page/component can render a simple line chart.
- Empty/loading/error states do not break layout.
- Component can be reused by higher-level charts.
```

---

# Phase 5 — Build MacroLineChart

## Goal

Replace the single-series custom SVG/Sparkline experience with a proper ECharts line chart.

## File

```text
apps/web-dotnet/SkyWeb.Client/src/components/charts/echarts/MacroLineChart.jsx
```

## Input contract

```js
{
  title,
  subtitle,
  unit,
  source,
  frequency,
  latestValue,
  latestDate,
  series: [
    { date, value }
  ]
}
```

## Features

```text
- date x-axis
- line series
- tooltip
- y-axis value formatting
- latest value display
- source/frequency metadata
- zoom support when chart is large enough
- dashboard compact mode
- detail-page full mode
```

## First migration target

```text
MacroIndicatorDetail.jsx
```

Reason: indicator detail is the cleanest place to prove a professional full-size chart before replacing dashboard cards.

---

# Phase 6 — Build MultiSeriesMacroChart

## Goal

Support comparison charts for macro views and future multi-indicator dashboards.

## File

```text
apps/web-dotnet/SkyWeb.Client/src/components/charts/echarts/MultiSeriesMacroChart.jsx
```

## Input contract

```js
{
  title,
  subtitle,
  unit,
  frequency,
  series: [
    {
      key,
      name,
      data: [{ date, value }]
    }
  ]
}
```

## Features

```text
- multiple line series
- legend toggle
- shared tooltip
- date zoom
- missing/null data handling
- optional normalization later
```

## First migration target

```text
ChartPanel.jsx
```

Current `ChartPanel.jsx` already chooses between `Sparkline` and `MultiSeriesSparkline`, so it is the natural adapter point.

---

# Phase 7 — Build Frontend Chart Adapters

## Goal

Keep page code clean while allowing C# API contracts to evolve carefully.

## Files

```text
apps/web-dotnet/SkyWeb.Client/src/components/charts/adapters/indicatorSeriesAdapter.js
apps/web-dotnet/SkyWeb.Client/src/components/charts/adapters/viewSeriesAdapter.js
apps/web-dotnet/SkyWeb.Client/src/components/charts/adapters/dashboardChartAdapter.js
apps/web-dotnet/SkyWeb.Client/src/components/charts/adapters/alertOverlayAdapter.js
```

## Important rule

Adapters should be thin.

They should not compensate for chaotic API contracts. The C# API should already return clean chart DTOs.

Adapter responsibilities:

```text
- ensure numeric values are numbers
- sort by date if needed
- remove impossible points if needed
- convert null/undefined consistently
- map API field names into chart component props
```

---

# Phase 8 — Migrate Dashboard Chart Cards

## Goal

Replace compact custom SVG cards with ECharts-backed dashboard visualizations while preserving dashboard behavior.

## Primary target files

```text
DashboardItemVisualization.jsx
MetricQuickCard.jsx
TrendMetricCard.jsx
DashboardViewer.jsx
DashboardBuilder.jsx
MemberDashboard.jsx
```

## Migration approach

```text
1. Add ECharts compact mode.
2. Keep old Sparkline as fallback.
3. Switch indicator cards first.
4. Switch view/multi-series cards second.
5. Remove fallback only after all dashboard cards are stable.
```

## Acceptance criteria

```text
- Existing dashboards still load.
- Saved/pinned dashboards still work.
- Cards remain visually stable.
- Small dashboard charts remain readable.
- Build/lint pass.
```

---

# Phase 9 — Add Alert Overlay Support

## Goal

Use the chart layer to make macro alerts visible and useful.

## File options

Preferred:

```text
apps/web-dotnet/SkyWeb.Client/src/components/charts/echarts/AlertOverlayChart.jsx
```

Or integrate into:

```text
MacroLineChart.jsx
MultiSeriesMacroChart.jsx
```

## Recommendation

Start by integrating overlay support into `MacroLineChart` and `MultiSeriesMacroChart` via optional props:

```js
thresholds = { thresholds };
events = { events };
```

Create `AlertOverlayChart.jsx` only if overlay logic becomes large.

## Overlay types

```text
- horizontal threshold line
- event marker dot
- shaded warning region
- tooltip annotation
- latest active alert marker
```

## API dependency

```text
GET /api/skyweb/alerts/{alertKey}/events
GET /api/skyweb/alert-notifications
```

## Acceptance criteria

```text
- Alert thresholds display clearly.
- Alert events display without clutter.
- Alerts can be toggled on/off if needed.
- Normal chart reading remains clean.
```

---

# Phase 10 — Add Chart Interaction Polish

## Goal

Make the chart layer feel like a macro analytics workstation.

## Priority features

```text
1. Tooltip formatting
2. Legend toggle
3. Zoom/dataZoom
4. Latest value display
5. Metadata display
6. Dashboard compact/detail mode split
7. Export image later
```

## Acceptance criteria

```text
- Detail charts feel analytical and spacious.
- Dashboard cards feel compact and clean.
- Users can inspect exact values.
- Users can zoom into specific periods.
- Metadata is available but not visually noisy.
```

---

# Phase 11 — Install D3 After ECharts Is Stable

## Goal

Use D3 only for visualizations that justify custom work.

## Command

```powershell
cd apps/web-dotnet/SkyWeb.Client
npm install d3
```

## Important rule

Do **not** use D3 for ordinary line charts.

Use D3 for signature visualizations such as:

```text
- Yield Curve Visualizer
- Macro Regime Map
- Recession Timeline
- Correlation Heatmap
- Central Bank Policy Path
```

## First recommended D3 feature

```text
YieldCurveVisualizer.jsx
```

Only start this when the required yield curve data exists or when a clearly mocked/demo dataset has been defined.

## Acceptance criteria

```text
- D3 logic stays isolated.
- D3 does not leak into normal page code.
- D3 visuals share the same theme rules.
- The visualization is impressive enough to justify the complexity.
```

---

# Phase 12 — Documentation and Portfolio Signal

## Goal

Turn the chart migration into visible career evidence.

## Docs to create/update

```text
docs/SkyWeb_Chart_Audit_PostDotNet.md
docs/SkyWeb_Chart_Architecture.md
docs/SkyWeb_ECharts_Migration.md
docs/SkyWeb_D3_Specialty_Visualizations.md
README.md
```

## README section

```text
Data Visualization Layer

SkyWeb Analytics uses React, ASP.NET Core, PostgreSQL, and Apache ECharts to provide interactive macroeconomic time-series dashboards, indicator detail charts, multi-series comparison views, zoomable trend analysis, and alert overlays. D3.js is reserved for specialized custom visualizations such as yield curve analysis, macro regime mapping, recession timelines, and correlation heatmaps.
```

## Resume bullet later

```text
Designed and implemented an interactive macroeconomic analytics layer using React, ASP.NET Core, C#, PostgreSQL, and Apache ECharts, supporting time-series dashboards, multi-indicator comparison, and alert overlays, with D3.js planned for specialized financial visualizations.
```

---

## DN-9.2 Implementation Note — Chart Architecture Extraction

DN-9.2 formalizes the chart layer added in DN-9.1. The copied `.NET-lane` client now has a dedicated chart architecture folder:

```text
apps/web-dotnet/SkyWeb.Client/src/components/charts/
  adapters/
    alertOverlayAdapter.js
    dashboardChartAdapter.js
    indicatorSeriesAdapter.js
    viewSeriesAdapter.js
  echarts/
    EChartBase.jsx
    MacroLineChart.jsx
    MultiSeriesMacroChart.jsx
  shared/
    chartOptions.js
    chartTheme.js
    chartTypes.js
    chartUtils.js
```

The legacy-compatible wrappers remain:

```text
components/Sparkline.jsx
components/MultiSeriesSparkline.jsx
```

Those wrappers now delegate to the reusable ECharts components. This keeps the current pages stable while allowing the next DN-9 passes to target the new chart layer directly.

---

## 8. Optimized Final Execution Checklist

```text
[ ] Complete SkyWeb .NET transition baseline.
[ ] Confirm SkyWeb.Api + SkyWeb.Client build successfully.
[ ] Confirm C# API returns one working macro series.
[x] Audit copied chart components in SkyWeb.Client.
[ ] Define chart DTOs in SkyWeb.Api.
[x] Install echarts and d3 in SkyWeb.Client.
[x] Create EChartBase.
[x] Create shared chart theme/options/utils.
[x] Create MacroLineChart.
[x] Preserve MacroIndicatorDetail through existing ChartPanel wrapper.
[x] Create MultiSeriesMacroChart.
[x] Preserve ChartPanel through Sparkline/MultiSeriesSparkline compatibility wrappers.
[x] Add thin frontend adapters.
[ ] Migrate DashboardItemVisualization and dashboard cards.
[ ] Add alert overlays.
[ ] Add chart interaction polish.
[ ] Install D3 only after ECharts is stable.
[ ] Build YieldCurveVisualizer or first D3 signature visual.
[ ] Update documentation and README.
[ ] Capture screenshots for portfolio/demo deck.
```

---

## 9. What Not to Do

```text
Do not migrate charts inside legacy apps/web unless absolutely necessary.
Do not introduce D3 before ECharts is stable.
Do not add GraphQL during the chart migration.
Do not rewrite all dashboard logic at once.
Do not make page components directly depend on raw ECharts option objects.
Do not let C# API contracts become inconsistent and rely on frontend adapters to clean everything.
Do not remove Sparkline/MultiSeriesSparkline until ECharts replacements are fully tested.
```

---

## 10. Final Architecture Direction

```text
SkyServer
  Node.js / Express / React Admin / PostgreSQL tooling
  Worker + Scheduler + Listener
  Future Temporal orchestration

SkyWeb Analytics
  apps/web-dotnet/SkyWeb.Api
    ASP.NET Core / C# / Dapper / PostgreSQL

  apps/web-dotnet/SkyWeb.Client
    React / Vite
    Apache ECharts primary chart layer
    D3 specialty visualization layer
```

This creates the strongest portfolio signal:

```text
React + ASP.NET Core + C# + PostgreSQL + professional analytics charts + future Temporal automation
```

That is a much sharper career artifact than a standalone chart upgrade inside the old Node-oriented frontend.

---

## 11. Strategic Conclusion

The chart strategy remains strong, but its timing and target should change.

The optimized decision is:

```text
Finish the .NET migration first.
Then perform the ECharts/D3 migration inside SkyWeb.Client.
Use C# API DTOs to make chart data clean at the source.
Keep the old custom SVG chart components temporarily as fallback.
Migrate detail charts first, dashboard cards second, alert overlays third, D3 specialty visuals last.
```

This gives SkyWeb Analytics a clean professional evolution:

```text
working React app
→ parallel ASP.NET Core/C# migration
→ professional ECharts macro visualization layer
→ D3 specialty visuals
→ portfolio-grade analytics workstation
```

The goal is not merely prettier charts.

The goal is a coherent macro analytics platform that proves full-stack capability across React, C#, PostgreSQL, visualization architecture, API design, and practical product judgment.

---

## DN-9.3 Update — Runtime and UX Polish

DN-9.3 focuses on production feel rather than new chart families:

- `EChartBase.jsx` now initializes only when a renderable chart container exists, resizes through `ResizeObserver`, falls back to window resize when needed, and displays readable chart-runtime errors.
- `Sparkline.jsx` and `MultiSeriesSparkline.jsx` now pass through `loading`, `error`, and `emptyMessage` props to the ECharts layer.
- `chartUtils.js` centralizes tooltip filtering, adaptive date-axis labels, compact numeric axis labels, dense-series symbol visibility, and value-range handling.
- `chartOptions.js` standardizes dashed axis pointers, tooltip rendering, zero lines, latest-point emphasis, precision-grid behavior, and hidden internal legends.
- `App.css` adds chart state styling for loading, empty, and unavailable chart surfaces.

This keeps the current dashboard, indicator detail, and macro-view pages stable while making the chart core safer for future specialty visuals.
