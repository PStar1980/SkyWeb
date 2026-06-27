# SkyWeb Visual Asset Manifest

This manifest defines the canonical screenshot and visual asset set for SkyWeb Analytics. It supports README polish, GitHub presentation, LinkedIn/project writeups, and interview demos.

## Asset Folder

```text
docs/assets/screenshots/
```

## Current Status

| Asset                             | Status   | README Candidate | Notes                                        |
| --------------------------------- | -------- | ---------------- | -------------------------------------------- |
| `01-macro-overview.png`           | Captured | Optional         | Macro entry point and public product context |
| `02-macro-dashboard.png`          | Captured | Yes              | Main cockpit and summary/chart surface       |
| `03-macro-view-detail.png`        | Captured | Yes              | Multi-series macro lens detail               |
| `04-indicator-alert-overlays.png` | Captured | Yes              | Best proof of chart + alert integration      |
| `05-alert-rules.png`              | Captured | Optional         | Rule management and severity/status logic    |
| `06-signal-center.png`            | Captured | Yes              | Notification lifecycle and member workflow   |
| `07-dashboard-builder.png`        | Captured | Optional         | Personalization and custom dashboards        |
| `08-account-preferences.png`      | Captured | Optional         | Authenticated profile/preferences layer      |
| `09-alert-preferences.png`        | Captured | Optional         | Future delivery-prep controls                |
| `10-chart-tooltip.png`            | Captured | Optional         | Tooltip/detail polish shot                   |
| `11-dashboard-presentation.png`   | Captured | Optional         | Presentation mode and dashboard storytelling |

## README Usage

The root README currently uses a compact four-image gallery:

```text
02-macro-dashboard.png
04-indicator-alert-overlays.png
03-macro-view-detail.png
06-signal-center.png
```

This keeps the README visually strong without making it feel like a storage closet with markdown furniture. The remaining screenshots stay available for feature-tour, portfolio, and interview prep docs.

## Capture Quality Bar

A screenshot is ready when it meets all of these:

- It shows a meaningful state, not an empty/default page.
- It contains no local secrets or account-sensitive material.
- It is visually readable at GitHub README scale.
- It has a stable browser/app state with no hover artifacts unless the hover is intentional.
- It tells one clear product story.

## Asset Naming Rules

Use lowercase kebab-case filenames with numeric prefixes:

```text
01-macro-overview.png
02-macro-dashboard.png
03-macro-view-detail.png
```

Avoid spaces, timestamps, browser-export suffixes, and vague names like `screenshot-final-final2.png`.

## Related Career Assets

Phase 9.4 adds interview and recruiter-facing documents that use this screenshot set as supporting evidence:

```text
docs/SkyWeb_Interview_Talking_Points.md
docs/SkyWeb_Architecture_Decisions.md
docs/SkyWeb_Resume_Bullets.md
docs/SkyWeb_Recruiter_Brief.md
docs/SkyWeb_Demo_QA.md
```
