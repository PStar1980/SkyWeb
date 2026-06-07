# SkyWeb .NET Lane — Getting Started

This document supports DN-0 through DN-2 of the SkyWeb .NET transition.

## 1. Check whether .NET is installed

Open PowerShell:

```powershell
dotnet --info
dotnet --list-sdks
```

If those commands fail, install the .NET SDK before running the new API.

## 2. Install .NET SDK

Recommended target for this project: **.NET 10 SDK**.

PowerShell with winget:

```powershell
winget install Microsoft.DotNet.SDK.10
```

After installation, close and reopen PowerShell, then confirm:

```powershell
dotnet --version
dotnet --info
```

## 3. Configure the API connection string

Edit:

```text
apps/web-dotnet/SkyWeb.Api/appsettings.Development.json
```

Replace `CHANGE_ME` with your local PostgreSQL password:

```json
{
  "ConnectionStrings": {
    "SkyDb": "Host=localhost;Port=5432;Database=skyserver;Username=postgres;Password=YOUR_PASSWORD"
  }
}
```

A safer later option is to move this value into user secrets or an environment variable.

## 4. Run the C# API

From the SkyWeb repo root:

```powershell
npm run dotnet:api
```

Or directly:

```powershell
cd apps\web-dotnet\SkyWeb.Api
dotnet run
```

Expected local API base:

```text
http://localhost:7280
```

Check:

```text
http://localhost:7280/_health
http://localhost:7280/_db/health
http://localhost:7280/swagger
```

## 5. Run the copied React client

From the SkyWeb repo root:

```powershell
npm run web:dotnet
```

The copied client currently remains a safe parallel baseline. DN-3 will wire it to `SkyWeb.Api` as the active API gateway.
