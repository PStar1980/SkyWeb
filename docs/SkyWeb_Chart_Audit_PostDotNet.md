# SkyWeb Chart Audit — Post-.NET Lane

**Audit slice:** DN-9.4 — Alert Overlays and Chart Annotations  
**Target client:** `apps/web-dotnet/SkyWeb.Client`

## Current Chart Components

```text
components/Sparkline.jsx
components/MultiSeriesSparkline.jsx
components/ChartPanel.jsx
components/DashboardItemVisualization.jsx
components/MetricQuickCard.jsx
components/TrendMetricCard.jsx
utils/charting.js
```

DN-9.1 replaced the copied SVG internals of `Sparkline` and `MultiSeriesSparkline` with ECharts. DN-9.2 extracted that implementation into reusable chart architecture modules. DN-9.3 hardens the runtime wrapper and normalizes chart states, tooltips, axis labels, dense-series symbol behavior, and value formatting.

## New Chart Architecture

```text
components/charts/
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

## Pages and Components Using Charts

```text
MacroIndicatorDetail.jsx
MacroViewDetail.jsx
MemberDashboard.jsx
DashboardViewer.jsx
DashboardBuilder.jsx
DashboardItemVisualization.jsx
ChartPanel.jsx
MetricQuickCard.jsx
TrendMetricCard.jsx
```

## Current Data Shapes

Indicator series rows:

```json
{ "date": "2026-05-29", "value": 4.27 }
```

Macro view rows:

```json
{ "date": "2026-05-29", "yield7y": 4.27, "yield10y": 4.45 }
```

Dashboard item payloads can reference direct indicators or saved macro views. The current chart wrappers normalize these rows into chart points before reaching ECharts.

## Replacement Priority

1. Keep `Sparkline` and `MultiSeriesSparkline` as compatibility wrappers.
2. Use `MacroLineChart` directly on future single-indicator detail work.
3. Use `MultiSeriesMacroChart` directly for future analytical lens pages.
4. Use adapters for dashboard and alert overlay work.
5. Reserve D3-specific files for specialty visualizations after ECharts is fully stable.

## Migration Risk

Low-to-medium. The main risk is changing chart component props used across dashboard and detail pages. DN-9.2 avoids that by preserving wrapper APIs and moving reusable logic underneath them.

## DN-9.3 Notes

- Chart wrappers remain stable compatibility shims.
- The ECharts base component now owns runtime-state display for loading, empty, and chart-render errors.
- Axis labels thin automatically on long histories, while tooltip labels keep the full point context.
- Dense precision charts suppress point symbols to prevent visual noise, but hover/crosshair behavior remains active.
- Dashboard mini charts, indicator detail charts, and macro-view multi-series charts all share the same option and theme utilities.

## DN-9.4 Notes

The chart layer now accepts alert overlay payloads without forcing page-level chart rewrites. `ChartPanel` filters overlays to the currently selected indicator metric or selected macro-view series and passes only visible overlays into the ECharts wrappers. The reusable option builders render threshold lines and alert event markers, while mini dashboard charts remain clean by design.
