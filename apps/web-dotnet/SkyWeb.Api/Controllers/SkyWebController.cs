using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using SkyWeb.Api.DTOs.Auth;
using SkyWeb.Api.Middleware;
using SkyWeb.Api.Services;

namespace SkyWeb.Api.Controllers;

[ApiController]
[Route("api/skyweb")]
public sealed class SkyWebController : ControllerBase
{
    private static readonly string[] PreferenceReadPermissions =
    {
        "SKYWEB_PREFERENCES_READ",
        "SKYWEB_PROFILE_READ"
    };

    private static readonly string[] PreferenceWritePermissions =
    {
        "SKYWEB_PREFERENCES_WRITE",
        "SKYWEB_PROFILE_WRITE"
    };

    private static readonly string[] DashboardReadPermissions =
    {
        "SKYWEB_DASHBOARD_READ",
        "SKYWEB_PROFILE_READ"
    };

    private static readonly string[] DashboardWritePermissions =
    {
        "SKYWEB_DASHBOARD_WRITE",
        "SKYWEB_PROFILE_WRITE"
    };


    private const string AlertReadPermission = "SKYWEB_ALERT_READ";
    private const string AlertWritePermission = "SKYWEB_ALERT_WRITE";

    private readonly SkyWebAuthorizationService _authorizationService;
    private readonly SkyWebProfileService _profileService;
    private readonly SkyWebPreferencesService _preferencesService;
    private readonly SkyWebSavedViewsService _savedViewsService;
    private readonly SkyWebDashboardsService _dashboardsService;
    private readonly SkyWebAlertsService _alertsService;
    private readonly ILogger<SkyWebController> _logger;

    public SkyWebController(
        SkyWebAuthorizationService authorizationService,
        SkyWebProfileService profileService,
        SkyWebPreferencesService preferencesService,
        SkyWebSavedViewsService savedViewsService,
        SkyWebDashboardsService dashboardsService,
        SkyWebAlertsService alertsService,
        ILogger<SkyWebController> logger)
    {
        _authorizationService = authorizationService;
        _profileService = profileService;
        _preferencesService = preferencesService;
        _savedViewsService = savedViewsService;
        _dashboardsService = dashboardsService;
        _alertsService = alertsService;
        _logger = logger;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, "SKYWEB_PROFILE_READ");

            var profile = await _profileService.GetProfileAsync(authContext!.User.UserId);
            return Ok(new
            {
                ok = true,
                profile
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb profile read failed.");
        }
    }

    [HttpPatch("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, "SKYWEB_PROFILE_WRITE");

            var profile = await _profileService.UpdateProfileAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                profile
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb profile update failed.");
        }
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, PreferenceReadPermissions);

            var preferenceRow = await _preferencesService.GetPreferencesAsync(authContext!.User.UserId);
            return Ok(new
            {
                ok = true,
                preferenceRow,
                preferences = preferenceRow?.Preferences ?? new Dictionary<string, object?>()
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb preference read failed.");
        }
    }

    [HttpPatch("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, PreferenceWritePermissions);

            var preferenceRow = await _preferencesService.UpdatePreferencesAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                preferenceRow,
                preferences = preferenceRow?.Preferences ?? new Dictionary<string, object?>()
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb preference update failed.");
        }
    }

    [HttpGet("alert-preferences")]
    public async Task<IActionResult> GetAlertPreferences()
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, "SKYWEB_ALERT_READ");

            var preferenceRow = await _preferencesService.GetAlertPreferencesAsync(authContext!.User.UserId);
            return Ok(new
            {
                ok = true,
                preferenceRow,
                preferences = preferenceRow?.Preferences ?? new Dictionary<string, object?>()
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert preference read failed.");
        }
    }

    [HttpPatch("alert-preferences")]
    public async Task<IActionResult> UpdateAlertPreferences([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, "SKYWEB_ALERT_WRITE");

            var preferenceRow = await _preferencesService.UpdateAlertPreferencesAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                preferenceRow,
                preferences = preferenceRow?.Preferences ?? new Dictionary<string, object?>()
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert preference update failed.");
        }
    }


    [HttpGet("saved-views")]
    public async Task<IActionResult> ListSavedViews()
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardReadPermissions);

            var items = await _savedViewsService.ListSavedViewsAsync(authContext!.User.UserId);
            return Ok(new
            {
                ok = true,
                total = items.Count,
                items
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb saved-view list failed.");
        }
    }

    [HttpPost("saved-views")]
    public async Task<IActionResult> SaveSavedView([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var item = await _savedViewsService.SaveViewAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb saved-view save failed.");
        }
    }

    [HttpPatch("saved-views/{viewKey}")]
    public async Task<IActionResult> UpdateSavedView(string viewKey, [FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var item = await _savedViewsService.UpdateSavedViewAsync(authContext!.User.UserId, viewKey, body);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb saved-view update failed.");
        }
    }

    [HttpDelete("saved-views/{viewKey}")]
    public async Task<IActionResult> RemoveSavedView(string viewKey)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var result = await _savedViewsService.RemoveSavedViewAsync(authContext!.User.UserId, viewKey);
            return Ok(new
            {
                ok = true,
                removed = result.Removed,
                viewKey = result.ViewKey
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb saved-view remove failed.");
        }
    }

    [HttpGet("dashboards")]
    public async Task<IActionResult> ListDashboards()
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardReadPermissions);

            var items = await _dashboardsService.ListDashboardsAsync(authContext!.User.UserId);
            return Ok(new
            {
                ok = true,
                total = items.Count,
                items
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard list failed.");
        }
    }

    [HttpPost("dashboards")]
    public async Task<IActionResult> CreateDashboard([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var item = await _dashboardsService.CreateDashboardAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard create failed.");
        }
    }

    [HttpGet("dashboards/{dashboardKey}")]
    public async Task<IActionResult> GetDashboard(string dashboardKey)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardReadPermissions);

            var item = await _dashboardsService.GetDashboardAsync(authContext!.User.UserId, dashboardKey);
            if (item is null)
            {
                return NotFound(new
                {
                    ok = false,
                    error = "Dashboard not found."
                });
            }

            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard read failed.");
        }
    }

    [HttpPatch("dashboards/{dashboardKey}")]
    public async Task<IActionResult> UpdateDashboard(string dashboardKey, [FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var item = await _dashboardsService.UpdateDashboardAsync(authContext!.User.UserId, dashboardKey, body);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard update failed.");
        }
    }

    [HttpDelete("dashboards/{dashboardKey}")]
    public async Task<IActionResult> RemoveDashboard(string dashboardKey)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var result = await _dashboardsService.RemoveDashboardAsync(authContext!.User.UserId, dashboardKey);
            return Ok(new
            {
                ok = true,
                removed = result.Removed,
                dashboardKey = result.DashboardKey
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard remove failed.");
        }
    }

    [HttpPost("dashboards/{dashboardKey}/items")]
    public async Task<IActionResult> AddDashboardItem(string dashboardKey, [FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var result = await _dashboardsService.AddDashboardItemAsync(authContext!.User.UserId, dashboardKey, body);
            return Ok(new
            {
                ok = true,
                dashboard = result.Dashboard,
                item = result.Item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard item add failed.");
        }
    }

    [HttpPatch("dashboards/{dashboardKey}/items/{itemId}")]
    public async Task<IActionResult> UpdateDashboardItem(string dashboardKey, string itemId, [FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var result = await _dashboardsService.UpdateDashboardItemAsync(authContext!.User.UserId, dashboardKey, itemId, body);
            return Ok(new
            {
                ok = true,
                dashboard = result.Dashboard,
                item = result.Item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard item update failed.");
        }
    }

    [HttpDelete("dashboards/{dashboardKey}/items/{itemId}")]
    public async Task<IActionResult> RemoveDashboardItem(string dashboardKey, string itemId)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequireAnyPermission(authContext, DashboardWritePermissions);

            var result = await _dashboardsService.RemoveDashboardItemAsync(authContext!.User.UserId, dashboardKey, itemId);
            return Ok(new
            {
                ok = true,
                dashboard = result.Dashboard,
                itemId = result.ItemId,
                removed = result.Removed
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb dashboard item remove failed.");
        }
    }



    [HttpGet("alerts")]
    public async Task<IActionResult> ListAlerts()
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertReadPermission);

            var items = await _alertsService.ListAlertRulesAsync(authContext!.User.UserId, ToQueryDictionary());
            return Ok(new
            {
                ok = true,
                total = items.Count,
                items
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-rule list failed.");
        }
    }

    [HttpPost("alerts")]
    public async Task<IActionResult> CreateAlert([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertWritePermission);

            var item = await _alertsService.CreateAlertRuleAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-rule create failed.");
        }
    }

    [HttpGet("alerts/{alertKey}/events")]
    public async Task<IActionResult> ListAlertEvents(string alertKey)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertReadPermission);

            var items = await _alertsService.ListAlertEventsAsync(authContext!.User.UserId, alertKey, ToQueryDictionary());
            return Ok(new
            {
                ok = true,
                total = items.Count,
                items
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-rule event list failed.");
        }
    }

    [HttpGet("alerts/{alertKey}")]
    public async Task<IActionResult> GetAlert(string alertKey)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertReadPermission);

            var item = await _alertsService.GetAlertRuleAsync(authContext!.User.UserId, alertKey);
            if (item is null)
            {
                return NotFound(new
                {
                    ok = false,
                    error = "Alert rule not found."
                });
            }

            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-rule read failed.");
        }
    }

    [HttpPatch("alerts/{alertKey}")]
    public async Task<IActionResult> UpdateAlert(string alertKey, [FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertWritePermission);

            var item = await _alertsService.UpdateAlertRuleAsync(authContext!.User.UserId, alertKey, body);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-rule update failed.");
        }
    }

    [HttpDelete("alerts/{alertKey}")]
    public async Task<IActionResult> RemoveAlert(string alertKey)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertWritePermission);

            var result = await _alertsService.RemoveAlertRuleAsync(authContext!.User.UserId, alertKey);
            return Ok(new
            {
                ok = true,
                removed = result.Removed,
                alertKey = result.AlertKey
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-rule remove failed.");
        }
    }

    [HttpGet("alert-notifications")]
    public async Task<IActionResult> ListAlertNotifications()
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertReadPermission);

            var result = await _alertsService.ListAlertNotificationsAsync(authContext!.User.UserId, ToQueryDictionary());
            return Ok(new
            {
                ok = true,
                total = result.Total,
                summary = result.Summary,
                items = result.Items
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-notification list failed.");
        }
    }

    [HttpPatch("alert-notifications/{notificationId}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlertNotification(string notificationId)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertWritePermission);

            var item = await _alertsService.AcknowledgeAlertNotificationAsync(authContext!.User.UserId, notificationId);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-notification acknowledge failed.");
        }
    }

    [HttpPatch("alert-notifications/{notificationId}/dismiss")]
    public async Task<IActionResult> DismissAlertNotification(string notificationId)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertWritePermission);

            var item = await _alertsService.DismissAlertNotificationAsync(authContext!.User.UserId, notificationId);
            return Ok(new
            {
                ok = true,
                item
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-notification dismiss failed.");
        }
    }

    [HttpPost("alert-notifications/acknowledge-all")]
    public async Task<IActionResult> AcknowledgeAllAlertNotifications([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertWritePermission);

            var result = await _alertsService.AcknowledgeAllAlertNotificationsAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                acknowledgedCount = result.AcknowledgedCount
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-notification bulk acknowledge failed.");
        }
    }

    [HttpPost("alert-notifications/dismiss-all")]
    public async Task<IActionResult> DismissAllAlertNotifications([FromBody] JsonElement body)
    {
        try
        {
            var authContext = GetAuthContext();
            _authorizationService.RequirePermission(authContext, AlertWritePermission);

            var result = await _alertsService.DismissAllAlertNotificationsAsync(authContext!.User.UserId, body);
            return Ok(new
            {
                ok = true,
                dismissedCount = result.DismissedCount
            });
        }
        catch (Exception ex)
        {
            return HandleException(ex, "Native SkyWeb alert-notification bulk dismiss failed.");
        }
    }


    private Dictionary<string, string?> ToQueryDictionary()
    {
        return Request.Query.ToDictionary(
            entry => entry.Key,
            entry => (string?)entry.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);
    }

    private AuthContextDto? GetAuthContext()
    {
        return AuthMiddleware.GetAuthContext(HttpContext);
    }

    private IActionResult HandleException(Exception ex, string logMessage)
    {
        switch (ex)
        {
            case AuthHttpException authException:
                return StatusCode(authException.StatusCode, new
                {
                    ok = false,
                    error = authException.Message,
                    details = authException.Details
                });
            case ApiException apiException:
                return StatusCode(apiException.StatusCode, new
                {
                    ok = false,
                    error = apiException.Message,
                    details = apiException.Details
                });
            default:
                _logger.LogError(ex, logMessage);
                return StatusCode(500, new
                {
                    ok = false,
                    error = "Internal server error."
                });
        }
    }
}
