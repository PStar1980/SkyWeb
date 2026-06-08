using System.Data;
using System.Text.Json;
using Dapper;
using SkyWeb.Api.Data;
using SkyWeb.Api.DTOs.SkyWeb;

namespace SkyWeb.Api.Services;

public sealed class SkyWebProfileService
{
    private readonly DbConnectionFactory _connectionFactory;

    public SkyWebProfileService(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<SkyWebProfileDto?> GetProfileAsync(Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await EnsureProfileAsync(connection, userId);

        var row = await connection.QueryFirstOrDefaultAsync<ProfileRow>(
            @"
                SELECT
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    user_display_name AS UserDisplayName,
                    profile_display_name AS ProfileDisplayName,
                    headline AS Headline,
                    bio AS Bio,
                    timezone AS Timezone,
                    locale AS Locale,
                    avatar_url AS AvatarUrl,
                    profile_metadata::text AS ProfileMetadataJson,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_user_profiles
                WHERE user_id = @UserId
                LIMIT 1
            ",
            new { UserId = userId });

        return SanitizeProfile(row);
    }

    public async Task<SkyWebProfileDto?> UpdateProfileAsync(Guid userId, JsonElement body)
    {
        using var connection = _connectionFactory.CreateConnection();
        await EnsureProfileAsync(connection, userId);

        var assignments = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);

        AddNullableStringAssignment(body, "displayName", "display_name", assignments, parameters);
        AddNullableStringAssignment(body, "headline", "headline", assignments, parameters);
        AddNullableStringAssignment(body, "bio", "bio", assignments, parameters);
        AddNullableStringAssignment(body, "timezone", "timezone", assignments, parameters);
        AddNullableStringAssignment(body, "locale", "locale", assignments, parameters);
        AddNullableStringAssignment(body, "avatarUrl", "avatar_url", assignments, parameters);

        if (SkyWebJson.TryGetProperty(body, "metadata", out var metadata))
        {
            var metadataJson = metadata.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null
                ? "{}"
                : metadata.GetRawText();

            parameters.Add("ProfileMetadataJson", metadataJson);
            assignments.Add("profile_metadata = CAST(@ProfileMetadataJson AS jsonb)");
        }

        if (assignments.Count == 0)
        {
            return await GetProfileAsync(userId);
        }

        await connection.ExecuteAsync(
            $@"
                UPDATE skyweb.user_profiles
                SET {string.Join(", ", assignments)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
            ",
            parameters);

        return await GetProfileAsync(userId);
    }

    private static void AddNullableStringAssignment(
        JsonElement body,
        string propertyName,
        string columnName,
        List<string> assignments,
        DynamicParameters parameters)
    {
        if (!SkyWebJson.TryGetProperty(body, propertyName, out var value))
        {
            return;
        }

        var parameterName = propertyName;
        parameters.Add(parameterName, SkyWebJson.NormalizeNullableString(value));
        assignments.Add($"{columnName} = @{parameterName}");
    }

    private static async Task EnsureProfileAsync(IDbConnection connection, Guid userId)
    {
        await connection.ExecuteAsync(
            @"
                INSERT INTO skyweb.user_profiles (user_id, display_name)
                SELECT u.user_id, u.display_name
                FROM auth.users u
                WHERE u.user_id = @UserId
                ON CONFLICT (user_id) DO NOTHING
            ",
            new { UserId = userId });
    }

    private static SkyWebProfileDto? SanitizeProfile(ProfileRow? row)
    {
        if (row is null)
        {
            return null;
        }

        var displayName = FirstNonEmpty(
            row.ProfileDisplayName,
            row.UserDisplayName,
            row.Username,
            row.Email);

        return new SkyWebProfileDto(
            UserId: row.UserId,
            Email: row.Email,
            Username: row.Username,
            UserDisplayName: row.UserDisplayName,
            ProfileDisplayName: row.ProfileDisplayName,
            DisplayName: displayName,
            Headline: row.Headline,
            Bio: row.Bio,
            Timezone: row.Timezone,
            Locale: row.Locale,
            AvatarUrl: row.AvatarUrl,
            Metadata: SkyWebJson.ParseObjectJson(row.ProfileMetadataJson),
            CreatedAt: row.CreatedAt,
            UpdatedAt: row.UpdatedAt);
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private sealed class ProfileRow
    {
        public Guid UserId { get; set; }
        public string? Email { get; set; }
        public string? Username { get; set; }
        public string? UserDisplayName { get; set; }
        public string? ProfileDisplayName { get; set; }
        public string? Headline { get; set; }
        public string? Bio { get; set; }
        public string? Timezone { get; set; }
        public string? Locale { get; set; }
        public string? AvatarUrl { get; set; }
        public string? ProfileMetadataJson { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
