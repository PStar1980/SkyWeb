# SkyWeb Analytics Feature Tour

This guide is a product walkthrough and screenshot checklist for presenting SkyWeb Analytics as a portfolio project.

## Recommended Demo Path

### 1. Start at Macro Overview

**Route:** `/macro`

Show the user-facing macro entry point: curated signals, macro views, and high-level economic context.

Screenshot target:

```text
Macro Overview with triggered signal strip or curated macro cards visible.
```

### 2. Open Macro Dashboard

**Route:** `/dashboard`

Show the main cockpit: summary cards, visual dashboard elements, saved content, and alert signal surfacing.

Screenshot target:

```text
Dashboard with cards, charts, and signal summary visible.
```

### 3. Drill into a Macro View

**Route example:** `/macro/views/rates-curve`

Show multi-series charting and macro lens storytelling.

Screenshot target:

```text
Macro view detail page with ECharts multi-series chart and data table.
```

### 4. Drill into an Indicator

**Route example:** `/macro/indicators/FXUSDCAD`

Show a single-indicator detail chart with alert threshold overlays.

Screenshot target:

```text
Indicator detail page with threshold overlays enabled and clean metric controls.
```

### 5. Show Alert Rules

**Route:** `/macro/alerts`

Show search/filter/sort, edit mode, cloning, evaluate action, and severity/status treatment.

Screenshot target:

```text
Alert rules list with at least one active rule and severity visible.
```

### 6. Show Signal Center

**Route:** `/macro/alerts/signals`

Show notification lifecycle: open, acknowledged, dismissed, all history.

Screenshot target:

```text
Signal Center with filters and acknowledge/dismiss actions visible.
```

### 7. Show Dashboard Builder

**Route:** `/dashboards`

Show member personalization: custom dashboards, saved views, direct indicator cards, and item configuration.

Screenshot target:

```text
Dashboard builder with editable dashboard items.
```

### 8. Show Account / Preferences

**Route:** `/account`

Show authenticated member profile and preference management.

Screenshot target:

```text
Account page showing profile/preferences without sensitive values.
```

## Screenshot Naming Suggestions

```text
01-macro-overview.png
02-macro-dashboard.png
03-macro-view-rates-curve.png
04-indicator-alert-overlays.png
05-alert-rules.png
06-signal-center.png
07-dashboard-builder.png
08-account-preferences.png
```

## What to Emphasize While Presenting

- This is not a static dashboard; it has authenticated member state.
- Public macro data and private user dashboards coexist cleanly.
- Alerts have a full lifecycle: rules → evaluation → notifications → Signal Center → chart overlays.
- The C# API owns the analytics/member endpoints after cutover.
- SkyServer remains intentionally responsible for ingestion and alert evaluation execution.
- The chart architecture is reusable and ready for additional macro-specialty visuals.

## Visual Polish Checklist

Before capturing screenshots, confirm:

- Browser is at a comfortable width, ideally desktop/laptop size.
- The app is logged in for member-specific pages.
- At least one alert rule is active and has generated a signal.
- Indicator detail has threshold overlays enabled.
- Dashboard has at least one chart card and one saved-view card.
- Tables are not scrolled to awkward positions.
- No local database passwords, tokens, or dev-only errors are visible.

## Phase 9.2 Visual Asset Notes

The canonical screenshot capture instructions now live in:

```text
docs/SkyWeb_Screenshot_Capture_Guide.md
```

The screenshot file/status tracker now lives in:

```text
docs/SkyWeb_Visual_Asset_Manifest.md
```

Screenshots should be saved under:

```text
docs/assets/screenshots/
```

Keep the root README free of image links until the corresponding screenshot files exist.
