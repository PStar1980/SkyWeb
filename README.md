# SkyWeb

SkyWeb is the public-facing web layer for the Sky ecosystem. It is designed to consume SkyServer APIs and present polished dashboards, macroeconomic views, and eventually personalized user experiences.

SkyServer remains the private control plane: ingestion, tools, automation, access control, audit, and operational configuration. SkyWeb is the presentation layer that turns those curated data services into public and user-facing experiences.

## Current Status

**Phase 9.1 — Public Macro API Bridge**

SkyWeb has been converted from its original starter/NeoFinTech placeholder into a dedicated SkyWeb application shell and is now wired to SkyServer public macro APIs.

Implemented foundation pieces:

- Single root `package.json`
- Root `.env.example`
- Vite dev proxy to SkyServer API
- SkyWeb branding and navigation
- Macro dashboard route shell
- Shared API client
- Macro API service layer
- Public-facing home page
- Macro overview, views, view detail, and indicator explorer pages
- Public macro API namespace: `/api/public/macro/*`

## Repository Layout

```text
SkyWeb/
├── apps/
│   └── web/                 # React/Vite frontend
│       ├── src/
│       │   ├── components/  # Shared UI components
│       │   ├── pages/       # Route pages
│       │   └── services/    # API service clients
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
VITE_SKYWEB_PUBLIC_MODE=true
```

During local development, Vite proxies `/api/*` to the SkyServer API using `VITE_SKYSERVER_API_ORIGIN`.

## Phase 9 Roadmap

### 9.0 — SkyWeb Foundation

- Establish SkyWeb identity and README
- Add root workspace scripts
- Add environment template
- Add API service layer
- Add macro dashboard route skeleton

### 9.1 — SkyServer Public Macro API

- Add safe public macro endpoints to SkyServer
- Reuse existing macro read service with public limits
- Avoid exposing operational/admin-only data
- Switch SkyWeb `VITE_MACRO_API_PREFIX` to `/public/macro`

### 9.2 — Macro Dashboard v1

- Macro overview cards
- Curated macro view list
- View detail pages
- Latest values and table previews
- Region/category filtering

### 9.3 — SkyWeb Auth Preparation

- Use app-scoped auth with `SKYWEB`
- Add SkyWeb login/session context
- Prepare profile/preferences tables

### 9.4 — Dashboard Polish

- Charts and trend previews
- Saved dashboards
- Indicator explorer
- Responsive public dashboard UI

## Relationship to SkyServer

SkyWeb should not duplicate SkyServer administration features. SkyServer owns:

- Tool execution
- Ingestion management
- Worker automation
- Access control
- Audit reporting
- Repository/system configuration

SkyWeb consumes curated APIs exposed by SkyServer and focuses on public presentation, exploration, and future user personalization.
