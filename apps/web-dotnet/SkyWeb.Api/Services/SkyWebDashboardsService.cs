using System.Text.RegularExpressions;
using System.Text.Json;
using Dapper;
using SkyWeb.Api.Data;

namespace SkyWeb.Api.Services;

public sealed class SkyWebDashboardsService
{
    private const int MaxTitleLength = 160;
    private const int MaxDescriptionLength = 800;
    private const int MaxItemNoteLength = 800;

    private static readonly ISet<string> AllowedLayoutPresets = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "executive",
        "research",
        "compact"
    };

    private static readonly ISet<string> AllowedItemModes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "view_card",
        "wide_card",
        "compact_card",
        "metric_card",
        "mini_chart",
        "latest_row",
        "table_preview"
    };

    private readonly DbConnectionFactory _connectionFactory;
    private readonly MacroReadService _macroReadService;
    private readonly SkyWebSavedViewsService _savedViewsService;

    public SkyWebDashboardsService(
        DbConnectionFactory connectionFactory,
        MacroReadService macroReadService,
        SkyWebSavedViewsService savedViewsService)
    {
        _connectionFactory = connectionFactory;
        _macroReadService = macroReadService;
        _savedViewsService = savedViewsService;
    }

    public async Task<IReadOnlyList<DashboardDto>> ListDashboardsAsync(Guid userId)
    {
        var viewByKey = await _savedViewsService.GetMacroViewMapAsync(includeStats: true);

        using var connection = _connectionFactory.CreateConnection();
        var dashboardRows = (await connection.QueryAsync<DashboardRow>(
            @"
                SELECT
                    dashboard_id AS DashboardId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    dashboard_key AS DashboardKey,
                    title AS Title,
                    description AS Description,
                    layout_preset AS LayoutPreset,
                    is_default AS IsDefault,
                    sort_order AS SortOrder,
                    item_count AS ItemCount,
                    pinned_item_count AS PinnedItemCount,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_user_dashboards
                WHERE user_id = @UserId
                ORDER BY is_default DESC, sort_order ASC, updated_at DESC, dashboard_key ASC
            ",
            new { UserId = userId })).ToList();

        var itemRows = (await connection.QueryAsync<DashboardItemRow>(
            @"
                SELECT
                    item_id AS ItemId,
                    dashboard_id AS DashboardId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    dashboard_key AS DashboardKey,
                    dashboard_title AS DashboardTitle,
                    item_source AS ItemSource,
                    view_key AS ViewKey,
                    indicator_code AS IndicatorCode,
                    item_title AS ItemTitle,
                    item_note AS ItemNote,
                    item_mode AS ItemMode,
                    sort_order AS SortOrder,
                    position_row AS PositionRow,
                    position_col AS PositionCol,
                    width_units AS WidthUnits,
                    height_units AS HeightUnits,
                    saved_view_id AS SavedViewId,
                    saved_display_label AS SavedDisplayLabel,
                    saved_note AS SavedNote,
                    saved_pinned AS SavedPinned,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_user_dashboard_items
                WHERE user_id = @UserId
                ORDER BY sort_order ASC, updated_at DESC, COALESCE(view_key, indicator_code) ASC
            ",
            new { UserId = userId })).ToList();

        var indicatorByCode = await GetMacroIndicatorMapAsync(itemRows.Select(row => row.IndicatorCode));

        var itemsByDashboardKey = itemRows
            .GroupBy(row => row.DashboardKey ?? string.Empty, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.Select(row => SanitizeDashboardItem(row, viewByKey, indicatorByCode)).ToList(),
                StringComparer.OrdinalIgnoreCase);

        return dashboardRows
            .Select(row => SanitizeDashboard(row, itemsByDashboardKey.TryGetValue(row.DashboardKey ?? string.Empty, out var items) ? items : new List<DashboardItemDto>()))
            .ToList();
    }

    public async Task<DashboardDto?> GetDashboardAsync(Guid userId, string dashboardKey)
    {
        var normalizedDashboardKey = NormalizeDashboardKey(dashboardKey);
        var viewByKey = await _savedViewsService.GetMacroViewMapAsync(includeStats: true);

        using var connection = _connectionFactory.CreateConnection();
        var dashboardRow = await connection.QueryFirstOrDefaultAsync<DashboardRow>(
            @"
                SELECT
                    dashboard_id AS DashboardId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    dashboard_key AS DashboardKey,
                    title AS Title,
                    description AS Description,
                    layout_preset AS LayoutPreset,
                    is_default AS IsDefault,
                    sort_order AS SortOrder,
                    item_count AS ItemCount,
                    pinned_item_count AS PinnedItemCount,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_user_dashboards
                WHERE user_id = @UserId
                  AND dashboard_key = @DashboardKey
                LIMIT 1
            ",
            new { UserId = userId, DashboardKey = normalizedDashboardKey });

        if (dashboardRow is null)
        {
            return null;
        }

        var itemRows = await connection.QueryAsync<DashboardItemRow>(
            @"
                SELECT
                    item_id AS ItemId,
                    dashboard_id AS DashboardId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    dashboard_key AS DashboardKey,
                    dashboard_title AS DashboardTitle,
                    item_source AS ItemSource,
                    view_key AS ViewKey,
                    indicator_code AS IndicatorCode,
                    item_title AS ItemTitle,
                    item_note AS ItemNote,
                    item_mode AS ItemMode,
                    sort_order AS SortOrder,
                    position_row AS PositionRow,
                    position_col AS PositionCol,
                    width_units AS WidthUnits,
                    height_units AS HeightUnits,
                    saved_view_id AS SavedViewId,
                    saved_display_label AS SavedDisplayLabel,
                    saved_note AS SavedNote,
                    saved_pinned AS SavedPinned,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_user_dashboard_items
                WHERE user_id = @UserId
                  AND dashboard_key = @DashboardKey
                ORDER BY sort_order ASC, updated_at DESC, COALESCE(view_key, indicator_code) ASC
            ",
            new { UserId = userId, DashboardKey = normalizedDashboardKey });

        var itemRowList = itemRows.ToList();
        var indicatorByCode = await GetMacroIndicatorMapAsync(itemRowList.Select(row => row.IndicatorCode));

        return SanitizeDashboard(
            dashboardRow,
            itemRowList.Select(row => SanitizeDashboardItem(row, viewByKey, indicatorByCode)).ToList());
    }

    public async Task<DashboardDto> CreateDashboardAsync(Guid userId, JsonElement body)
    {
        var dashboard = NormalizeDashboardBody(body);
        var dashboardKey = await CreateUniqueDashboardKeyAsync(userId, dashboard.Title, dashboard.DashboardKey);

        using var connection = _connectionFactory.CreateConnection();
        if (dashboard.IsDefault)
        {
            await connection.ExecuteAsync(
                "UPDATE skyweb.user_dashboards SET is_default = FALSE WHERE user_id = @UserId",
                new { UserId = userId });
        }

        var row = await connection.QuerySingleAsync<DashboardRow>(
            @"
                INSERT INTO skyweb.user_dashboards (
                    user_id,
                    dashboard_key,
                    title,
                    description,
                    layout_preset,
                    is_default,
                    sort_order
                )
                VALUES (@UserId, @DashboardKey, @Title, @Description, @LayoutPreset, @IsDefault, @SortOrder)
                RETURNING
                    dashboard_id AS DashboardId,
                    user_id AS UserId,
                    NULL::text AS Email,
                    NULL::text AS Username,
                    dashboard_key AS DashboardKey,
                    title AS Title,
                    description AS Description,
                    layout_preset AS LayoutPreset,
                    is_default AS IsDefault,
                    sort_order AS SortOrder,
                    0::int AS ItemCount,
                    0::int AS PinnedItemCount,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
            ",
            new
            {
                UserId = userId,
                DashboardKey = dashboardKey,
                dashboard.Title,
                dashboard.Description,
                dashboard.LayoutPreset,
                dashboard.IsDefault,
                dashboard.SortOrder
            });

        return SanitizeDashboard(row, new List<DashboardItemDto>());
    }

    public async Task<DashboardDto> UpdateDashboardAsync(Guid userId, string dashboardKey, JsonElement body)
    {
        var normalizedDashboardKey = NormalizeDashboardKey(dashboardKey);
        var patch = NormalizeDashboardPatchBody(body);

        if (patch.Count == 0)
        {
            var current = await GetDashboardAsync(userId, normalizedDashboardKey);
            if (current is null)
            {
                throw new ApiException(StatusCodes.Status404NotFound, "Dashboard not found.", new { dashboardKey = normalizedDashboardKey });
            }

            return current;
        }

        using var connection = _connectionFactory.CreateConnection();
        if (patch.TryGetValue("isDefault", out var defaultValue) && defaultValue is true)
        {
            await connection.ExecuteAsync(
                @"
                    UPDATE skyweb.user_dashboards
                    SET is_default = FALSE
                    WHERE user_id = @UserId
                      AND dashboard_key <> @DashboardKey
                ",
                new { UserId = userId, DashboardKey = normalizedDashboardKey });
        }

        var assignments = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);
        parameters.Add("DashboardKey", normalizedDashboardKey);
        AddAssignmentIfPresent(patch, "title", "title", assignments, parameters);
        AddAssignmentIfPresent(patch, "description", "description", assignments, parameters);
        AddAssignmentIfPresent(patch, "layoutPreset", "layout_preset", assignments, parameters);
        AddAssignmentIfPresent(patch, "isDefault", "is_default", assignments, parameters);
        AddAssignmentIfPresent(patch, "sortOrder", "sort_order", assignments, parameters);

        var updatedDashboardKey = await connection.ExecuteScalarAsync<string?>(
            $@"
                UPDATE skyweb.user_dashboards
                SET {string.Join(", ", assignments)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
                  AND dashboard_key = @DashboardKey
                RETURNING dashboard_key
            ",
            parameters);

        if (string.IsNullOrWhiteSpace(updatedDashboardKey))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Dashboard not found.", new { dashboardKey = normalizedDashboardKey });
        }

        return (await GetDashboardAsync(userId, normalizedDashboardKey))!;
    }

    public async Task<RemoveDashboardResult> RemoveDashboardAsync(Guid userId, string dashboardKey)
    {
        var normalizedDashboardKey = NormalizeDashboardKey(dashboardKey);
        using var connection = _connectionFactory.CreateConnection();
        var removedDashboardKey = await connection.ExecuteScalarAsync<string?>(
            @"
                DELETE FROM skyweb.user_dashboards
                WHERE user_id = @UserId
                  AND dashboard_key = @DashboardKey
                RETURNING dashboard_key
            ",
            new { UserId = userId, DashboardKey = normalizedDashboardKey });

        return new RemoveDashboardResult(
            Removed: !string.IsNullOrWhiteSpace(removedDashboardKey),
            DashboardKey: normalizedDashboardKey);
    }

    public async Task<DashboardMutationResult> AddDashboardItemAsync(Guid userId, string dashboardKey, JsonElement body)
    {
        var normalizedDashboardKey = NormalizeDashboardKey(dashboardKey);
        var item = NormalizeDashboardItemBody(body);

        if (item.ItemSource == "indicator")
        {
            await AssertMacroIndicatorExistsAsync(item.IndicatorCode!);
        }
        else
        {
            await _savedViewsService.AssertMacroViewExistsAsync(item.ViewKey!);
            await _savedViewsService.AssertSavedViewExistsAsync(userId, item.ViewKey!);
        }

        using var connection = _connectionFactory.CreateConnection();
        var dashboardId = await connection.ExecuteScalarAsync<Guid?>(
            @"
                SELECT dashboard_id
                FROM skyweb.user_dashboards
                WHERE user_id = @UserId
                  AND dashboard_key = @DashboardKey
                LIMIT 1
            ",
            new { UserId = userId, DashboardKey = normalizedDashboardKey });

        if (dashboardId is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Dashboard not found.", new { dashboardKey = normalizedDashboardKey });
        }

        var existingItemId = await connection.ExecuteScalarAsync<Guid?>(
            @"
                SELECT item_id
                FROM skyweb.user_dashboard_items
                WHERE dashboard_id = @DashboardId
                  AND item_source = @ItemSource
                  AND (
                    (@ItemSource = 'view' AND view_key = @ViewKey)
                    OR (@ItemSource = 'indicator' AND indicator_code = @IndicatorCode)
                  )
                LIMIT 1
            ",
            new
            {
                DashboardId = dashboardId.Value,
                item.ItemSource,
                item.ViewKey,
                item.IndicatorCode
            });

        Guid itemId;
        if (existingItemId is not null)
        {
            itemId = await connection.ExecuteScalarAsync<Guid>(
                @"
                    UPDATE skyweb.user_dashboard_items
                    SET item_title = @ItemTitle,
                        item_note = @ItemNote,
                        item_mode = @ItemMode,
                        sort_order = @SortOrder,
                        position_row = @PositionRow,
                        position_col = @PositionCol,
                        width_units = @WidthUnits,
                        height_units = @HeightUnits,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE item_id = @ItemId
                    RETURNING item_id
                ",
                new
                {
                    ItemId = existingItemId.Value,
                    item.ItemTitle,
                    item.ItemNote,
                    item.ItemMode,
                    item.SortOrder,
                    item.PositionRow,
                    item.PositionCol,
                    item.WidthUnits,
                    item.HeightUnits
                });
        }
        else
        {
            itemId = await connection.ExecuteScalarAsync<Guid>(
                @"
                    INSERT INTO skyweb.user_dashboard_items (
                        dashboard_id,
                        item_source,
                        view_key,
                        indicator_code,
                        item_title,
                        item_note,
                        item_mode,
                        sort_order,
                        position_row,
                        position_col,
                        width_units,
                        height_units
                    )
                    VALUES (@DashboardId, @ItemSource, @ViewKey, @IndicatorCode, @ItemTitle, @ItemNote, @ItemMode, @SortOrder, @PositionRow, @PositionCol, @WidthUnits, @HeightUnits)
                    RETURNING item_id
                ",
                new
                {
                    DashboardId = dashboardId.Value,
                    item.ItemSource,
                    item.ViewKey,
                    item.IndicatorCode,
                    item.ItemTitle,
                    item.ItemNote,
                    item.ItemMode,
                    item.SortOrder,
                    item.PositionRow,
                    item.PositionCol,
                    item.WidthUnits,
                    item.HeightUnits
                });
        }

        var dashboard = await GetDashboardAsync(userId, normalizedDashboardKey);
        return new DashboardMutationResult(
            Dashboard: dashboard,
            Item: dashboard?.Items.FirstOrDefault(dashboardItem => dashboardItem.ItemId == itemId));
    }

    public async Task<DashboardMutationResult> UpdateDashboardItemAsync(Guid userId, string dashboardKey, string itemId, JsonElement body)
    {
        var normalizedDashboardKey = NormalizeDashboardKey(dashboardKey);
        var normalizedItemId = NormalizeGuid(itemId, "itemId");
        var patch = NormalizeDashboardItemPatchBody(body);

        if (patch.Count == 0)
        {
            var dashboard = await GetDashboardAsync(userId, normalizedDashboardKey);
            var existingItem = dashboard?.Items.FirstOrDefault(dashboardItem => dashboardItem.ItemId == normalizedItemId);
            if (dashboard is null || existingItem is null)
            {
                throw new ApiException(StatusCodes.Status404NotFound, "Dashboard item not found.", new { dashboardKey = normalizedDashboardKey, itemId = normalizedItemId });
            }

            return new DashboardMutationResult(Dashboard: dashboard, Item: existingItem);
        }

        var assignments = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);
        parameters.Add("DashboardKey", normalizedDashboardKey);
        parameters.Add("ItemId", normalizedItemId);
        AddAssignmentIfPresent(patch, "itemTitle", "item_title", assignments, parameters);
        AddAssignmentIfPresent(patch, "itemNote", "item_note", assignments, parameters);
        AddAssignmentIfPresent(patch, "itemMode", "item_mode", assignments, parameters);
        AddAssignmentIfPresent(patch, "sortOrder", "sort_order", assignments, parameters);
        AddAssignmentIfPresent(patch, "positionRow", "position_row", assignments, parameters);
        AddAssignmentIfPresent(patch, "positionCol", "position_col", assignments, parameters);
        AddAssignmentIfPresent(patch, "widthUnits", "width_units", assignments, parameters);
        AddAssignmentIfPresent(patch, "heightUnits", "height_units", assignments, parameters);

        using var connection = _connectionFactory.CreateConnection();
        var updatedItemId = await connection.ExecuteScalarAsync<Guid?>(
            $@"
                UPDATE skyweb.user_dashboard_items item
                SET {string.Join(", ", assignments)},
                    updated_at = CURRENT_TIMESTAMP
                FROM skyweb.user_dashboards dashboard
                WHERE item.dashboard_id = dashboard.dashboard_id
                  AND dashboard.user_id = @UserId
                  AND dashboard.dashboard_key = @DashboardKey
                  AND item.item_id = @ItemId
                RETURNING item.item_id
            ",
            parameters);

        if (updatedItemId is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Dashboard item not found.", new { dashboardKey = normalizedDashboardKey, itemId = normalizedItemId });
        }

        var dashboard = await GetDashboardAsync(userId, normalizedDashboardKey);
        return new DashboardMutationResult(
            Dashboard: dashboard,
            Item: dashboard?.Items.FirstOrDefault(dashboardItem => dashboardItem.ItemId == normalizedItemId));
    }

    public async Task<DashboardItemRemoveResult> RemoveDashboardItemAsync(Guid userId, string dashboardKey, string itemId)
    {
        var normalizedDashboardKey = NormalizeDashboardKey(dashboardKey);
        var normalizedItemId = NormalizeGuid(itemId, "itemId");

        using var connection = _connectionFactory.CreateConnection();
        var removedItemId = await connection.ExecuteScalarAsync<Guid?>(
            @"
                DELETE FROM skyweb.user_dashboard_items item
                USING skyweb.user_dashboards dashboard
                WHERE item.dashboard_id = dashboard.dashboard_id
                  AND dashboard.user_id = @UserId
                  AND dashboard.dashboard_key = @DashboardKey
                  AND item.item_id = @ItemId
                RETURNING item.item_id
            ",
            new { UserId = userId, DashboardKey = normalizedDashboardKey, ItemId = normalizedItemId });

        var dashboard = await GetDashboardAsync(userId, normalizedDashboardKey);
        return new DashboardItemRemoveResult(
            Dashboard: dashboard,
            ItemId: normalizedItemId,
            Removed: removedItemId is not null);
    }

    private async Task<string> CreateUniqueDashboardKeyAsync(Guid userId, string title, string? requestedKey)
    {
        var baseKey = !string.IsNullOrWhiteSpace(requestedKey)
            ? NormalizeDashboardKey(requestedKey)
            : Slugify(title) ?? "dashboard";

        using var connection = _connectionFactory.CreateConnection();
        var candidateKey = baseKey;
        var suffix = 2;

        while (suffix < 1000)
        {
            var exists = await connection.ExecuteScalarAsync<bool>(
                @"
                    SELECT EXISTS (
                        SELECT 1
                        FROM skyweb.user_dashboards
                        WHERE user_id = @UserId
                          AND dashboard_key = @DashboardKey
                    )
                ",
                new { UserId = userId, DashboardKey = candidateKey });

            if (!exists)
            {
                return candidateKey;
            }

            candidateKey = $"{baseKey[..Math.Min(baseKey.Length, 120)]}-{suffix}";
            suffix += 1;
        }

        throw new ApiException(StatusCodes.Status409Conflict, "Unable to create a unique dashboard key.", new { title });
    }

    private async Task<IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>>> GetMacroIndicatorMapAsync(IEnumerable<string?> indicatorCodes)
    {
        var requestedCodes = indicatorCodes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => NormalizeIndicatorCode(code!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (requestedCodes.Count == 0)
        {
            return new Dictionary<string, IReadOnlyDictionary<string, object?>>(StringComparer.OrdinalIgnoreCase);
        }

        var indicators = new Dictionary<string, IReadOnlyDictionary<string, object?>>(StringComparer.OrdinalIgnoreCase);

        foreach (var code in requestedCodes)
        {
            try
            {
                var payload = await _macroReadService.GetMacroIndicatorAsync(code);
                var payloadDictionary = SkyWebJson.ObjectToDictionary(payload);

                if (payloadDictionary.TryGetValue("indicator", out var indicatorValue) &&
                    indicatorValue is IReadOnlyDictionary<string, object?> indicator)
                {
                    indicators[code] = indicator;
                    continue;
                }
            }
            catch (ApiException)
            {
                // Missing indicators should not break dashboard rendering; validation still protects writes.
            }
        }

        return indicators;
    }

    private async Task AssertMacroIndicatorExistsAsync(string indicatorCode)
    {
        try
        {
            await _macroReadService.GetMacroIndicatorAsync(indicatorCode);
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Macro indicator not found.", new { indicatorCode });
        }
    }

    private static DashboardDto SanitizeDashboard(DashboardRow row, IReadOnlyList<DashboardItemDto> items)
    {
        return new DashboardDto(
            DashboardId: row.DashboardId,
            UserId: row.UserId,
            Email: row.Email,
            Username: row.Username,
            DashboardKey: row.DashboardKey,
            Title: row.Title,
            Description: row.Description,
            LayoutPreset: row.LayoutPreset,
            IsDefault: row.IsDefault,
            SortOrder: row.SortOrder,
            ItemCount: row.ItemCount ?? items.Count,
            PinnedItemCount: row.PinnedItemCount ?? 0,
            CreatedAt: row.CreatedAt,
            UpdatedAt: row.UpdatedAt,
            Items: items);
    }

    private static DashboardItemDto SanitizeDashboardItem(
        DashboardItemRow row,
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> viewByKey,
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> indicatorByCode)
    {
        var itemSource = row.ItemSource ?? (!string.IsNullOrWhiteSpace(row.IndicatorCode) ? "indicator" : "view");
        IReadOnlyDictionary<string, object?>? view = null;
        IReadOnlyDictionary<string, object?>? indicator = null;

        if (itemSource == "indicator" && !string.IsNullOrWhiteSpace(row.IndicatorCode))
        {
            indicatorByCode.TryGetValue(row.IndicatorCode, out indicator);
        }
        else if (!string.IsNullOrWhiteSpace(row.ViewKey))
        {
            viewByKey.TryGetValue(row.ViewKey, out view);
        }

        var itemTitle = FirstNonEmpty(
            row.ItemTitle,
            row.SavedDisplayLabel,
            view is null ? null : SkyWebSavedViewsService.GetString(view, "label"),
            indicator is null ? null : SkyWebSavedViewsService.GetString(indicator, "description"),
            row.IndicatorCode,
            row.ViewKey);
        var itemNote = FirstNonEmpty(row.ItemNote, row.SavedNote);

        return new DashboardItemDto(
            ItemId: row.ItemId,
            DashboardId: row.DashboardId,
            UserId: row.UserId,
            Email: row.Email,
            Username: row.Username,
            DashboardKey: row.DashboardKey,
            DashboardTitle: row.DashboardTitle,
            ItemSource: itemSource,
            ViewKey: row.ViewKey,
            IndicatorCode: row.IndicatorCode,
            ItemTitle: itemTitle,
            ItemNote: itemNote,
            ItemMode: row.ItemMode,
            SortOrder: row.SortOrder,
            PositionRow: row.PositionRow,
            PositionCol: row.PositionCol,
            WidthUnits: row.WidthUnits,
            HeightUnits: row.HeightUnits,
            SavedViewId: row.SavedViewId,
            SavedDisplayLabel: row.SavedDisplayLabel,
            SavedNote: row.SavedNote,
            SavedPinned: row.SavedPinned,
            CreatedAt: row.CreatedAt,
            UpdatedAt: row.UpdatedAt,
            View: view,
            Indicator: indicator);
    }

    private static DashboardInput NormalizeDashboardBody(JsonElement body)
    {
        var title = SkyWebSavedViewsService.NormalizeRequiredString(
            SkyWebSavedViewsService.GetStringProperty(body, "title"),
            "title",
            MaxTitleLength);

        return new DashboardInput
        {
            DashboardKey = SkyWebSavedViewsService.GetStringProperty(body, "dashboardKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "dashboard_key"),
            Title = title,
            Description = SkyWebSavedViewsService.NormalizeOptionalString(SkyWebSavedViewsService.GetProperty(body, "description"), "description", MaxDescriptionLength),
            LayoutPreset = NormalizeLayoutPreset(SkyWebSavedViewsService.GetStringProperty(body, "layoutPreset") ?? SkyWebSavedViewsService.GetStringProperty(body, "layout_preset")),
            IsDefault = SkyWebSavedViewsService.NormalizeBoolean(SkyWebSavedViewsService.GetProperty(body, "isDefault") ?? SkyWebSavedViewsService.GetProperty(body, "is_default"), fallback: false),
            SortOrder = SkyWebSavedViewsService.NormalizeInteger(SkyWebSavedViewsService.GetProperty(body, "sortOrder") ?? SkyWebSavedViewsService.GetProperty(body, "sort_order"), fallback: 0, fieldName: "sortOrder")
        };
    }

    private static IReadOnlyDictionary<string, object?> NormalizeDashboardPatchBody(JsonElement body)
    {
        var patch = new Dictionary<string, object?>();

        if (SkyWebJson.TryGetProperty(body, "title", out var title))
        {
            patch["title"] = SkyWebSavedViewsService.NormalizeRequiredString(SkyWebJson.NormalizeNullableString(title), "title", MaxTitleLength);
        }

        if (SkyWebJson.TryGetProperty(body, "description", out var description))
        {
            patch["description"] = SkyWebSavedViewsService.NormalizeOptionalString(description, "description", MaxDescriptionLength);
        }

        if (SkyWebJson.TryGetProperty(body, "layoutPreset", out var layoutPreset) || SkyWebJson.TryGetProperty(body, "layout_preset", out layoutPreset))
        {
            patch["layoutPreset"] = NormalizeLayoutPreset(SkyWebJson.NormalizeNullableString(layoutPreset));
        }

        if (SkyWebJson.TryGetProperty(body, "isDefault", out var isDefault) || SkyWebJson.TryGetProperty(body, "is_default", out isDefault))
        {
            patch["isDefault"] = SkyWebSavedViewsService.NormalizeBoolean(isDefault, fallback: false);
        }

        if (SkyWebJson.TryGetProperty(body, "sortOrder", out var sortOrder) || SkyWebJson.TryGetProperty(body, "sort_order", out sortOrder))
        {
            patch["sortOrder"] = SkyWebSavedViewsService.NormalizeInteger(sortOrder, fallback: 0, fieldName: "sortOrder");
        }

        return patch;
    }

    private static DashboardItemInput NormalizeDashboardItemBody(JsonElement body)
    {
        var itemSource = NormalizeItemSource(body);
        var viewKey = itemSource == "view"
            ? SkyWebSavedViewsService.NormalizeViewKey(SkyWebSavedViewsService.GetStringProperty(body, "viewKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "view_key"))
            : null;
        var indicatorCode = itemSource == "indicator"
            ? NormalizeIndicatorCode(SkyWebSavedViewsService.GetStringProperty(body, "indicatorCode") ?? SkyWebSavedViewsService.GetStringProperty(body, "indicator_code"))
            : null;

        return new DashboardItemInput
        {
            ItemSource = itemSource,
            ViewKey = viewKey,
            IndicatorCode = indicatorCode,
            ItemTitle = SkyWebSavedViewsService.NormalizeOptionalString(SkyWebSavedViewsService.GetProperty(body, "itemTitle") ?? SkyWebSavedViewsService.GetProperty(body, "item_title"), "itemTitle", MaxTitleLength),
            ItemNote = SkyWebSavedViewsService.NormalizeOptionalString(SkyWebSavedViewsService.GetProperty(body, "itemNote") ?? SkyWebSavedViewsService.GetProperty(body, "item_note"), "itemNote", MaxItemNoteLength),
            ItemMode = NormalizeItemMode(SkyWebSavedViewsService.GetStringProperty(body, "itemMode") ?? SkyWebSavedViewsService.GetStringProperty(body, "item_mode")),
            SortOrder = SkyWebSavedViewsService.NormalizeInteger(SkyWebSavedViewsService.GetProperty(body, "sortOrder") ?? SkyWebSavedViewsService.GetProperty(body, "sort_order"), fallback: 0, fieldName: "sortOrder"),
            PositionRow = SkyWebSavedViewsService.NormalizeInteger(SkyWebSavedViewsService.GetProperty(body, "positionRow") ?? SkyWebSavedViewsService.GetProperty(body, "position_row"), fallback: 0, fieldName: "positionRow", min: 0),
            PositionCol = SkyWebSavedViewsService.NormalizeInteger(SkyWebSavedViewsService.GetProperty(body, "positionCol") ?? SkyWebSavedViewsService.GetProperty(body, "position_col"), fallback: 0, fieldName: "positionCol", min: 0),
            WidthUnits = SkyWebSavedViewsService.NormalizeInteger(SkyWebSavedViewsService.GetProperty(body, "widthUnits") ?? SkyWebSavedViewsService.GetProperty(body, "width_units"), fallback: 1, fieldName: "widthUnits", min: 1, max: 4),
            HeightUnits = SkyWebSavedViewsService.NormalizeInteger(SkyWebSavedViewsService.GetProperty(body, "heightUnits") ?? SkyWebSavedViewsService.GetProperty(body, "height_units"), fallback: 1, fieldName: "heightUnits", min: 1, max: 4)
        };
    }

    private static IReadOnlyDictionary<string, object?> NormalizeDashboardItemPatchBody(JsonElement body)
    {
        var patch = new Dictionary<string, object?>();

        if (SkyWebJson.TryGetProperty(body, "itemTitle", out var itemTitle) || SkyWebJson.TryGetProperty(body, "item_title", out itemTitle))
        {
            patch["itemTitle"] = SkyWebSavedViewsService.NormalizeOptionalString(itemTitle, "itemTitle", MaxTitleLength);
        }

        if (SkyWebJson.TryGetProperty(body, "itemNote", out var itemNote) || SkyWebJson.TryGetProperty(body, "item_note", out itemNote))
        {
            patch["itemNote"] = SkyWebSavedViewsService.NormalizeOptionalString(itemNote, "itemNote", MaxItemNoteLength);
        }

        if (SkyWebJson.TryGetProperty(body, "itemMode", out var itemMode) || SkyWebJson.TryGetProperty(body, "item_mode", out itemMode))
        {
            patch["itemMode"] = NormalizeItemMode(SkyWebJson.NormalizeNullableString(itemMode));
        }

        if (SkyWebJson.TryGetProperty(body, "sortOrder", out var sortOrder) || SkyWebJson.TryGetProperty(body, "sort_order", out sortOrder))
        {
            patch["sortOrder"] = SkyWebSavedViewsService.NormalizeInteger(sortOrder, fallback: 0, fieldName: "sortOrder");
        }

        if (SkyWebJson.TryGetProperty(body, "positionRow", out var positionRow) || SkyWebJson.TryGetProperty(body, "position_row", out positionRow))
        {
            patch["positionRow"] = SkyWebSavedViewsService.NormalizeInteger(positionRow, fallback: 0, fieldName: "positionRow", min: 0);
        }

        if (SkyWebJson.TryGetProperty(body, "positionCol", out var positionCol) || SkyWebJson.TryGetProperty(body, "position_col", out positionCol))
        {
            patch["positionCol"] = SkyWebSavedViewsService.NormalizeInteger(positionCol, fallback: 0, fieldName: "positionCol", min: 0);
        }

        if (SkyWebJson.TryGetProperty(body, "widthUnits", out var widthUnits) || SkyWebJson.TryGetProperty(body, "width_units", out widthUnits))
        {
            patch["widthUnits"] = SkyWebSavedViewsService.NormalizeInteger(widthUnits, fallback: 1, fieldName: "widthUnits", min: 1, max: 4);
        }

        if (SkyWebJson.TryGetProperty(body, "heightUnits", out var heightUnits) || SkyWebJson.TryGetProperty(body, "height_units", out heightUnits))
        {
            patch["heightUnits"] = SkyWebSavedViewsService.NormalizeInteger(heightUnits, fallback: 1, fieldName: "heightUnits", min: 1, max: 4);
        }

        return patch;
    }

    private static string NormalizeDashboardKey(string? value)
    {
        var normalized = SkyWebSavedViewsService.NormalizeRequiredString(value, "dashboardKey")
            .Replace("_", "-")
            .ToLowerInvariant();

        if (!Regex.IsMatch(normalized, "^[a-z0-9][a-z0-9-]{0,127}$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "dashboardKey contains invalid characters.", new { fieldName = "dashboardKey", value });
        }

        return normalized;
    }

    private static string NormalizeIndicatorCode(string? value)
    {
        var normalized = SkyWebSavedViewsService.NormalizeRequiredString(value, "indicatorCode")
            .Replace("-", "_")
            .ToUpperInvariant();

        if (!Regex.IsMatch(normalized, "^[A-Z0-9_]{1,128}$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "indicatorCode contains invalid characters.", new { fieldName = "indicatorCode", value });
        }

        return normalized;
    }

    private static Guid NormalizeGuid(string value, string fieldName)
    {
        if (!Guid.TryParse(value, out var guid))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} must be a valid UUID.", new { fieldName, value });
        }

        return guid;
    }

    private static string NormalizeItemSource(JsonElement body)
    {
        var rawValue =
            SkyWebSavedViewsService.GetStringProperty(body, "itemSource") ??
            SkyWebSavedViewsService.GetStringProperty(body, "item_source") ??
            SkyWebSavedViewsService.GetStringProperty(body, "itemType") ??
            SkyWebSavedViewsService.GetStringProperty(body, "item_type") ??
            SkyWebSavedViewsService.GetStringProperty(body, "sourceType") ??
            SkyWebSavedViewsService.GetStringProperty(body, "source_type");

        if (!string.IsNullOrWhiteSpace(rawValue))
        {
            var normalized = rawValue.Trim().ToLowerInvariant();
            if (normalized is "indicator" or "macro_indicator")
            {
                return "indicator";
            }

            if (normalized is "view" or "macro_view")
            {
                return "view";
            }

            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid dashboard item source.", new
            {
                fieldName = "itemSource",
                value = rawValue,
                allowedValues = new[] { "view", "indicator" }
            });
        }

        return SkyWebSavedViewsService.GetStringProperty(body, "indicatorCode") is not null ||
               SkyWebSavedViewsService.GetStringProperty(body, "indicator_code") is not null
            ? "indicator"
            : "view";
    }

    private static string NormalizeLayoutPreset(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "executive" : value.Trim().ToLowerInvariant();
        if (!AllowedLayoutPresets.Contains(normalized))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid dashboard layout preset.", new
            {
                fieldName = "layoutPreset",
                value,
                allowedValues = AllowedLayoutPresets
            });
        }

        return normalized;
    }

    private static string NormalizeItemMode(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "view_card" : value.Trim().ToLowerInvariant();
        if (!AllowedItemModes.Contains(normalized))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid dashboard item mode.", new
            {
                fieldName = "itemMode",
                value,
                allowedValues = AllowedItemModes
            });
        }

        return normalized;
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

    private static string? Slugify(string value)
    {
        var normalized = Regex.Replace(value.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
        if (normalized.Length == 0)
        {
            return null;
        }

        return normalized[..Math.Min(normalized.Length, 96)];
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

    public sealed record RemoveDashboardResult(bool Removed, string DashboardKey);

    public sealed record DashboardMutationResult(DashboardDto? Dashboard, DashboardItemDto? Item);

    public sealed record DashboardItemRemoveResult(DashboardDto? Dashboard, Guid ItemId, bool Removed);

    public sealed record DashboardDto(
        Guid DashboardId,
        Guid UserId,
        string? Email,
        string? Username,
        string? DashboardKey,
        string? Title,
        string? Description,
        string? LayoutPreset,
        bool IsDefault,
        int SortOrder,
        int ItemCount,
        int PinnedItemCount,
        DateTime? CreatedAt,
        DateTime? UpdatedAt,
        IReadOnlyList<DashboardItemDto> Items);

    public sealed record DashboardItemDto(
        Guid ItemId,
        Guid DashboardId,
        Guid UserId,
        string? Email,
        string? Username,
        string? DashboardKey,
        string? DashboardTitle,
        string? ItemSource,
        string? ViewKey,
        string? IndicatorCode,
        string? ItemTitle,
        string? ItemNote,
        string? ItemMode,
        int SortOrder,
        int PositionRow,
        int PositionCol,
        int WidthUnits,
        int HeightUnits,
        Guid? SavedViewId,
        string? SavedDisplayLabel,
        string? SavedNote,
        bool? SavedPinned,
        DateTime? CreatedAt,
        DateTime? UpdatedAt,
        IReadOnlyDictionary<string, object?>? View,
        IReadOnlyDictionary<string, object?>? Indicator);

    private sealed class DashboardInput
    {
        public string? DashboardKey { get; init; }
        public required string Title { get; init; }
        public string? Description { get; init; }
        public required string LayoutPreset { get; init; }
        public bool IsDefault { get; init; }
        public int SortOrder { get; init; }
    }

    private sealed class DashboardItemInput
    {
        public required string ItemSource { get; init; }
        public string? ViewKey { get; init; }
        public string? IndicatorCode { get; init; }
        public string? ItemTitle { get; init; }
        public string? ItemNote { get; init; }
        public required string ItemMode { get; init; }
        public int SortOrder { get; init; }
        public int PositionRow { get; init; }
        public int PositionCol { get; init; }
        public int WidthUnits { get; init; }
        public int HeightUnits { get; init; }
    }

    private sealed class DashboardRow
    {
        public Guid DashboardId { get; init; }
        public Guid UserId { get; init; }
        public string? Email { get; init; }
        public string? Username { get; init; }
        public string? DashboardKey { get; init; }
        public string? Title { get; init; }
        public string? Description { get; init; }
        public string? LayoutPreset { get; init; }
        public bool IsDefault { get; init; }
        public int SortOrder { get; init; }
        public int? ItemCount { get; init; }
        public int? PinnedItemCount { get; init; }
        public DateTime? CreatedAt { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }

    private sealed class DashboardItemRow
    {
        public Guid ItemId { get; init; }
        public Guid DashboardId { get; init; }
        public Guid UserId { get; init; }
        public string? Email { get; init; }
        public string? Username { get; init; }
        public string? DashboardKey { get; init; }
        public string? DashboardTitle { get; init; }
        public string? ItemSource { get; init; }
        public string? ViewKey { get; init; }
        public string? IndicatorCode { get; init; }
        public string? ItemTitle { get; init; }
        public string? ItemNote { get; init; }
        public string? ItemMode { get; init; }
        public int SortOrder { get; init; }
        public int PositionRow { get; init; }
        public int PositionCol { get; init; }
        public int WidthUnits { get; init; }
        public int HeightUnits { get; init; }
        public Guid? SavedViewId { get; init; }
        public string? SavedDisplayLabel { get; init; }
        public string? SavedNote { get; init; }
        public bool? SavedPinned { get; init; }
        public DateTime? CreatedAt { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }
}
