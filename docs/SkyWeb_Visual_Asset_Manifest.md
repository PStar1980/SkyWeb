# SkyWeb Visual Asset Manifest

This manifest defines the canonical screenshot and visual asset set for SkyWeb Analytics. It is intentionally separate from the README so visual polish can evolve without turning the root page into a storage closet with nice fonts.

## Asset Folder

```text
docs/assets/screenshots/
```

## Current Status

| Asset                             | Status   | README Candidate | Notes                                            |
| --------------------------------- | -------- | ---------------- | ------------------------------------------------ |
| `01-macro-overview.png`           | Planned  | Yes              | Macro entry point and public product context     |
| `02-macro-dashboard.png`          | Planned  | Yes              | Main cockpit and summary/chart surface           |
| `03-macro-view-detail.png`        | Planned  | Optional         | Multi-series macro lens detail                   |
| `04-indicator-alert-overlays.png` | Planned  | Yes              | Best proof of chart + alert integration          |
| `05-alert-rules.png`              | Planned  | Optional         | Shows rule management and severity/status logic  |
| `06-signal-center.png`            | Planned  | Yes              | Shows notification lifecycle and member workflow |
| `07-dashboard-builder.png`        | Planned  | Optional         | Shows personalization and custom dashboards      |
| `08-account-preferences.png`      | Planned  | Optional         | Shows authenticated profile/preferences layer    |
| `09-alert-preferences.png`        | Optional | No               | Future delivery-prep controls                    |
| `10-chart-tooltip.png`            | Optional | No               | Tooltip/detail polish shot                       |
| `11-dashboard-presentation.png`   | Optional | No               | Presentation mode if visually strong             |

## Recommended README Layout

Once screenshots exist, use a compact visual section in `README.md`:

```markdown
## Screenshots

| Macro Dashboard                                                    | Indicator Alert Overlays                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| ![Macro Dashboard](docs/assets/screenshots/02-macro-dashboard.png) | ![Indicator Alert Overlays](docs/assets/screenshots/04-indicator-alert-overlays.png) |

| Signal Center                                                  | Macro Overview                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| ![Signal Center](docs/assets/screenshots/06-signal-center.png) | ![Macro Overview](docs/assets/screenshots/01-macro-overview.png) |
```

Do not add those image links to the root README until the files actually exist. Broken image links look like the app tripped over its own shoelaces.

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
