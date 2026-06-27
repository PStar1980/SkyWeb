# SkyWeb Interview Talking Points

Use this document to explain SkyWeb Analytics in interviews, recruiter screens, portfolio walkthroughs, and technical discussions. Keep the tone practical: this is a real system built through incremental delivery, not a tutorial app.

## Project Pitch

SkyWeb Analytics is a full-stack macroeconomic analytics platform built with React, ASP.NET Core Web API, C#, PostgreSQL, Dapper, Apache ECharts, and D3 helpers. It provides public macroeconomic exploration, authenticated dashboards, saved views, alert rules, a Signal Center, and chart-level alert overlays.

SkyWeb is the analytics/member-facing product layer. SkyServer remains the Node.js control plane responsible for ingestion, automation, workers, repository tooling, and alert evaluation execution.

## Short Version

> I built SkyWeb Analytics as a full-stack macroeconomic dashboard and alerting platform. The frontend is React/Vite with ECharts/D3 visualizations, the analytics API is ASP.NET Core/C# over PostgreSQL using Dapper/Npgsql, and SkyServer remains a Node.js control plane for ingestion and alert evaluation. The project demonstrates full-stack development, data modeling, API migration, authentication, dashboard UX, and production-style cutover discipline.

## What Problem It Solves

SkyWeb gives a user a single place to review macroeconomic indicators, compare curated multi-series views, build dashboards, and monitor threshold-based alerts. It turns raw time-series data into a more operational macro cockpit: views, dashboards, signal notifications, and chart overlays all connect back to the same PostgreSQL-backed source data.

## Why ASP.NET Core Was Added

Good interview answer:

> I introduced ASP.NET Core to create a dedicated analytics/member API layer for SkyWeb while preserving the existing SkyServer Node.js control plane. This let me build C#/.NET experience around real product features without rewriting working ingestion and automation infrastructure. The migration was done route family by route family, with a temporary proxy bridge until each area was proven natively in C#.

Key points:

- The .NET API owns user-facing analytics and member workflows.
- SkyServer remains focused on ingestion, worker automation, and control-plane execution.
- The cutover was incremental, testable, and reversible during migration.
- The result is a cleaner portfolio architecture: React + ASP.NET Core + PostgreSQL + Node automation.

## Why SkyServer Stayed Node.js

Good interview answer:

> SkyServer already handled ingestion scripts, workers, scheduling/listening concepts, repo tooling, and alert evaluation. Rewriting that all at once would have increased risk without improving the user-facing product. I kept SkyServer as the operational control plane and moved SkyWeb’s presentation/member API into C# where it added the most learning and career value.

Key points:

- Avoided a risky big-bang rewrite.
- Preserved working ingestion and evaluation logic.
- Allowed the .NET layer to focus on API design, auth, dashboards, alerts, and analytics reads.
- Demonstrates boundary-setting and migration judgment.

## Why React Was Kept Instead of Blazor

Good interview answer:

> I kept React because the existing UI was already productive and because React remains highly relevant for full-stack roles. The goal was not to convert everything for the sake of conversion; it was to add a strong C# API layer while preserving a capable JavaScript frontend and improving the chart system with ECharts and D3.

Key points:

- React was already working well.
- The project targets common hiring stacks: React + ASP.NET Core.
- Charts and interaction patterns were best handled in the browser with mature JS libraries.
- Avoided unnecessary frontend churn.

## Why REST Before GraphQL

Good interview answer:

> I stayed REST-first because the route families were clear: public macro reads, auth, profile/preferences, saved views, dashboards, alerts, and notifications. REST made the migration easier to validate against the existing Node behavior. GraphQL may be useful later for flexible analytic querying, but it was not needed for the cutover.

Key points:

- REST reduced migration complexity.
- Existing client behavior already mapped well to REST endpoints.
- Swagger/OpenAPI provided immediate API visibility.
- GraphQL remains a possible future optimization, not a prerequisite.

## Why Dapper + Npgsql

Good interview answer:

> The data model is SQL-heavy and analytics-oriented, so Dapper gave me direct control over PostgreSQL queries while keeping mapping lightweight. It was a good fit because the project already depended on SQL views, time-series reads, JSONB preferences, auth/session tables, dashboards, and alert history.

Key points:

- Strong fit for SQL-first analytics work.
- Less abstraction for complex read queries.
- Easy to reason about response shape and performance.
- Reinforces SQL/PostgreSQL strengths.

## How Authentication Works

Good interview answer:

> SkyWeb uses app-scoped local authentication. Login validates BCrypt password hashes, issues opaque bearer sessions, stores SHA-256 hashes of session tokens, and checks permissions on protected route families. The React client stores and sends the session token, while the C# middleware resolves the authenticated user and permissions.

Key points:

- BCrypt password validation.
- Opaque bearer tokens.
- SHA-256 session-token hashes in PostgreSQL.
- App-scoped auth using `SKYWEB`.
- Permission checks on profile, preferences, dashboards, saved views, and alerts.

## How Alerts Work

Good interview answer:

> Alerts are threshold rules defined against indicators or macro view metrics. SkyWeb.Api owns rule management, notification reads, and Signal Center lifecycle operations. SkyServer still owns evaluate-now execution because it is the control plane that already knows how to evaluate rules, write events, and generate notifications.

Alert lifecycle:

1. User creates or updates an alert rule.
2. SkyServer evaluates active rules when requested or scheduled.
3. Evaluation writes event history.
4. Triggered events create open signal notifications.
5. User acknowledges or dismisses signals in the Signal Center.
6. Indicator and macro-view charts can display thresholds and optional event markers.

## How Chart Overlays Work

Good interview answer:

> The chart layer uses shared ECharts components and adapter functions. Alert rules and event history are transformed into chart overlay definitions. Indicator charts can show threshold lines and optional event markers, while the UI defaults to the least noisy useful mode so the chart remains readable.

Key points:

- ECharts renders dense time-series charts.
- D3 helpers support ranges, ticks, and formatting logic.
- Overlay adapter converts alerts/notifications into visual annotations.
- Thresholds are useful by default; event markers are optional.
- Dashboard mini charts intentionally avoid overlay clutter.

## Migration Story

Good interview answer:

> I migrated SkyWeb from a Node-backed frontend path into a React + ASP.NET Core architecture incrementally. I first created the .NET solution, health checks, CORS, DB connectivity, and Swagger. Then I migrated public macro reads, auth, preferences, dashboards, alerts, and notifications one route family at a time. Once the .NET lane was stable, I promoted it to the default and removed the old client.

Migration sequence:

- DN-0 to DN-2: baseline, solution structure, health checks, database connectivity.
- DN-3: temporary proxy bridge.
- DN-4: public macro endpoints in C#.
- DN-5: auth/session in C#.
- DN-6: profile/preferences in C#.
- DN-7: saved views/dashboards in C#.
- DN-8: alerts and Signal Center in C#.
- DN-9: ECharts/D3 chart architecture and overlays.
- DN-10: cutover and retired client removal.

## Production-Style Habits Demonstrated

- Health endpoints and DB health checks.
- Swagger/OpenAPI for API inspection.
- Environment templates and local secret guidance.
- Incremental route-family migration.
- Repo-map and repo-zip tooling.
- Source zips excluding build artifacts.
- Docs, validation checklists, demo scripts, and screenshots.
- Alert lifecycle language and product UX polish.

## Tradeoffs and Limitations

Good interview answer:

> The project is currently local-first and portfolio-oriented, not deployed as a public SaaS product. Alert evaluation still runs through SkyServer by design. External delivery like email or browser push is staged but not active yet. Future improvements would include hosting, CI/CD hardening, scheduled evaluation workflows, better ingestion retry/backoff, and external notification delivery.

## How This Relates to Professional Experience

Useful bridge:

> My professional background is Oracle PL/SQL, pension systems, data remediation, production support, testing, and business analysis. SkyWeb extends that into a modern full-stack platform: PostgreSQL, React, ASP.NET Core, C#, APIs, analytics dashboards, alerts, and AI-assisted development workflows.

## Strong Closing Line

> The strongest part of this project is not only the stack; it is the migration discipline. I took a working system, introduced a new API technology, migrated route families safely, validated user workflows, and ended with a cleaner full-stack architecture.
