# SkyWeb.Client — Parallel .NET Lane

This is the copied React/Vite client for the SkyWeb .NET transition lane.

- Original working baseline remains at `apps/web`.
- This copy remains safe to mutate during the .NET migration.
- The client points at `SkyWeb.Api` first, then `SkyWeb.Api` proxies unfinished route families to SkyServer Node API during DN-3.
- The .NET-lane client defaults to `http://localhost:5175` so it can run beside the existing `apps/web` client on `http://localhost:5174`.

## Local run

From the SkyWeb repo root:

```powershell
npm run web:dotnet
```

Open:

```text
http://localhost:5175
```

## Optional local environment override

Defaults should work without a local env file. To override values, copy `.env.example` to `.env.development` inside this folder.

```text
VITE_SKYWEB_CLIENT_PORT=5175
VITE_SKYWEB_API_ORIGIN=http://localhost:7280
VITE_SKYWEB_API_BASE_URL=/api
```
