# SkyWeb Architecture Decisions

This document summarizes the major engineering decisions behind SkyWeb Analytics. It is written in ADR-style language for interviews, portfolio review, and future maintenance.

## ADR-001 — Keep React/Vite as the Client Layer

**Decision:** Retain React/Vite for the SkyWeb client instead of moving to Blazor.

**Context:** The existing UI already supported macro views, dashboards, preferences, alerts, and chart surfaces. The primary architectural gap was C#/.NET API experience, not frontend productivity.

**Rationale:**

- React is widely requested in full-stack job descriptions.
- ECharts and D3 are mature browser-native visualization tools.
- Keeping React reduced migration risk.
- The portfolio story becomes React + ASP.NET Core, a common industry pairing.

**Consequence:** The frontend remains JavaScript/React, while the analytics/member API is C#.

## ADR-002 — Introduce ASP.NET Core as the SkyWeb Analytics API

**Decision:** Add `SkyWeb.Api` as an ASP.NET Core Web API under `apps/web-dotnet/`.

**Context:** SkyWeb needed stronger C#/.NET proof-of-work while preserving the working SkyServer infrastructure.

**Rationale:**

- Creates real C# backend experience around auth, dashboards, preferences, alerts, and macro analytics.
- Supports Swagger/OpenAPI, health checks, middleware, and service-layer structure.
- Allows PostgreSQL access through Dapper/Npgsql.
- Gives the React client a dedicated analytics/member API boundary.

**Consequence:** SkyWeb now has a clean full-stack portfolio architecture: React client + ASP.NET Core API + PostgreSQL.

## ADR-003 — Keep SkyServer as the Node.js Control Plane

**Decision:** Retain SkyServer as the Node.js/Express/Knex control plane.

**Context:** SkyServer already owns ingestion scripts, workers, automation concepts, repo tooling, and alert evaluation logic.

**Rationale:**

- Avoids a risky big-bang rewrite.
- Preserves working ingestion and evaluation behavior.
- Keeps operational duties separate from presentation/member analytics.
- Leaves room for future Temporal orchestration without disrupting SkyWeb.

**Consequence:** SkyWeb.Api owns most user-facing API calls; SkyServer owns ingestion, automation, repository tools, and alert evaluation execution.

## ADR-004 — Migrate by Route Family with a Temporary Proxy Bridge

**Decision:** Use a temporary proxy bridge during the .NET transition.

**Context:** The frontend could not safely switch to a brand-new API until route behavior was proven incrementally.

**Rationale:**

- Allowed `SkyWeb.Client → SkyWeb.Api → SkyServer` while C# endpoints were implemented.
- Reduced breakage during cutover.
- Made each route family independently testable.
- Preserved rollback options during migration.

**Consequence:** The proxy bridge was narrowed over time and now remains only where intentional: alert evaluation execution.

## ADR-005 — Use Dapper + Npgsql for PostgreSQL Data Access

**Decision:** Use Dapper and Npgsql instead of a heavier ORM.

**Context:** SkyWeb is SQL-heavy and analytics-oriented, with time-series reads, JSONB preferences, dashboard items, auth/session tables, and alert event history.

**Rationale:**

- Direct SQL control for analytics queries.
- Lightweight mapping without hiding SQL behavior.
- Good fit for existing database-first development habits.
- Easy to preserve response contracts during migration.

**Consequence:** Service classes contain explicit SQL, which is readable and closely aligned with PostgreSQL schemas.

## ADR-006 — Stay REST-First Before GraphQL

**Decision:** Use REST APIs for the SkyWeb migration.

**Context:** Route families were naturally grouped around public macro reads, auth, profile/preferences, saved views, dashboards, alerts, and notifications.

**Rationale:**

- REST was simpler to validate against existing behavior.
- Swagger/OpenAPI made endpoints immediately inspectable.
- GraphQL was not necessary for the first stable cutover.
- Avoided adding complexity while changing backend technology.

**Consequence:** GraphQL remains a future option for flexible analytic querying, not part of the cutover path.

## ADR-007 — Use Apache ECharts with D3 Helpers

**Decision:** Move chart rendering to reusable ECharts components with D3 helper utilities.

**Context:** The project needed professional dense time-series charts, tooltips, adaptive axes, and alert overlays.

**Rationale:**

- ECharts handles dense chart rendering and interaction well.
- D3 helpers support extents, ticks, formatting, and data shaping.
- Shared wrappers reduce page-level chart duplication.
- Adapter files prepare the chart layer for future specialized visuals.

**Consequence:** Chart pages now share a stronger architecture: base wrapper, macro line chart, multi-series chart, adapters, theme, and utility helpers.

## ADR-008 — Keep Alert Evaluation in SkyServer

**Decision:** Keep alert evaluation execution in SkyServer while SkyWeb.Api owns alert rules, events, notifications, and Signal Center reads/writes.

**Context:** SkyServer is the control plane and already coordinates ingestion/evaluation behavior.

**Rationale:**

- Evaluation is operational logic, not only presentation logic.
- SkyServer can later schedule/automate evaluations with worker orchestration.
- Preserves a clean split: SkyWeb manages cockpit UX, SkyServer manages execution.

**Consequence:** Evaluate-now routes intentionally proxy to SkyServer.

## ADR-009 — Remove the Retired React-Only Client After DN-10

**Decision:** Delete the retired `apps/web` client after successful cutover validation.

**Context:** The `.NET` lane became the default client and API path. Keeping the old client increased duplication and documentation noise.

**Rationale:**

- Removes dead code and stale scripts.
- Simplifies repo structure.
- Makes the portfolio story cleaner.
- Recovery remains possible through Git history or older repo archives.

**Consequence:** `apps/web-dotnet/SkyWeb.Client` is the sole active SkyWeb client.

## ADR-010 — Keep Repository Hygiene as Part of the Product Story

**Decision:** Maintain generated repo maps, source-only zip archives, and explicit ignore rules for build artifacts.

**Context:** Repo zips grew when .NET `bin/` and `obj/` folders were accidentally included.

**Rationale:**

- Keeps project archives small and reviewable.
- Avoids shipping compiled build artifacts in source snapshots.
- Improves AI-assisted review and handoff workflows.
- Reinforces maintainability discipline.

**Consequence:** Repo generation scripts now ignore `bin/`, `obj/`, `dist/`, `node_modules/`, and other non-source outputs.

## Current Architecture Summary

```text
Browser
  → SkyWeb.Client                    React / Vite / ECharts / D3
  → SkyWeb.Api                       ASP.NET Core / C# / Dapper / Npgsql
  → PostgreSQL                       macro + skyweb + auth schemas
  → SkyServer for evaluation only    Node.js control plane
```

The design goal is not single-stack purity. The design goal is clean ownership: product analytics in SkyWeb, operational automation in SkyServer.
