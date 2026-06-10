# SkyWeb Analytics

SkyWeb Analytics is the public-facing analytics layer for the Sky ecosystem. It presents macroeconomic dashboards, indicator detail views, curated macro lenses, saved member dashboards, alert signals, and professional charting surfaces.

SkyServer Admin remains the private control plane for ingestion, tools, automation, access control, audit, repository/system configuration, and operational workflow work. SkyWeb Analytics is the presentation and user-facing analytics layer.

## Current Status

**Historical feature baseline:** Phase 8.8 — Macro Alerts complete  
**Active implementation:** Phase 9.2 — Screenshot and Visual Asset Pass

The .NET transition is complete. DN-10 promoted the ASP.NET Core / C# lane as the default SkyWeb development and build path, and DN-10.1 removed the retired React-only client. Phase 9 shifts SkyWeb from migration work into portfolio and presentation polish.

```text
Primary client/API path:
  apps/web-dotnet/SkyWeb.Client  React / Vite / Apache ECharts / D3
  apps/web-dotnet/SkyWeb.Api     ASP.NET Core / C# / Dapper / PostgreSQL
```

The default npm scripts use the active SkyWeb client:

```text
npm run web      -> apps/web-dotnet/SkyWeb.Client
npm run build    -> apps/web-dotnet/SkyWeb.Client production build
npm run preview  -> apps/web-dotnet/SkyWeb.Client preview
```

The previous React-only client has been removed from the working tree after successful DN-10 validation. Recovery is through Git history or an earlier repo archive, not through an active source folder.

The .NET lane is validated through the main SkyWeb Analytics surfaces:

- Native C# public macro endpoints under `/api/public/macro/*`.
- Native C# authentication/session endpoints under `/api/auth/*`.
- Native C# profile, preferences, alert preferences, saved views, dashboards, alert rules, alert events, alert notifications, and Signal Center endpoints under `/api/skyweb/*`.
- React/Vite primary client running on `http://localhost:5175`.
- ASP.NET Core API running on `http://localhost:7280`.
- Apache ECharts + D3 chart layer in `SkyWeb.Client`.
- Alert threshold overlays and optional alert-event markers on indicator and macro-view detail charts.

The only intentional proxy bridge still remaining is alert evaluation:

```text
POST /api/skyweb/alerts/evaluate
POST /api/skyweb/alerts/{alertKey}/evaluate
```

Those continue to route through SkyServer because SkyServer currently owns ingestion, workers, scheduler/listener behavior, and alert evaluation writes. This is intentional, not a migration gap.

Current request flow:

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
│   └── web-dotnet/          # Active SkyWeb Analytics implementation
│       ├── SkyWeb.DotNet.sln
│       ├── SkyWeb.Api/      # ASP.NET Core / C# API
│       └── SkyWeb.Client/   # React / Vite client backed by SkyWeb.Api
├── docs/                    # Current repo map and reference notes
├── .env.example
└── package.json
```

Build artifacts such as `bin/`, `obj/`, `dist/`, and `node_modules/` should not be included in generated repo zips.

## Local Development

Install JavaScript dependencies from the repository root:

```bash
npm install
```

Run these in separate terminals for the active stack:

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
# Terminal 3 — SkyWeb Analytics client
cd ../SkyWeb
npm run web
```

Open:

```text
http://localhost:5175
```

Useful validation/build commands:

```bash
npm run dotnet:prep
npm run dotnet:build
npm run build
npm run lint
```

## Environment

Create `.env.local` from `.env.example` when needed:

```bash
cp .env.example .env.local
```

Active client variables:

```text
VITE_SKYWEB_API_BASE_URL=/api
VITE_SKYWEB_API_ORIGIN=http://localhost:7280
VITE_SKYSERVER_API_BASE_URL=/api
VITE_SKYSERVER_API_ORIGIN=http://localhost:7171
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_SKYWEB_SESSION_TOKEN_KEY=skyweb.sessionToken
VITE_SKYWEB_PUBLIC_MODE=true
VITE_API_TIMEOUT_MS=20000
```

The client also has its own optional local override file:

```text
apps/web-dotnet/SkyWeb.Client/.env.development
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
| DN-10    |     ✅ | Promote the `.NET` lane as the default SkyWeb path                     |
| DN-10.1  |     ✅ | Remove the retired client folder and clean stale references            |

## SkyWeb Feature Roadmap

| Phase   | Status | Objective                                                                                                                    |
| ------- | -----: | ---------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 |     ✅ | SkyWeb foundation: identity, README, package scripts, environment template, API client, and route shell                      |
| Phase 2 |     ✅ | SkyServer public macro API bridge: safe unauthenticated macro endpoints with public limits                                   |
| Phase 3 |     ✅ | Macro Dashboard v1: live overview, curated view cards, drilldowns, formatted tables, and indicator explorer                  |
| Phase 4 |     ✅ | Auth shell and member layer prep: app-scoped `SKYWEB` login, protected account route, profile/preferences foundation         |
| Phase 5 |     ✅ | Dashboard polish: charts, trend previews, responsive refinements, and richer macro storytelling surfaces                     |
| Phase 6 |     ✅ | Profile and preferences UI: editable member profile, saved display preferences, and account settings                         |
| Phase 7 |     ✅ | Saved dashboards and watchlists: personalized dashboard builder, presentation mode, analytical view polish                   |
| Phase 8 |     ✅ | Macro alerts: alert rules, evaluation history, signal queue, preferences, Signal Center, and alert-rule UX polish            |
| Phase 9 |     🔥 | Public portfolio polish: feature tour, architecture story, GitHub/LinkedIn proof assets, and presentation-ready storytelling |

## Portfolio / Presentation Assets

Phase 9 starts the portfolio-polish lane. These documents translate the working product into material that can be used for GitHub, LinkedIn, interview prep, screenshots, and live demos.

| Asset                                                                                | Purpose                                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`docs/SkyWeb_Portfolio_Brief.md`](docs/SkyWeb_Portfolio_Brief.md)                   | Concise portfolio story, technical proof points, and architecture summary           |
| [`docs/SkyWeb_Feature_Tour.md`](docs/SkyWeb_Feature_Tour.md)                         | Guided product walkthrough and screenshot capture plan                              |
| [`docs/SkyWeb_Demo_Script.md`](docs/SkyWeb_Demo_Script.md)                           | Five-minute interview/demo narrative                                                |
| [`docs/SkyWeb_Phase_9_Roadmap.md`](docs/SkyWeb_Phase_9_Roadmap.md)                   | Phase 9 execution plan and remaining polish slices                                  |
| [`docs/SkyWeb_Screenshot_Capture_Guide.md`](docs/SkyWeb_Screenshot_Capture_Guide.md) | Browser setup, capture rules, route sequence, and privacy checklist for screenshots |
| [`docs/SkyWeb_Visual_Asset_Manifest.md`](docs/SkyWeb_Visual_Asset_Manifest.md)       | Canonical screenshot filenames, README usage priority, and asset status tracker     |
| [`docs/assets/screenshots/README.md`](docs/assets/screenshots/README.md)             | Target folder for portfolio screenshots and export notes                            |

## Screenshot Asset Targets

Phase 9.2 defines the canonical screenshot set for the portfolio pass. Capture the images into:

```text
docs/assets/screenshots/
```

Recommended first-pass assets:

```text
01-macro-overview.png
02-macro-dashboard.png
03-macro-view-detail.png
04-indicator-alert-overlays.png
05-alert-rules.png
06-signal-center.png
07-dashboard-builder.png
08-account-preferences.png
```

Do not include local tokens, database values, terminal windows, or browser profile details in captured images.

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
- `SkyWeb.Api` serves nearly all SkyWeb Analytics API surfaces natively in C#. Alert evaluation remains intentionally SkyServer-owned.

## Primary Local URLs

| Surface                 | URL                                                |
| ----------------------- | -------------------------------------------------- |
| SkyWeb Analytics client | `http://localhost:5175` when running `npm run web` |
| SkyServer Node API      | `http://localhost:7171`                            |
| SkyWeb.Api health       | `http://localhost:7280/_health`                    |
| SkyWeb.Api DB health    | `http://localhost:7280/_db/health`                 |
| SkyWeb.Api Swagger      | `http://localhost:7280/swagger`                    |
