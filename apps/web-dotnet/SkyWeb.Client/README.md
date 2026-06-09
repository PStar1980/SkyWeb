# SkyWeb.Client — Primary DN-10 Client

This React/Vite client is the primary SkyWeb Analytics browser application after DN-10 cutover.

- The preserved legacy rollback client remains at `apps/web`.
- This client talks to `SkyWeb.Api` first through `/api`.
- `SkyWeb.Api` serves nearly all SkyWeb Analytics API surfaces natively in ASP.NET Core/C#.
- Alert evaluation still routes through SkyServer intentionally because SkyServer owns the worker/evaluator path.
- The client defaults to `http://localhost:5175`.

## Local run

From the SkyWeb repo root:

```powershell
npm run web
```

Equivalent explicit command:

```powershell
npm run web:dotnet
```

Open:

```text
http://localhost:5175
```

## Build

```powershell
npm run build
```

Equivalent explicit command:

```powershell
npm run web:dotnet:build
```

## Legacy rollback

The original client can still be run separately:

```powershell
npm run web:legacy
```

It defaults to:

```text
http://localhost:5174
```

## Optional local environment override

Defaults should work without a local env file. To override values, copy `.env.example` to `.env.development` inside this folder.

```text
VITE_SKYWEB_CLIENT_PORT=5175
VITE_SKYWEB_API_ORIGIN=http://localhost:7280
VITE_SKYWEB_API_BASE_URL=/api
```
