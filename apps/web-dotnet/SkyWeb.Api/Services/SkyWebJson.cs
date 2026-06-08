using System.Text.Json;

namespace SkyWeb.Api.Services;

internal static class SkyWebJson
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static bool TryGetProperty(JsonElement source, string propertyName, out JsonElement value)
    {
        value = default;

        if (source.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return false;
        }

        if (source.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        foreach (var property in source.EnumerateObject())
        {
            if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        return false;
    }

    public static JsonElement GetPreferenceSource(JsonElement body)
    {
        if (TryGetProperty(body, "preferences", out var preferences) && preferences.ValueKind == JsonValueKind.Object)
        {
            return preferences;
        }

        return body;
    }

    public static string? NormalizeNullableString(JsonElement value)
    {
        if (value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return null;
        }

        var normalized = value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : value.ToString();

        normalized = (normalized ?? string.Empty).Trim();
        return normalized.Length == 0 ? null : normalized;
    }

    public static bool TryReadBoolean(JsonElement value, out bool result)
    {
        result = false;

        switch (value.ValueKind)
        {
            case JsonValueKind.True:
                result = true;
                return true;
            case JsonValueKind.False:
                result = false;
                return true;
            case JsonValueKind.Number:
                if (value.TryGetInt32(out var number) && (number == 0 || number == 1))
                {
                    result = number == 1;
                    return true;
                }
                return false;
            case JsonValueKind.String:
                var raw = (value.GetString() ?? string.Empty).Trim();
                if (string.Equals(raw, "true", StringComparison.OrdinalIgnoreCase) || raw == "1")
                {
                    result = true;
                    return true;
                }

                if (string.Equals(raw, "false", StringComparison.OrdinalIgnoreCase) || raw == "0")
                {
                    result = false;
                    return true;
                }

                return false;
            default:
                return false;
        }
    }

    public static IReadOnlyDictionary<string, object?> ParseObjectJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<string, object?>();
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.ValueKind == JsonValueKind.Object
                ? ConvertObject(document.RootElement)
                : new Dictionary<string, object?>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, object?>();
        }
    }

    public static string SerializeObject(IReadOnlyDictionary<string, object?> value)
    {
        return JsonSerializer.Serialize(value, JsonOptions);
    }

    private static Dictionary<string, object?> ConvertObject(JsonElement element)
    {
        var output = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var property in element.EnumerateObject())
        {
            output[property.Name] = ConvertValue(property.Value);
        }

        return output;
    }

    private static List<object?> ConvertArray(JsonElement element)
    {
        var output = new List<object?>();

        foreach (var item in element.EnumerateArray())
        {
            output.Add(ConvertValue(item));
        }

        return output;
    }

    private static object? ConvertValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => ConvertObject(element),
            JsonValueKind.Array => ConvertArray(element),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt64(out var longValue) => longValue,
            JsonValueKind.Number when element.TryGetDouble(out var doubleValue) => doubleValue,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.ToString()
        };
    }
}
