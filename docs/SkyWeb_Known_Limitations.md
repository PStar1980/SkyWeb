# SkyWeb Known Limitations and Future Roadmap

This document keeps the portfolio release honest while preserving a clear future roadmap.

## Known Limitations

### Local-first runtime

SkyWeb currently runs as a local development system. It has production-style architecture patterns, but it is not yet containerized or hosted.

### Alert evaluation remains SkyServer-owned

Most SkyWeb member and analytics API routes are native to ASP.NET Core/C#, but evaluate-now alert execution still routes to SkyServer. This is intentional because SkyServer owns operational execution paths.

### External alert delivery is staged, not active

Alert preferences include future delivery concepts such as email, browser delivery, digest cadence, and quiet hours. In-app signal surfacing is active; external delivery workers are future work.

### Ingestion resilience can improve

FRED ingestion timeout was increased for stability, but deeper resilience such as retry/backoff, checkpoint/resume, failed-indicator summaries, and scheduled orchestration remains a future SkyServer phase.

### Screenshots are GitHub assets, not transfer-zip assets

Portfolio screenshots live in the working tree and render on GitHub. Generated handoff zips normally exclude image binaries to keep AI/project file exchange lean.

## Future Roadmap Candidates

### SkyServer Temporal pilot

Use Temporal as a durable workflow orchestration engine for ingestion, alert evaluation, and longer-running automation tasks.

Potential workflow candidates:

- Scheduled macro ingestion.
- Indicator refresh batches.
- Alert evaluation runs.
- Retry/backoff and failure notifications.
- Workflow history and run visibility.

### External alert delivery

Add email/browser notification delivery using the existing alert preference model.

Potential scope:

- Email digest worker.
- Browser notification opt-in.
- Quiet-hour suppression.
- Delivery logs.
- Retry/error handling.

### Advanced macro visuals

Add specialized visuals beyond general time-series charts.

Potential candidates:

- Yield-curve surface.
- Macro regime timeline.
- Inflation/rates spread comparison panel.
- Policy-rate divergence view.
- Alert event timeline strip.

### Deployment and CI/CD hardening

Prepare the app for hosted demo or controlled release.

Potential scope:

- Dockerfiles for SkyWeb.Api and SkyServer.
- Static client build hosting.
- GitHub Actions validation.
- Environment-specific configuration.
- Secrets handling guidance.

## Portfolio Framing

When discussing these limitations, frame them as intentional project boundaries:

> SkyWeb is a local full-stack analytics platform and portfolio proof-of-work. It demonstrates architecture, migration discipline, authenticated workflows, dashboards, charting, and alert intelligence. The next production-hardening steps would be deployment, orchestration, external delivery, and ingestion resilience.
