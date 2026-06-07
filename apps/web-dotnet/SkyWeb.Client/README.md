# SkyWeb.Client — Parallel .NET Lane

This is the copied React/Vite client for the SkyWeb .NET transition lane.

- Original working baseline remains at `apps/web`.
- This copy remains safe to mutate during the .NET migration.
- DN-3 will wire this client to `SkyWeb.Api` using `VITE_SKYWEB_API_BASE_URL`.

For now, the Vite config still supports the root SkyWeb environment so the copied client can start without disturbing the existing application.
