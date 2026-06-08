# SkyWeb Analytics .NET Transition Plan — Updated Execution Version

**Target:** Add an ASP.NET Core / C# API layer for SkyWeb Analytics while preserving the existing SkyServer Node.js control plane.

**Prepared from uploaded repositories:**

- `SkyWeb_RepoZip.zip`
- `SkyServer_RepoZip.zip`

**Updated purpose:** This version incorporates the final execution refinements before implementation: distinct `DN-*` migration numbering, proxy fallback scaffolding, JSON compatibility rules, `VITE_SKYWEB_API_BASE_URL` support, Phase 8.8 baseline capture, and an optional Node-vs-.NET contract comparison harness.

**Primary decision:** Build the new .NET implementation in parallel, prove it route-by-route, then cut over when stable.

---

## 1. Executive Summary

SkyWeb is currently a React/Vite analytics application. It does not contain its own backend API server. It calls SkyServer's Node/Express API through the shared `api.js` client.

SkyServer is currently the backend/control-plane repository. It contains:

- PostgreSQL database build/migration/seed tooling
- Node.js/Express API under `apps/api`
- Admin React app under `apps/admin-web`
- Worker daemon under `apps/worker`
- Macro ingestion tooling
- SkyWeb auth/profile/preferences/saved-views/dashboard/alert APIs
- Future Temporal workflow-orchestration path

The best transition is **not** to convert SkyServer to .NET right now.

Instead, create a new **SkyWeb-specific ASP.NET Core Web API** beside the current SkyWeb app. This gives strong C# proof-of-work while preserving SkyServer as the operational backend/control plane.

The target shape is:

```text
SkyServer
  Node.js / Express API
  React Admin-Web
  PostgreSQL DB build / migrations / seeds
  Worker / Scheduler / Listener runtime
  Future Temporal control plane

SkyWeb Analytics
  React / Vite frontend
  ASP.NET Core / C# API layer
  PostgreSQL read/write access for SkyWeb-facing features
  Apache ECharts + D3 chart layer
```

The migration should be done in parallel:

```text
apps/web                  existing SkyWeb React app, preserved as legacy baseline
apps/web-dotnet            new parallel implementation
  SkyWeb.Api               ASP.NET Core / C# API
  SkyWeb.Client            React / Vite client copied from existing apps/web
```

Once the new app reaches feature parity, `apps/web` can be deprecated and the new app can become the main SkyWeb implementation.

---

## 2. Numbering Rule for This Migration

The existing SkyWeb roadmap already used numbered phases, including the completed Phase 8 alert system work. To avoid confusion, this .NET transition uses a dedicated `DN-*` prefix.

```text
DN-0  Preserve Pre-.NET Baseline
DN-1  Create Parallel .NET App Structure
DN-2  Configure API, CORS, Health, DB Connection
DN-3  Wire SkyWeb.Client to SkyWeb.Api
DN-4  Implement Public Macro REST Endpoints in C#        [implemented]
DN-5  Implement Authentication in C#                   [implemented]
DN-5.1 Stabilize Public Macro Series Reads              [implemented]
DN-5.2 Fix Indicator Series Regclass/NaN Handling        [done]
DN-6  Implement SkyWeb Profile and Preferences           [current]
DN-7  Implement Saved Views and Dashboards
DN-8  Implement Alerts and Signal Center
DN-9  ECharts + D3 Migration
DN-10 Cutover and Legacy Removal
```

This keeps the historical SkyWeb feature phases separate from the .NET migration lane.

---

## 3. Current Repository Findings

## 3.1 Current SkyWeb structure

Current SkyWeb repo contains:

```text
SkyWeb/
  apps/web/
    index.html
    vite.config.js
    src/
      App.jsx
      components/
      context/
      pages/
      services/
      utils/
  docs/
  package.json
```

Current major frontend areas:

```text
apps/web/src/pages/
  Home.jsx
  MacroOverview.jsx
  MacroViews.jsx
  MacroViewDetail.jsx
  MacroIndicators.jsx
  MacroIndicatorDetail.jsx
  MacroAlerts.jsx
  MacroAlertDetail.jsx
  MacroAlertPreferences.jsx
  MacroAlertSignals.jsx
  MemberDashboard.jsx
  DashboardBuilder.jsx
  DashboardViewer.jsx
  Account.jsx
  Login.jsx
```

Current shared service files:

```text
apps/web/src/services/api.js
apps/web/src/services/authService.js
apps/web/src/services/macroService.js
```

Important current environment/config behavior:

```js
VITE_SKYSERVER_API_BASE_URL || '/api';
VITE_MACRO_API_PREFIX || '/public/macro';
VITE_SKYWEB_AUTH_APP_CODE || 'SKYWEB';
```

Current SkyWeb frontend calls these endpoint families:

```text
/api/auth/*
/api/public/macro/*
/api/skyweb/*
```

Because `api.js` uses `baseURL = VITE_SKYSERVER_API_BASE_URL || '/api'`, the frontend expects route paths such as:

```text
/auth/login
/public/macro/summary
/skyweb/profile
```

which become full API paths:

```text
/api/auth/login
/api/public/macro/summary
/api/skyweb/profile
```

---

## 3.2 Current SkyServer structure

Current SkyServer repo contains:

```text
SkyServer/
  apps/api/              Node.js / Express backend
  apps/admin-web/        React/Vite Admin UI
  apps/worker/           worker daemon runtime
  packages/db_build/     PostgreSQL migrations/seeds
  packages/ingestion/    macro ingestion pipelines
  packages/skyweb/       alert evaluator script
  scripts/db/            database schema/table/view/function SQL
```

Current SkyServer API mount points in `apps/api/src/server.js`:

```text
GET /_health
GET /_db/health

/api/public
/api/auth
/api/tools
/api/admin
/api/macro
/api/ingestion
/api/worker
/api/skyweb
```

Current public macro routes:

```text
GET /api/public/macro/summary
GET /api/public/macro/views
GET /api/public/macro/views/:viewKey/columns
GET /api/public/macro/views/:viewKey/latest
GET /api/public/macro/views/:viewKey
GET /api/public/macro/indicators
GET /api/public/macro/indicators/:indicatorCode/series
GET /api/public/macro/indicators/:indicatorCode
```

Current SkyWeb authenticated routes:

```text
GET    /api/skyweb/profile
PATCH  /api/skyweb/profile
GET    /api/skyweb/preferences
PATCH  /api/skyweb/preferences
GET    /api/skyweb/alert-preferences
PATCH  /api/skyweb/alert-preferences

GET    /api/skyweb/saved-views
POST   /api/skyweb/saved-views
PATCH  /api/skyweb/saved-views/:viewKey
DELETE /api/skyweb/saved-views/:viewKey

GET    /api/skyweb/dashboards
POST   /api/skyweb/dashboards
GET    /api/skyweb/dashboards/:dashboardKey
PATCH  /api/skyweb/dashboards/:dashboardKey
DELETE /api/skyweb/dashboards/:dashboardKey
POST   /api/skyweb/dashboards/:dashboardKey/items
PATCH  /api/skyweb/dashboards/:dashboardKey/items/:itemId
DELETE /api/skyweb/dashboards/:dashboardKey/items/:itemId

GET    /api/skyweb/alerts
POST   /api/skyweb/alerts
POST   /api/skyweb/alerts/evaluate
GET    /api/skyweb/alerts/:alertKey/events
GET    /api/skyweb/alerts/:alertKey
PATCH  /api/skyweb/alerts/:alertKey
DELETE /api/skyweb/alerts/:alertKey
POST   /api/skyweb/alerts/:alertKey/evaluate

GET    /api/skyweb/alert-notifications
POST   /api/skyweb/alert-notifications/acknowledge-all
POST   /api/skyweb/alert-notifications/dismiss-all
PATCH  /api/skyweb/alert-notifications/:notificationId/acknowledge
PATCH  /api/skyweb/alert-notifications/:notificationId/dismiss
```

Current auth routes:

```text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/change-password
GET  /api/auth/me
GET  /api/auth/permissions
```

---

## 4. Recommended Target Architecture

## 4.1 Keep SkyServer as Node.js

SkyServer should remain Node.js for now because it already owns:

- database build tooling
- ingestion processes
- worker runtime
- scheduler/listener framework
- Admin-Web APIs
- tool execution
- alert scheduled evaluation
- future Temporal TypeScript integration

Converting SkyServer to .NET now would be high-risk and low-return. It would force a rewrite of working operational infrastructure before the .NET proof-of-work is even established.

## 4.2 Add SkyWeb.Api as C#/.NET layer

SkyWeb should gain a new ASP.NET Core API layer.

This API becomes the user-facing analytics API for SkyWeb. It can read/write the existing PostgreSQL schemas while SkyServer continues to own schema creation, ingestion, automation, and admin operations.

Target flow:

```text
Browser
  ↓
SkyWeb.Client
React / Vite / ECharts / D3
  ↓ HTTP JSON
SkyWeb.Api
ASP.NET Core / C#
  ↓ SQL
PostgreSQL
```

SkyServer remains:

```text
SkyServer Admin-Web
  ↓
SkyServer Node API
  ↓
PostgreSQL + Worker + Future Temporal
```

## 4.3 PostgreSQL ownership rule

PostgreSQL remains the shared truth layer, but ownership must be explicit.

Recommended ownership:

| Area                                              | Owner                                                  |
| ------------------------------------------------- | ------------------------------------------------------ |
| database schema/migrations/seeds                  | SkyServer                                              |
| macro ingestion                                   | SkyServer                                              |
| worker/scheduler/listener automation              | SkyServer                                              |
| future Temporal workflows                         | SkyServer                                              |
| Admin-Web operational APIs                        | SkyServer Node API                                     |
| public macro read APIs for SkyWeb                 | SkyWeb.Api C# after migration                          |
| SkyWeb profile/preferences/saved views/dashboards | SkyWeb.Api C# after migration                          |
| scheduled alert evaluation                        | SkyServer worker initially                             |
| user alert display/notification actions           | SkyWeb.Api C# after migration                          |
| manual alert evaluate-now                         | proxy to SkyServer initially, native C# later optional |

This prevents both apps from becoming tangled.

---

## 5. Migration Guardrails

## 5.1 Parallel implementation only

Do **not** mutate the existing `apps/web` app directly.

Create the .NET version in parallel so the current working version remains safe.

Recommended structure:

```text
SkyWeb/
  apps/
    web/                         # existing working React app
    web-dotnet/
      SkyWeb.Api/                # new ASP.NET Core API
      SkyWeb.Client/             # copied React/Vite app
  docs/
  package.json                   # existing JS scripts remain
```

Benefits:

- rollback safety
- easy side-by-side comparison
- no destruction of working SkyWeb while learning .NET
- clean C# project structure
- clean portfolio story
- allows route-by-route migration
- allows final deprecation after successful cutover

Final cleanup after feature parity:

```text
apps/web              → archive or delete
apps/web-dotnet       → rename / promote to primary SkyWeb app
```

## 5.2 Proxy fallback bridge during migration

Early in the migration, the copied `SkyWeb.Client` should point to `SkyWeb.Api`. But not every endpoint will be native C# yet.

Use this temporary bridge:

```text
SkyWeb.Client
  → SkyWeb.Api
      → native C# endpoint if implemented
      → proxy to SkyServer Node API if not migrated yet
```

This allows the new client to run through the .NET API from the beginning without forcing full backend parity on day one.

Recommended first proxy categories:

```text
/api/auth/*                  until C# auth is implemented
/api/skyweb/*                until each feature family is implemented
/api/skyweb/alerts/evaluate  keep proxied initially even after alert CRUD moves
```

Important rule:

```text
Proxy fallback is migration scaffolding, not final architecture.
```

Each proxied family should be replaced with native C# implementation as its `DN-*` phase lands.

## 5.3 JSON compatibility and casing rule

The C# API must preserve the current JavaScript-facing response contract.

Use camelCase JSON output globally.

Example MVC configuration:

```csharp
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });
```

Add this import if needed:

```csharp
using System.Text.Json;
```

Response shape compatibility matters more than idiomatic C# DTO naming.

Validate:

- top-level keys
- nested key names
- date string format
- numeric values
- pagination keys
- error shapes
- 401 behavior

## 5.4 API base URL naming

The current client uses:

```js
VITE_SKYSERVER_API_BASE_URL;
```

For the copied .NET client, add support for the clearer variable while keeping backward compatibility:

```js
const baseURL =
  import.meta.env.VITE_SKYWEB_API_BASE_URL || import.meta.env.VITE_SKYSERVER_API_BASE_URL || '/api';
```

Recommended `.env.development` for the copied client:

```text
VITE_SKYWEB_API_BASE_URL=http://localhost:7280/api
VITE_SKYSERVER_API_BASE_URL=http://localhost:7280/api
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_API_TIMEOUT_MS=20000
```

After cutover, `VITE_SKYSERVER_API_BASE_URL` can be retired from SkyWeb.

---

## 6. C# Role in the Architecture

C# does **not** replace React.

C# becomes the backend/API language for SkyWeb.

React remains the frontend language/framework.

Correct mental model:

```text
React controls pages/components/charts.
C# controls API endpoints/data/business rules.
PostgreSQL stores the data.
ECharts/D3 render in the browser.
```

Example request flow:

```text
1. User opens /macro/indicators/CPI
2. React loads MacroIndicatorDetail.jsx
3. React calls GET /api/public/macro/indicators/CPI/series
4. ASP.NET Core controller receives request
5. C# service queries PostgreSQL
6. C# returns JSON
7. React passes JSON into ECharts component
8. Browser renders chart
```

C# does not directly call chart components. React calls the API, receives data, and renders charts.

---

## 7. GraphQL Answer

Yes, ASP.NET Core has GraphQL options.

The strongest common option is:

```text
Hot Chocolate GraphQL
```

Node equivalent:

```text
Express + Apollo Server / GraphQL Yoga
```

.NET equivalent:

```text
ASP.NET Core + Hot Chocolate
```

Recommendation for this migration:

```text
Start with REST.
Add GraphQL later only if dashboard data composition becomes painful.
```

Reason: SkyWeb already uses clean REST endpoint families, and the immediate goal is a stable .NET/C# transition plus chart upgrade. GraphQL is valuable, but it should not be introduced during the first migration wave.

Future GraphQL use case:

```graphql
query Dashboard($dashboardKey: String!) {
  dashboard(key: $dashboardKey) {
    dashboardKey
    title
    items {
      itemId
      itemType
      indicator {
        indicatorCode
        description
        series(period: "5Y") {
          date
          value
        }
      }
    }
  }
}
```

This would be powerful later, but REST is the safer first step.

---

## 8. Technology Choices

## 8.1 Backend: SkyWeb.Api

Recommended stack:

```text
ASP.NET Core Web API
C#
PostgreSQL
Npgsql
Dapper
Swagger/OpenAPI
Custom bearer-token session middleware
BCrypt.Net-Next for password verification if login is implemented natively
```

Why Dapper first:

- matches the existing SQL-first development style
- keeps SQL visible and controlled
- avoids ORM complexity during first migration
- works well with existing database views/tables
- strong for analytics/read-heavy APIs

Entity Framework Core can be added later if needed, but Dapper is better for this first version.

## 8.2 Frontend: SkyWeb.Client

Recommended stack:

```text
React
Vite
JavaScript first, TypeScript later optional
Axios
React Router
Bootstrap / existing styling
Apache ECharts
D3.js
```

Do not move to Blazor.

## 8.3 Charting

Recommended chart split:

```text
Apache ECharts = primary chart renderer
D3.js = specialized visualization/data-shaping toolkit
```

ECharts should replace current custom SVG sparkline components over time.

Current chart components to migrate:

```text
components/Sparkline.jsx
components/MultiSeriesSparkline.jsx
components/ChartPanel.jsx
components/DashboardItemVisualization.jsx
components/MetricQuickCard.jsx
components/TrendMetricCard.jsx
```

---

# 9. .NET Migration Phases

---

# DN-0 — Preserve Pre-.NET Baseline

## Goal

Freeze the current working state before creating the .NET branch/lane.

## Tasks

1. Commit current SkyWeb and SkyServer states.
2. Generate fresh repo zips/maps.
3. Confirm current SkyWeb runs against SkyServer.
4. Confirm current SkyServer API starts.
5. Confirm existing SkyWeb routes work:
   - `/`
   - `/login`
   - `/account`
   - `/macro`
   - `/macro/views`
   - `/macro/views/:viewKey`
   - `/macro/indicators`
   - `/macro/indicators/:indicatorCode`
   - `/dashboard`
   - `/dashboards`
   - `/dashboards/:dashboardKey`
   - `/dashboards/:dashboardKey/presentation`
   - `/macro/alerts`
   - `/macro/alerts/signals`
   - `/macro/alerts/preferences`
   - `/macro/alerts/:alertKey`
   - `/macro/alerts?edit=:alertKey`
6. Capture completed alert-system state:
   - alert rules
   - event history
   - scheduled evaluation visibility
   - triggered notification queue
   - app-wide signal surfacing
   - alert preferences
   - dedicated Signal Center
   - alert-rule UX polish
   - search/filter/sort
   - inline edit
   - clone rule
   - safer remove confirmation
7. Add a marker doc:

```text
docs/SkyWeb_PreDotNet_Baseline.md
```

## Suggested baseline doc contents

```text
# SkyWeb Pre-.NET Baseline

Date: YYYY-MM-DD
Source repos: SkyWeb + SkyServer
Current SkyWeb phase: Phase 8.8 — Alert Rule UX Polish
Current backend: SkyServer Node/Express API
Current frontend: apps/web React/Vite

Baseline routes validated:
- /macro
- /macro/views
- /macro/views/:viewKey
- /macro/indicators
- /macro/indicators/:indicatorCode
- /dashboard
- /dashboards
- /dashboards/:dashboardKey
- /dashboards/:dashboardKey/presentation
- /macro/alerts
- /macro/alerts/signals
- /macro/alerts/preferences
- /macro/alerts/:alertKey
- /macro/alerts?edit=:alertKey

Baseline preserved before creating apps/web-dotnet.
```

## Acceptance Criteria

- Current SkyWeb still builds.
- Current SkyWeb still connects to SkyServer.
- Current SkyServer API still starts.
- Baseline marker doc is added.
- No .NET changes yet.

---

# DN-1 — Create Parallel .NET App Structure

## Goal

Create the new parallel app without disrupting the current app.

## Recommended folder structure

```text
SkyWeb/
  apps/
    web/
    web-dotnet/
      SkyWeb.DotNet.sln
      SkyWeb.Api/
      SkyWeb.Client/
```

## Suggested commands

From the SkyWeb repo root:

```powershell
mkdir apps\web-dotnet
cd apps\web-dotnet

dotnet new sln -n SkyWeb.DotNet

dotnet new webapi -n SkyWeb.Api -o SkyWeb.Api

dotnet sln add .\SkyWeb.Api\SkyWeb.Api.csproj
```

Then copy the existing frontend:

```powershell
# From SkyWeb root
Copy-Item -Recurse .\apps\web .\apps\web-dotnet\SkyWeb.Client
```

## Add initial API packages

From `apps/web-dotnet/SkyWeb.Api`:

```powershell
dotnet add package Npgsql
dotnet add package Dapper
dotnet add package BCrypt.Net-Next
dotnet add package Swashbuckle.AspNetCore
```

## Acceptance Criteria

- `dotnet run` starts `SkyWeb.Api`.
- `SkyWeb.Client` still runs with Vite.
- Existing `apps/web` remains untouched.
- The new folder structure can be committed independently.

---

# DN-2 — Configure API, CORS, Health, DB Connection

## Goal

Make the C# API connect to PostgreSQL and expose basic health endpoints.

## Suggested C# API folders

```text
SkyWeb.Api/
  Controllers/
    HealthController.cs
  Data/
    DbConnectionFactory.cs
  Middleware/
  Models/
  DTOs/
  Services/
  Options/
  Program.cs
  appsettings.json
  appsettings.Development.json
```

## API config keys

Use `appsettings.Development.json`, user secrets, or environment variables:

```json
{
  "ConnectionStrings": {
    "SkyDb": "Host=localhost;Port=5432;Database=skyserver;Username=postgres;Password=..."
  },
  "Auth": {
    "SessionMinutes": 720,
    "ApplicationCode": "SKYWEB"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
  },
  "SkyServer": {
    "BaseUrl": "http://localhost:7171/api"
  }
}
```

## Health endpoints

Implement:

```text
GET /_health
GET /_db/health
```

Return shapes can mirror SkyServer style:

```json
{
  "ok": true,
  "service": "SkyWeb.Api",
  "database": "skyserver",
  "timestamp": "2026-06-06T00:00:00.000Z"
}
```

## Add JSON compatibility config

Add global camelCase JSON serialization during this phase.

## Acceptance Criteria

- `GET /_health` works.
- `GET /_db/health` connects to the same PostgreSQL database.
- Swagger loads.
- CORS allows the new React client.
- JSON output uses camelCase.

---

# DN-3 — Wire SkyWeb.Client to SkyWeb.Api

## Goal

Make the copied React client talk to the new ASP.NET Core API.

## Update Vite environment

In the new client, use:

```text
apps/web-dotnet/SkyWeb.Client/.env.development
```

Suggested values:

```text
VITE_SKYWEB_API_BASE_URL=http://localhost:7280/api
VITE_SKYSERVER_API_BASE_URL=http://localhost:7280/api
VITE_MACRO_API_PREFIX=/public/macro
VITE_SKYWEB_AUTH_APP_CODE=SKYWEB
VITE_API_TIMEOUT_MS=20000
```

## Update API client base URL logic

In the copied `SkyWeb.Client`, update `api.js` to prefer the new variable:

```js
const baseURL =
  import.meta.env.VITE_SKYWEB_API_BASE_URL || import.meta.env.VITE_SKYSERVER_API_BASE_URL || '/api';
```

Do not make this change to the original `apps/web` unless intentionally backporting later.

## Add temporary proxy fallback

Add an API proxy service/controller in `SkyWeb.Api` for endpoint families not yet ported.

Initial practical bridge:

```text
/api/auth/*       → proxy to SkyServer Node until DN-5
/api/skyweb/*     → proxy to SkyServer Node until DN-6/DN-7/DN-8
```

Public macro endpoints became the first native C# route family in DN-4. DN-5 moves `/api/auth/*` into native ASP.NET Core/C# while `/api/skyweb/*` remains on proxy fallback until DN-6 through DN-8.

## Acceptance Criteria

- New client starts independently.
- New client calls `SkyWeb.Api`, not SkyServer Node API directly.
- Existing old client still works against SkyServer.
- Unimplemented endpoints can still function through proxy fallback.

---

# DN-4 — Implement Public Macro REST Endpoints in C#

## DN-4 implementation note

This phase replaced the `/api/public/macro/*` proxy fallback with native ASP.NET Core/C# endpoints. The temporary proxy bridge remained active for `/api/auth/*` and `/api/skyweb/*` until later route-family migrations.

## Goal

Recreate public macro endpoints first because they are read-only and lower risk.

## Endpoints to implement first

```text
GET /api/public/macro/summary
GET /api/public/macro/views
GET /api/public/macro/views/{viewKey}/columns
GET /api/public/macro/views/{viewKey}/latest
GET /api/public/macro/views/{viewKey}
GET /api/public/macro/indicators
GET /api/public/macro/indicators/{indicatorCode}
GET /api/public/macro/indicators/{indicatorCode}/series
```

## C# files

```text
Controllers/PublicMacroController.cs
Services/PublicMacroService.cs
Services/MacroReadService.cs
DTOs/Macro/
```

## Important compatibility rule

Match the existing JSON response shapes exactly where practical.

Examples:

```json
{
  "ok": true,
  "items": []
}
```

```json
{
  "ok": true,
  "indicator": {},
  "stats": {},
  "total": 0,
  "limit": 250,
  "offset": 0,
  "items": []
}
```

## Current service behavior to preserve

Public macro service currently applies these defaults/maxes:

```text
view rows default limit: 50
view rows max limit: 250
indicator default limit: 250
indicator max limit: 500
series default limit: 250
series max limit: 1000
active indicators default: active=true
```

Preserve these behaviors initially.

## Acceptance Criteria

- Macro overview page works from C# API.
- Macro views catalog works from C# API.
- Macro view detail works from C# API.
- Macro indicators page works from C# API.
- Macro indicator detail works from C# API.
- Response shapes compare cleanly with existing SkyServer Node endpoints.

---

# DN-5 — Implement Authentication in C#

## DN-5 implementation note

This phase replaces the `/api/auth/*` proxy fallback with native ASP.NET Core/C# endpoints while preserving the existing opaque bearer-token contract. Sessions remain stored in `auth.sessions` as SHA-256 token hashes, permissions are still read from `auth.vw_user_permissions`, and login/audit events continue to write into the existing auth schema. The remaining `/api/skyweb/*` route families stay on the proxy bridge until DN-6 through DN-8.

## DN-5.2 stabilization note

The native C# indicator-series endpoint needs to account for PostgreSQL-specific types and values that Node handled more loosely. `to_regclass(...)` returns `regclass`, which Npgsql should not materialize through `System.Object`; cast it to `text` before reading. Indicator value columns can also contain PostgreSQL numeric `NaN`, which should surface to the React client as `null` rather than causing JSON or numeric materialization failures.

## Goal

Allow the new SkyWeb.Client to log in through SkyWeb.Api.

## Recommended approach

Implement native C# auth against the existing PostgreSQL auth schema.

Reason: this is valuable C# proof-of-work and avoids permanently depending on the Node API for user session validation.

## Auth routes to implement

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/auth/permissions
POST /api/auth/change-password     # optional later; not first-wave required
```

## Existing auth model to mirror

Current Node auth:

- validates users from `auth.users`
- verifies password with bcrypt
- checks app access for `SKYWEB`
- creates a random session token
- stores `sha256(token)` in `auth.sessions.session_token_hash`
- returns raw `sessionToken` to browser
- validates bearer token by hashing token and checking active session
- extends session expiry on activity using `AUTH_SESSION_MINUTES`
- loads permissions from `auth.vw_user_permissions`

## C# packages/features

```text
BCrypt.Net-Next                         password verification
System.Security.Cryptography.SHA256     session token hashing
RandomNumberGenerator                   session token creation
Dapper + Npgsql                         database access
```

## Important behavior

Preserve inactivity-based sliding expiry:

```sql
UPDATE auth.sessions
SET last_seen_at = CURRENT_TIMESTAMP,
    expires_at = CURRENT_TIMESTAMP + (:sessionMinutes * INTERVAL '1 minute')
WHERE session_token_hash = :hash
  AND revoked_at IS NULL
  AND expires_at > CURRENT_TIMESTAMP
```

## Middleware

Create:

```text
Middleware/SkyWebAuthMiddleware.cs
Services/AuthService.cs
Services/PermissionService.cs
DTOs/Auth/
```

The middleware should populate a request-scoped user/session context equivalent to Node's:

```text
req.user
req.session
req.permissions
```

C# equivalent:

```text
HttpContext.Items["SkyUser"]
HttpContext.Items["SkySession"]
HttpContext.Items["SkyPermissions"]
```

or a typed scoped service.

## Acceptance Criteria

- Login works through C# API.
- Session token is stored by current frontend unchanged.
- Protected routes work.
- Expired/invalid token returns 401.
- Frontend auth-expired event still works.
- `/account` loads current profile after login.

---

# DN-6 — Implement SkyWeb Profile and Preferences

## Goal

Move core authenticated user features to the C# API.

## Endpoints

```text
GET   /api/skyweb/profile
PATCH /api/skyweb/profile
GET   /api/skyweb/preferences
PATCH /api/skyweb/preferences
GET   /api/skyweb/alert-preferences
PATCH /api/skyweb/alert-preferences
```

## Current database areas

Relevant SkyServer migrations/views indicate:

```text
skyweb.user_profiles
skyweb.user_preferences
skyweb.vw_user_profiles
skyweb.vw_user_preferences
```

## Permission behavior to preserve

Current Node routes require permissions such as:

```text
SKYWEB_PROFILE_READ
SKYWEB_PROFILE_WRITE
SKYWEB_PREFERENCES_READ
SKYWEB_PREFERENCES_WRITE
SKYWEB_ALERT_READ
SKYWEB_ALERT_WRITE
```

Use a C# permission filter/attribute or service method.

## Acceptance Criteria

- Account/profile page works.
- Preferences load and save.
- Alert preferences load and save.
- Existing React contexts continue to work.

## DN-6 implementation note

DN-6 moves the first authenticated SkyWeb user-owned route family into native ASP.NET Core/C#:

```text
GET   /api/skyweb/profile
PATCH /api/skyweb/profile
GET   /api/skyweb/preferences
PATCH /api/skyweb/preferences
GET   /api/skyweb/alert-preferences
PATCH /api/skyweb/alert-preferences
```

These endpoints keep the existing React response contract and database objects:

```text
skyweb.user_profiles
skyweb.user_preferences
skyweb.vw_user_profiles
skyweb.vw_user_preferences
```

The .NET implementation preserves SkyWeb session enforcement, permission checks, default preference insertion, preference validation, and JSONB storage. The remaining `/api/skyweb/*` families continue through the temporary SkyServer proxy until DN-7 and DN-8.

---

# DN-7 — Implement Saved Views and Dashboards

## Goal

Move user-owned dashboard and saved-view features to C#.

## Saved views endpoints

```text
GET    /api/skyweb/saved-views
POST   /api/skyweb/saved-views
PATCH  /api/skyweb/saved-views/{viewKey}
DELETE /api/skyweb/saved-views/{viewKey}
```

## Dashboard endpoints

```text
GET    /api/skyweb/dashboards
POST   /api/skyweb/dashboards
GET    /api/skyweb/dashboards/{dashboardKey}
PATCH  /api/skyweb/dashboards/{dashboardKey}
DELETE /api/skyweb/dashboards/{dashboardKey}
POST   /api/skyweb/dashboards/{dashboardKey}/items
PATCH  /api/skyweb/dashboards/{dashboardKey}/items/{itemId}
DELETE /api/skyweb/dashboards/{dashboardKey}/items/{itemId}
```

## Relevant database areas

```text
skyweb.saved_macro_views
skyweb.user_dashboards
skyweb.dashboard_items / related migration tables
skyweb.vw_saved_macro_views
```

## Acceptance Criteria

- Macro Views save/remove/pin/edit metadata works.
- Dashboard builder works.
- Dashboard viewer works.
- Presentation route still renders.
- Dashboard item visualization modes still render.

---

# DN-8 — Implement Alerts and Signal Center

## Goal

Move user-facing alert surfaces to C# while keeping scheduled execution in SkyServer worker initially.

## User-facing alert endpoints

```text
GET    /api/skyweb/alerts
POST   /api/skyweb/alerts
GET    /api/skyweb/alerts/{alertKey}
PATCH  /api/skyweb/alerts/{alertKey}
DELETE /api/skyweb/alerts/{alertKey}
GET    /api/skyweb/alerts/{alertKey}/events

GET    /api/skyweb/alert-notifications
PATCH  /api/skyweb/alert-notifications/{notificationId}/acknowledge
PATCH  /api/skyweb/alert-notifications/{notificationId}/dismiss
POST   /api/skyweb/alert-notifications/acknowledge-all
POST   /api/skyweb/alert-notifications/dismiss-all
```

## Evaluation endpoints

Current frontend also calls:

```text
POST /api/skyweb/alerts/evaluate
POST /api/skyweb/alerts/{alertKey}/evaluate
```

Recommended first implementation:

```text
Proxy these two evaluation endpoints from SkyWeb.Api to SkyServer Node API.
```

Reason:

- scheduled alert evaluation is already wired into SkyServer worker
- `packages/skyweb/src/evaluateSkyWebAlerts.js` already exists
- duplicating evaluator logic in C# during the first migration adds risk
- C# can still own CRUD/read/notification actions first

Later optional improvement:

```text
Port alert evaluation logic to C# or expose it as a Temporal workflow from SkyServer.
```

Long-term preferred route after Temporal:

```text
SkyWeb.Api
  → request evaluate-now
SkyServer API
  → starts Temporal workflow/activity
Temporal worker
  → evaluates alert(s)
PostgreSQL
  → stores events/notifications
SkyWeb.Api
  → reads updated result
```

## Acceptance Criteria

- Alert cockpit works.
- Alert detail works.
- Signal Center works.
- Acknowledge/dismiss actions work.
- Evaluate-now works via proxy or native implementation.
- Scheduled evaluation remains working through SkyServer worker.

---

# DN-9 — ECharts + D3 Migration

## Goal

Upgrade charting after API stability is proven.

## Install packages in new SkyWeb.Client

```powershell
cd apps\web-dotnet\SkyWeb.Client
npm install echarts echarts-for-react d3
```

## Recommended chart folder structure

```text
src/components/charts/
  adapters/
    macroSeriesAdapter.js
    viewSeriesAdapter.js
    dashboardSeriesAdapter.js
  echarts/
    EChartBase.jsx
    MacroLineChart.jsx
    MultiSeriesMacroChart.jsx
    DashboardChartCard.jsx
    AlertOverlayChart.jsx
  d3/
    YieldCurveVisualizer.jsx
    MacroRegimeMap.jsx
    RecessionTimeline.jsx
    CorrelationHeatmap.jsx
  shared/
    chartTheme.js
    chartOptions.js
    chartUtils.js
```

## Migration order

1. Add `EChartBase.jsx`.
2. Replace `Sparkline.jsx` usage in single-series contexts with `MacroLineChart.jsx`.
3. Replace `MultiSeriesSparkline.jsx` usage with `MultiSeriesMacroChart.jsx`.
4. Update `ChartPanel.jsx` to call the new chart components.
5. Update `DashboardItemVisualization.jsx` to use ECharts for dashboard chart cards.
6. Add alert overlays later.
7. Keep old SVG components temporarily as fallback.

## Acceptance Criteria

- Indicator detail chart renders with ECharts.
- Macro view detail multi-series chart renders with ECharts.
- Dashboard chart cards render with ECharts.
- Tooltips, axes, zoom, and responsive resizing work.
- Old chart components can be removed after replacement is complete.

---

# DN-10 — Cutover and Legacy Removal

## Goal

Promote the .NET version after feature parity.

## Cutover checklist

1. `SkyWeb.Api` supports required endpoints.
2. `SkyWeb.Client` works against `SkyWeb.Api`.
3. Auth works.
4. Public macro pages work.
5. User dashboard pages work.
6. Alerts and Signal Center work.
7. ECharts migration is stable.
8. Old `apps/web` remains untouched and buildable until final decision.
9. README updated.
10. Screenshots captured for portfolio.
11. Repo map regenerated.
12. Repo zip regenerated.

## Final cleanup options

Option A:

```text
apps/web              → apps/web-legacy
apps/web-dotnet       → apps/web
```

Option B:

```text
apps/web              → delete after archive tag
apps/web-dotnet       → apps/web
```

Option C:

```text
keep both until job portfolio screenshots and README are finalized
```

Recommended: Option A first, then Option B later.

---

## 10. API Migration Inventory

## 10.1 Public macro endpoints

| Existing endpoint                                        | C# migration priority | Notes                     |
| -------------------------------------------------------- | --------------------: | ------------------------- |
| `GET /api/public/macro/summary`                          |                     1 | Macro overview dependency |
| `GET /api/public/macro/views`                            |                     1 | Macro views catalog       |
| `GET /api/public/macro/views/:viewKey`                   |                     1 | View detail table/chart   |
| `GET /api/public/macro/views/:viewKey/latest`            |                     1 | Latest row surfaces       |
| `GET /api/public/macro/views/:viewKey/columns`           |                     1 | Chart/table metadata      |
| `GET /api/public/macro/indicators`                       |                     1 | Indicator explorer        |
| `GET /api/public/macro/indicators/:indicatorCode`        |                     1 | Indicator detail          |
| `GET /api/public/macro/indicators/:indicatorCode/series` |                     1 | Indicator charts          |

## 10.2 Auth endpoints

| Existing endpoint                | C# migration priority | Notes                                |
| -------------------------------- | --------------------: | ------------------------------------ |
| `POST /api/auth/login`           |                     2 | Required for protected pages         |
| `POST /api/auth/logout`          |                     2 | Revoke session                       |
| `GET /api/auth/me`               |                     2 | Auth context                         |
| `GET /api/auth/permissions`      |                     2 | Optional if `me` returns permissions |
| `POST /api/auth/change-password` |                     4 | Can come later                       |

## 10.3 SkyWeb user endpoints

| Existing endpoint family | C# migration priority | Notes                                 |
| ------------------------ | --------------------: | ------------------------------------- |
| profile                  |                     3 | Account page                          |
| preferences              |                     3 | Density/chart/dashboard prefs         |
| alert preferences        |                     3 | Alert preferences page                |
| saved views              |                     4 | Macro catalog saved/pinned state      |
| dashboards               |                     4 | Dashboard builder/viewer              |
| alert rules              |                     5 | Alert cockpit/detail                  |
| alert notifications      |                     5 | Signal Center                         |
| alert evaluate-now       |         5 proxy first | Keep evaluator in SkyServer initially |

---

## 11. Recommended Development Order

This is the practical execution sequence.

```text
1. Commit baseline.
2. Add docs/SkyWeb_PreDotNet_Baseline.md.
3. Create apps/web-dotnet.
4. Create SkyWeb.Api.
5. Copy apps/web to SkyWeb.Client.
6. Add health + DB health.
7. Add CORS + Swagger + JSON casing config.
8. Wire SkyWeb.Client to SkyWeb.Api using VITE_SKYWEB_API_BASE_URL.
9. Add temporary proxy fallback for not-yet-migrated route families.
10. Implement public macro endpoints natively in C#.
11. Confirm all public macro pages work.
12. Implement auth/login/session validation.
13. Confirm protected shell works.
14. Implement profile/preferences.
15. Implement saved views.
16. Implement dashboards.
17. Implement alerts/notifications.
18. Proxy evaluate-now to SkyServer.
19. Add ECharts/D3.
20. Replace chart components.
21. QA against old SkyWeb.
22. Update README/portfolio docs.
23. Deprecate old app.
```

---

## 12. Validation Plan

## 12.1 Backend validation

Use Swagger, browser, or Postman.

Minimum checks:

```text
GET /_health
GET /_db/health
GET /api/public/macro/summary
GET /api/public/macro/views
GET /api/public/macro/indicators
POST /api/auth/login
GET /api/auth/me
GET /api/skyweb/profile
GET /api/skyweb/preferences
GET /api/skyweb/dashboards
GET /api/skyweb/alerts
GET /api/skyweb/alert-notifications
```

## 12.2 Frontend validation

Check these routes:

```text
/
/login
/account
/macro
/macro/views
/macro/views/:viewKey
/macro/indicators
/macro/indicators/:indicatorCode
/dashboard
/dashboards
/dashboards/:dashboardKey
/dashboards/:dashboardKey/presentation
/macro/alerts
/macro/alerts/preferences
/macro/alerts/signals
/macro/alerts/:alertKey
/macro/alerts?edit=:alertKey
```

## 12.3 Comparison validation

For each endpoint, compare old Node response and new C# response.

Example:

```text
Old: http://localhost:7171/api/public/macro/summary
New: http://localhost:7280/api/public/macro/summary
```

Validate:

- top-level keys
- item key names
- date formats
- numeric formats
- pagination fields
- error status behavior
- auth 401 behavior

## 12.4 Optional contract comparison harness

Create a small validation script during or after DN-4:

```text
scripts/compareNodeVsDotNet.js
```

Suggested behavior:

```text
- load a list of endpoint pairs
- call old Node endpoint
- call new C# endpoint
- compare top-level response keys
- compare important nested keys
- report missing/extra keys
- optionally dump response snapshots to docs/validation/
```

Example endpoint pair:

```text
Node:   http://localhost:7171/api/public/macro/summary
DotNet: http://localhost:7280/api/public/macro/summary
```

This script is not mandatory for the first .NET skeleton, but it is strongly recommended before migrating the larger authenticated endpoint families.

---

## 13. Risks and Controls

| Risk                                     | Control                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Breaking working SkyWeb                  | parallel implementation                                           |
| Auth drift                               | mirror current opaque bearer-token model first                    |
| Duplicated business logic                | migrate route families in order; keep evaluator proxied initially |
| Shared DB write conflicts                | define ownership boundaries                                       |
| Too much at once                         | public macro first, auth second, dashboards/alerts later          |
| Chart migration chaos                    | finish API stability before ECharts/D3 replacement                |
| SkyServer/Temporal delay                 | leave SkyServer Node untouched during SkyWeb migration            |
| Inconsistent JSON shapes                 | compare old/new endpoint responses                                |
| CORS/dev proxy confusion                 | use explicit env vars and fixed dev ports                         |
| C# casing drift                          | enforce camelCase JSON globally                                   |
| Client partially broken during migration | use temporary proxy fallback bridge                               |

---

## 14. Career / Portfolio Positioning

Once complete, SkyWeb can be described as:

> Full-stack macroeconomic analytics platform built with React, ASP.NET Core Web API, C#, PostgreSQL, REST APIs, authenticated user dashboards, alert-rule workflows, and advanced charting with Apache ECharts and D3.

SkyServer can be described separately as:

> Node.js/React/PostgreSQL admin and automation control plane with ingestion pipelines, worker scheduling, script execution, database build tooling, operational dashboards, and planned Temporal workflow orchestration.

Together, the Sky ecosystem demonstrates:

- React frontend development
- ASP.NET Core / C# API development
- Node.js backend/admin development
- PostgreSQL database design
- REST API design
- authentication/session management
- dashboard/data visualization
- macroeconomic analytics
- automation architecture
- future Temporal workflow orchestration

That is a very strong job-market proof package.

---

## 15. Immediate Execution Slice

Start with a tight first implementation pass:

```text
DN-0 — Preserve Pre-.NET Baseline
DN-1 — Create Parallel .NET App Structure
DN-2 — Configure API, CORS, Health, DB Connection
```

Expected first implementation output:

```text
SkyWeb/
  apps/web-dotnet/
    SkyWeb.DotNet.sln
    SkyWeb.Api/
    SkyWeb.Client/
  docs/SkyWeb_PreDotNet_Baseline.md
```

First acceptance checkpoint:

```text
dotnet run works
/_health works
/_db/health works
Swagger loads
SkyWeb.Client still starts
old apps/web remains untouched
```

This gives a safe foundation before any endpoint migration begins.

---

## 16. Final Recommendation

Proceed with the parallel .NET migration.

Do **not** convert SkyServer to .NET.

Do **not** mutate the current `apps/web` in place.

Build:

```text
apps/web-dotnet/SkyWeb.Api
apps/web-dotnet/SkyWeb.Client
```

Then migrate in this order:

```text
baseline → structure → health/db → client wiring/proxy → public macro → auth → profile/preferences → saved views/dashboards → alerts → charts → cutover
```

This gives the safest technical path and the best portfolio outcome.

The big architectural win is:

```text
SkyWeb becomes the C# / ASP.NET Core / React analytics proof-of-work.
SkyServer remains the Node.js / Temporal-ready automation control plane.
```

That is the clean split.
