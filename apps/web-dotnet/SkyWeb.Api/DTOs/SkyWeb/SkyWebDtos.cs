namespace SkyWeb.Api.DTOs.SkyWeb;

public sealed record SkyWebProfileDto(
    Guid UserId,
    string? Email,
    string? Username,
    string? UserDisplayName,
    string? ProfileDisplayName,
    string? DisplayName,
    string? Headline,
    string? Bio,
    string? Timezone,
    string? Locale,
    string? AvatarUrl,
    IReadOnlyDictionary<string, object?> Metadata,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public sealed record SkyWebPreferenceRowDto(
    Guid PreferenceId,
    Guid UserId,
    string? Email,
    string? Username,
    string? PreferenceKey,
    IReadOnlyDictionary<string, object?> Preferences,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);
