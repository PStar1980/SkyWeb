# SkyWeb Release Checklist

This checklist defines the final local validation path for the SkyWeb Analytics portfolio release candidate.

## Release Candidate Scope

SkyWeb Analytics is considered portfolio-ready when the following surfaces work through the post-cutover React + ASP.NET Core path:

- Public macro overview and curated macro views.
- Indicator detail pages with ECharts/D3 charts.
- Authenticated dashboard cockpit and dashboard builder.
- Saved views, profile preferences, dashboard preferences, and alert preferences.
- Alert rules, evaluate-now flows, Signal Center, and chart alert overlays.
- README, screenshots, and career-facing docs render cleanly on GitHub.

## Local Stack Startup

Run these in separate terminals:

```powershell
# Terminal 1 — SkyServer control plane / evaluator
cd "../SkyServer"
npm run api
```

```powershell
# Terminal 2 — SkyWeb ASP.NET Core API
cd "../SkyWeb"
npm run dotnet:api
```

```powershell
# Terminal 3 — SkyWeb Analytics client
cd "../SkyWeb"
npm run web
```

Open:

```text
http://localhost:5175
```

## Build and Static Checks

Run from the SkyWeb repo root:

```powershell
npm install
npm run dotnet:clean
npm run dotnet:build
npm run build
npm run lint
```

Expected result:

- .NET solution builds successfully.
- Vite production build completes.
- ESLint passes or reports only known non-release-blocking items.

## API Health Checks

Confirm:

```text
http://localhost:7280/_health
http://localhost:7280/_db/health
http://localhost:7280/swagger
```

Expected result:

- Service health returns `ok: true`.
- DB health returns the local PostgreSQL database name.
- Swagger lists public macro, auth, and SkyWeb route groups.

## Product Demo Checks

| Surface           | Route                        | Pass Criteria                                           |
| ----------------- | ---------------------------- | ------------------------------------------------------- |
| Macro Overview    | `/macro`                     | Public macro cards and summary stats load               |
| Macro Dashboard   | `/dashboard`                 | Authenticated dashboard cards/charts render             |
| Macro View Detail | `/macro/views/rates-curve`   | Multi-series chart, picker, table, and tooltip work     |
| Indicator Detail  | `/macro/indicators/FXUSDCAD` | Chart renders with threshold overlays when alerts exist |
| Alert Rules       | `/macro/alerts`              | Rules load; evaluate-now still works through SkyServer  |
| Signal Center     | `/macro/alerts/signals`      | Filters, counts, acknowledge/dismiss flows work         |
| Dashboard Builder | `/dashboards`                | Dashboard and item management surfaces load             |
| Account           | `/account`                   | Profile/preferences load and save                       |

## Screenshot / README Checks

On GitHub, confirm:

- Root README screenshot gallery renders.
- Mermaid architecture diagram renders or degrades acceptably.
- Portfolio docs links are valid.
- Screenshot files contain no secrets, local tokens, browser downloads, or private notes.

Generated repo handoff zips intentionally exclude image binaries by default. Screenshots remain part of the GitHub working tree, but transfer zips can stay small for AI review and file exchange.

## Security / Hygiene Checks

Confirm before public sharing:

- No real database password is committed in `appsettings.Development.json`.
- Local secrets are stored through .NET user secrets or private environment settings.
- No session tokens or personal secrets appear in docs/screenshots.
- Generated zips exclude `node_modules/`, `dist/`, `bin/`, `obj/`, and image binaries unless explicitly requested.

## Release Candidate Declaration

When all checks pass, SkyWeb can be described as:

> A post-cutover React + ASP.NET Core + PostgreSQL macroeconomic analytics platform with portfolio-ready documentation, screenshots, demo assets, and career-facing proof material.
