SkyWeb/
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── change.log
├── eslint.config.mjs
├── package-lock.json
├── package.json
├── README.md
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
│   ├── SkyServer_RepoMap.md
│   ├── SkyWeb_Architecture_Decisions.md
│   ├── SkyWeb_Demo_QA.md
│   ├── SkyWeb_Feature_Tour.md
│   ├── SkyWeb_Interview_Talking_Points.md
│   ├── SkyWeb_Known_Limitations.md
│   ├── SkyWeb_Phase_9_Roadmap.md
│   ├── SkyWeb_Portfolio_Brief.md
│   ├── SkyWeb_Recruiter_Brief.md
│   ├── SkyWeb_Release_Checklist.md
│   ├── SkyWeb_Release_Notes.md
│   ├── SkyWeb_RepoMap.md
│   ├── SkyWeb_Resume_Bullets.md
│   ├── SkyWeb_Visual_Asset_Manifest.md
│   └── assets/
│       └── screenshots/
│           ├── 01-macro-overview.png
│           ├── 02-macro-dashboard.png
│           ├── 03-macro-view-detail.png
│           ├── 04-indicator-alert-overlays.png
│           ├── 05-alert-rules.png
│           ├── 06-signal-center.png
│           ├── 07-dashboard-builder.png
│           ├── 08-account-preferences.png
│           ├── 09-alert-preferences.png
│           ├── 10-chart-tooltip.png
│           ├── 11-dashboard-presentation.png
│           └── README.md
└── tests/
