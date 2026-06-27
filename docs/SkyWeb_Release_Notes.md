# SkyWeb Release Notes

## Portfolio Release Candidate

SkyWeb Analytics has completed the post-cutover Phase 9 polish track. The application is now positioned as a portfolio-ready full-stack macroeconomic analytics platform.

## Release Summary

The project now demonstrates:

- React/Vite client development with professional dashboard UX.
- ASP.NET Core/C# Web API services for user-facing analytics and member workflows.
- PostgreSQL-backed macro, auth, alert, preference, saved-view, and dashboard data.
- Dapper/Npgsql data access in a SQL-first analytics architecture.
- ECharts/D3 time-series visualization, multi-series charts, tooltips, threshold overlays, and optional alert-event markers.
- SkyServer integration as a Node.js control plane for ingestion, automation, repository tooling, and alert evaluation execution.
- Portfolio-ready README, screenshots, feature tour, demo script, recruiter summary, resume bullets, and interview Q&A.

## Major Milestones Completed

| Milestone       | Result                                                            |
| --------------- | ----------------------------------------------------------------- |
| DN-10 cutover   | ASP.NET Core/C# lane promoted as default SkyWeb path              |
| DN-10.1 cleanup | Retired React-only client removed from active source              |
| Phase 9.1       | Portfolio foundation docs created                                 |
| Phase 9.2       | Screenshot capture plan and asset manifest added                  |
| Phase 9.3       | GitHub README polished and screenshot gallery integrated          |
| Phase 9.4       | Career/interview proof docs added                                 |
| Phase 9.5       | Release checklist, release notes, and known limitations finalized |

## Current Runtime Boundary

SkyWeb owns:

- React client and authenticated member UX.
- ASP.NET Core public macro, auth, profile, preference, saved-view, dashboard, alert, and notification APIs.
- Chart surfaces, dashboard presentation, Signal Center, and alert overlay display.

SkyServer owns:

- Data ingestion and macro update scripts.
- Worker/automation concepts.
- Repository map/zip utilities.
- Alert evaluation execution.
- Future workflow orchestration experiments.

## Non-Goals for This Release

This release does not include:

- Hosted deployment.
- CI/CD pipeline hardening.
- External alert delivery by email or browser push.
- Temporal workflow orchestration.
- Advanced ingestion retry/backoff/resume logic.

Those remain valid future roadmap items.

## Recommended Next Product Direction

After this release candidate, the strongest next technical track is SkyServer workflow/control-plane modernization, especially a Temporal pilot for durable ingestion and alert-evaluation orchestration.
