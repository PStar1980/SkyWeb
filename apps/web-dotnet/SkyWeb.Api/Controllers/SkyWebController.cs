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

    private readonly SkyWebAuthorizationService _authorizationService;
    private readonly SkyWebProfileService _profileService;
    private readonly SkyWebPreferencesService _preferencesService;
    private readonly SkyWebSavedViewsService _savedViewsService;
    private readonly SkyWebDashboardsService _dashboardsService;
    private readonly ILogger<SkyWebController> _logger;

    public SkyWebController(
        SkyWebAuthorizationService authorizationService,
        SkyWebProfileService profileService,
        SkyWebPreferencesService preferencesService,
        SkyWebSavedViewsService savedViewsService,
        SkyWebDashboardsService dashboardsService,
        ILogger<SkyWebController> logger)
    {
        _authorizationService = authorizationService;
        _profileService = profileService;
        _preferencesService = preferencesService;
        _savedViewsService = savedViewsService;
        _dashboardsService = dashboardsService;
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
