# SkyWeb Analytics

SkyWeb Analytics is the public-facing analytics layer for the Sky ecosystem. It consumes curated SkyServer APIs and presents polished dashboards, macroeconomic views, alert signals, and future personalized user experiences.

SkyServer Admin remains the private control plane for ingestion, tools, automation, access control, audit, repository/system configuration, and operational workflow work. SkyWeb Analytics is the presentation and user-facing analytics layer.

Detailed phase history now lives in [`change.log`](./change.log) so this README stays readable.

## Current Status

**Current application phase:** Phase 8.8 — Alert Rule UX Polish  
**Active transition lane:** DN-3 — .NET Client Wiring + Proxy Bridge

The original `apps/web` React/Vite application remains the working SkyWeb Analytics baseline. The new `apps/web-dotnet` lane is being built in parallel so the ASP.NET Core/C# API can be proven route-by-route without disrupting the existing application.

The .NET foundation is active:

- `SkyWeb.Api` runs on `http://localhost:7280`.
- `/_health`, `/_db/health`, and `/swagger` are available.
- `SkyWeb.Api` connects to the existing PostgreSQL `skyserver_dev` database.
- `SkyWeb.Client` is a copied React/Vite client for the .NET migration lane.
- DN-3 adds a temporary proxy bridge so the .NET-lane client can call `SkyWeb.Api` first, while unported routes fall back to SkyServer Node API.

Current DN-3 request flow:

```text
SkyWeb.Client
  → SkyWeb.Api
      → native C# endpoints where implemented
      → proxy to SkyServer Node API for not-yet-migrated endpoint families
```

The existing app and .NET-lane client intentionally use different local ports so they can run side-by-side during the migration:

```text
apps/web                  http://localhost:5174
apps/web-dotnet/SkyWeb.Client  http://localhost:5175
```

Proxy fallback is migration scaffolding only. Each route family will be replaced with native C# implementation as the DN phases progress.

## Repository Layout

```text
SkyWeb/
├── apps/
│   ├── web/                 # Current working React/Vite frontend
│   │   ├── src/
│   │   │   ├── components/  # Shared UI components
│   │   │   ├── context/     # Auth/session context
│   │   │   ├── pages/       # Route pages
│   │   │   ├── services/    # API service clients
│   │   │   └── utils/       # Formatting helpers
│   │   └── vite.config.js
│   └── web-dotnet/          # Parallel .NET migration lane
│       ├── SkyWeb.DotNet.sln
│       ├── SkyWeb.Api/      # ASP.NET Core / C# API
│       └── SkyWeb.Client/   # Copied React/Vite client for .NET transition testing
├── docs/                    # Repo maps and project docs
├── change.log               # Detailed historical phase/change log
├── .env.example
└── package.json
```

## Local Development

Install JavaScript dependencies from the repository root:

```bash
npm install
```

Run the existing working SkyWeb Analytics app:

```bash
npm run web
```

Build the existing working app:

```bash
npm run web:build
```

Preview the existing working app production build:

```bash
npm run web:preview
```

Run the parallel .NET API:

```bash
npm run dotnet:api
```

Build the .NET solution:

```bash
npm run dotnet:build
```

Run the copied .NET-lane React client:

```bash
npm run web:dotnet
```

Build the copied .NET-lane React client:

```bash
npm run web:dotnet:build
```

## Environment

Create `.env.local` from `.env.example` when needed for the existing `apps/web` app:

```bash
cp .env.example .env.local
```

Important existing-app variables:

```text
VITE_SKYSERVER_API_BASE_URL=/api
VITE_SKYSERVER_API_ORIGIN=http://localhost:7171
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_SKYWEB_SESSION_TOKEN_KEY=skyweb.sessionToken
VITE_SKYWEB_PUBLIC_MODE=true
```

The .NET-lane client has its own example environment file:

```text
apps/web-dotnet/SkyWeb.Client/.env.example
```

Defaults should work without creating a local `.env.development`, but local overrides can be added inside `apps/web-dotnet/SkyWeb.Client` if needed. Important .NET-lane variables:

```text
VITE_SKYWEB_CLIENT_PORT=5175
VITE_SKYWEB_API_ORIGIN=http://localhost:7280
VITE_SKYWEB_API_BASE_URL=/api
VITE_SKYSERVER_API_BASE_URL=/api
VITE_SKYSERVER_API_ORIGIN=http://localhost:7171
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_SKYWEB_SESSION_TOKEN_KEY=skyweb.sessionToken
VITE_API_TIMEOUT_MS=20000
```

The .NET API connection string is configured in:

```text
apps/web-dotnet/SkyWeb.Api/appsettings.Development.json
```

Use .NET user secrets for local database passwords instead of committing real credentials.

## .NET Transition Lane

The .NET migration uses a dedicated `DN-*` numbering system so it does not collide with the historical SkyWeb feature phases.

| DN Phase | Status | Objective                                                          |
| -------- | -----: | ------------------------------------------------------------------ |
| DN-0     |     ✅ | Preserve Pre-.NET baseline                                         |
| DN-1     |     ✅ | Create parallel `.NET` app structure                               |
| DN-2     |     ✅ | Configure API, CORS, health, DB connection                         |
| DN-3     |     🔄 | Wire `SkyWeb.Client` to `SkyWeb.Api` with temporary proxy fallback |
| DN-4     |     🔜 | Implement public macro REST endpoints in C#                        |
| DN-5     |     🔜 | Implement authentication in C#                                     |
| DN-6     |     🔜 | Implement SkyWeb profile and preferences in C#                     |
| DN-7     |     🔜 | Implement saved views and dashboards in C#                         |
| DN-8     |     🔜 | Implement alerts and Signal Center in C#                           |
| DN-9     |     🔜 | Migrate charts to Apache ECharts + D3                              |
| DN-10    |     🔜 | Cutover and legacy removal                                         |

## SkyWeb Feature Roadmap

SkyServer tracks the broader ecosystem integration separately. SkyWeb Analytics uses standalone feature phases for the public/user-facing application.

| Phase   | Status | Objective                                                                                                            |
| ------- | -----: | -------------------------------------------------------------------------------------------------------------------- |
| Phase 1 |     ✅ | SkyWeb foundation: identity, README, root package scripts, environment template, API client, and route shell         |
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

SkyWeb Analytics consumes curated APIs exposed by SkyServer and focuses on public presentation, exploration, and user personalization.

## Auth Notes

- SkyWeb Analytics login posts to `/api/auth/login` with `appCode: SKYWEB`.
- Public macro pages remain unauthenticated.
- `/account` is protected by the SkyWeb AuthContext and reads `/api/skyweb/profile`.
- SkyWeb profiles and preferences are staged in the `skyweb` database schema.
- SkyServer Admin controls which shared users have `SKYWEB` application membership and SkyWeb-specific roles.
- During DN-3, `SkyWeb.Api` proxies auth and SkyWeb user routes to SkyServer until native C# route families are implemented.

## Primary Local URLs

| Surface                 | URL                                                       |
| ----------------------- | --------------------------------------------------------- |
| Existing SkyWeb app     | `http://localhost:5174`                                   |
| SkyServer Node API      | `http://localhost:7171`                                   |
| SkyWeb.Api health       | `http://localhost:7280/_health`                           |
| SkyWeb.Api DB health    | `http://localhost:7280/_db/health`                        |
| SkyWeb.Api Swagger      | `http://localhost:7280/swagger`                           |
| .NET-lane SkyWeb.Client | `http://localhost:5175` when running `npm run web:dotnet` |

## Portfolio Positioning

Once complete, SkyWeb can be described as:

> Full-stack macroeconomic analytics platform built with React, ASP.NET Core Web API, C#, PostgreSQL, REST APIs, authenticated user dashboards, alert-rule workflows, and advanced charting with Apache ECharts and D3.

SkyServer can be described separately as:

> Node.js/React/PostgreSQL admin and automation control plane with ingestion pipelines, worker scheduling, script execution, database build tooling, operational dashboards, and planned Temporal workflow orchestration.
