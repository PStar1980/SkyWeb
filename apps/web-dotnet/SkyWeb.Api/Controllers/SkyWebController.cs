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

    private readonly SkyWebAuthorizationService _authorizationService;
    private readonly SkyWebProfileService _profileService;
    private readonly SkyWebPreferencesService _preferencesService;
    private readonly ILogger<SkyWebController> _logger;

    public SkyWebController(
        SkyWebAuthorizationService authorizationService,
        SkyWebProfileService profileService,
        SkyWebPreferencesService preferencesService,
        ILogger<SkyWebController> logger)
    {
        _authorizationService = authorizationService;
        _profileService = profileService;
        _preferencesService = preferencesService;
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
