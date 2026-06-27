# SkyWeb Analytics Feature Tour

This guide is a product walkthrough for presenting SkyWeb Analytics as a portfolio project. It pairs the recommended demo path with the captured screenshot assets under `docs/assets/screenshots/`.

## Recommended Demo Path

### 1. Start at Macro Overview

**Route:** `/macro`  
**Screenshot:** `docs/assets/screenshots/01-macro-overview.png`

Show the user-facing macro entry point: curated signals, macro views, and high-level economic context.

### 2. Open Macro Dashboard

**Route:** `/dashboard`  
**Screenshot:** `docs/assets/screenshots/02-macro-dashboard.png`

Show the main cockpit: summary cards, dashboard blocks, reusable chart cards, saved content, and alert signal surfacing.

### 3. Drill into a Macro View

**Route example:** `/macro/views/rates-curve`  
**Screenshot:** `docs/assets/screenshots/03-macro-view-detail.png`

Show multi-series charting, macro lens storytelling, ECharts tooltips, selected-series controls, and row-level data exploration.

### 4. Drill into an Indicator

**Route example:** `/macro/indicators/FXUSDCAD`  
**Screenshot:** `docs/assets/screenshots/04-indicator-alert-overlays.png`

Show a single-indicator detail chart with alert threshold overlays, optional event markers, and clean indicator-only controls.

### 5. Show Alert Rules

**Route:** `/macro/alerts`  
**Screenshot:** `docs/assets/screenshots/05-alert-rules.png`

Show search/filter/sort, inline editing, cloning, evaluate action, severity/status treatment, and the open signal summary.

### 6. Show Signal Center

**Route:** `/macro/alerts/signals`  
**Screenshot:** `docs/assets/screenshots/06-signal-center.png`

Show notification lifecycle: open, acknowledged, dismissed, all history, bulk actions, and severity/status filtering.

### 7. Show Dashboard Builder

**Route:** `/dashboards`  
**Screenshot:** `docs/assets/screenshots/07-dashboard-builder.png`

Show member personalization: custom dashboards, saved views, direct indicator cards, and item configuration.

### 8. Show Account / Preferences

**Route:** `/account`  
**Screenshot:** `docs/assets/screenshots/08-account-preferences.png`

Show authenticated member profile and preference management without exposing sensitive values.

## Optional Supporting Screenshots

| Screenshot                      | Use Case                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `09-alert-preferences.png`      | Show alert-surfacing preferences, severity channels, quiet hours, and future delivery staging |
| `10-chart-tooltip.png`          | Show ECharts interaction polish and tooltip readability                                       |
| `11-dashboard-presentation.png` | Show presentation-mode dashboard storytelling                                                 |

## What to Emphasize While Presenting

- This is not a static dashboard; it has authenticated member state.
- Public macro data and private user dashboards coexist cleanly.
- Alerts have a full lifecycle: rules → evaluation → notifications → Signal Center → chart overlays.
- The C# API owns the analytics/member endpoints after cutover.
- SkyServer remains intentionally responsible for ingestion and alert evaluation execution.
- The chart architecture is reusable and ready for additional macro-specialty visuals.

## Five-Minute Demo Narrative

1. **Open with the dashboard:** “This is the macro cockpit: custom dashboard layout, chart cards, and live alert surfacing.”
2. **Drill into an indicator:** “The detail page exposes full time-series history with ECharts and alert threshold overlays.”
3. **Open a macro view:** “Curated macro lenses compare related series in one chart without losing row-level table access.”
4. **Show alert rules:** “Rules can be created, edited, cloned, evaluated, and tied back to indicator/view targets.”
5. **Show Signal Center:** “Triggered events become notifications with acknowledge/dismiss lifecycle and permanent history.”
6. **Close with architecture:** “The client is React/Vite, the analytics API is ASP.NET Core/C#, data is PostgreSQL, and SkyServer remains the Node.js control plane.”

## Visual Polish Checklist

Before using screenshots in public material, confirm:

- The screenshot shows a meaningful product state.
- Browser chrome, downloads, tokens, database values, or local secrets are not visible.
- At least one screenshot shows authenticated/member-only behavior.
- At least one screenshot shows ECharts charting clearly.
- At least one screenshot shows alert intelligence connected to charts or Signal Center.
- The image remains readable at GitHub README scale.

## Screenshot Inventory

The canonical file/status tracker lives in:

```text
docs/SkyWeb_Visual_Asset_Manifest.md
```

Screenshot folder notes live in:

```text
docs/assets/screenshots/README.md
```
