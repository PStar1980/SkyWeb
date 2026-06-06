# SkyWeb Analytics Chart Strategy Migration Plan

## Objective

Upgrade SkyWeb Analytics’ charting system into a professional macroeconomic visualization layer that supports high-quality time-series analysis, multi-indicator comparison, dashboard chart cards, event overlays, alerts, and eventually specialized custom visualizations.

The target strategy is:

```text
Primary chart engine:
Apache ECharts

Specialized/custom visualization engine:
D3.js

Current chart system:
Preserve temporarily, then migrate behind a reusable chart abstraction layer.
```

---

## Strategic Rationale

SkyWeb Analytics is evolving into a macroeconomic analytics workstation, not a generic dashboard app. The charting layer should support:

- professional macroeconomic time-series analysis
- multi-series comparison across indicators
- dashboard-ready chart cards
- zooming, tooltips, legends, and metadata
- future macro alert overlays
- future custom visuals such as yield curves, regime maps, recession timelines, and correlation heatmaps
- free/open-source tooling suitable for portfolio, personal, and possible published use

The preferred approach is:

```text
Apache ECharts = main production chart engine
D3.js = specialty visualization layer for custom high-impact visuals
```

This balances visual quality, flexibility, development velocity, professional credibility, and long-term customization.

---

# Phase 1 — Confirm Current Chart Implementation

## Goal

Identify the current charting method/library used in SkyWeb before making changes.

## Tasks

1. Inspect `package.json`.
2. Identify whether the project currently uses:
   - Recharts
   - Chart.js
   - D3
   - ECharts
   - custom SVG/React chart components
   - another chart package
3. Search the repo for chart-related imports:
   - `recharts`
   - `chart.js`
   - `react-chartjs`
   - `echarts`
   - `d3`
   - `LineChart`
   - `AreaChart`
   - `ResponsiveContainer`
   - `svg`
4. Document all current chart components and where they are used.

## Deliverable

Create:

```text
docs/SkyWeb_Chart_Audit.md
```

Include:

```text
Current chart library:
Current chart components:
Pages using charts:
Data format expected by current charts:
Known limitations:
Migration risk:
```

---

# Phase 2 — Define SkyWeb Chart Architecture

## Goal

Prevent chart logic from being scattered across pages.

All chart rendering should go through a reusable internal chart layer.

## Proposed Folder Structure

```text
src/
  components/
    charts/
      chartAdapters/
        macroSeriesAdapter.js
        indicatorSeriesAdapter.js
        viewSeriesAdapter.js

      echarts/
        EChartBase.jsx
        MacroLineChart.jsx
        MultiSeriesMacroChart.jsx
        DashboardChartCard.jsx
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
```

## Key Principle

Pages should not directly know the chart engine.

Pages should call reusable chart components like:

```jsx
<MacroLineChart data={seriesData} />
<MultiSeriesMacroChart series={multiSeriesData} />
<DashboardChartCard card={dashboardCard} />
```

Pages should not contain raw chart-engine code everywhere.

## Deliverable

Create:

```text
docs/SkyWeb_Chart_Architecture.md
```

---

# Phase 3 — Install Apache ECharts

## Goal

Add ECharts as the main chart engine.

## Install Command

From the SkyWeb root:

```powershell
npm install echarts echarts-for-react
```

## Notes

Use `echarts-for-react` initially because it provides a clean React wrapper around ECharts.

Later, if deeper control is needed, raw ECharts can be used directly inside controlled wrapper components.

## Deliverable

Updated:

```text
package.json
package-lock.json
```

---

# Phase 4 — Create Base ECharts Component

## Goal

Create a reusable wrapper so all ECharts charts share consistent sizing, loading behavior, theme settings, and error handling.

## Component

```text
src/components/charts/echarts/EChartBase.jsx
```

## Responsibilities

- Accept an ECharts option object
- Render chart responsively
- Support loading state
- Support empty state
- Support error state
- Apply shared theme defaults
- Expose optional `height` prop

## Example Usage

```jsx
<EChartBase option={option} height={420} loading={loading} error={error} />
```

## Acceptance Criteria

- One working base chart component exists.
- It can render a simple ECharts line chart.
- It handles loading, empty, and error states consistently.
- It can be reused by higher-level chart components.

---

# Phase 5 — Build Macro Line Chart Component

## Goal

Replace or supplement the current single-indicator line chart with an ECharts-powered macro line chart.

## Component

```text
src/components/charts/echarts/MacroLineChart.jsx
```

## Inputs

```js
{
  title,
  subtitle,
  data,
  xKey: "date",
  yKey: "value",
  unit,
  source,
  frequency
}
```

## Required Features

- Date-based x-axis
- Single line series
- Tooltip showing date and value
- Y-axis formatting
- Responsive resizing
- Optional latest value display
- Empty state
- Loading state

## Acceptance Criteria

- One existing indicator chart can be rendered using ECharts.
- Chart looks at least as good as the current implementation.
- No existing dashboard functionality is broken.
- The component is reusable on detail pages and dashboard cards.

---

# Phase 6 — Build Multi-Series Macro Chart Component

## Goal

Support comparison of multiple indicators or multiple columns from a view.

## Component

```text
src/components/charts/echarts/MultiSeriesMacroChart.jsx
```

## Inputs

```js
{
  title,
  series: [
    {
      name: "Canada CPI",
      data: [{ date, value }]
    },
    {
      name: "US CPI",
      data: [{ date, value }]
    }
  ],
  unit,
  dateRange,
  frequency
}
```

## Required Features

- Multiple line series
- Legend
- Tooltip for all visible series
- Toggle series visibility
- Zoom / `dataZoom` support
- Date range support
- Missing value handling
- Optional normalization mode later

## Acceptance Criteria

- Multiple indicators can be compared on one chart.
- Legend works.
- Tooltip clearly shows each series.
- Chart remains readable on dashboard and detail pages.
- Missing/null data does not break the chart.

---

# Phase 7 — Build Chart Data Adapters

## Goal

Separate raw API response formats from chart rendering formats.

## Adapter Files

```text
src/components/charts/chartAdapters/indicatorSeriesAdapter.js
src/components/charts/chartAdapters/viewSeriesAdapter.js
src/components/charts/chartAdapters/macroSeriesAdapter.js
```

## Purpose

Convert raw API data into a consistent chart-ready structure.

## Example Output

```js
{
  title: "Inflation Comparison",
  series: [
    {
      name: "Canada CPI YoY",
      data: [
        { date: "2024-01-01", value: 3.1 },
        { date: "2024-02-01", value: 2.9 }
      ]
    }
  ]
}
```

## Acceptance Criteria

- Chart components do not need to know raw API response details.
- Data transformation is centralized.
- Future chart engines can reuse the same adapter output.
- Dashboard/detail pages receive predictable chart-ready objects.

---

# Phase 8 — Migrate Dashboard Chart Cards

## Goal

Use ECharts for dashboard chart cards while preserving existing dashboard functionality.

## Target Components

Exact files to confirm during repo review, but likely candidates include:

```text
DashboardChartCard.jsx
MacroDashboard.jsx
CustomDashboard.jsx
DashboardView.jsx
```

## Requirements

- Indicator-based dashboard cards use `MacroLineChart`.
- View-based dashboard cards can eventually use `MultiSeriesMacroChart`.
- Existing dashboard card layout remains stable.
- Existing saved dashboards do not break.
- Old chart component remains available temporarily as fallback if needed.

## Acceptance Criteria

- Existing dashboards still load.
- Indicator chart cards render with ECharts.
- Card sizing is consistent.
- Dashboard layout remains visually stable.
- Migration does not break saved/pinned dashboard behavior.

---

# Phase 9 — Add Chart Interaction Features

## Goal

Make charts feel like a serious macro analytics workstation.

## Features

Initial priority:

```text
1. Tooltip
2. Legend
3. Zoom
4. Latest value
5. Metadata
```

Later:

```text
6. Event overlays
7. Alert markers
8. Export image
```

## Acceptance Criteria

- Users can hover for precise values.
- Users can toggle series visibility.
- Users can zoom into a time range.
- Latest value is visible where appropriate.
- Source/frequency metadata is available without cluttering the chart.

---

# Phase 10 — Add Alert Overlay Support

## Goal

Prepare charts for Phase 8 macro alerts.

## Feature Types

- Horizontal threshold line
- Alert marker dot
- Shaded warning region
- Tooltip annotation
- Event marker on the timeline

## Component Strategy

Either create:

```text
src/components/charts/echarts/AlertOverlayChart.jsx
```

Or integrate overlay support into:

```text
MacroLineChart.jsx
MultiSeriesMacroChart.jsx
```

## Acceptance Criteria

- Alert events can be displayed on charts.
- Thresholds are visually clear.
- Alerts do not clutter normal chart use.
- Overlay behavior works for both single-series and multi-series charts where applicable.

---

# Phase 11 — Add D3 as Specialty Visualization Layer

## Goal

Use D3 only where it provides visible custom advantage.

## Install Command

From the SkyWeb root:

```powershell
npm install d3
```

## Initial D3 Candidates

Do **not** use D3 for ordinary line charts first.

Use it later for signature visuals such as:

```text
1. Yield Curve Visualizer
2. Macro Regime Map
3. Recession Timeline
4. Correlation Heatmap
5. Central Bank Policy Path
```

## First Recommended D3 Component

```text
YieldCurveVisualizer.jsx
```

## Why Yield Curve First?

A yield curve visual is highly relevant to macroeconomic analysis, visually distinctive, and impressive in a portfolio/demo setting.

It can become a signature feature of SkyWeb Analytics.

## Acceptance Criteria

- D3 is used only in isolated components.
- D3 does not replace the main chart engine.
- D3 components use the same chart theme rules.
- D3 components are impressive enough to justify the added complexity.
- D3 does not leak scattered logic across the application.

---

# Phase 12 — Chart Theme and Visual Identity

## Goal

Make all charts look like one coherent product.

## File

```text
src/components/charts/shared/chartTheme.js
```

## Include

- Font sizes
- Axis styling
- Gridline rules
- Tooltip styling
- Legend placement
- Dashboard chart height defaults
- Detail chart height defaults
- Colour palette rules
- Time-series axis conventions
- Loading/empty/error state styling

## Important Rule

Avoid random chart styling per page.

The chart layer should feel unified.

## Acceptance Criteria

- All charts share a consistent visual identity.
- Dashboard cards feel compact.
- Detail charts feel analytical and spacious.
- Charts match the SkyWeb Analytics workstation style.
- Future chart components can reuse the same visual standards.

---

# Phase 13 — Documentation and Resume Signal

## Goal

Turn the chart upgrade into career evidence.

## Documentation Files

```text
docs/SkyWeb_Chart_Architecture.md
docs/SkyWeb_ECharts_Migration.md
docs/SkyWeb_D3_Specialty_Visualizations.md
```

## README Update

Add a section:

```text
Data Visualization Layer

SkyWeb Analytics uses Apache ECharts for interactive macroeconomic time-series dashboards, multi-indicator comparison charts, zoomable trend analysis, and alert overlays. D3.js is planned for specialized custom visualizations such as yield curve analysis, macro regime mapping, recession timelines, and correlation heatmaps.
```

## Resume Bullet Later

```text
Designed and implemented an interactive macroeconomic charting layer using React, Apache ECharts, and PostgreSQL-backed time-series data, with planned D3.js specialty visualizations for advanced financial analysis.
```

---

# Recommended Execution Order

```text
1. Audit current chart implementation
2. Create chart architecture document
3. Install Apache ECharts
4. Build EChartBase
5. Build MacroLineChart
6. Build MultiSeriesMacroChart
7. Add chart data adapters
8. Migrate dashboard chart cards
9. Add tooltip / legend / zoom / metadata
10. Add alert overlay support
11. Install D3
12. Build first specialty D3 visualization
13. Document chart architecture and update README
```

---

# Strategic Decision

## Main Engine

```text
Apache ECharts
```

Use for:

- dashboard chart cards
- single-indicator line charts
- multi-series comparison charts
- macro view charts
- alert overlays
- zoomable time-series analysis

## Specialty Engine

```text
D3.js
```

Use for:

- custom yield curve visualizations
- macro regime maps
- correlation heatmaps
- custom timelines
- highly bespoke interactive visualizations

## Avoid for Now

```text
Highcharts
```

Reason:

```text
Excellent enterprise product, but commercial licensing may become an issue if SkyWeb is published or monetized.
```

---

# Final Architecture Direction

```text
React / Vite frontend
        ↓
SkyWeb chart abstraction layer
        ↓
Apache ECharts for primary charts
D3.js for specialty visualizations
        ↓
Node/Express API now
ASP.NET Core API proof-of-concept later
        ↓
PostgreSQL / future time-series optimization
```

This gives SkyWeb Analytics the best blend of:

- visual quality
- macro analytics power
- professional credibility
- free/open-source tooling
- enterprise relevance
- future customization
- portfolio/demo impact

---

# Prioritization Note

This migration should be considered before final SkyWeb documentation and before creating the PowerPoint/demo screenshots if time allows.

Reason:

```text
The chart layer is one of the most visible and professionally impressive parts of SkyWeb Analytics.
```

If Apache ECharts can be migrated cleanly before the presentation screenshots, the final deck will look significantly stronger.

However, this should not block the current SkyWeb phase unless the current chart layer is limiting the planned macro alerts or dashboard experience.

Recommended decision point:

```text
After current SkyWeb Phase 8 macro alert work:
- If chart limitations are obvious, migrate to ECharts before documentation/deck.
- If current charts are acceptable, finish Phase 9 docs first, then schedule ECharts/D3 as a visual upgrade phase.
```

---

# Working Philosophy

This chart migration follows the broader SkyWeb development method:

```text
Discuss architecture
→ make decisions
→ reprioritize
→ implement
→ test
→ refine
→ test again
→ ship when satisfactory
```

The goal is not just to add a chart library.

The goal is to create a professional, extensible, macroeconomic visualization layer worthy of the SkyWeb Analytics vision.
