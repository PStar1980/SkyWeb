using Microsoft.AspNetCore.Mvc;
using SkyWeb.Api.DTOs.Auth;
using SkyWeb.Api.Middleware;
using SkyWeb.Api.Services;

namespace SkyWeb.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request, HttpContext);
            return Ok(new
            {
                ok = true,
                user = result.User,
                sessionToken = result.SessionToken,
                expiresAt = result.ExpiresAt,
                permissions = result.Permissions
            });
        }
        catch (AuthHttpException ex) when (ex.StatusCode == 429)
        {
            var retryAfterSeconds = TryGetRetryAfterSeconds(ex.Details);
            return StatusCode(429, new
            {
                ok = false,
                error = ex.Message,
                retryAfterSeconds
            });
        }
        catch (AuthHttpException ex)
        {
            return StatusCode(ex.StatusCode, new
            {
                ok = false,
                error = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Native SkyWeb auth login failed.");
            return StatusCode(500, new
            {
                ok = false,
                error = "Internal server error."
            });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var authContext = RequireAuthContext();
        if (authContext is null)
        {
            return Unauthorized(new { ok = false, error = "Invalid or expired session." });
        }

        await _authService.LogoutAsync(
            AuthMiddleware.GetSessionToken(HttpContext),
            authContext,
            HttpContext);

        return Ok(new { ok = true });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var authContext = RequireAuthContext();
        if (authContext is null)
        {
            return Unauthorized(new { ok = false, error = "Invalid or expired session." });
        }

        try
        {
            var result = await _authService.ChangePasswordAsync(request, authContext, HttpContext);
            return Ok(new
            {
                ok = true,
                user = result.User,
                changed = result.Changed,
                revokedOtherSessionsCount = result.RevokedOtherSessionsCount
            });
        }
        catch (AuthHttpException ex)
        {
            return StatusCode(ex.StatusCode, new
            {
                ok = false,
                error = ex.Message,
                details = ex.Details
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Native SkyWeb auth password change failed.");
            return StatusCode(500, new
            {
                ok = false,
                error = "Internal server error."
            });
        }
    }

    [HttpGet("me")]
    public IActionResult Me()
    {
        var authContext = RequireAuthContext();
        if (authContext is null)
        {
            return Unauthorized(new { ok = false, error = "Invalid or expired session." });
        }

        return Ok(new
        {
            ok = true,
            user = authContext.User,
            session = authContext.Session,
            permissions = authContext.Permissions
        });
    }

    [HttpGet("permissions")]
    public IActionResult Permissions()
    {
        var authContext = RequireAuthContext();
        if (authContext is null)
        {
            return Unauthorized(new { ok = false, error = "Invalid or expired session." });
        }

        return Ok(new
        {
            ok = true,
            permissions = authContext.Permissions
        });
    }

    private AuthContextDto? RequireAuthContext()
    {
        return AuthMiddleware.GetAuthContext(HttpContext);
    }

    private static int? TryGetRetryAfterSeconds(object? details)
    {
        if (details is null)
        {
            return null;
        }

        var property = details.GetType().GetProperty("retryAfterSeconds");
        var value = property?.GetValue(details);
        return value is int retryAfterSeconds ? retryAfterSeconds : null;
    }
}
