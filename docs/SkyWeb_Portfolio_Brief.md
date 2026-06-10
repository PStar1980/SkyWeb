# SkyWeb Analytics Portfolio Brief

**SkyWeb Analytics** is a full-stack macroeconomic analytics platform built as the public/member-facing layer of the Sky ecosystem. It combines a React/Vite user interface, an ASP.NET Core/C# API, PostgreSQL-backed macro data, member dashboards, alert rules, signal notifications, and an Apache ECharts/D3 visualization layer.

The project demonstrates a practical transition from a Node-backed prototype/client stack into a dedicated C# analytics API while preserving SkyServer as the operational control plane for ingestion, automation, and alert evaluation.

## One-Sentence Portfolio Pitch

SkyWeb Analytics is a React + ASP.NET Core + PostgreSQL macro analytics platform with authenticated member dashboards, saved views, alert rules, signal center workflows, and ECharts/D3 charting over live economic indicators.

## What This Project Demonstrates

| Area                    | Proof Point                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Full-stack architecture | React/Vite client backed by ASP.NET Core/C# API                                                 |
| Data access             | Dapper + Npgsql queries over PostgreSQL macro and member schemas                                |
| Authentication          | App-scoped login, opaque bearer tokens, hashed sessions, permission-aware endpoints             |
| Product design          | Public macro exploration plus protected member personalization                                  |
| Analytics UX            | Dashboards, curated macro views, indicator details, chart overlays, and alert signals           |
| Visualization           | Apache ECharts runtime with D3 helpers for ranges, ticks, formatting, and data adaptation       |
| Migration discipline    | Parallel .NET lane, route-family migration, proxy bridge, validation, and safe cutover          |
| System boundary design  | SkyWeb owns analytics/member presentation; SkyServer owns ingestion, automation, and evaluation |

## Current Architecture

```text
Browser
  ↓
SkyWeb.Client
  React / Vite / React Router / Bootstrap / ECharts / D3
  ↓ /api
SkyWeb.Api
  ASP.NET Core / C# / Dapper / Npgsql / Swagger
  ↓
PostgreSQL
  macro schema + skyweb schema + auth schema

SkyServer
  Node.js control plane for ingestion, workers, schedulers, tools, repo utilities, and alert evaluation
```

## Active Route Ownership

| Route Family                        | Owner      | Notes                                                      |
| ----------------------------------- | ---------- | ---------------------------------------------------------- |
| `/api/public/macro/*`               | SkyWeb.Api | Native C# public macro reads                               |
| `/api/auth/*`                       | SkyWeb.Api | Native C# auth/session endpoints                           |
| `/api/skyweb/profile/*`             | SkyWeb.Api | Native C# profile endpoints                                |
| `/api/skyweb/preferences/*`         | SkyWeb.Api | Native C# preference endpoints                             |
| `/api/skyweb/saved-views/*`         | SkyWeb.Api | Native C# saved macro views                                |
| `/api/skyweb/dashboards/*`          | SkyWeb.Api | Native C# custom dashboards and dashboard items            |
| `/api/skyweb/alerts/*`              | SkyWeb.Api | Native C# alert-rule reads/writes and event history        |
| `/api/skyweb/alert-notifications/*` | SkyWeb.Api | Native C# Signal Center workflows                          |
| Alert evaluation execution          | SkyServer  | Intentionally retained in the control-plane/evaluator lane |

## Product Surfaces

- **Macro Overview** — curated economic snapshot and narrative entry point.
- **Macro Dashboard** — member-focused dashboard cockpit with cards, charts, signals, and saved content.
- **Macro Views** — curated multi-indicator lenses such as rates, inflation, labor, or FX-oriented views.
- **Indicator Details** — single-indicator drilldown with ECharts line chart, alert overlays, and time-series table.
- **Saved Views** — user-specific saved macro lenses.
- **Dashboard Builder** — custom dashboard creation and item management.
- **Alert Rules** — threshold rules with severity, status, evaluation history, clone/edit/delete flows.
- **Signal Center** — open, acknowledged, dismissed, and historical alert notifications.
- **Alert Preferences** — in-app signal preferences, severity lanes, delivery prep, and quiet-hour staging.
- **Account/Profile** — authenticated profile and preference management.

## Technical Stack

| Layer         | Technology                                                               |
| ------------- | ------------------------------------------------------------------------ |
| Client        | React, Vite, React Router, Bootstrap, Axios                              |
| Charts        | Apache ECharts, D3 helpers                                               |
| API           | ASP.NET Core / C#                                                        |
| Data access   | Dapper, Npgsql                                                           |
| Database      | PostgreSQL                                                               |
| Auth          | Opaque bearer tokens, SHA-256 token hashes, BCrypt password verification |
| Control plane | SkyServer Node.js APIs, ingestion scripts, workers, repo tooling         |

## Interview-Friendly Talking Points

1. **The migration was incremental, not reckless.** The .NET lane was built beside the existing app, route families were migrated one at a time, and the temporary proxy bridge allowed testing before cutover.
2. **The system has clean ownership boundaries.** SkyWeb.Api owns presentation/member analytics APIs; SkyServer owns ingestion, automation, repo tooling, and alert evaluation execution.
3. **The alert system is productized, not just stored.** Alert rules connect to signal notifications, preferences, a Signal Center, dashboard surfacing, and chart overlays.
4. **The chart layer is reusable.** ECharts components are wrapped in shared base components, adapters, theme utilities, and formatting helpers so charts can grow without page-level rewrites.
5. **The project reflects production habits.** It includes environment templates, Swagger, health endpoints, permission checks, validation docs, repo-map generation, zip hygiene, lint/build scripts, and cutover documentation.

## Suggested Portfolio Summary

> Built SkyWeb Analytics, a React + ASP.NET Core + PostgreSQL macroeconomic analytics platform featuring authenticated dashboards, saved views, alert rules, signal notifications, and ECharts/D3 visualizations. Migrated the application from a Node-backed prototype lane into a dedicated C# API with incremental route-family cutover, while preserving SkyServer as the ingestion and automation control plane.

## Visual Portfolio Assets

Phase 9.2 defines the screenshot capture lane for turning the working app into a public-facing portfolio package. The strongest README candidates are:

```text
01-macro-overview.png
02-macro-dashboard.png
04-indicator-alert-overlays.png
06-signal-center.png
```

The full asset plan is tracked in `docs/SkyWeb_Visual_Asset_Manifest.md`, with capture guidance in `docs/SkyWeb_Screenshot_Capture_Guide.md`.
