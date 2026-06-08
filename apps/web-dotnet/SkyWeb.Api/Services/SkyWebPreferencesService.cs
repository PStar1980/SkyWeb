using System.Data;
using System.Text.Json;
using Dapper;
using SkyWeb.Api.Data;
using SkyWeb.Api.DTOs.SkyWeb;

namespace SkyWeb.Api.Services;

public sealed class SkyWebPreferencesService
{
    public const string DashboardDefaultsKey = "dashboard_defaults";
    public const string AlertPreferencesKey = "alert_delivery";

    private static readonly IReadOnlyDictionary<string, object?> DefaultPreferences = new Dictionary<string, object?>
    {
        ["defaultMacroRegion"] = "ALL",
        ["defaultMacroCategory"] = "ALL",
        ["defaultChartWindow"] = "3Y",
        ["dashboardDensity"] = "comfortable",
        ["preferredLandingPage"] = "/macro"
    };

    private static readonly IReadOnlyDictionary<string, object?> DefaultAlertPreferences = new Dictionary<string, object?>
    {
        ["inAppEnabled"] = true,
        ["minimumSeverity"] = "low",
        ["notifyLow"] = true,
        ["notifyMedium"] = true,
        ["notifyHigh"] = true,
        ["notifyCritical"] = true,
        ["deliveryMode"] = "immediate",
        ["digestCadence"] = "daily",
        ["quietHoursEnabled"] = false,
        ["quietHoursStart"] = "22:00",
        ["quietHoursEnd"] = "07:00",
        ["quietHoursTimezone"] = "America/Toronto",
        ["emailEnabled"] = false,
        ["browserEnabled"] = false
    };

    private static readonly IReadOnlyDictionary<string, ISet<string>> AllowedPreferenceValues =
        new Dictionary<string, ISet<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["defaultMacroRegion"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "ALL", "US", "CA", "US_CA" },
            ["defaultMacroCategory"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "ALL", "inflation", "rates", "growth", "labor", "credit", "housing", "trade",
                "liquidity", "regime", "comparison", "rates_fx"
            },
            ["defaultChartWindow"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "1Y", "3Y", "5Y", "7Y", "10Y", "MAX" },
            ["dashboardDensity"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "comfortable", "compact", "roomy" },
            ["preferredLandingPage"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "/", "/dashboard", "/dashboards", "/macro", "/macro/views", "/macro/indicators", "/saved", "/account"
            }
        };

    private static readonly IReadOnlyDictionary<string, ISet<string>> AllowedAlertValues =
        new Dictionary<string, ISet<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["minimumSeverity"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "low", "medium", "high", "critical" },
            ["deliveryMode"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "immediate", "digest" },
            ["digestCadence"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "daily", "weekly" }
        };

    private static readonly ISet<string> AlertBooleanFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "inAppEnabled", "notifyLow", "notifyMedium", "notifyHigh", "notifyCritical",
        "quietHoursEnabled", "emailEnabled", "browserEnabled"
    };

    private static readonly ISet<string> AlertTimeFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "quietHoursStart", "quietHoursEnd"
    };

    private readonly DbConnectionFactory _connectionFactory;

    public SkyWebPreferencesService(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public Task<SkyWebPreferenceRowDto?> GetPreferencesAsync(Guid userId)
    {
        return GetPreferenceRowAsync(userId, DashboardDefaultsKey, DefaultPreferences, NormalizeStoredDashboardPreferences);
    }

    public Task<SkyWebPreferenceRowDto?> UpdatePreferencesAsync(Guid userId, JsonElement body)
    {
        return UpdatePreferenceRowAsync(
            userId,
            DashboardDefaultsKey,
            DefaultPreferences,
            NormalizeIncomingDashboardPreferences,
            NormalizeStoredDashboardPreferences,
            body);
    }

    public Task<SkyWebPreferenceRowDto?> GetAlertPreferencesAsync(Guid userId)
    {
        return GetPreferenceRowAsync(userId, AlertPreferencesKey, DefaultAlertPreferences, NormalizeStoredAlertPreferences);
    }

    public Task<SkyWebPreferenceRowDto?> UpdateAlertPreferencesAsync(Guid userId, JsonElement body)
    {
        return UpdatePreferenceRowAsync(
            userId,
            AlertPreferencesKey,
            DefaultAlertPreferences,
            NormalizeIncomingAlertPreferences,
            NormalizeStoredAlertPreferences,
            body);
    }

    private async Task<SkyWebPreferenceRowDto?> GetPreferenceRowAsync(
        Guid userId,
        string preferenceKey,
        IReadOnlyDictionary<string, object?> defaults,
        Func<IReadOnlyDictionary<string, object?>, IReadOnlyDictionary<string, object?>> normalizeStored)
    {
        using var connection = _connectionFactory.CreateConnection();
        await EnsurePreferenceAsync(connection, userId, preferenceKey, defaults);

        var row = await connection.QueryFirstOrDefaultAsync<PreferenceRow>(
            @"
                SELECT
                    preference_id AS PreferenceId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    preference_key AS PreferenceKey,
                    preference_value::text AS PreferenceValueJson,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_user_preferences
                WHERE user_id = @UserId
                  AND preference_key = @PreferenceKey
                LIMIT 1
            ",
            new { UserId = userId, PreferenceKey = preferenceKey });

        return SanitizePreferenceRow(row, normalizeStored);
    }

    private async Task<SkyWebPreferenceRowDto?> UpdatePreferenceRowAsync(
        Guid userId,
        string preferenceKey,
        IReadOnlyDictionary<string, object?> defaults,
        Func<JsonElement, IReadOnlyDictionary<string, object?>> normalizeIncoming,
        Func<IReadOnlyDictionary<string, object?>, IReadOnlyDictionary<string, object?>> normalizeStored,
        JsonElement body)
    {
        using var connection = _connectionFactory.CreateConnection();
        await EnsurePreferenceAsync(connection, userId, preferenceKey, defaults);

        var incoming = normalizeIncoming(body);
        if (incoming.Count == 0)
        {
            return await GetPreferenceRowAsync(userId, preferenceKey, defaults, normalizeStored);
        }

        var current = await GetPreferenceRowAsync(userId, preferenceKey, defaults, normalizeStored);
        var nextPreferences = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var entry in defaults)
        {
            nextPreferences[entry.Key] = entry.Value;
        }

        foreach (var entry in current?.Preferences ?? new Dictionary<string, object?>())
        {
            nextPreferences[entry.Key] = entry.Value;
        }

        foreach (var entry in incoming)
        {
            nextPreferences[entry.Key] = entry.Value;
        }

        var nextJson = SkyWebJson.SerializeObject(nextPreferences);

        await connection.ExecuteAsync(
            @"
                INSERT INTO skyweb.user_preferences (user_id, preference_key, preference_value)
                VALUES (@UserId, @PreferenceKey, CAST(@PreferenceValueJson AS jsonb))
                ON CONFLICT (user_id, preference_key)
                DO UPDATE SET
                    preference_value = EXCLUDED.preference_value,
                    updated_at = CURRENT_TIMESTAMP
            ",
            new
            {
                UserId = userId,
                PreferenceKey = preferenceKey,
                PreferenceValueJson = nextJson
            });

        return await GetPreferenceRowAsync(userId, preferenceKey, defaults, normalizeStored);
    }

    private static async Task EnsurePreferenceAsync(
        IDbConnection connection,
        Guid userId,
        string preferenceKey,
        IReadOnlyDictionary<string, object?> defaults)
    {
        await connection.ExecuteAsync(
            @"
                INSERT INTO skyweb.user_preferences (user_id, preference_key, preference_value)
                VALUES (@UserId, @PreferenceKey, CAST(@PreferenceValueJson AS jsonb))
                ON CONFLICT (user_id, preference_key) DO NOTHING
            ",
            new
            {
                UserId = userId,
                PreferenceKey = preferenceKey,
                PreferenceValueJson = SkyWebJson.SerializeObject(defaults)
            });
    }

    private static IReadOnlyDictionary<string, object?> NormalizeIncomingDashboardPreferences(JsonElement body)
    {
        var source = SkyWebJson.GetPreferenceSource(body);
        var normalized = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var fieldName in DefaultPreferences.Keys)
        {
            if (!SkyWebJson.TryGetProperty(source, fieldName, out var value))
            {
                continue;
            }

            normalized[fieldName] = NormalizeDashboardPreferenceValue(fieldName, value);
        }

        return normalized;
    }

    private static IReadOnlyDictionary<string, object?> NormalizeStoredDashboardPreferences(IReadOnlyDictionary<string, object?> stored)
    {
        var normalized = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var fieldName in DefaultPreferences.Keys)
        {
            var rawValue = stored.TryGetValue(fieldName, out var value) ? value?.ToString() : null;
            var candidateValue = NormalizeLegacyChartPeriod(rawValue);

            if (AllowedPreferenceValues[fieldName].Contains(candidateValue ?? string.Empty))
            {
                normalized[fieldName] = candidateValue;
            }
            else
            {
                normalized[fieldName] = DefaultPreferences[fieldName];
            }
        }

        return normalized;
    }

    private static object? NormalizeDashboardPreferenceValue(string fieldName, JsonElement value)
    {
        var rawValue = SkyWebJson.NormalizeNullableString(value) ?? DefaultPreferences[fieldName]?.ToString();
        var normalized = fieldName == "defaultChartWindow" ? NormalizeLegacyChartPeriod(rawValue) : rawValue;

        if (!AllowedPreferenceValues[fieldName].Contains(normalized ?? string.Empty))
        {
            throw new ApiException(400, $"Invalid SkyWeb preference value for {fieldName}.", new
            {
                fieldName,
                value = rawValue,
                allowedValues = AllowedPreferenceValues[fieldName]
            });
        }

        return normalized;
    }

    private static string? NormalizeLegacyChartPeriod(string? value)
    {
        var candidateValue = (value ?? string.Empty).Trim();

        return candidateValue switch
        {
            "30" or "60" => "1Y",
            "120" => "3Y",
            "ALL" => "MAX",
            _ => candidateValue
        };
    }

    private static IReadOnlyDictionary<string, object?> NormalizeIncomingAlertPreferences(JsonElement body)
    {
        var source = SkyWebJson.GetPreferenceSource(body);
        var normalized = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var fieldName in DefaultAlertPreferences.Keys)
        {
            if (!SkyWebJson.TryGetProperty(source, fieldName, out var value))
            {
                continue;
            }

            normalized[fieldName] = NormalizeAlertPreferenceValue(fieldName, value, true);
        }

        return normalized;
    }

    private static IReadOnlyDictionary<string, object?> NormalizeStoredAlertPreferences(IReadOnlyDictionary<string, object?> stored)
    {
        var normalized = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var fieldName in DefaultAlertPreferences.Keys)
        {
            try
            {
                var rawElement = CreateJsonElement(stored.TryGetValue(fieldName, out var value)
                    ? value
                    : DefaultAlertPreferences[fieldName]);
                normalized[fieldName] = NormalizeAlertPreferenceValue(fieldName, rawElement, false);
            }
            catch
            {
                normalized[fieldName] = DefaultAlertPreferences[fieldName];
            }
        }

        return normalized;
    }

    private static object? NormalizeAlertPreferenceValue(string fieldName, JsonElement value, bool strict)
    {
        if (AlertBooleanFields.Contains(fieldName))
        {
            if (value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return DefaultAlertPreferences[fieldName];
            }

            if (SkyWebJson.TryReadBoolean(value, out var boolValue))
            {
                return boolValue;
            }

            if (strict)
            {
                throw new ApiException(400, "Invalid boolean SkyWeb alert preference value.", new { fieldName });
            }

            return DefaultAlertPreferences[fieldName];
        }

        if (AlertTimeFields.Contains(fieldName))
        {
            var timeValue = SkyWebJson.NormalizeNullableString(value) ?? DefaultAlertPreferences[fieldName]?.ToString() ?? string.Empty;
            if (!System.Text.RegularExpressions.Regex.IsMatch(timeValue, "^([01]\\d|2[0-3]):[0-5]\\d$"))
            {
                if (strict)
                {
                    throw new ApiException(400, $"Invalid SkyWeb alert preference value for {fieldName}.", new
                    {
                        fieldName,
                        format = "HH:mm"
                    });
                }

                return DefaultAlertPreferences[fieldName];
            }

            return timeValue;
        }

        if (string.Equals(fieldName, "quietHoursTimezone", StringComparison.OrdinalIgnoreCase))
        {
            var timezone = SkyWebJson.NormalizeNullableString(value) ?? DefaultAlertPreferences[fieldName]?.ToString() ?? string.Empty;
            if (timezone.Length > 80 || !System.Text.RegularExpressions.Regex.IsMatch(timezone, "^[A-Za-z0-9_+\\-/]+$"))
            {
                if (strict)
                {
                    throw new ApiException(400, "Invalid SkyWeb alert preference value for quietHoursTimezone.", new
                    {
                        fieldName
                    });
                }

                return DefaultAlertPreferences[fieldName];
            }

            return timezone;
        }

        var rawValue = SkyWebJson.NormalizeNullableString(value) ?? DefaultAlertPreferences[fieldName]?.ToString();
        if (AllowedAlertValues.TryGetValue(fieldName, out var allowedValues) && !allowedValues.Contains(rawValue ?? string.Empty))
        {
            if (strict)
            {
                throw new ApiException(400, $"Invalid SkyWeb alert preference value for {fieldName}.", new
                {
                    fieldName,
                    value = rawValue,
                    allowedValues
                });
            }

            return DefaultAlertPreferences[fieldName];
        }

        return rawValue;
    }

    private static JsonElement CreateJsonElement(object? value)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var document = JsonDocument.Parse(bytes);
        return document.RootElement.Clone();
    }

    private static SkyWebPreferenceRowDto? SanitizePreferenceRow(
        PreferenceRow? row,
        Func<IReadOnlyDictionary<string, object?>, IReadOnlyDictionary<string, object?>> normalizeStored)
    {
        if (row is null)
        {
            return null;
        }

        return new SkyWebPreferenceRowDto(
            PreferenceId: row.PreferenceId,
            UserId: row.UserId,
            Email: row.Email,
            Username: row.Username,
            PreferenceKey: row.PreferenceKey,
            Preferences: normalizeStored(SkyWebJson.ParseObjectJson(row.PreferenceValueJson)),
            CreatedAt: row.CreatedAt,
            UpdatedAt: row.UpdatedAt);
    }

    private sealed class PreferenceRow
    {
        public Guid PreferenceId { get; set; }
        public Guid UserId { get; set; }
        public string? Email { get; set; }
        public string? Username { get; set; }
        public string? PreferenceKey { get; set; }
        public string? PreferenceValueJson { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
