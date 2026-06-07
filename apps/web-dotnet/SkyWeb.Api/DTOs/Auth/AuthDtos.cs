namespace SkyWeb.Api.DTOs.Auth;

public sealed record LoginRequest(
    string? Email,
    string? Password,
    string? AppCode);

public sealed record ChangePasswordRequest(
    string? CurrentPassword,
    string? NewPassword,
    string? ConfirmPassword,
    bool RevokeOtherSessions = true);

public sealed record AuthUserDto(
    Guid UserId,
    string? Email,
    string? Username,
    string? DisplayName,
    string? Status,
    bool IsSystemUser,
    DateTime? LastLoginAt);

public sealed record AuthSessionDto(
    Guid SessionId,
    Guid AppId,
    string? AppCode,
    string? AppTitle,
    DateTime ExpiresAt,
    DateTime? LastSeenAt,
    int SessionMinutes);

public sealed record AuthPermissionDto(
    Guid PermissionId,
    string? PermissionCode,
    string? Resource,
    string? Action,
    string? Description,
    string? GrantedThroughRoles,
    Guid? AppId,
    string? AppCode,
    string? AppTitle);

public sealed record AuthContextDto(
    AuthSessionDto Session,
    AuthUserDto User,
    IReadOnlyList<AuthPermissionDto> Permissions);
