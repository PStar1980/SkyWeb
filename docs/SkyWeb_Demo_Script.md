# SkyWeb Analytics Demo Script

This is a compact walkthrough for interviews, portfolio recordings, or live demos.

## 30-Second Opening

SkyWeb Analytics is my full-stack macro analytics platform. The frontend is React/Vite with Apache ECharts and D3 helpers, the API layer is ASP.NET Core/C# using Dapper and PostgreSQL, and the operational control plane remains in SkyServer for ingestion, automation, and alert evaluation. The app supports public macro exploration plus authenticated member dashboards, saved views, alerts, preferences, and signal workflows.

## Five-Minute Demo Flow

### 1. Architecture Setup

Start by explaining the boundary:

```text
SkyWeb.Client → SkyWeb.Api → PostgreSQL
SkyServer remains the ingestion/evaluation/control plane.
```

Mention that the .NET migration was done incrementally through DN phases and the old client has now been removed after validation.

### 2. Macro Dashboard

Open `/dashboard`.

Show the dashboard cards and charts. Explain that public macro reads are served natively by the ASP.NET Core API.

### 3. Indicator Detail With Alert Overlays

Open an indicator page, such as `/macro/indicators/FXUSDCAD`.

Show:

- ECharts chart runtime
- alert threshold overlays
- overlay mode control
- clean single-indicator metric UI

Explain that alert rules are not isolated from charts; they become visual context directly on the data surface.

### 4. Alert Rules and Signal Center

Open `/macro/alerts`, then `/macro/alerts/signals`.

Show:

- alert-rule CRUD and evaluation handoff
- severity/status treatment
- Signal Center lifecycle filters
- acknowledge/dismiss workflows

Mention that alert evaluation remains intentionally delegated to SkyServer because it owns the worker/evaluator path.

### 5. Dashboard Builder

Open `/dashboards`.

Show dashboard personalization: saved-view cards, direct indicator items, and layout/item configuration.

### 6. Close With Engineering Proof Points

End with:

- ASP.NET Core/C# API migration
- Dapper/Npgsql/PostgreSQL data layer
- authentication/session/permission model
- reusable chart architecture
- clear separation between analytics presentation and operational control plane

## Strong Closing Line

SkyWeb is designed as more than a dashboard: it is a working analytics product with identity, state, alerts, visual intelligence, and a clean backend boundary between member-facing analytics and operational automation.
