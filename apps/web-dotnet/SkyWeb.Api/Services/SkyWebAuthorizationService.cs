using SkyWeb.Api.DTOs.Auth;

namespace SkyWeb.Api.Services;

public sealed class SkyWebAuthorizationService
{
    public void RequireSkyWebSession(AuthContextDto? authContext)
    {
        if (authContext is null)
        {
            throw new AuthHttpException(401, "Invalid or expired session.");
        }

        if (!string.Equals(authContext.Session.AppCode, "SKYWEB", StringComparison.OrdinalIgnoreCase))
        {
            throw new AuthHttpException(403, "SkyWeb session required.");
        }
    }

    public void RequirePermission(AuthContextDto? authContext, string permissionCode)
    {
        RequireSkyWebSession(authContext);

        if (!HasPermission(authContext!, permissionCode))
        {
            throw new AuthHttpException(403, "Required SkyWeb permission is missing.", new
            {
                permissionCode
            });
        }
    }

    public void RequireAnyPermission(AuthContextDto? authContext, IReadOnlyCollection<string> permissionCodes)
    {
        RequireSkyWebSession(authContext);

        if (permissionCodes.Any(permissionCode => HasPermission(authContext!, permissionCode)))
        {
            return;
        }

        throw new AuthHttpException(403, "Required SkyWeb permission is missing.", new
        {
            permissionCodes
        });
    }

    private static bool HasPermission(AuthContextDto authContext, string permissionCode)
    {
        return authContext.Permissions.Any(permission =>
            string.Equals(permission.PermissionCode, permissionCode, StringComparison.OrdinalIgnoreCase));
    }
}
