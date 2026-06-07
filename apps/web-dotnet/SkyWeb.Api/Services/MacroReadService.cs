using System.Text.RegularExpressions;
using Dapper;
using Microsoft.AspNetCore.Http;
using SkyWeb.Api.Data;
using SkyWeb.Api.Models.Macro;

namespace SkyWeb.Api.Services;

public sealed class MacroReadService
{
    private const int DefaultLimit = 100;
    private const int MaxLimit = 500;
    private const int DefaultSeriesLimit = 500;
    private const int MaxSeriesLimit = 5000;

    private static readonly IReadOnlyList<MacroViewDefinition> MacroViewRegistry = new[]
    {
        new MacroViewDefinition(
            "inflation",
            "macro",
            "vw_inflation",
            "U.S. Inflation",
            "US",
            "inflation",
            "U.S. CPI, Core CPI, PCE, Core PCE, and calculated inflation spreads."),
        new MacroViewDefinition(
            "rates-curve",
            "macro",
            "vw_rates_curve",
            "U.S. Rates Curve",
            "US",
            "rates",
            "U.S. Treasury curve, corporate yields, Fed Funds, and curve spreads."),
        new MacroViewDefinition(
            "growth",
            "macro",
            "vw_growth",
            "U.S. Growth",
            "US",
            "growth",
            "U.S. nominal GDP, real GDP, industrial production, and growth momentum."),
        new MacroViewDefinition(
            "labor",
            "macro",
            "vw_labor",
            "U.S. Labor",
            "US",
            "labor",
            "U.S. payrolls, unemployment, underemployment, labor slack, and Sahm signal."),
        new MacroViewDefinition(
            "credit-conditions",
            "macro",
            "vw_credit_conditions",
            "U.S. Credit Conditions",
            "US",
            "credit",
            "Chicago Fed financial conditions, leverage, risk stress, and z-score signals."),
        new MacroViewDefinition(
            "housing",
            "macro",
            "vw_housing",
            "U.S. Housing",
            "US",
            "housing",
            "U.S. housing starts, building permits, and housing momentum proxies."),
        new MacroViewDefinition(
            "liquidity",
            "macro",
            "vw_liquidity",
            "U.S. Liquidity",
            "US",
            "liquidity",
            "U.S. M1/M2 money supply, liquidity gap, YoY change, and liquidity regime."),
        new MacroViewDefinition(
            "macro-regime",
            "macro",
            "vw_macro_regime",
            "U.S. Macro Regime",
            "US",
            "regime",
            "Composite U.S. inflation, growth, labor, liquidity, curve, and regime signals."),
        new MacroViewDefinition(
            "ca-inflation",
            "macro",
            "vw_ca_inflation",
            "Canada Inflation",
            "CA",
            "inflation",
            "Canadian CPI, CPI momentum, housing price inflation, and inflation spread signals."),
        new MacroViewDefinition(
            "ca-growth",
            "macro",
            "vw_ca_growth",
            "Canada Growth",
            "CA",
            "growth",
            "Canadian GDP, retail sales, imports, trade by industry, and growth momentum."),
        new MacroViewDefinition(
            "ca-labor",
            "macro",
            "vw_ca_labor",
            "Canada Labor",
            "CA",
            "labor",
            "Canadian employment, unemployment, participation, and Sahm-style stress signal."),
        new MacroViewDefinition(
            "ca-housing",
            "macro",
            "vw_ca_housing",
            "Canada Housing",
            "CA",
            "housing",
            "Canadian new housing price index, building permits, and housing momentum signals."),
        new MacroViewDefinition(
            "ca-trade",
            "macro",
            "vw_ca_trade",
            "Canada Trade",
            "CA",
            "trade",
            "Canadian imports, exports proxy, net trade proxy, and total trade activity."),
        new MacroViewDefinition(
            "ca-rates-fx",
            "macro",
            "vw_ca_rates_fx",
            "Canada Rates and FX",
            "CA",
            "rates_fx",
            "Bank of Canada overnight rate, USD/CAD, CAD proxy, and FX momentum."),
        new MacroViewDefinition(
            "ca-macro-regime",
            "macro",
            "vw_ca_macro_regime",
            "Canada Macro Regime",
            "CA",
            "regime",
            "Composite Canadian inflation, growth, labor, housing, trade, policy, FX, and regime signals."),
        new MacroViewDefinition(
            "us-ca-policy-fx",
            "macro",
            "vw_us_ca_policy_fx",
            "U.S. / Canada Policy and FX",
            "US_CA",
            "comparison",
            "Cross-border Fed/BoC policy spread, USD/CAD, CAD proxy, and divergence regimes."),
        new MacroViewDefinition(
            "us-ca-inflation-compare",
            "macro",
            "vw_us_ca_inflation_compare",
            "U.S. / Canada Inflation Compare",
            "US_CA",
            "comparison",
            "U.S. versus Canadian inflation, spreads, and inflation divergence regime."),
        new MacroViewDefinition(
            "us-ca-labor-compare",
            "macro",
            "vw_us_ca_labor_compare",
            "U.S. / Canada Labor Compare",
            "US_CA",
            "comparison",
            "U.S. versus Canadian labor-market stress, unemployment, participation, and divergence regime.")
    };

    private static readonly IReadOnlyDictionary<string, MacroViewDefinition> MacroViewByKey =
        MacroViewRegistry.ToDictionary(view => view.ViewKey, view => view, StringComparer.OrdinalIgnoreCase);

    private readonly DbConnectionFactory _connectionFactory;

    public MacroReadService(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<object> GetMacroSummaryAsync()
    {
        var views = await ListMacroViewsAsync(new Dictionary<string, string?>
        {
            ["includeStats"] = "true"
        });
        var indicatorCounts = await GetIndicatorSourceCountsAsync();

        return new
        {
            viewCount = MacroViewRegistry.Count,
            views,
            indicatorCounts
        };
    }

    public async Task<IReadOnlyList<object>> ListMacroViewsAsync(IReadOnlyDictionary<string, string?> filters)
    {
        var includeStats = NormalizeBooleanFilter(GetFilter(filters, "includeStats") ?? GetFilter(filters, "stats")) == true;

        if (!includeStats)
        {
            return MacroViewRegistry.Select(view => SanitizeMacroView(view)).ToList();
        }

        var statsByViewKey = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var view in MacroViewRegistry)
        {
            statsByViewKey[view.ViewKey] = await GetViewStatsAsync(view);
        }

        return MacroViewRegistry.Select(view => SanitizeMacroView(view, statsByViewKey[view.ViewKey])).ToList();
    }

    public async Task<object> GetMacroViewColumnsAsync(string viewKey)
    {
        var view = GetMacroViewDefinition(viewKey);
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync(
            @"
                SELECT
                    column_name,
                    ordinal_position,
                    data_type,
                    numeric_precision,
                    numeric_scale,
                    is_nullable
                FROM information_schema.columns
                WHERE table_schema = @SchemaName
                  AND table_name = @ViewName
                ORDER BY ordinal_position
            ",
            new { view.SchemaName, view.ViewName });

        return new
        {
            view = SanitizeMacroView(view),
            columns = rows.Select(SanitizeColumn).ToList()
        };
    }

    public async Task<object> ListMacroViewRowsAsync(string viewKey, IReadOnlyDictionary<string, string?> filters)
    {
        var view = GetMacroViewDefinition(viewKey);
        var (limit, offset) = GetPagination(filters, allowAll: true);
        var clauses = new List<string>();
        var parameters = new DynamicParameters();
        var parameterIndex = 0;

        AddDateRangeFilters(clauses, parameters, ref parameterIndex, "date", GetFilter(filters, "from"), GetFilter(filters, "to"));

        var whereClause = BuildWhereClause(clauses);
        var relationSql = GetRelationSql(view.SchemaName, view.ViewName);
        var sortDirection = IsAscending(filters) ? "ASC" : "DESC";

        using var connection = _connectionFactory.CreateConnection();
        var total = await connection.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*)::int AS total FROM {relationSql} {whereClause}",
            parameters);

        var paginationSql = string.Empty;
        if (limit is not null)
        {
            parameters.Add("limit", limit.Value);
            parameters.Add("offset", offset);
            paginationSql = "LIMIT @limit OFFSET @offset";
        }

        var rows = await connection.QueryAsync(
            $@"
                SELECT *
                FROM {relationSql}
                {whereClause}
                ORDER BY date {sortDirection}
                {paginationSql}
            ",
            parameters);

        return new
        {
            view = SanitizeMacroView(view),
            total,
            limit = limit ?? total,
            offset,
            items = rows.Select(CamelizeRow).ToList()
        };
    }

    public async Task<object> GetLatestMacroViewRowAsync(string viewKey)
    {
        var view = GetMacroViewDefinition(viewKey);
        var relationSql = GetRelationSql(view.SchemaName, view.ViewName);

        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QueryFirstOrDefaultAsync(
            $@"
                SELECT *
                FROM {relationSql}
                WHERE date IS NOT NULL
                ORDER BY date DESC
                LIMIT 1
            ");

        return new
        {
            view = SanitizeMacroView(view),
            item = row is null ? null : CamelizeRow(row)
        };
    }

    public async Task<object> ListMacroIndicatorsAsync(IReadOnlyDictionary<string, string?> filters)
    {
        var (limit, offset) = GetPagination(
            filters,
            defaultLimit: DefaultSeriesLimit,
            maxLimit: MaxSeriesLimit);
        var clauses = new List<string>();
        var parameters = new DynamicParameters();
        var parameterIndex = 0;

        var source = NormalizeOptionalString(GetFilter(filters, "source"));
        if (source is not null)
        {
            AddEqualsFilter(clauses, parameters, ref parameterIndex, "source", source.ToUpperInvariant());
        }

        AddBooleanFilter(clauses, parameters, ref parameterIndex, "active", GetFilter(filters, "active"));
        AddSearchFilter(
            clauses,
            parameters,
            ref parameterIndex,
            new[] { "indicator_code", "source", "description", "frequency" },
            GetFilter(filters, "q"));

        var whereClause = BuildWhereClause(clauses);
        using var connection = _connectionFactory.CreateConnection();
        var total = await connection.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*)::int AS total FROM macro.indicators {whereClause}",
            parameters);

        parameters.Add("limit", limit ?? DefaultSeriesLimit);
        parameters.Add("offset", offset);

        var rows = await connection.QueryAsync(
            $@"
                SELECT
                    indicator_code,
                    source,
                    description,
                    frequency,
                    created_at,
                    active
                FROM macro.indicators
                {whereClause}
                ORDER BY source, indicator_code
                LIMIT @limit
                OFFSET @offset
            ",
            parameters);

        return new
        {
            total,
            limit = limit ?? DefaultSeriesLimit,
            offset,
            items = rows.Select(SanitizeIndicator).ToList()
        };
    }

    public async Task<object> GetMacroIndicatorAsync(string indicatorCode)
    {
        var normalizedIndicatorCode = NormalizeIndicatorCode(indicatorCode);
        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QueryFirstOrDefaultAsync(
            @"
                SELECT
                    indicator_code,
                    source,
                    description,
                    frequency,
                    created_at,
                    active
                FROM macro.indicators
                WHERE indicator_code = @IndicatorCode
                LIMIT 1
            ",
            new { IndicatorCode = normalizedIndicatorCode });

        if (row is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Indicator not found.", new { indicatorCode = normalizedIndicatorCode });
        }

        var indicator = SanitizeIndicator(row);
        var stats = await GetIndicatorSeriesStatsAsync(normalizedIndicatorCode);

        return new
        {
            indicator,
            stats
        };
    }

    public async Task<object> ListMacroIndicatorSeriesAsync(string indicatorCode, IReadOnlyDictionary<string, string?> filters)
    {
        var normalizedIndicatorCode = NormalizeIndicatorCode(indicatorCode);
        var indicatorPayload = await GetMacroIndicatorAsync(normalizedIndicatorCode);
        var relationSql = await EnsureIndicatorTableExistsAsync(normalizedIndicatorCode);
        var (limit, offset) = GetPagination(
            filters,
            allowAll: true,
            defaultLimit: DefaultSeriesLimit,
            maxLimit: MaxSeriesLimit);
        var clauses = new List<string>();
        var parameters = new DynamicParameters();
        var parameterIndex = 0;

        AddDateRangeFilters(clauses, parameters, ref parameterIndex, "edate", GetFilter(filters, "from"), GetFilter(filters, "to"));

        var whereClause = BuildWhereClause(clauses);
        var sortDirection = IsAscending(filters) ? "ASC" : "DESC";

        using var connection = _connectionFactory.CreateConnection();
        var total = await connection.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*)::int AS total FROM {relationSql} {whereClause}",
            parameters);

        var paginationSql = string.Empty;
        if (limit is not null)
        {
            parameters.Add("limit", limit.Value);
            parameters.Add("offset", offset);
            paginationSql = "LIMIT @limit OFFSET @offset";
        }

        var rows = await connection.QueryAsync(
            $@"
                SELECT edate, value
                FROM {relationSql}
                {whereClause}
                ORDER BY edate {sortDirection}
                {paginationSql}
            ",
            parameters);

        return new
        {
            indicator = GetProperty(indicatorPayload, "indicator"),
            stats = GetProperty(indicatorPayload, "stats"),
            total,
            limit = limit ?? total,
            offset,
            items = rows.Select(SanitizeIndicatorSeriesRow).ToList()
        };
    }

    private async Task<object> GetViewStatsAsync(MacroViewDefinition view)
    {
        var relationSql = GetRelationSql(view.SchemaName, view.ViewName);
        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QueryFirstOrDefaultAsync(
            $@"
                SELECT
                    COUNT(*)::int AS total_rows,
                    MIN(date) AS min_date,
                    MAX(date) AS max_date
                FROM {relationSql}
            ");

        return new
        {
            totalRows = GetInt(row, "total_rows"),
            minDate = GetValue(row, "min_date"),
            maxDate = GetValue(row, "max_date")
        };
    }

    private async Task<object> GetIndicatorSeriesStatsAsync(string indicatorCode)
    {
        var relationSql = await EnsureIndicatorTableExistsAsync(indicatorCode);
        using var connection = _connectionFactory.CreateConnection();
        var row = await connection.QueryFirstOrDefaultAsync(
            $@"
                SELECT
                    COUNT(*)::int AS total_rows,
                    MIN(edate) AS min_date,
                    MAX(edate) AS max_date
                FROM {relationSql}
            ");

        return new
        {
            totalRows = GetInt(row, "total_rows"),
            minDate = GetValue(row, "min_date"),
            maxDate = GetValue(row, "max_date")
        };
    }

    private async Task<IReadOnlyList<object>> GetIndicatorSourceCountsAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync(
            @"
                SELECT
                    source,
                    active,
                    COUNT(*)::int AS total
                FROM macro.indicators
                GROUP BY source, active
                ORDER BY source, active DESC
            ");

        return rows.Select(row => new
        {
            source = GetValue(row, "source"),
            active = GetValue(row, "active"),
            total = GetInt(row, "total")
        }).ToList<object>();
    }

    private async Task<string> EnsureIndicatorTableExistsAsync(string indicatorCode)
    {
        var relationSql = GetRelationSql("macro", indicatorCode);
        using var connection = _connectionFactory.CreateConnection();
        var relationName = await connection.ExecuteScalarAsync<string?>(
            "SELECT to_regclass(@RelationName) AS relation_name",
            new { RelationName = relationSql });

        if (string.IsNullOrWhiteSpace(relationName))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Indicator table not found.", new { indicatorCode });
        }

        return relationSql;
    }

    private static MacroViewDefinition GetMacroViewDefinition(string viewKey)
    {
        var normalizedViewKey = NormalizeViewKey(viewKey);
        if (normalizedViewKey is null || !MacroViewByKey.TryGetValue(normalizedViewKey, out var view))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Macro view not found.", new { viewKey });
        }

        return view;
    }

    private static object SanitizeMacroView(MacroViewDefinition view, object? stats = null)
    {
        if (stats is null)
        {
            return new
            {
                viewKey = view.ViewKey,
                schemaName = view.SchemaName,
                viewName = view.ViewName,
                databaseObject = $"{view.SchemaName}.{view.ViewName}",
                label = view.Label,
                region = view.Region,
                category = view.Category,
                description = view.Description,
                defaultOrder = "date_desc"
            };
        }

        return new
        {
            viewKey = view.ViewKey,
            schemaName = view.SchemaName,
            viewName = view.ViewName,
            databaseObject = $"{view.SchemaName}.{view.ViewName}",
            label = view.Label,
            region = view.Region,
            category = view.Category,
            description = view.Description,
            defaultOrder = "date_desc",
            stats
        };
    }

    private static object SanitizeColumn(object row)
    {
        return new
        {
            columnName = GetValue(row, "column_name"),
            fieldName = ToCamelCase(Convert.ToString(GetValue(row, "column_name")) ?? string.Empty),
            ordinalPosition = GetValue(row, "ordinal_position"),
            dataType = GetValue(row, "data_type"),
            numericPrecision = GetValue(row, "numeric_precision"),
            numericScale = GetValue(row, "numeric_scale"),
            isNullable = string.Equals(Convert.ToString(GetValue(row, "is_nullable")), "YES", StringComparison.OrdinalIgnoreCase)
        };
    }

    private static object SanitizeIndicator(object row)
    {
        return new
        {
            indicatorCode = GetValue(row, "indicator_code"),
            source = GetValue(row, "source"),
            description = GetValue(row, "description"),
            frequency = GetValue(row, "frequency"),
            createdAt = GetValue(row, "created_at"),
            active = GetValue(row, "active")
        };
    }

    private static object SanitizeIndicatorSeriesRow(object row)
    {
        return new
        {
            date = GetValue(row, "edate"),
            value = GetValue(row, "value")
        };
    }

    private static Dictionary<string, object?> CamelizeRow(object row)
    {
        return ToObjectDictionary(row).ToDictionary(
            entry => ToCamelCase(entry.Key),
            entry => entry.Value,
            StringComparer.OrdinalIgnoreCase);
    }

    private static string? NormalizeViewKey(string? viewKey)
    {
        var normalized = NormalizeOptionalString(viewKey);
        if (normalized is null)
        {
            return null;
        }

        return normalized
            .Replace("macro.vw_", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("vw_", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace('_', '-')
            .ToLowerInvariant();
    }

    private static string NormalizeIndicatorCode(string? indicatorCode)
    {
        var normalized = NormalizeOptionalString(indicatorCode);
        if (normalized is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "indicatorCode is required.");
        }

        var upperIndicatorCode = normalized.ToUpperInvariant();
        if (!Regex.IsMatch(upperIndicatorCode, "^[A-Z0-9_]+$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "indicatorCode contains invalid characters.");
        }

        return upperIndicatorCode;
    }

    private static (int? Limit, int Offset) GetPagination(
        IReadOnlyDictionary<string, string?> filters,
        bool allowAll = false,
        int defaultLimit = DefaultLimit,
        int maxLimit = MaxLimit)
    {
        if (allowAll && IsAllRowsRequest(filters))
        {
            return (null, 0);
        }

        return (
            ToPositiveInteger(GetFilter(filters, "limit"), defaultLimit, maxLimit),
            ToPositiveInteger(GetFilter(filters, "offset"), 0, int.MaxValue));
    }

    private static bool IsAllRowsRequest(IReadOnlyDictionary<string, string?> filters)
    {
        var allValue = (GetFilter(filters, "all") ?? string.Empty).Trim().ToLowerInvariant();
        var limitValue = (GetFilter(filters, "limit") ?? string.Empty).Trim().ToLowerInvariant();
        var allTokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "1",
            "true",
            "yes",
            "all",
            "max"
        };

        return allTokens.Contains(allValue) || limitValue is "all" or "max";
    }

    private static int ToPositiveInteger(string? value, int fallback, int max = int.MaxValue)
    {
        if (!int.TryParse(value, out var parsed) || parsed < 0)
        {
            return fallback;
        }

        return Math.Min(parsed, max);
    }

    private static string? NormalizeOptionalString(string? value)
    {
        if (value is null)
        {
            return null;
        }

        var text = value.Trim();
        return text.Length == 0 ? null : text;
    }

    private static bool? NormalizeBooleanFilter(string? value)
    {
        if (value is null || value.Length == 0)
        {
            return null;
        }

        if (value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1")
        {
            return true;
        }

        if (value.Equals("false", StringComparison.OrdinalIgnoreCase) || value == "0")
        {
            return false;
        }

        return null;
    }

    private static void AddDateRangeFilters(
        ICollection<string> clauses,
        DynamicParameters parameters,
        ref int parameterIndex,
        string columnName,
        string? from,
        string? to)
    {
        var normalizedFrom = NormalizeOptionalString(from);
        var normalizedTo = NormalizeOptionalString(to);

        if (normalizedFrom is not null)
        {
            var parameterName = $"p{parameterIndex++}";
            parameters.Add(parameterName, normalizedFrom);
            clauses.Add($"{columnName} >= CAST(@{parameterName} AS date)");
        }

        if (normalizedTo is not null)
        {
            var parameterName = $"p{parameterIndex++}";
            parameters.Add(parameterName, normalizedTo);
            clauses.Add($"{columnName} < CAST(@{parameterName} AS date)");
        }
    }

    private static void AddEqualsFilter(
        ICollection<string> clauses,
        DynamicParameters parameters,
        ref int parameterIndex,
        string columnName,
        string value)
    {
        var normalizedValue = NormalizeOptionalString(value);
        if (normalizedValue is null)
        {
            return;
        }

        var parameterName = $"p{parameterIndex++}";
        parameters.Add(parameterName, normalizedValue);
        clauses.Add($"{columnName} = @{parameterName}");
    }

    private static void AddBooleanFilter(
        ICollection<string> clauses,
        DynamicParameters parameters,
        ref int parameterIndex,
        string columnName,
        string? value)
    {
        var normalizedValue = NormalizeBooleanFilter(value);
        if (normalizedValue is null)
        {
            return;
        }

        var parameterName = $"p{parameterIndex++}";
        parameters.Add(parameterName, normalizedValue.Value);
        clauses.Add($"{columnName} = @{parameterName}");
    }

    private static void AddSearchFilter(
        ICollection<string> clauses,
        DynamicParameters parameters,
        ref int parameterIndex,
        IEnumerable<string> columns,
        string? searchText)
    {
        var normalizedSearchText = NormalizeOptionalString(searchText);
        if (normalizedSearchText is null)
        {
            return;
        }

        var parameterName = $"p{parameterIndex++}";
        parameters.Add(parameterName, $"%{normalizedSearchText}%");
        var placeholder = $"@{parameterName}";
        clauses.Add($"({string.Join(" OR ", columns.Select(columnName => $"{columnName} ILIKE {placeholder}"))})");
    }

    private static string BuildWhereClause(IReadOnlyCollection<string> clauses)
    {
        return clauses.Count == 0 ? string.Empty : $"WHERE {string.Join(" AND ", clauses)}";
    }

    private static bool IsAscending(IReadOnlyDictionary<string, string?> filters)
    {
        var sortValue = (GetFilter(filters, "sort") ?? GetFilter(filters, "order") ?? string.Empty).Trim();
        return sortValue.Equals("asc", StringComparison.OrdinalIgnoreCase);
    }

    private static string GetRelationSql(string schemaName, string objectName)
    {
        return $"{QuoteIdentifier(schemaName)}.{QuoteIdentifier(objectName)}";
    }

    private static string QuoteIdentifier(string identifier)
    {
        if (!Regex.IsMatch(identifier, "^[A-Za-z_][A-Za-z0-9_]*$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "SQL identifier contains invalid characters.");
        }

        return $"\"{identifier.Replace("\"", "\"\"")}\"";
    }

    private static string ToCamelCase(string value)
    {
        return Regex.Replace(value, "_([a-z0-9])", match => match.Groups[1].Value.ToUpperInvariant());
    }

    private static string? GetFilter(IReadOnlyDictionary<string, string?> filters, string key)
    {
        return filters.TryGetValue(key, out var value) ? value : null;
    }

    private static object? GetValue(object? row, string key)
    {
        if (row is null)
        {
            return null;
        }

        var dictionary = ToObjectDictionary(row);
        return dictionary.TryGetValue(key, out var value) ? value : null;
    }

    private static int GetInt(object? row, string key)
    {
        var value = GetValue(row, key);
        return value is null || value is DBNull ? 0 : Convert.ToInt32(value);
    }

    private static object? GetProperty(object source, string propertyName)
    {
        return source.GetType().GetProperty(propertyName)?.GetValue(source);
    }

    private static Dictionary<string, object?> ToObjectDictionary(object row)
    {
        if (row is IDictionary<string, object> objectDictionary)
        {
            return objectDictionary.ToDictionary(
                entry => entry.Key,
                entry => entry.Value is DBNull ? null : entry.Value,
                StringComparer.OrdinalIgnoreCase);
        }

        return row.GetType()
            .GetProperties()
            .ToDictionary(
                property => property.Name,
                property =>
                {
                    var value = property.GetValue(row);
                    return value is DBNull ? null : value;
                },
                StringComparer.OrdinalIgnoreCase);
    }
}
