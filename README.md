# SkyWeb Analytics

SkyWeb Analytics is the public-facing analytics layer for the Sky ecosystem. It consumes curated SkyServer APIs and presents polished dashboards, macroeconomic views, and future personalized user experiences.

SkyServer Admin remains the private control plane: ingestion, tools, automation, access control, audit, and operational configuration. SkyWeb Analytics is the presentation layer that turns those curated data services into public and user-facing experiences.

## Current Status

**Phase 8.8 — Alert Rule UX Polish**

**.NET transition lane:** DN-0 through DN-2 foundation added. The existing `apps/web` React/Vite app remains the working baseline, while `apps/web-dotnet` now contains the parallel ASP.NET Core/C# API skeleton and copied React client for the migration path.

SkyWeb Analytics has been converted from its original starter/NeoFinTech placeholder into a dedicated public analytics shell, is wired to SkyServer public macro APIs, has a first-pass authenticated member shell, includes editable private member profile and dashboard-preference surfaces backed by SkyServer, consumes those preferences across macro catalog, chart, landing, and density surfaces, includes a polished personalized saved-view watchlist surface, composes pinned saved views into a private `/dashboard` command board, supports first-class user-owned dashboard objects through a protected `/dashboards` builder surface, promotes a selected custom dashboard into the primary `/dashboard` cockpit with dedicated viewer routes, now lets dashboard items render as metric cards, mini charts, latest-row panels, and table previews instead of only saved-view cards, applies dashboard item width/height metadata through a responsive grid layout engine, includes screenshot-ready dashboard presentation routes for clean portfolio captures and PDF/print output, consolidates saved-view management into the main Macro Views catalog so save/remove, pin/unpin, and metadata edits happen directly from the outer card layer, and now consolidates macro navigation behind a Macro dropdown while making `/dashboard` the switchable custom-dashboard cockpit, begins the dashboard-card refactor from view-centric cards to direct indicator-based time-series cards, and redefines macro views as analytical lenses with multi-series chart selection, precision chart axes, hover coordinate tooltips, full-history loading, 50-row paginated data tables, time-based period filters, table-first exploration, a full-width analytics workspace layout for chart/dashboard/table-heavy routes, and the first user-owned macro alert-rule surface for indicator and view-metric threshold watches with scheduled evaluation, event history, an actionable triggered-signal notification queue, a global signal badge, dashboard alert summary, Macro Overview signal strip, and user-owned alert preference controls for in-app surfacing, severity filters, delivery mode staging, quiet-hours staging, future email/browser toggles, and a dedicated `/macro/alerts/signals` signal center with status/severity filtering, sorting, per-signal actions, bulk open-signal acknowledge/dismiss controls, and a polished alert-rule cockpit with search/filter/sort, edit mode, cloning, safer removal confirmation, clearer validation, and direct edit handoff from rule detail pages.

Implemented foundation pieces:

- Single root `package.json`
- Root `.env.example`
- Vite dev proxy to SkyServer API
- SkyWeb Analytics branding and navigation
- Shared API client
- Macro API service layer
- Public-facing home page
- Macro dashboard overview with live summary metrics
- Curated view cards with coverage metadata
- View detail pages with latest-row and preview-table surfaces
- Indicator explorer with source/frequency filtering and indicator drilldown pages
- Indicator detail route with chart preview and latest series table
- Public macro API namespace: `/api/public/macro/*`
- SkyWeb Analytics login/session context using app-scoped `SKYWEB` authentication
- Protected `/account` route backed by `/api/skyweb/profile`
- Editable account/profile UI for display name, headline, bio, timezone, locale, and avatar URL
- Editable dashboard-preference UI for default macro region, macro category, chart period, dashboard density, and preferred landing page
- Preference-aware macro catalog defaults that respect saved region/category unless URL filters are present
- Preference-aware chart periods for macro view drilldowns
- Full-history view and indicator detail loads with 50-row paginated analytical tables
- Full-width analytics workspace shell for macro, view, indicator, dashboard, builder, and presentation routes
- Protected `/macro/alerts` route for user-owned macro alert rules
- Alert-rule creation for direct indicators or numeric view metrics
- Manual alert evaluation against the latest/previous macro observations
- Alert inventory cards showing status, severity, target, threshold, latest value, and evaluation history summary
- Alert evaluation history pages showing manual/scheduled source, observed values, thresholds, and messages
- Triggered alert notifications surfaced on Macro Alerts with acknowledge/dismiss actions
- Macro dropdown alert badge showing open triggered signals
- Global navbar signal pill near the account controls for open triggered alerts
- Macro Dashboard alert summary card showing open signals, triggered rules, highest severity, and last evaluation
- Macro Overview triggered-signal strip for authenticated users with open notifications
- Alert lifecycle copy clarified for open, acknowledged, dismissed, triggered, and not-triggered states
- Shared alert-signal helpers for severity labels, status labels, target links, and notification refresh events
- Severity-aware styling for low, medium, high, and critical alert signals
- Protected `/macro/alerts/preferences` route for alert delivery preferences and surfacing controls
- Alert preferences backed by SkyServer `/api/skyweb/alert-preferences`
- In-app signal surfacing respects enabled state, minimum severity, and severity-channel preferences on navbar, dashboard, and Macro Overview surfaces
- Future delivery toggles for email, browser push, digest cadence, and quiet hours are stored without activating external delivery yet
- Protected `/macro/alerts/signals` route for a dedicated alert Signal Center
- Signal Center status, severity, and sort controls for open, acknowledged, dismissed, and historical notifications
- Bulk acknowledge and bulk dismiss controls for open signals, including severity-scoped batches
- Alert rule inventory search, status/severity/target filtering, and sort controls
- Inline alert-rule edit mode that preserves each rule's existing event and signal history
- Alert-rule clone staging for quickly creating variants without immediately activating duplicates
- Remove confirmation and client-side validation for missing target, metric, or numeric threshold values
- Alert detail pages can hand off directly into alert-rule edit mode
- Global Signals pill and Macro Overview/Dashboard signal links now route to the dedicated Signal Center
- App-level dashboard density classes for comfortable, compact, and roomy layouts
- Authenticated saved macro view context backed by `/api/skyweb/saved-views`
- Authenticated saved-view controls directly on the Macro Views catalog cards
- Save/remove, pin/unpin, and custom-label/display-order edits from `/macro/views`
- Legacy `/saved` route redirects into `/macro/views?status=SAVED`
- Home navigation removed because the SkyWeb Analytics brand link already returns to the public landing page
- Macro navigation is now a dropdown with Overview and Dashboard entry points
- `/macro` is titled Macro Overview to distinguish it from the private dashboard cockpit
- `/dashboard` now supports switching across custom dashboards from the top of the page
- `/dashboard` removes duplicated default-live, dashboard-hero, and metadata summary cards so the cockpit focuses on dashboard controls and configured blocks
- Saved-view account summary and preferred landing option
- Saved-view pin/unpin controls, metadata editing, private notes, and display-order support
- Macro Views status filters for all/saved/unsaved/pinned/unpinned saved-view management
- Protected `/dashboard` route that composes pinned saved macro views into a personal member dashboard
- Visible product rebrand from SkyWeb to SkyWeb Analytics while preserving repo/app code names
- Protected `/dashboards` route for the dashboard builder foundation
- Dashboard library backed by SkyServer user-owned dashboard objects
- Create, edit, and remove dashboard definitions with title, description, layout preset, and display order
- Add direct macro indicators or saved macro views as dashboard items with item title, note, mode, order, and size metadata
- Edit/remove dashboard items from the builder surface
- `/dashboards` preferred landing-page option for builder-focused workflows
- Default-dashboard selection from the dashboard builder
- Protected `/dashboards/:dashboardKey` viewer route for clean dashboard presentation
- `/dashboard` now renders the default custom dashboard when one exists, with pinned saved-view fallback
- Dashboard viewer rendering that respects dashboard item source, order, mode, notes, and size metadata
- Indicator-centric dashboard item visualization modes for metric cards, mini charts, latest rows, and table previews
- Dashboard layout engine that applies item width/height spans across executive, research, and compact presets
- Dashboard builder size presets and size guidance for shaping custom dashboard blocks
- Protected `/dashboards/:dashboardKey/presentation` route for screenshot-ready dashboard canvases
- Presentation toolbar with copy-link and print/save-PDF actions
- Print rules that preserve dashboard colors while hiding workspace controls
- Dirty-state detection, edit/cancel/save flow, saving state, and success/error messaging
- Profile/preferences table foundation in the `skyweb` schema
- Lightweight SVG chart foundation for macro view drilldowns
- Precision chart mode with y-axis ruler labels, x-axis reference ticks, separator gridlines, and hover coordinate tooltips
- Trend metric cards for latest/range/change summaries
- Metric-selectable chart panels with quick metric cards and chart period controls
- Drilldown UX refinements for loaded date windows, latest-row emphasis, and chart/table pairing
- Macro overview signal board for freshest, deepest, cross-border, and breadth stories
- Decision-lane cards for category-driven exploration
- Clickable regional coverage bars and recently refreshed view list
- Query-aware macro view catalog links from dashboard storytelling surfaces
- Screenshot-ready home and macro proof strips for public portfolio presentation
- Sticky responsive navigation and tighter small-screen dashboard/card behavior
- Table and chart overflow handling for cleaner browser, screenshot, and print views

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
│       ├── SkyWeb.Api/      # ASP.NET Core / C# API skeleton
│       └── SkyWeb.Client/   # Copied React/Vite client
├── docs/                    # Repo maps and project docs
├── .env.example
└── package.json
```

## Local Development

Install dependencies from the repository root:

```bash
npm install
```

Run SkyWeb Analytics locally:

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

Run the parallel .NET API skeleton after installing the .NET SDK:

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

SkyServer tracks the broader ecosystem integration as its Phase 9. SkyWeb Analytics uses its own standalone phase numbering so the public application can grow independently.

| Phase      | Objective                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Phase 1 | SkyWeb foundation: identity, README, root package scripts, environment template, API client, and route shell                    |
| ✅ Phase 2 | SkyServer public macro API bridge: safe unauthenticated macro endpoints with public limits                                      |
| ✅ Phase 3 | Macro Dashboard v1: live overview, curated view cards, drilldowns, formatted tables, and indicator explorer                     |
| ✅ Phase 4 | Auth shell and member layer prep: app-scoped `SKYWEB` login, protected account route, profile/preferences foundation            |
| ✅ Phase 5 | Dashboard polish: charts, trend previews, responsive refinements, and richer macro storytelling surfaces                        |
| ✅ Phase 6 | Profile and preferences UI: editable member profile, saved display preferences, and account settings                            |
| ✅ Phase 7 | Saved dashboards and watchlists: first personalized SkyWeb Analytics dashboard features                                         |
| 🔄 Phase 8 | Macro alerts foundation: user-tracked indicators, views, scheduled evaluation, notification center surfacing, and signal polish |
| 🔜 Phase 9 | Public portfolio polish: screenshots, GitHub/LinkedIn proof assets, and presentation-ready feature storytelling                 |

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
- Indicator drilldown pages with chart preview and latest series table

### Phase 4 — Auth Shell & Member Layer Prep

- Use app-scoped auth with `SKYWEB`
- Add SkyWeb Analytics login/session context
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
- Add chart period controls for 1yr, 3yr, 5yr, 7yr, 10yr, or Max history
- Add chart metadata chips for selected metric, plotted points, and date range
- Add lightweight gridline/zero-line context to the SVG trend chart
- Rename preview rows as latest rows and highlight the newest table observation
- Replace unclear earliest-date stat with loaded-window context

#### 5.3 — Macro Overview Storytelling

- Add signal-board cards for freshest surface, deepest history, cross-border lens, and catalog breadth
- Add decision-lane cards that frame categories as analytical questions
- Add regional coverage bars with row-share context
- Add recently refreshed view list for current public data surfaces
- Add query-aware links into the macro view catalog

#### 5.4 — Responsive & Portfolio Polish

- Add screenshot-ready proof strips to the home and macro dashboard surfaces
- Refresh the home page status panel to reflect the current dashboard polish layer
- Make the navbar sticky and more resilient across desktop, tablet, and mobile widths
- Improve table/chart overflow behavior for narrow screens and screenshot capture
- Widen desktop analytics pages so charts, tables, and dashboards use more horizontal workspace
- Add print-friendly presentation rules for dashboard screenshots and exported views

### Phase 6 — Profile and Preferences UI

#### 6.1 — Editable SkyWeb Profile UI

- Convert the protected `/account` page from read-only profile display into an editable member profile surface
- Support editing `displayName`, `headline`, `bio`, `timezone`, `locale`, and `avatarUrl`
- Add edit/cancel/save controls with dirty-state detection
- Add saving state plus success and error messaging
- Refresh local profile state after successful save using the SkyServer `/api/skyweb/profile` response
- Keep identity, session, coming-next, and app-permission cards visible around the editable profile panel

#### 6.2 — Dashboard Preferences UI

- Add authenticated SkyWeb preference loading through `/api/skyweb/preferences`
- Add dashboard-preference save support through `PATCH /api/skyweb/preferences`
- Support default macro region, default macro category, default chart period, dashboard density, and preferred landing page
- Add edit/cancel/save/reset-defaults controls with dirty-state detection
- Keep preference state visible beside profile, identity, session, and permission cards

#### 6.3 — Preference-Aware Macro Surfaces

- Add a shared SkyWeb preferences context for authenticated and public routes
- Load saved preferences once after SkyWeb authentication and expose refresh/update helpers
- Apply saved macro region/category defaults to `/macro/views` when no URL filters are present
- Preserve URL filter precedence, including explicit `ALL` selections
- Apply saved chart-window defaults to macro drilldown chart panels
- Apply saved dashboard density as an app-level class for comfortable, compact, and roomy layouts
- Keep `/account` preference saves in sync with the global preferences context

### Phase 7 — Saved Dashboards and Watchlists

#### 7.1 — Saved Macro Views Foundation

- Add a shared saved-views context for authenticated SkyWeb members
- Add saved macro view context for the first private watchlist surface
- Add save/remove controls for macro views
- Add saved badges and saved-view summaries across member surfaces
- Prepare the personalized object layer for saved dashboards, presets, and future alert rules

#### 7.2 — Saved View Polish + Pinning Controls

- Keep saved views sorted globally by pinned state, display order, updated date, and label
- Add saved-view search across labels, notes, descriptions, regions, categories, and view keys
- Add region, category, and pinned/unpinned filters for saved-view management
- Add sort controls for priority, recently updated, recently saved, title, region, and category
- Add pin/unpin controls for saved views
- Add editable saved-view metadata for custom labels, private notes, and display order
- Improve empty and no-match states for saved-view workflows

#### 7.3 — Personal Macro Dashboard + SkyWeb Analytics Rebrand

- Add protected `/dashboard` route for the authenticated member command board
- Compose pinned saved macro views into a personal dashboard grid
- Show saved-view notes and pinned metadata as dashboard context
- Add `/dashboard` as a preferred landing-page option
- Rebrand visible product surfaces from SkyWeb to SkyWeb Analytics while preserving the `SkyWeb` repo name and `SKYWEB` app code

#### 7.4 — Dashboard Builder Foundation

- Add protected `/dashboards` route for the dashboard builder foundation
- Add dashboard library and builder entry points
- Create, edit, and remove dashboard definitions
- Support dashboard title, description, layout preset, and display order
- Add saved macro views as dashboard items
- Edit dashboard-item title, note, mode, order, and size metadata
- Remove dashboard items from a dashboard
- Add `/dashboards` as a preferred landing-page option

#### 7.5 — Default Dashboard + Dashboard Viewer

- Add default-dashboard selection from the dashboard builder
- Add protected `/dashboards/:dashboardKey` viewer route for clean dashboard display
- Make `/dashboard` render the default custom dashboard when one exists
- Preserve the pinned saved-view command board as the fallback dashboard surface
- Render dashboard items from saved dashboard definitions using item order, mode, note, and size metadata

#### 7.6 — Dashboard Item Visualization Modes

- Add richer dashboard item modes for metric cards, mini charts, latest-row panels, and table previews
- Keep classic view-card, wide-card, and compact-card modes available for saved macro view summaries
- Render dashboard item data directly from SkyServer public macro endpoints when a richer mode is selected
- Add builder support for choosing the richer item modes when adding or editing dashboard blocks
- Keep item order, size, note, and saved-view metadata visible around richer visualization blocks

#### 7.7 — Dashboard Layout Engine

- Apply dashboard item width/height metadata as responsive grid spans in dashboard viewer surfaces
- Tune executive, research, and compact layout presets so they shape the available dashboard grid
- Add builder size presets for common 1 × 1, 2 × 1, 2 × 2, 3 × 1, and 4 × 2 dashboard blocks
- Add size guidance beside dashboard item editing controls so layout metadata is easier to understand
- Preserve mobile responsiveness by collapsing dashboard blocks safely on narrower screens

#### 7.8 — Dashboard Presentation Mode

- Add protected `/dashboards/:dashboardKey/presentation` route for screenshot-ready dashboard viewing
- Hide the normal navigation shell in presentation mode while preserving a focused dashboard toolbar
- Add presentation metadata, canvas summary, and footer branding around rendered dashboard surfaces
- Add copy-link and print/save-PDF actions to the presentation toolbar
- Add presentation-view entry points from dashboard builder, dashboard viewer, and default dashboard surfaces
- Add print CSS that hides workspace controls and preserves dashboard colors for portfolio captures

#### Phase 7 Requirement 2 — Multi-Series Analytical Views

- Clarify macro views as grouped analytical lenses rather than default single-line dashboard chart sources
- Add multi-series selection to macro view detail charts
- Allow one or more numeric columns from a view to render on the same comparison chart
- Preserve latest-row and preview-table exploration as central view-detail behavior
- Keep indicator items as the preferred model for single-series dashboard cards
- Treat saved macro views on dashboards as lens summaries, latest-row panels, or table previews rather than implicit single-series charts

#### Phase 7 Requirement 3 — Precision Chart Surfaces

- Add y-axis ruler labels, x-axis reference ticks, and separator gridlines to detail chart surfaces
- Add hover coordinate tooltips for single-series indicator charts and multi-series analytical lens charts
- Remove side summary cards beside detail charts so the chart canvas uses the full available width
- Preserve compact sparkline behavior for dashboard cards while making detail charts more precise

#### Phase 7 Revision — Macro Navigation and Dashboard Cockpit Polish

- Remove the separate Saved navbar item so Views becomes the primary macro catalog and watchlist control surface
- Add saved-status filtering directly to `/macro/views`
- Add save/remove, pin/unpin, and metadata editing controls to macro catalog cards
- Keep custom label and display order edits on the catalog card layer for fast shelf management
- Move longer private saved-view notes onto the individual macro view detail page
- Redirect legacy `/saved` links to `/macro/views?status=SAVED`

#### Coming next

- Additional Phase 7 requirements from hands-on dashboard testing
- Dashboard export/portfolio preparation before Phase 8 alerts begin

## Relationship to SkyServer

SkyWeb Analytics should not duplicate SkyServer Admin features. SkyServer owns:

- Tool execution
- Ingestion management
- Worker automation
- Access control
- Audit reporting
- Repository/system configuration
- Application membership management

SkyWeb Analytics consumes curated APIs exposed by SkyServer and focuses on public presentation, exploration, and future user personalization.

## Auth Notes

- SkyWeb Analytics login posts to `/api/auth/login` with `appCode: SKYWEB`.
- Public macro pages remain unauthenticated.
- `/account` is protected by the SkyWeb AuthContext and reads `/api/skyweb/profile`.
- SkyWeb profiles and preferences are staged in the `skyweb` database schema.
- SkyServer Admin controls which shared users have `SKYWEB` application membership and SkyWeb-specific roles.

### Phase 8 — Macro Alerts Foundation

#### 8.1 — Alert Rules Foundation

- Add protected `/macro/alerts` route
- Create user-owned alert rules for indicators and view metrics
- Support threshold condition types: above, below, crosses above, crosses below, absolute change, and percent change
- Add manual alert evaluation controls before scheduler/notification automation
- Show last evaluation status, latest observed value, triggered time, and evaluation message
- Keep future notification delivery staged for later Phase 8 slices

### Phase 8.2 — Alert Evaluation History

- Added `/macro/alerts/:alertKey` protected detail page for per-rule alert inspection.
- Alert inventory cards now link to the rule detail surface and show event counts.
- Rule detail surfaces show current status, latest observed values, trigger counts, and evaluation-event history.

### Phase 8.3 — Scheduled Alert Evaluation

- Alert detail history now distinguishes manual evaluations from worker-scheduled evaluations.
- Macro alert copy now reflects that SkyServer Worker can evaluate active alert watches on a schedule.
- Scheduled evaluation remains backed by SkyServer, while SkyWeb continues to show the audit trail and current rule status.

### Phase 8.4 — Alert Notifications / Trigger Surfacing

- Triggered evaluation events now create user-facing alert notifications.
- Macro Alerts shows an actionable triggered-signal queue with acknowledge and dismiss actions.
- Macro dropdown shows an open-signal badge so alerts are visible from navigation.
- Notification actions preserve the permanent rule evaluation history.

### Phase 8.5 — Alert Notification Center + Dashboard Surfacing

- Added a global Signals pill near the account/logout controls when open alert notifications exist.
- Added a Macro Dashboard alert summary card with open signals, triggered rules, highest severity, and last evaluated time.
- Added an authenticated Macro Overview triggered-signal strip so watched conditions surface outside `/macro/alerts`.
- Clarified lifecycle copy: open means awaiting review, acknowledge means reviewed, dismiss removes from the open queue, and event history remains permanent.
- Added shared alert-signal helpers and severity-aware low/medium/high/critical styling.

### Phase 8.6 — Alert Preferences / Delivery Prep

- Added protected alert preferences at `/macro/alerts/preferences`.
- Added SkyServer-backed alert preference read/write calls through `/api/skyweb/alert-preferences`.
- Stored in-app signal enablement, minimum surfaced severity, per-severity notification lanes, delivery mode, digest cadence, quiet-hours fields, and future email/browser toggles.
- Navbar Signals pill, Macro Dashboard alert summary, and Macro Overview signal strip now respect the alert surfacing preferences.
- External delivery remains intentionally staged; this phase creates the clean preference contract before email/browser notification work.

### Phase 8.7 — Dedicated Signal Center

- Added protected `/macro/alerts/signals` route as the focused notification-center surface.
- Added status, severity, and sort controls for reviewing open, acknowledged, dismissed, and all historical alert notifications.
- Added bulk open-signal acknowledge and dismiss controls, with severity filtering passed through to SkyServer.
- Added SkyServer `/api/skyweb/alert-notifications/dismiss-all` endpoint and severity-aware bulk filters for acknowledgement/dismissal.
- Updated navbar, Macro Overview, and Dashboard signal links so the Signals pill opens the dedicated Signal Center instead of the broader alert-rule builder.
