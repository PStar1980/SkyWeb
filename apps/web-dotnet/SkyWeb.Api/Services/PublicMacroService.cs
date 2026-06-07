namespace SkyWeb.Api.Services;

public sealed class PublicMacroService
{
    private const int PublicViewRowDefaultLimit = 50;
    private const int PublicViewRowMaxLimit = 250;
    private const int PublicIndicatorDefaultLimit = 250;
    private const int PublicIndicatorMaxLimit = 500;
    private const int PublicSeriesDefaultLimit = 250;
    private const int PublicSeriesMaxLimit = 1000;

    private readonly MacroReadService _macroReadService;

    public PublicMacroService(MacroReadService macroReadService)
    {
        _macroReadService = macroReadService;
    }

    public async Task<object> GetPublicMacroSummaryAsync()
    {
        var payload = await _macroReadService.GetMacroSummaryAsync();
        var views = GetEnumerable(payload, "views").Select(PublicizeView).ToList();

        return new
        {
            viewCount = GetProperty(payload, "viewCount"),
            views,
            indicatorCounts = GetProperty(payload, "indicatorCounts")
        };
    }

    public async Task<object> ListPublicMacroViewsAsync(IReadOnlyDictionary<string, string?> filters)
    {
        var items = await _macroReadService.ListMacroViewsAsync(filters);

        return new
        {
            items = items.Select(PublicizeView).ToList()
        };
    }

    public async Task<object> GetPublicMacroViewColumnsAsync(string viewKey)
    {
        var payload = await _macroReadService.GetMacroViewColumnsAsync(viewKey);

        return new
        {
            view = PublicizeView(GetProperty(payload, "view")),
            columns = GetEnumerable(payload, "columns").Select(PublicizeColumn).ToList()
        };
    }

    public async Task<object> ListPublicMacroViewRowsAsync(string viewKey, IReadOnlyDictionary<string, string?> filters)
    {
        var normalizedFilters = NormalizeQuery(filters, new Dictionary<string, string?>
        {
            ["limit"] = ToPositiveInteger(GetFilter(filters, "limit"), PublicViewRowDefaultLimit, PublicViewRowMaxLimit).ToString()
        });
        var payload = await _macroReadService.ListMacroViewRowsAsync(viewKey, normalizedFilters);

        return new
        {
            view = PublicizeView(GetProperty(payload, "view")),
            total = GetProperty(payload, "total"),
            limit = GetProperty(payload, "limit"),
            offset = GetProperty(payload, "offset"),
            items = GetProperty(payload, "items")
        };
    }

    public async Task<object> GetLatestPublicMacroViewRowAsync(string viewKey)
    {
        var payload = await _macroReadService.GetLatestMacroViewRowAsync(viewKey);

        return new
        {
            view = PublicizeView(GetProperty(payload, "view")),
            item = GetProperty(payload, "item")
        };
    }

    public async Task<object> ListPublicMacroIndicatorsAsync(IReadOnlyDictionary<string, string?> filters)
    {
        var normalizedFilters = NormalizeQuery(filters, new Dictionary<string, string?>
        {
            ["limit"] = ToPositiveInteger(GetFilter(filters, "limit"), PublicIndicatorDefaultLimit, PublicIndicatorMaxLimit).ToString(),
            ["active"] = "true"
        });
        var payload = await _macroReadService.ListMacroIndicatorsAsync(normalizedFilters);

        return new
        {
            total = GetProperty(payload, "total"),
            limit = GetProperty(payload, "limit"),
            offset = GetProperty(payload, "offset"),
            items = GetEnumerable(payload, "items").Select(PublicizeIndicator).ToList()
        };
    }

    public async Task<object> GetPublicMacroIndicatorAsync(string indicatorCode)
    {
        var payload = await _macroReadService.GetMacroIndicatorAsync(indicatorCode);

        return new
        {
            indicator = PublicizeIndicator(GetProperty(payload, "indicator")),
            stats = PublicizeIndicatorStats(GetProperty(payload, "stats"))
        };
    }

    public async Task<object> ListPublicMacroIndicatorSeriesAsync(string indicatorCode, IReadOnlyDictionary<string, string?> filters)
    {
        var normalizedFilters = NormalizeQuery(filters, new Dictionary<string, string?>
        {
            ["limit"] = ToPositiveInteger(GetFilter(filters, "limit"), PublicSeriesDefaultLimit, PublicSeriesMaxLimit).ToString()
        });
        var payload = await _macroReadService.ListMacroIndicatorSeriesAsync(indicatorCode, normalizedFilters);

        return new
        {
            indicator = PublicizeIndicator(GetProperty(payload, "indicator")),
            stats = PublicizeIndicatorStats(GetProperty(payload, "stats")),
            total = GetProperty(payload, "total"),
            limit = GetProperty(payload, "limit"),
            offset = GetProperty(payload, "offset"),
            items = GetProperty(payload, "items")
        };
    }

    private static object? PublicizeView(object? view)
    {
        if (view is null)
        {
            return null;
        }

        var stats = GetProperty(view, "stats");
        if (stats is null)
        {
            return new
            {
                viewKey = GetProperty(view, "viewKey"),
                label = GetProperty(view, "label"),
                region = GetProperty(view, "region"),
                category = GetProperty(view, "category"),
                description = GetProperty(view, "description"),
                defaultOrder = GetProperty(view, "defaultOrder")
            };
        }

        return new
        {
            viewKey = GetProperty(view, "viewKey"),
            label = GetProperty(view, "label"),
            region = GetProperty(view, "region"),
            category = GetProperty(view, "category"),
            description = GetProperty(view, "description"),
            defaultOrder = GetProperty(view, "defaultOrder"),
            stats
        };
    }

    private static object PublicizeColumn(object column)
    {
        return new
        {
            columnName = GetProperty(column, "columnName"),
            fieldName = GetProperty(column, "fieldName"),
            ordinalPosition = GetProperty(column, "ordinalPosition"),
            dataType = GetProperty(column, "dataType"),
            numericPrecision = GetProperty(column, "numericPrecision"),
            numericScale = GetProperty(column, "numericScale"),
            isNullable = GetProperty(column, "isNullable")
        };
    }

    private static object? PublicizeIndicator(object? indicator)
    {
        if (indicator is null)
        {
            return null;
        }

        return new
        {
            indicatorCode = GetProperty(indicator, "indicatorCode"),
            source = GetProperty(indicator, "source"),
            description = GetProperty(indicator, "description"),
            frequency = GetProperty(indicator, "frequency"),
            active = GetProperty(indicator, "active")
        };
    }

    private static object? PublicizeIndicatorStats(object? stats)
    {
        if (stats is null)
        {
            return null;
        }

        return new
        {
            totalRows = GetProperty(stats, "totalRows"),
            minDate = GetProperty(stats, "minDate"),
            maxDate = GetProperty(stats, "maxDate")
        };
    }

    private static Dictionary<string, string?> NormalizeQuery(
        IReadOnlyDictionary<string, string?> filters,
        IReadOnlyDictionary<string, string?> defaults)
    {
        return defaults
            .Concat(filters)
            .Where(entry => !string.IsNullOrWhiteSpace(entry.Value))
            .GroupBy(entry => entry.Key, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.Last().Value,
                StringComparer.OrdinalIgnoreCase);
    }

    private static int ToPositiveInteger(string? value, int fallback, int max)
    {
        if (!int.TryParse(value, out var parsed) || parsed < 0)
        {
            return fallback;
        }

        return Math.Min(parsed, max);
    }

    private static string? GetFilter(IReadOnlyDictionary<string, string?> filters, string key)
    {
        return filters.TryGetValue(key, out var value) ? value : null;
    }

    private static IEnumerable<object> GetEnumerable(object source, string propertyName)
    {
        var value = GetProperty(source, propertyName);
        if (value is IEnumerable<object> objectEnumerable)
        {
            return objectEnumerable;
        }

        if (value is System.Collections.IEnumerable enumerable && value is not string)
        {
            return enumerable.Cast<object>();
        }

        return Enumerable.Empty<object>();
    }

    private static object? GetProperty(object? source, string propertyName)
    {
        if (source is null)
        {
            return null;
        }

        if (source is IDictionary<string, object> dictionary)
        {
            return dictionary.TryGetValue(propertyName, out var value) ? value : null;
        }

        return source.GetType().GetProperty(propertyName)?.GetValue(source);
    }
}
