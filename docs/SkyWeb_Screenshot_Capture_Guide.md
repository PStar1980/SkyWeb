# SkyWeb Screenshot Capture Guide

This guide turns the working SkyWeb Analytics app into a consistent screenshot set for README, GitHub, LinkedIn, interview prep, and demo material.

## Goal

Create a small, polished screenshot set that shows the product breadth without overwhelming the viewer.

The screenshots should prove four things quickly:

1. SkyWeb is a real full-stack analytics application, not a static mockup.
2. The interface supports macro exploration, personalized dashboards, alerts, and signal workflows.
3. The chart layer is polished and integrated with alert intelligence.
4. The ASP.NET Core / C# migration produced a coherent product surface.

## Capture Setup

Recommended setup before capture:

```text
Browser: Edge or Chrome
Viewport: 1440px wide or similar desktop size
Zoom: 100%
Theme: existing SkyWeb dark theme
Client: http://localhost:5175
API: http://localhost:7280
SkyServer: running for alert evaluation support
```

Before capturing:

- Log in as a seeded/test SkyWeb user.
- Make sure no password, token, connection string, or browser profile detail is visible.
- Keep browser UI minimal; app-only cropped images are preferred.
- Use realistic but non-sensitive data.
- Make sure at least one alert rule has triggered so Signal Center and overlays have something meaningful to show.
- Keep charts in a stable hover-free state unless deliberately capturing tooltip behavior.

## Canonical Screenshot Set

|   # | Filename                          | Route                                             | Purpose                                                  |
| --: | --------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
|  01 | `01-macro-overview.png`           | `/macro`                                          | Public macro entry point and curated macro lens surface  |
|  02 | `02-macro-dashboard.png`          | `/dashboard`                                      | Main macro cockpit with summary cards and chart previews |
|  03 | `03-macro-view-detail.png`        | `/macro/views/rates-curve` or another strong view | Multi-series macro chart and table detail                |
|  04 | `04-indicator-alert-overlays.png` | `/macro/indicators/FXUSDCAD`                      | Indicator detail with alert threshold overlays visible   |
|  05 | `05-alert-rules.png`              | `/macro/alerts`                                   | Alert-rule cockpit: search/filter/edit/clone/evaluate    |
|  06 | `06-signal-center.png`            | `/macro/alerts/signals`                           | Notification lifecycle and Signal Center filters/actions |
|  07 | `07-dashboard-builder.png`        | `/dashboards`                                     | Personalized dashboard builder and item management       |
|  08 | `08-account-preferences.png`      | `/account`                                        | Authenticated profile/preferences surface                |

Save screenshots under:

```text
docs/assets/screenshots/
```

## Optional Detail Shots

Use these only if README or LinkedIn space allows:

| Filename                        | Route                                      | Purpose                                                  |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| `09-alert-preferences.png`      | `/macro/alerts/preferences`                | Alert preference controls and future delivery-prep story |
| `10-chart-tooltip.png`          | indicator/detail chart                     | ECharts tooltip polish and latest-value treatment        |
| `11-dashboard-presentation.png` | dashboard presentation route if configured | Portfolio-friendly dashboard display mode                |

## Crop Guidance

Good screenshots should show product value quickly.

Use these rules:

- Prefer full app viewport captures for overview/dashboard pages.
- Prefer chart-section crops for indicator/view pages if the full page is too tall.
- Avoid capturing empty whitespace below tables.
- Avoid half-open dropdowns unless the dropdown itself is the feature.
- Avoid dev overlays, console errors, or browser downloads bars.

## Privacy Checklist

Before committing screenshots, verify:

```text
No passwords visible
No bearer/session tokens visible
No local filesystem paths visible
No PostgreSQL connection strings visible
No private browser profile/account info visible
No accidental terminal windows visible
No personally sensitive user data visible
```

## README Priority

Use only the strongest 4 screenshots in the public README:

```text
01-macro-overview.png
02-macro-dashboard.png
04-indicator-alert-overlays.png
06-signal-center.png
```

Keep the full screenshot set available in the docs folder for deeper review.
