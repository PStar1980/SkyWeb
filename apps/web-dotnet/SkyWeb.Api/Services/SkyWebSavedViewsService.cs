using System.Text.Json;
using Dapper;
using SkyWeb.Api.Data;

namespace SkyWeb.Api.Services;

public sealed class SkyWebSavedViewsService
{
    private const int MaxDisplayLabelLength = 160;
    private const int MaxNoteLength = 800;

    private readonly DbConnectionFactory _connectionFactory;
    private readonly MacroReadService _macroReadService;

    public SkyWebSavedViewsService(DbConnectionFactory connectionFactory, MacroReadService macroReadService)
    {
        _connectionFactory = connectionFactory;
        _macroReadService = macroReadService;
    }

    public async Task<IReadOnlyList<object>> ListSavedViewsAsync(Guid userId)
    {
        var viewByKey = await GetMacroViewMapAsync(includeStats: true);
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<SavedViewRow>(
            @"
                SELECT
                    saved_view_id AS SavedViewId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    view_key AS ViewKey,
                    display_label AS DisplayLabel,
                    note AS Note,
                    pinned AS Pinned,
                    sort_order AS SortOrder,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_saved_macro_views
                WHERE user_id = @UserId
                ORDER BY pinned DESC, sort_order ASC, updated_at DESC, view_key ASC
            ",
            new { UserId = userId });

        return rows.Select(row => SanitizeSavedView(row, viewByKey)).ToList();
    }

    public async Task<object> SaveViewAsync(Guid userId, JsonElement body)
    {
        var savedView = NormalizeSavedViewBody(body);
        var viewByKey = await AssertMacroViewExistsAsync(savedView.ViewKey);

        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QuerySingleAsync<SavedViewRow>(
            @"
                INSERT INTO skyweb.saved_macro_views (
                    user_id,
                    view_key,
                    display_label,
                    note,
                    pinned,
                    sort_order
                )
                VALUES (@UserId, @ViewKey, @DisplayLabel, @Note, @Pinned, @SortOrder)
                ON CONFLICT (user_id, view_key)
                DO UPDATE SET
                    display_label = EXCLUDED.display_label,
                    note = EXCLUDED.note,
                    pinned = EXCLUDED.pinned,
                    sort_order = EXCLUDED.sort_order,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING
                    saved_view_id AS SavedViewId,
                    user_id AS UserId,
                    NULL::text AS Email,
                    NULL::text AS Username,
                    view_key AS ViewKey,
                    display_label AS DisplayLabel,
                    note AS Note,
                    pinned AS Pinned,
                    sort_order AS SortOrder,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
            ",
            new
            {
                UserId = userId,
                savedView.ViewKey,
                savedView.DisplayLabel,
                savedView.Note,
                savedView.Pinned,
                savedView.SortOrder
            });

        var returnedViewKey = row.ViewKey ?? savedView.ViewKey;
        var hydrated = await GetSavedViewAsync(userId, returnedViewKey, viewByKey);
        return hydrated ?? SanitizeSavedView(row, viewByKey);
    }

    public async Task<object> UpdateSavedViewAsync(Guid userId, string viewKey, JsonElement body)
    {
        var normalizedViewKey = NormalizeViewKey(viewKey);
        var patch = NormalizeSavedViewPatchBody(body);

        if (patch.Count == 0)
        {
            var current = await GetSavedViewAsync(userId, normalizedViewKey);
            if (current is null)
            {
                throw new ApiException(StatusCodes.Status404NotFound, "Saved macro view not found.", new { viewKey = normalizedViewKey });
            }

            return current;
        }

        var assignments = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);
        parameters.Add("ViewKey", normalizedViewKey);

        AddAssignmentIfPresent(patch, "displayLabel", "display_label", assignments, parameters);
        AddAssignmentIfPresent(patch, "note", "note", assignments, parameters);
        AddAssignmentIfPresent(patch, "pinned", "pinned", assignments, parameters);
        AddAssignmentIfPresent(patch, "sortOrder", "sort_order", assignments, parameters);

        using var connection = _connectionFactory.CreateConnection();
        var updatedViewKey = await connection.ExecuteScalarAsync<string?>(
            $@"
                UPDATE skyweb.saved_macro_views
                SET {string.Join(", ", assignments)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
                  AND view_key = @ViewKey
                RETURNING view_key
            ",
            parameters);

        if (string.IsNullOrWhiteSpace(updatedViewKey))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Saved macro view not found.", new { viewKey = normalizedViewKey });
        }

        var updated = await GetSavedViewAsync(userId, normalizedViewKey);
        return updated!;
    }

    public async Task<RemoveSavedViewResult> RemoveSavedViewAsync(Guid userId, string viewKey)
    {
        var normalizedViewKey = NormalizeViewKey(viewKey);
        using var connection = _connectionFactory.CreateConnection();
        var removedViewKey = await connection.ExecuteScalarAsync<string?>(
            @"
                DELETE FROM skyweb.saved_macro_views
                WHERE user_id = @UserId
                  AND view_key = @ViewKey
                RETURNING view_key
            ",
            new { UserId = userId, ViewKey = normalizedViewKey });

        return new RemoveSavedViewResult(
            Removed: !string.IsNullOrWhiteSpace(removedViewKey),
            ViewKey: normalizedViewKey);
    }

    public async Task<object?> GetSavedViewAsync(Guid userId, string viewKey, IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>>? viewByKey = null)
    {
        var normalizedViewKey = NormalizeViewKey(viewKey);
        var macroViews = viewByKey ?? await GetMacroViewMapAsync(includeStats: true);

        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QueryFirstOrDefaultAsync<SavedViewRow>(
            @"
                SELECT
                    saved_view_id AS SavedViewId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    view_key AS ViewKey,
                    display_label AS DisplayLabel,
                    note AS Note,
                    pinned AS Pinned,
                    sort_order AS SortOrder,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_saved_macro_views
                WHERE user_id = @UserId
                  AND view_key = @ViewKey
                LIMIT 1
            ",
            new { UserId = userId, ViewKey = normalizedViewKey });

        return row is null ? null : SanitizeSavedView(row, macroViews);
    }

    public async Task AssertSavedViewExistsAsync(Guid userId, string viewKey)
    {
        using var connection = _connectionFactory.CreateConnection();
        var exists = await connection.ExecuteScalarAsync<bool>(
            @"
                SELECT EXISTS (
                    SELECT 1
                    FROM skyweb.saved_macro_views
                    WHERE user_id = @UserId
                      AND view_key = @ViewKey
                )
            ",
            new { UserId = userId, ViewKey = viewKey });

        if (!exists)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Save the macro view before adding it to a dashboard.", new
            {
                fieldName = "viewKey",
                viewKey
            });
        }
    }

    public async Task<IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>>> GetMacroViewMapAsync(bool includeStats)
    {
        var payload = await _macroReadService.ListMacroViewsAsync(new Dictionary<string, string?>
        {
            ["includeStats"] = includeStats ? "true" : "false"
        });

        return payload
            .Select(SkyWebJson.ObjectToDictionary)
            .Where(view => GetString(view, "viewKey") is not null)
            .ToDictionary(view => GetString(view, "viewKey")!, view => view, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>>> AssertMacroViewExistsAsync(string viewKey)
    {
        var viewByKey = await GetMacroViewMapAsync(includeStats: true);
        if (!viewByKey.ContainsKey(viewKey))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Macro view not found.", new { viewKey });
        }

        return viewByKey;
    }

    private static object SanitizeSavedView(
        SavedViewRow row,
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> viewByKey)
    {
        viewByKey.TryGetValue(row.ViewKey ?? string.Empty, out var view);

        return new
        {
            savedViewId = row.SavedViewId,
            userId = row.UserId,
            email = row.Email,
            username = row.Username,
            viewKey = row.ViewKey,
            displayLabel = row.DisplayLabel,
            note = row.Note,
            pinned = row.Pinned,
            sortOrder = row.SortOrder,
            createdAt = row.CreatedAt,
            updatedAt = row.UpdatedAt,
            view
        };
    }

    private static void AddAssignmentIfPresent(
        IReadOnlyDictionary<string, object?> patch,
        string patchKey,
        string columnName,
        List<string> assignments,
        DynamicParameters parameters)
    {
        if (!patch.ContainsKey(patchKey))
        {
            return;
        }

        var parameterName = patchKey;
        parameters.Add(parameterName, patch[patchKey]);
        assignments.Add($"{columnName} = @{parameterName}");
    }

    private static SavedViewPatch NormalizeSavedViewBody(JsonElement body)
    {
        var viewKey = NormalizeViewKey(GetStringProperty(body, "viewKey") ?? GetStringProperty(body, "view_key"));
        return new SavedViewPatch
        {
            ViewKey = viewKey,
            DisplayLabel = NormalizeOptionalString(GetProperty(body, "displayLabel") ?? GetProperty(body, "display_label"), "displayLabel", MaxDisplayLabelLength),
            Note = NormalizeOptionalString(GetProperty(body, "note"), "note", MaxNoteLength),
            Pinned = NormalizeBoolean(GetProperty(body, "pinned"), fallback: true),
            SortOrder = NormalizeInteger(GetProperty(body, "sortOrder") ?? GetProperty(body, "sort_order"), fallback: 0, fieldName: "sortOrder")
        };
    }

    private static IReadOnlyDictionary<string, object?> NormalizeSavedViewPatchBody(JsonElement body)
    {
        var patch = new Dictionary<string, object?>();

        if (SkyWebJson.TryGetProperty(body, "displayLabel", out var displayLabel) ||
            SkyWebJson.TryGetProperty(body, "display_label", out displayLabel))
        {
            patch["displayLabel"] = NormalizeOptionalString(displayLabel, "displayLabel", MaxDisplayLabelLength);
        }

        if (SkyWebJson.TryGetProperty(body, "note", out var note))
        {
            patch["note"] = NormalizeOptionalString(note, "note", MaxNoteLength);
        }

        if (SkyWebJson.TryGetProperty(body, "pinned", out var pinned))
        {
            patch["pinned"] = NormalizeBoolean(pinned, fallback: true);
        }

        if (SkyWebJson.TryGetProperty(body, "sortOrder", out var sortOrder) ||
            SkyWebJson.TryGetProperty(body, "sort_order", out sortOrder))
        {
            patch["sortOrder"] = NormalizeInteger(sortOrder, fallback: 0, fieldName: "sortOrder");
        }

        return patch;
    }

    internal static string NormalizeViewKey(string? viewKey)
    {
        var normalized = NormalizeRequiredString(viewKey, "viewKey")
            .Replace("macro.vw_", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("vw_", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("_", "-")
            .ToLowerInvariant();

        if (!System.Text.RegularExpressions.Regex.IsMatch(normalized, "^[a-z0-9][a-z0-9-]{0,127}$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "viewKey contains invalid characters.", new
            {
                fieldName = "viewKey",
                value = viewKey
            });
        }

        return normalized;
    }

    internal static string NormalizeRequiredString(string? value, string fieldName, int? maxLength = null)
    {
        var normalized = (value ?? string.Empty).Trim();
        if (normalized.Length == 0)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} is required.", new { fieldName });
        }

        if (maxLength is not null && normalized.Length > maxLength.Value)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} is too long.", new { fieldName, maxLength });
        }

        return normalized;
    }

    internal static string? NormalizeOptionalString(JsonElement? value, string fieldName, int? maxLength = null)
    {
        if (value is null || value.Value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return null;
        }

        var normalized = value.Value.ValueKind == JsonValueKind.String
            ? value.Value.GetString()
            : value.Value.ToString();

        normalized = (normalized ?? string.Empty).Trim();
        if (normalized.Length == 0)
        {
            return null;
        }

        if (maxLength is not null && normalized.Length > maxLength.Value)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} is too long.", new { fieldName, maxLength });
        }

        return normalized;
    }

    internal static bool NormalizeBoolean(JsonElement? value, bool fallback)
    {
        if (value is null || value.Value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return fallback;
        }

        return SkyWebJson.TryReadBoolean(value.Value, out var result) ? result : fallback;
    }

    internal static int NormalizeInteger(JsonElement? value, int fallback, string fieldName, int? min = null, int? max = null)
    {
        if (value is null || value.Value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return fallback;
        }

        int numberValue;
        if (value.Value.ValueKind == JsonValueKind.Number && value.Value.TryGetInt32(out var numeric))
        {
            numberValue = numeric;
        }
        else if (value.Value.ValueKind == JsonValueKind.String && int.TryParse(value.Value.GetString(), out var parsed))
        {
            numberValue = parsed;
        }
        else
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} must be an integer.", new { fieldName, value = value.Value.ToString() });
        }

        if (min is not null && numberValue < min.Value)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} is too small.", new { fieldName, min, value = numberValue });
        }

        if (max is not null && numberValue > max.Value)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} is too large.", new { fieldName, max, value = numberValue });
        }

        return numberValue;
    }

    internal static JsonElement? GetProperty(JsonElement body, string propertyName)
    {
        return SkyWebJson.TryGetProperty(body, propertyName, out var value) ? value : null;
    }

    internal static string? GetStringProperty(JsonElement body, string propertyName)
    {
        var property = GetProperty(body, propertyName);
        return property is null ? null : SkyWebJson.NormalizeNullableString(property.Value);
    }

    internal static string? GetString(IReadOnlyDictionary<string, object?> source, string key)
    {
        if (!source.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return value.ToString();
    }

    public sealed record RemoveSavedViewResult(bool Removed, string ViewKey);

    private sealed class SavedViewPatch
    {
        public required string ViewKey { get; init; }
        public string? DisplayLabel { get; init; }
        public string? Note { get; init; }
        public bool Pinned { get; init; }
        public int SortOrder { get; init; }
    }

    private sealed class SavedViewRow
    {
        public Guid SavedViewId { get; init; }
        public Guid UserId { get; init; }
        public string? Email { get; init; }
        public string? Username { get; init; }
        public string? ViewKey { get; init; }
        public string? DisplayLabel { get; init; }
        public string? Note { get; init; }
        public bool Pinned { get; init; }
        public int SortOrder { get; init; }
        public DateTime? CreatedAt { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }
}
