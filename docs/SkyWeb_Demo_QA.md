# SkyWeb Demo Q&A

Use this as prep for interviews, portfolio walkthroughs, recruiter screens, and technical deep dives.

## Core Questions

### What is SkyWeb Analytics?

SkyWeb Analytics is a full-stack macroeconomic analytics platform. It lets users explore economic indicators, review curated macro views, build authenticated dashboards, create alert rules, manage signal notifications, and inspect alert overlays directly on charts.

### What stack did you use?

- React and Vite for the client.
- ASP.NET Core Web API and C# for the analytics/member API.
- PostgreSQL for macro, auth, and SkyWeb member schemas.
- Dapper and Npgsql for data access.
- Apache ECharts with D3 helpers for visualization.
- Node.js/Express/Knex in SkyServer for ingestion, automation, repo tooling, and alert evaluation.

### Why did you build it?

I wanted a real system that combined my database/business-systems background with modern full-stack development, analytics dashboards, C#/.NET API design, and AI-assisted development practices. It also gives me a strong portfolio project for roles involving React, ASP.NET Core, PostgreSQL, data visualization, automation, and business systems analysis.

## Architecture Questions

### Why are there two backend stacks?

SkyWeb.Api and SkyServer have different responsibilities. SkyWeb.Api is the user-facing analytics/member API built in C#. SkyServer is the Node.js control plane that owns ingestion, automation, workers, repository tooling, and alert evaluation execution. Keeping that split avoided a risky rewrite and created cleaner system boundaries.

### Why did you not rewrite SkyServer in C# too?

Because SkyServer already had working operational logic. Rewriting it would have increased migration risk without improving the immediate user-facing product. I focused C# effort where it produced the most value: the analytics API, auth/session logic, dashboards, preferences, alerts, and data reads.

### Why did you keep React instead of using Blazor?

React was already productive and remains widely relevant in full-stack roles. The goal was to add a strong ASP.NET Core API layer, not churn the frontend unnecessarily. React also pairs well with ECharts and D3 for chart-heavy UX.

### Why REST instead of GraphQL?

REST matched the route families well and made migration validation simpler. GraphQL could be useful later for flexible analytics querying, but it was not necessary for the initial stable cutover.

## Migration Questions

### How did you migrate from Node-backed behavior to C#?

I used an incremental route-family migration. First I created the .NET solution, health endpoints, DB connectivity, CORS, and Swagger. Then I added a temporary proxy bridge so the React client could call SkyWeb.Api while unfinished routes still flowed through SkyServer. After that I migrated route families one by one: public macro reads, auth, profile/preferences, saved views, dashboards, alerts, and notifications. Once stable, the .NET client became the default and the old client was removed.

### What was the hardest migration issue?

The main issues were response-shape compatibility, PostgreSQL type differences, and chart runtime behavior. For example, some PostgreSQL values needed safer handling in C#/Npgsql, and dense chart interactions needed ECharts runtime polish. Each issue was handled through small stabilization passes rather than broad rewrites.

### How did you know the migration was safe?

I validated each route family through browser flows, Swagger checks, build commands, health endpoints, and manual QA. I also kept the proxy bridge during migration so unfinished routes could still work while native C# implementations were added.

## Data and API Questions

### How is data stored?

PostgreSQL stores macro data, auth/session data, and SkyWeb member data. Macro indicator and view data are exposed through public macro endpoints. Member features such as saved views, dashboards, preferences, alerts, and notifications are exposed through authenticated SkyWeb endpoints.

### Why Dapper?

Dapper is a good fit because the project is SQL-first and analytics-heavy. It gives direct control over PostgreSQL queries and keeps the service layer close to the database schema without a heavy ORM.

### How is authentication handled?

The app uses local app-scoped authentication. Passwords are validated with BCrypt. Sessions use opaque bearer tokens, and only SHA-256 hashes of session tokens are stored. Protected endpoints check the resolved user and required permissions.

## Alert System Questions

### How do alerts work?

A user creates a threshold rule against an indicator or macro view metric. SkyServer evaluates active rules and writes event history. Triggered events create signal notifications. SkyWeb.Api exposes alert rules, event history, notification reads, and acknowledge/dismiss workflows to the React client.

### Why does alert evaluation still live in SkyServer?

Evaluation is operational execution logic. SkyServer already owns ingestion, workers, scheduler/listener behavior, automation, and control-plane tasks. Keeping evaluation there preserves clean boundaries while SkyWeb focuses on the member cockpit and visualization layer.

### What is the Signal Center?

The Signal Center is the notification lifecycle page. It lets users review open, acknowledged, dismissed, and historical alert notifications. Users can acknowledge or dismiss individual signals or bulk-handle open signals.

## Chart Questions

### Why ECharts and D3?

ECharts handles dense time-series rendering and tooltips well. D3 helpers are useful for extents, ticks, formatting, and data adaptation. Together they support professional chart behavior without writing a chart engine from scratch.

### What are alert overlays?

Alert overlays connect rules and signal history back to the chart. Indicator detail pages can show threshold lines and optional alert-event markers so users can see where a signal relates to the underlying data.

### Why not show overlays on dashboard mini charts?

Mini charts are too small for heavy overlay detail. Full overlays belong on detail pages where users have enough space to inspect thresholds and event markers without clutter.

## Product Questions

### What are the main user workflows?

- Browse public macro overview.
- Drill into curated macro views.
- Open individual indicator detail pages.
- Log in and manage preferences.
- Save views and build custom dashboards.
- Create alert rules.
- Evaluate alerts and review signals.
- Inspect thresholds and events on charts.

### What would you improve next?

Good answer:

> I would improve ingestion resilience with retry/backoff and resume logic, add external alert delivery through email or browser push, add more specialized macro visualizations, and eventually integrate workflow orchestration for scheduled alert evaluation and data ingestion tasks.

### How would you deploy this?

Good answer:

> I would containerize SkyWeb.Api and SkyServer, host PostgreSQL as a managed database or local container depending on environment, build the React client as static assets, add CI/CD validation, and configure environment-specific secrets outside source control.

## Behavioral / STAR Prompts

### Tell me about a technical decision you made.

Use: ASP.NET Core introduction while keeping SkyServer Node.

Structure:

- Situation: SkyWeb needed stronger C#/.NET proof-of-work and cleaner API ownership.
- Task: Add .NET without breaking the working Node control plane.
- Action: Built parallel .NET lane, used proxy bridge, migrated route families incrementally.
- Result: Cutover completed, old client removed, charts/alerts/dashboards working through C# API.

### Tell me about handling complexity.

Use: Alert lifecycle and chart overlays.

Structure:

- Situation: Alerts needed to be more than a table of rules.
- Task: Make signals visible across dashboard, Signal Center, preferences, and charts.
- Action: Added alert rules, notifications, lifecycle states, preferences, and chart overlays.
- Result: Alerts became an integrated product workflow instead of a hidden backend feature.

### Tell me about learning a new technology.

Use: ASP.NET Core/C# migration.

Structure:

- Situation: My professional background was more Oracle/PLSQL/J2EE, but job market asked for .NET/React.
- Task: Build meaningful .NET experience through a real app.
- Action: Created ASP.NET Core API, Dapper/Npgsql data layer, auth middleware, services, Swagger, and cutover docs.
- Result: Working full-stack system with C# API and React frontend.

## Questions to Ask Interviewers

- How does your team separate user-facing APIs from background workflow or ingestion services?
- Do you prefer ORM-heavy data access or SQL-first approaches for analytics workloads?
- How do you validate data-heavy UI changes and dashboard calculations?
- What alerting or monitoring workflows does the team currently support?
- Are there opportunities to modernize legacy systems incrementally rather than through big-bang rewrites?

## Final Demo Close

> SkyWeb is valuable because it combines product thinking with engineering discipline: real data, authenticated workflows, API migration, charting, alerts, and clear system boundaries. It shows I can work across database, backend, frontend, documentation, and stakeholder-style requirements without treating any one layer as isolated.

## Release Candidate Framing

### Is this production deployed?

Good answer:

> Not yet. SkyWeb is currently a local portfolio release candidate. It demonstrates full-stack architecture, authenticated workflows, PostgreSQL data access, charting, alerting, and migration discipline. The next hardening steps would be deployment, CI/CD, containerization, secrets management, and monitoring.

### What are the current limitations?

Good answer:

> The main limitations are intentional boundaries: alert evaluation remains SkyServer-owned, external alert delivery is staged but not active, ingestion resilience can be improved with retry/backoff/resume logic, and the app is not yet hosted. I documented those limitations separately so the project stays transparent and roadmap-ready.

### What would you tackle next after the portfolio release?

Good answer:

> I would move back to SkyServer and pilot Temporal for durable workflow orchestration around ingestion and alert evaluation. That would make the control plane stronger while preserving SkyWeb as the polished analytics/member experience.
