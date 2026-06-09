# SkyWeb Analytics

SkyWeb Analytics is the public-facing analytics layer for the Sky ecosystem. It presents macroeconomic dashboards, indicator detail views, curated macro lenses, saved member dashboards, alert signals, and professional charting surfaces.

SkyServer Admin remains the private control plane for ingestion, tools, automation, access control, audit, repository/system configuration, and operational workflow work. SkyWeb Analytics is the presentation and user-facing analytics layer.

Detailed implementation history lives in [`change.log`](./change.log) so this README stays readable.

## Current Status

**Historical feature baseline:** Phase 8.8 — Macro Alerts complete  
**Active .NET transition lane:** DN-9.5 — Pre-Cutover Cleanup + Documentation Lockdown

The original `apps/web` React/Vite application remains preserved as the legacy rollback baseline. The active migration lane is `apps/web-dotnet`, which contains:

```text
apps/web-dotnet/
  SkyWeb.Api      ASP.NET Core / C# API
  SkyWeb.Client   React / Vite client connected to SkyWeb.Api
```

The .NET lane is now feature-rich and validated through the main SkyWeb Analytics surfaces:

- Native C# public macro endpoints under `/api/public/macro/*`.
- Native C# authentication/session endpoints under `/api/auth/*`.
- Native C# profile, preferences, alert preferences, saved views, dashboards, alert rules, alert events, alert notifications, and Signal Center endpoints under `/api/skyweb/*`.
- React/Vite `.NET-lane` client running on `http://localhost:5175`.
- ASP.NET Core API running on `http://localhost:7280`.
- Apache ECharts + D3 chart layer in `SkyWeb.Client`.
- Alert threshold overlays and optional alert-event markers on indicator and macro-view detail charts.

The only intentional proxy bridge still remaining is alert evaluation:

```text
POST /api/skyweb/alerts/evaluate
POST /api/skyweb/alerts/{alertKey}/evaluate
```

Those continue to route through SkyServer because SkyServer currently owns ingestion, workers, scheduler/listener behavior, and alert evaluation writes. This is intentional, not a migration gap.

Current DN-9.5 request flow:

```text
SkyWeb.Client
  → SkyWeb.Api
      → native C# public macro endpoints
      → native C# auth/session endpoints
      → native C# SkyWeb member/profile/preference endpoints
      → native C# saved-view and dashboard endpoints
      → native C# alert-rule, event-history, alert-notification, and Signal Center endpoints
      → proxy to SkyServer Node API for evaluate-now alert execution only
```

## Repository Layout

```text
SkyWeb/
├── apps/
│   ├── web/                 # Legacy React/Vite baseline retained for rollback
│   └── web-dotnet/          # Active .NET migration lane
│       ├── SkyWeb.DotNet.sln
│       ├── SkyWeb.Api/      # ASP.NET Core / C# API
│       └── SkyWeb.Client/   # React / Vite client for .NET transition testing
├── docs/                    # Repo maps, transition plans, validation notes
├── change.log               # Detailed historical phase/change log
├── .env.example
└── package.json
```

Build artifacts such as `bin/`, `obj/`, `dist/`, and `node_modules/` should not be included in generated repo zips.

## Local Development

Install JavaScript dependencies from the repository root:

```bash
npm install
```

### Existing legacy baseline

```bash
npm run web
npm run web:build
npm run web:preview
```

### .NET migration lane

Run these in separate terminals when testing the full `.NET` lane:

```bash
# Terminal 1 — SkyServer Node API / control plane
cd ../SkyServer
npm run api
```

```bash
# Terminal 2 — SkyWeb ASP.NET Core API
cd ../SkyWeb
npm run dotnet:api
```

```bash
# Terminal 3 — SkyWeb .NET-lane React client
cd ../SkyWeb
npm run web:dotnet
```

Useful validation/build commands:

```bash
npm run dotnet:build
npm run web:dotnet:build
npm run lint
```

## Environment

Create `.env.local` from `.env.example` when needed for the legacy `apps/web` app:

```bash
cp .env.example .env.local
```

Important legacy-app variables:

```text
VITE_SKYSERVER_API_BASE_URL=/api
VITE_SKYSERVER_API_ORIGIN=http://localhost:7171
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_SKYWEB_SESSION_TOKEN_KEY=skyweb.sessionToken
VITE_SKYWEB_PUBLIC_MODE=true
```

The .NET-lane client uses:

```text
apps/web-dotnet/SkyWeb.Client/.env.development
```

Important .NET-lane variables:

```text
VITE_SKYWEB_API_BASE_URL=http://localhost:7280/api
VITE_SKYSERVER_API_BASE_URL=http://localhost:7280/api
VITE_SKYWEB_API_ORIGIN=http://localhost:7280
VITE_SKYSERVER_API_ORIGIN=http://localhost:7171
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_SKYWEB_SESSION_TOKEN_KEY=skyweb.sessionToken
VITE_SKYWEB_PUBLIC_MODE=true
VITE_API_TIMEOUT_MS=20000
```

The .NET API connection string is configured in:

```text
apps/web-dotnet/SkyWeb.Api/appsettings.Development.json
```

Use .NET user secrets for local database passwords instead of committing real credentials.

## .NET Transition Lane

The .NET migration uses a dedicated `DN-*` numbering system so it does not collide with historical SkyWeb feature phases.

| DN Phase | Status | Objective                                                              |
| -------- | -----: | ---------------------------------------------------------------------- |
| DN-0     |     ✅ | Preserve Pre-.NET baseline                                             |
| DN-1     |     ✅ | Create parallel `.NET` app structure                                   |
| DN-2     |     ✅ | Configure API, CORS, health, DB connection                             |
| DN-3     |     ✅ | Wire `SkyWeb.Client` to `SkyWeb.Api` with temporary proxy fallback     |
| DN-4     |     ✅ | Implement public macro REST endpoints in C#                            |
| DN-5     |     ✅ | Implement authentication in C#                                         |
| DN-5.1   |     ✅ | Stabilize public macro series reads                                    |
| DN-5.2   |     ✅ | Fix indicator-table `regclass` materialization and `NaN` series values |
| DN-6     |     ✅ | Implement SkyWeb profile and preferences in C#                         |
| DN-7     |     ✅ | Implement saved views and dashboards in C#                             |
| DN-7.1   |     ✅ | Stabilize saved views/dashboards build                                 |
| DN-8     |     ✅ | Implement alerts and Signal Center in C#                               |
| DN-9.1   |     ✅ | Add ECharts + D3 chart engine foundation in `SkyWeb.Client`            |
| DN-9.2   |     ✅ | Extract reusable ECharts chart architecture and frontend adapters      |
| DN-9.3   |     ✅ | Polish chart UX and harden ECharts runtime behavior                    |
| DN-9.4   |     ✅ | Add alert overlays and chart annotations                               |
| DN-9.4.1 |     ✅ | Restore page-level alert overlay wiring                                |
| DN-9.4.2 |     ✅ | Polish overlay counts/modes and indicator chart controls               |
| DN-9.5   |     ✅ | Pre-cutover cleanup and documentation lockdown                         |
| DN-10    |     🔜 | Cutover and legacy consolidation                                       |

## SkyWeb Feature Roadmap

| Phase   | Status | Objective                                                                                                            |
| ------- | -----: | -------------------------------------------------------------------------------------------------------------------- |
| Phase 1 |     ✅ | SkyWeb foundation: identity, README, package scripts, environment template, API client, and route shell              |
| Phase 2 |     ✅ | SkyServer public macro API bridge: safe unauthenticated macro endpoints with public limits                           |
| Phase 3 |     ✅ | Macro Dashboard v1: live overview, curated view cards, drilldowns, formatted tables, and indicator explorer          |
| Phase 4 |     ✅ | Auth shell and member layer prep: app-scoped `SKYWEB` login, protected account route, profile/preferences foundation |
| Phase 5 |     ✅ | Dashboard polish: charts, trend previews, responsive refinements, and richer macro storytelling surfaces             |
| Phase 6 |     ✅ | Profile and preferences UI: editable member profile, saved display preferences, and account settings                 |
| Phase 7 |     ✅ | Saved dashboards and watchlists: personalized dashboard builder, presentation mode, analytical view polish           |
| Phase 8 |     ✅ | Macro alerts: alert rules, evaluation history, signal queue, preferences, Signal Center, and alert-rule UX polish    |
| Phase 9 |     🔜 | Public portfolio polish: screenshots, GitHub/LinkedIn proof assets, and presentation-ready feature storytelling      |

## Relationship to SkyServer

SkyWeb Analytics should not duplicate SkyServer Admin features. SkyServer owns:

- Tool execution
- Ingestion management
- Worker automation
- Access control
- Audit reporting
- Repository/system configuration
- Application membership management
- Future Temporal workflow orchestration
- Current alert evaluation execution

SkyWeb Analytics consumes curated APIs and focuses on public presentation, exploration, member personalization, dashboards, alerts, and chart intelligence.

## Auth Notes

- SkyWeb Analytics login posts to `/api/auth/login` with `appCode: SKYWEB`.
- Public macro pages remain unauthenticated.
- `/account` is protected by the SkyWeb AuthContext and reads `/api/skyweb/profile`.
- SkyWeb profiles and preferences are staged in the `skyweb` database schema.
- SkyServer Admin controls which shared users have `SKYWEB` application membership and SkyWeb-specific roles.
- During DN-9.5, `SkyWeb.Api` serves nearly all SkyWeb Analytics API surfaces natively in C#. Alert evaluation remains intentionally SkyServer-owned.

## Primary Local URLs

| Surface                 | URL                                                       |
| ----------------------- | --------------------------------------------------------- |
| Legacy SkyWeb app       | `http://localhost:5174`                                   |
| SkyServer Node API      | `http://localhost:7171`                                   |
| SkyWeb.Api health       | `http://localhost:7280/_health`                           |
| SkyWeb.Api DB health    | `http://localhost:7280/_db/health`                        |
| SkyWeb.Api Swagger      | `http://localhost:7280/swagger`                           |
| .NET-lane SkyWeb.Client | `http://localhost:5175` when running `npm run web:dotnet` |

## Pre-Cutover Validation

Use [`docs/SkyWeb_DN_Validation_Checklist.md`](./docs/SkyWeb_DN_Validation_Checklist.md) before DN-10. The checklist covers local services, build checks, public macro pages, auth/member pages, saved views, dashboards, alerts, Signal Center, and chart overlays.

## Portfolio Positioning

Once complete, SkyWeb can be described as:

> Full-stack macroeconomic analytics platform built with React, ASP.NET Core Web API, C#, PostgreSQL, REST APIs, authenticated user dashboards, alert-rule workflows, and advanced charting with Apache ECharts and D3.

SkyServer can be described separately as:

> Node.js/React/PostgreSQL admin and automation control plane with ingestion pipelines, worker scheduling, script execution, database build tooling, operational dashboards, and planned Temporal workflow orchestration.
