# SkyWeb DN Validation Checklist

Use this checklist before DN-10 cutover.

## Services

Run the three-lane local stack:

```bash
# Terminal 1 — SkyServer Node API
cd ../SkyServer
npm run api

# Terminal 2 — SkyWeb ASP.NET Core API
cd ../SkyWeb
npm run dotnet:api

# Terminal 3 — SkyWeb .NET-lane client
cd ../SkyWeb
npm run web:dotnet
```

Confirm:

- `http://localhost:7171` SkyServer API is running.
- `http://localhost:7280/_health` returns `ok: true`.
- `http://localhost:7280/_db/health` returns `ok: true` and the expected database.
- `http://localhost:7280/swagger` loads.
- `http://localhost:5175` loads the .NET-lane client.

## Build Checks

```bash
npm run dotnet:build
npm run web:dotnet:build
npm run lint
```

Expected:

- .NET solution builds successfully.
- .NET-lane React client builds successfully.
- Lint passes or only shows known/non-blocking warnings.

## Public Macro Surfaces

Check:

- `/dashboard`
- `/macro`
- `/macro/views`
- `/macro/views/inflation`
- `/macro/views/rates-curve`
- `/macro/indicators`
- `/macro/indicators/DGS7`
- `/macro/indicators/DGS10`
- `/macro/indicators/FXUSDCAD`

Confirm:

- Public pages load without login.
- Summary cards populate.
- Tables paginate or display normally.
- Indicator detail charts render with the selected period.
- Macro-view multi-series charts render selected columns.

## Auth and Member Layer

Check:

- Login with a `SKYWEB` member user.
- Logout.
- `/account` loads after login.
- Profile changes save.
- Dashboard preferences save.
- Alert preferences save.

## Saved Views and Dashboards

Check:

- `/views` loads saved/pinned states.
- Save, unsave, pin, unpin, and edit a saved view.
- `/dashboard` loads the active dashboard.
- Dashboard builder opens.
- Add/update/remove a direct indicator item.
- Add/update/remove a saved-view item.
- Dashboard viewer and presentation view load.

## Alerts and Signal Center

Check:

- `/macro/alerts` loads alert rules.
- Create, edit, clone, enable/disable, and delete an alert rule.
- Alert detail page loads event history.
- Manual evaluate still works through the SkyServer evaluation proxy.
- `/macro/alerts/signals` loads Signal Center states.
- Acknowledge/dismiss single signals.
- Bulk acknowledge/dismiss open signals.
- `/macro/alerts/preferences` loads and saves alert preferences.

## Chart Layer

Check:

- Dashboard mini charts render cleanly.
- Indicator detail charts render without hover trails or disappearing line segments.
- Single-indicator pages no longer show redundant `Metric: Value` controls.
- Macro-view pages retain multi-series selection.
- Tooltips show readable dates and values.
- Long-history charts keep readable axis labels.
- Alert overlay modes work:
  - `Thresholds`
  - `Thresholds + events`
  - `Off`
- Threshold labels are visible when relevant alerts exist.
- Event markers appear only when enabled.

## Pre-Cutover Notes

Before DN-10:

- Confirm legacy `apps/web` remains untouched as rollback.
- Confirm repo zips exclude `bin/`, `obj/`, `dist/`, and `node_modules/`.
- Confirm `README.md`, `change.log`, transition docs, and repo map are current.
- Confirm alert evaluation remains intentionally SkyServer-owned.
