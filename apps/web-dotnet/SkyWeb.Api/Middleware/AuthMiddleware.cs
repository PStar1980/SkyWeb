using SkyWeb.Api.DTOs.Auth;
using SkyWeb.Api.Services;

namespace SkyWeb.Api.Middleware;

public sealed class AuthMiddleware
{
    public const string AuthContextItemKey = "SkyWeb.AuthContext";
    public const string SessionTokenItemKey = "SkyWeb.SessionToken";

    private readonly RequestDelegate _next;

    public AuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AuthService authService)
    {
        var token = AuthTokenService.GetBearerToken(context.Request);
        if (!string.IsNullOrWhiteSpace(token))
        {
            var authContext = await authService.GetSessionFromTokenAsync(token);
            if (authContext is not null)
            {
                context.Items[AuthContextItemKey] = authContext;
                context.Items[SessionTokenItemKey] = token;
            }
        }

        await _next(context);
    }

    public static AuthContextDto? GetAuthContext(HttpContext context)
    {
        return context.Items.TryGetValue(AuthContextItemKey, out var value)
            ? value as AuthContextDto
            : null;
    }

    public static string? GetSessionToken(HttpContext context)
    {
        return context.Items.TryGetValue(SessionTokenItemKey, out var value)
            ? value as string
            : null;
    }
}
