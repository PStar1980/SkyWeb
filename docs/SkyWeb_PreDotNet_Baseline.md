# SkyWeb Pre-.NET Baseline

**Date:** 2026-06-07

**Source repos:** SkyWeb + SkyServer

**Current SkyWeb phase:** Phase 8.8 — Alert Rule UX Polish

**Current backend:** SkyServer Node/Express API

**Current frontend:** `apps/web` React/Vite

## Baseline purpose

This document freezes the known-good SkyWeb Analytics state before creating the parallel .NET lane under `apps/web-dotnet`.

The existing `apps/web` application remains the working baseline. The new .NET lane is additive and should not mutate or replace the current application until feature parity and cutover are explicitly approved.

## Baseline routes to validate

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

## Completed alert-system baseline

- Alert rules
- Event history
- Scheduled evaluation visibility
- Triggered notification queue
- App-wide signal surfacing
- Alert preferences
- Dedicated Signal Center
- Alert-rule UX polish
- Search/filter/sort
- Inline edit
- Clone rule
- Safer remove confirmation

## Baseline acceptance

- Current SkyWeb still builds.
- Current SkyWeb still connects to SkyServer.
- Current SkyServer API still starts.
- `apps/web` remains untouched by the .NET transition lane.
- `apps/web-dotnet` is additive and isolated.
