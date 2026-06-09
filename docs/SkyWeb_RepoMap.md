SkyWeb/
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package-lock.json
├── package.json
├── README.md
├── .github/
│   └── workflows/
├── .husky/
│   ├── pre-commit
│   ├── pre-push
│   └── _/
│       ├── .gitignore
│       ├── applypatch-msg
│       ├── commit-msg
│       ├── h
│       ├── husky.sh
│       ├── post-applypatch
│       ├── post-checkout
│       ├── post-commit
│       ├── post-merge
│       ├── post-rewrite
│       ├── pre-applypatch
│       ├── pre-auto-gc
│       ├── pre-commit
│       ├── pre-merge-commit
│       ├── pre-push
│       ├── pre-rebase
│       └── prepare-commit-msg
├── apps/
│   └── web-dotnet/
│       ├── SkyWeb.DotNet.sln
│       ├── SkyWeb.Api/
│       │   ├── appsettings.Development.json
│       │   ├── appsettings.json
│       │   ├── Program.cs
│       │   ├── SkyWeb.Api.csproj
│       │   ├── bin/
│       │   │   └── Debug/
│       │   │       └── net10.0/
│       │   │           ├── appsettings.Development.json
│       │   │           ├── appsettings.json
│       │   │           ├── BCrypt-Net-Next.dll
│       │   │           ├── Dapper.dll
│       │   │           ├── Microsoft.OpenApi.dll
│       │   │           ├── Npgsql.dll
│       │   │           ├── SkyWeb.Api.deps.json
│       │   │           ├── SkyWeb.Api.dll
│       │   │           ├── SkyWeb.Api.exe
│       │   │           ├── SkyWeb.Api.pdb
│       │   │           ├── SkyWeb.Api.runtimeconfig.json
│       │   │           ├── SkyWeb.Api.staticwebassets.endpoints.json
│       │   │           ├── Swashbuckle.AspNetCore.Swagger.dll
│       │   │           ├── Swashbuckle.AspNetCore.SwaggerGen.dll
│       │   │           └── Swashbuckle.AspNetCore.SwaggerUI.dll
│       │   ├── Controllers/
│       │   │   ├── AuthController.cs
│       │   │   ├── HealthController.cs
│       │   │   ├── PublicMacroController.cs
│       │   │   ├── SkyServerProxyController.cs
│       │   │   └── SkyWebController.cs
│       │   ├── Data/
│       │   │   └── DbConnectionFactory.cs
│       │   ├── DTOs/
│       │   │   ├── Auth/
│       │   │   │   └── AuthDtos.cs
│       │   │   ├── Health/
│       │   │   │   └── HealthResponse.cs
│       │   │   └── SkyWeb/
│       │   │       └── SkyWebDtos.cs
│       │   ├── Middleware/
│       │   │   └── AuthMiddleware.cs
│       │   ├── Models/
│       │   │   └── Macro/
│       │   │       └── MacroViewDefinition.cs
│       │   ├── obj/
│       │   │   ├── project.assets.json
│       │   │   ├── project.nuget.cache
│       │   │   ├── SkyWeb.Api.csproj.nuget.dgspec.json
│       │   │   ├── SkyWeb.Api.csproj.nuget.g.props
│       │   │   ├── SkyWeb.Api.csproj.nuget.g.targets
│       │   │   └── Debug/
│       │   │       └── net10.0/
│       │   │           ├── .NETCoreApp,Version=v10.0.AssemblyAttributes.cs
│       │   │           ├── apphost.exe
│       │   │           ├── rjsmcshtml.dswa.cache.json
│       │   │           ├── rjsmrazor.dswa.cache.json
│       │   │           ├── rpswa.dswa.cache.json
│       │   │           ├── SkyWeb.Api.AssemblyInfo.cs
│       │   │           ├── SkyWeb.Api.AssemblyInfoInputs.cache
│       │   │           ├── SkyWeb.Api.assets.cache
│       │   │           ├── SkyWeb.Api.csproj.AssemblyReference.cache
│       │   │           ├── SkyWeb.Api.csproj.CoreCompileInputs.cache
│       │   │           ├── SkyWeb.Api.csproj.FileListAbsolute.txt
│       │   │           ├── SkyWeb.Api.csproj.Up2Date
│       │   │           ├── SkyWeb.Api.dll
│       │   │           ├── SkyWeb.Api.GeneratedMSBuildEditorConfig.editorconfig
│       │   │           ├── SkyWeb.Api.genruntimeconfig.cache
│       │   │           ├── SkyWeb.Api.GlobalUsings.g.cs
│       │   │           ├── SkyWeb.Api.MvcApplicationPartsAssemblyInfo.cache
│       │   │           ├── SkyWeb.Api.MvcApplicationPartsAssemblyInfo.cs
│       │   │           ├── SkyWeb.Api.pdb
│       │   │           ├── SkyWeb.Api.sourcelink.json
│       │   │           ├── staticwebassets.build.endpoints.json
│       │   │           ├── staticwebassets.build.json
│       │   │           ├── staticwebassets.build.json.cache
│       │   │           ├── swae.build.ex.cache
│       │   │           ├── ref/
│       │   │           │   └── SkyWeb.Api.dll
│       │   │           ├── refint/
│       │   │           │   └── SkyWeb.Api.dll
│       │   │           └── staticwebassets/
│       │   ├── Options/
│       │   │   ├── AuthOptions.cs
│       │   │   └── SkyServerOptions.cs
│       │   ├── Properties/
│       │   │   └── launchSettings.json
│       │   └── Services/
│       │       ├── ApiException.cs
│       │       ├── AuthHttpException.cs
│       │       ├── AuthService.cs
│       │       ├── AuthTokenService.cs
│       │       ├── MacroReadService.cs
│       │       ├── PublicMacroService.cs
│       │       ├── SkyServerProxyService.cs
│       │       ├── SkyWebAlertsService.cs
│       │       ├── SkyWebAuthorizationService.cs
│       │       ├── SkyWebDashboardsService.cs
│       │       ├── SkyWebJson.cs
│       │       ├── SkyWebPreferencesService.cs
│       │       ├── SkyWebProfileService.cs
│       │       └── SkyWebSavedViewsService.cs
│       └── SkyWeb.Client/
│           ├── .env.example
│           ├── index.html
│           ├── README.md
│           ├── vite.config.js
│           └── src/
│               ├── App.css
│               ├── App.jsx
│               ├── index.css
│               ├── main.jsx
│               ├── components/
│               │   ├── ChartPanel.jsx
│               │   ├── DashboardItemVisualization.jsx
│               │   ├── DashboardSurface.jsx
│               │   ├── MacroViewCatalogCard.jsx
│               │   ├── MetricQuickCard.jsx
│               │   ├── MultiSeriesSparkline.jsx
│               │   ├── Navbar.jsx
│               │   ├── PageState.jsx
│               │   ├── ProtectedRoute.jsx
│               │   ├── Sparkline.jsx
│               │   ├── StatCard.jsx
│               │   ├── StoryCard.jsx
│               │   ├── TrendMetricCard.jsx
│               │   ├── ViewCard.jsx
│               │   └── charts/
│               │       ├── adapters/
│               │       │   ├── alertOverlayAdapter.js
│               │       │   ├── dashboardChartAdapter.js
│               │       │   ├── indicatorSeriesAdapter.js
│               │       │   └── viewSeriesAdapter.js
│               │       ├── d3/
│               │       ├── echarts/
│               │       │   ├── EChartBase.jsx
│               │       │   ├── MacroLineChart.jsx
│               │       │   └── MultiSeriesMacroChart.jsx
│               │       └── shared/
│               │           ├── chartOptions.js
│               │           ├── chartTheme.js
│               │           ├── chartTypes.js
│               │           └── chartUtils.js
│               ├── constants/
│               │   ├── branding.js
│               │   └── dashboardModes.js
│               ├── context/
│               │   ├── AuthContext.jsx
│               │   ├── DashboardsContext.jsx
│               │   ├── PreferencesContext.jsx
│               │   └── SavedViewsContext.jsx
│               ├── pages/
│               │   ├── Account.jsx
│               │   ├── DashboardBuilder.jsx
│               │   ├── DashboardViewer.jsx
│               │   ├── Home.jsx
│               │   ├── Login.jsx
│               │   ├── MacroAlertDetail.jsx
│               │   ├── MacroAlertPreferences.jsx
│               │   ├── MacroAlerts.jsx
│               │   ├── MacroAlertSignals.jsx
│               │   ├── MacroIndicatorDetail.jsx
│               │   ├── MacroIndicators.jsx
│               │   ├── MacroOverview.jsx
│               │   ├── MacroViewDetail.jsx
│               │   ├── MacroViews.jsx
│               │   ├── MemberDashboard.jsx
│               │   └── SavedViews.jsx
│               ├── services/
│               │   ├── api.js
│               │   ├── authService.js
│               │   └── macroService.js
│               └── utils/
│                   ├── alertSignals.js
│                   ├── charting.js
│                   ├── formatters.js
│                   └── macroStory.js
├── docs/
│   └── SkyWeb_RepoMap.md
└── tests/
    └── e2e/
