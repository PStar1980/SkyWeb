# SkyWeb

SkyWeb is the public-facing web layer for the Sky ecosystem. It consumes curated SkyServer APIs and presents polished dashboards, macroeconomic views, and future personalized user experiences.

SkyServer remains the private control plane: ingestion, tools, automation, access control, audit, and operational configuration. SkyWeb is the presentation layer that turns those curated data services into public and user-facing experiences.

## Current Status

**Phase 5.2 — Macro Drilldown UX Upgrade**

SkyWeb has been converted from its original starter/NeoFinTech placeholder into a dedicated public dashboard shell, is wired to SkyServer public macro APIs, now has a first-pass authenticated member shell, and is beginning its dashboard polish phase with reusable chart primitives and richer macro drilldown UX.

Implemented foundation pieces:

- Single root `package.json`
- Root `.env.example`
- Vite dev proxy to SkyServer API
- SkyWeb branding and navigation
- Shared API client
- Macro API service layer
- Public-facing home page
- Macro dashboard overview with live summary metrics
- Curated view cards with coverage metadata
- View detail pages with latest-row and preview-table surfaces
- Indicator explorer with source/frequency filtering
- Public macro API namespace: `/api/public/macro/*`
- SkyWeb login/session context using app-scoped `SKYWEB` authentication
- Protected `/account` route backed by `/api/skyweb/profile`
- Profile/preferences table foundation in the `skyweb` schema
- Lightweight SVG chart foundation for macro view drilldowns
- Trend metric cards for latest/range/change summaries
- Metric-selectable chart panels with quick metric cards and chart window controls
- Drilldown UX refinements for loaded date windows, latest-row emphasis, and chart/table pairing

## Repository Layout

```text
SkyWeb/
├── apps/
│   └── web/                 # React/Vite frontend
│       ├── src/
│       │   ├── components/  # Shared UI components
│       │   ├── context/     # Auth/session context
│       │   ├── pages/       # Route pages
│       │   ├── services/    # API service clients
│       │   └── utils/       # Formatting helpers
│       └── vite.config.js
├── docs/                    # Repo maps and project docs
├── .env.example
└── package.json
```

## Local Development

Install dependencies from the repository root:

```bash
npm install
```

Run SkyWeb locally:

```bash
npm run web
```

Build:

```bash
npm run web:build
```

Preview a production build:

```bash
npm run web:preview
```

## Environment

Create `.env.local` from `.env.example` when needed:

```bash
cp .env.example .env.local
```

Important variables:

```text
VITE_SKYSERVER_API_BASE_URL=/api
VITE_SKYSERVER_API_ORIGIN=http://localhost:7171
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_SKYWEB_SESSION_TOKEN_KEY=skyweb.sessionToken
VITE_SKYWEB_PUBLIC_MODE=true
```

During local development, Vite proxies `/api/*` to the SkyServer API using `VITE_SKYSERVER_API_ORIGIN`.

## 🗺️ Roadmap

SkyServer tracks the broader ecosystem integration as its Phase 9. SkyWeb uses its own standalone phase numbering so the public application can grow independently.

| Phase      | Objective                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| ✅ Phase 1 | SkyWeb foundation: identity, README, root package scripts, environment template, API client, and route shell         |
| ✅ Phase 2 | SkyServer public macro API bridge: safe unauthenticated macro endpoints with public limits                           |
| ✅ Phase 3 | Macro Dashboard v1: live overview, curated view cards, drilldowns, formatted tables, and indicator explorer          |
| ✅ Phase 4 | Auth shell and member layer prep: app-scoped `SKYWEB` login, protected account route, profile/preferences foundation |
| 🔄 Phase 5 | Dashboard polish: charts, trend previews, responsive refinements, and richer macro storytelling surfaces             |
| 🔜 Phase 6 | Profile and preferences UI: editable member profile, saved display preferences, and account settings                 |
| 🔜 Phase 7 | Saved dashboards and watchlists: first personalized SkyWeb dashboard features                                        |
| 🔜 Phase 8 | Macro alerts foundation: user-tracked indicators, views, threshold metadata, and notification prep                   |
| 🔜 Phase 9 | Public portfolio polish: screenshots, GitHub/LinkedIn proof assets, and presentation-ready feature storytelling      |

## Phase Details

### Phase 1 — SkyWeb Foundation

- Establish SkyWeb identity and README
- Add root package scripts
- Add environment template
- Add API service layer
- Add macro dashboard route skeleton

### Phase 2 — SkyServer Public Macro API Bridge

- Add safe public macro endpoints to SkyServer
- Reuse existing macro read service with public limits
- Avoid exposing operational/admin-only data
- Switch SkyWeb `VITE_MACRO_API_PREFIX` to `/public/macro`

### Phase 3 — Macro Dashboard v1

- Live macro overview dashboard
- Summary metrics for views, indicators, regions, and combined rows
- Featured macro view cards enriched with latest-date and row coverage
- Regional and category coverage panels
- View detail metrics, latest values, and readable preview tables
- Indicator source/frequency filtering

### Phase 4 — Auth Shell & Member Layer Prep

- Use app-scoped auth with `SKYWEB`
- Add SkyWeb login/session context
- Add protected account page
- Prepare profile/preferences tables
- Keep public macro pages unauthenticated
- Manage SkyWeb application membership from SkyServer Admin

### Phase 5 — Dashboard Polish

#### 5.1 — Chart Foundation

- Add reusable lightweight SVG sparkline component
- Add reusable chart panel component
- Add trend metric summary cards
- Add numeric-series helpers for public macro rows
- Add first macro view drilldown trend preview

#### 5.2 — Macro Drilldown UX Upgrade

- Add metric quick-select cards for the highest-value numeric series
- Add chart window controls for 30, 60, 120, or all loaded points
- Add chart metadata chips for selected metric, plotted points, and date range
- Add lightweight gridline/zero-line context to the SVG trend chart
- Rename preview rows as latest rows and highlight the newest table observation
- Replace unclear earliest-date stat with loaded-window context

#### Coming next

- Better macro-card storytelling
- More chart/table pairing options
- Saved dashboard entry points
- Responsive public dashboard UI

## Relationship to SkyServer

SkyWeb should not duplicate SkyServer administration features. SkyServer owns:

- Tool execution
- Ingestion management
- Worker automation
- Access control
- Audit reporting
- Repository/system configuration
- Application membership management

SkyWeb consumes curated APIs exposed by SkyServer and focuses on public presentation, exploration, and future user personalization.

## Auth Notes

- SkyWeb login posts to `/api/auth/login` with `appCode: SKYWEB`.
- Public macro pages remain unauthenticated.
- `/account` is protected by the SkyWeb AuthContext and reads `/api/skyweb/profile`.
- SkyWeb profiles and preferences are staged in the `skyweb` database schema.
- SkyServer Admin controls which shared users have `SKYWEB` application membership and SkyWeb-specific roles.
