using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.AspNetCore.Http;
using SkyWeb.Api.Data;

namespace SkyWeb.Api.Services;

public sealed class SkyWebAlertsService
{
    private const int MaxTitleLength = 160;
    private const int MaxDescriptionLength = 800;
    private const int MaxEventLimit = 100;
    private const int MaxNotificationLimit = 100;

    private static readonly ISet<string> AllowedTargetTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "indicator",
        "view_metric"
    };

    private static readonly ISet<string> AllowedConditions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "above",
        "below",
        "crosses_above",
        "crosses_below",
        "changes_by",
        "percent_changes_by"
    };

    private static readonly ISet<string> AllowedSeverities = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "low",
        "medium",
        "high",
        "critical"
    };

    private static readonly ISet<string> AllowedNotificationStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "open",
        "acknowledged",
        "dismissed",
        "all"
    };

    private static readonly ISet<string> NumericDataTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "bigint",
        "decimal",
        "double precision",
        "integer",
        "numeric",
        "real",
        "smallint"
    };

    private readonly DbConnectionFactory _connectionFactory;
    private readonly MacroReadService _macroReadService;

    public SkyWebAlertsService(DbConnectionFactory connectionFactory, MacroReadService macroReadService)
    {
        _connectionFactory = connectionFactory;
        _macroReadService = macroReadService;
    }

    public async Task<IReadOnlyList<object>> ListAlertRulesAsync(Guid userId, IReadOnlyDictionary<string, string?> filters)
    {
        var clauses = new List<string> { "user_id = @UserId" };
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);

        if (filters.TryGetValue("active", out var activeRaw) && !string.IsNullOrWhiteSpace(activeRaw))
        {
            parameters.Add("Active", NormalizeBoolean(activeRaw, fallback: true));
            clauses.Add("active = @Active");
        }

        var targetType = GetFilter(filters, "targetType") ?? GetFilter(filters, "target_type");
        if (!string.IsNullOrWhiteSpace(targetType))
        {
            parameters.Add("TargetType", NormalizeTargetType(targetType));
            clauses.Add("target_type = @TargetType");
        }

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<AlertRuleRow>(
            $@"
                SELECT
                    alert_id AS AlertId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    alert_key AS AlertKey,
                    title AS Title,
                    description AS Description,
                    target_type AS TargetType,
                    indicator_code AS IndicatorCode,
                    view_key AS ViewKey,
                    metric_key AS MetricKey,
                    condition_type AS ConditionType,
                    threshold_value AS ThresholdValue,
                    severity AS Severity,
                    active AS Active,
                    evaluation_metadata::text AS EvaluationMetadataJson,
                    last_status AS LastStatus,
                    last_message AS LastMessage,
                    last_observed_value AS LastObservedValue,
                    last_previous_value AS LastPreviousValue,
                    last_evaluated_at AS LastEvaluatedAt,
                    last_triggered_at AS LastTriggeredAt,
                    event_count AS EventCount,
                    triggered_event_count AS TriggeredEventCount,
                    latest_event_at AS LatestEventAt,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_alert_rules
                WHERE {string.Join(" AND ", clauses)}
                ORDER BY active DESC, severity DESC, updated_at DESC, alert_key ASC
            ",
            parameters);

        return rows.Select(row => SanitizeAlertRule(row)).ToList();
    }

    public async Task<object?> GetAlertRuleAsync(Guid userId, string alertKey)
    {
        var normalizedAlertKey = NormalizeAlertKey(alertKey);
        var rowTask = GetAlertRowAsync(userId, normalizedAlertKey);
        var eventsTask = ListAlertEventsAsync(userId, normalizedAlertKey, new Dictionary<string, string?> { ["limit"] = "50" });

        await Task.WhenAll(rowTask, eventsTask);
        var row = await rowTask;
        if (row is null)
        {
            return null;
        }

        return SanitizeAlertRule(row, await eventsTask);
    }

    public async Task<IReadOnlyList<object>> ListAlertEventsAsync(Guid userId, string alertKey, IReadOnlyDictionary<string, string?> filters)
    {
        var normalizedAlertKey = NormalizeAlertKey(alertKey);
        var limit = NormalizeLimit(GetFilter(filters, "limit"), fallback: 25, max: MaxEventLimit);

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<AlertEventRow>(
            @"
                SELECT
                    event_id AS EventId,
                    alert_id AS AlertId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    alert_key AS AlertKey,
                    alert_title AS AlertTitle,
                    target_type AS TargetType,
                    indicator_code AS IndicatorCode,
                    view_key AS ViewKey,
                    metric_key AS MetricKey,
                    condition_type AS ConditionType,
                    event_status AS EventStatus,
                    observed_value AS ObservedValue,
                    previous_value AS PreviousValue,
                    threshold_value AS ThresholdValue,
                    observed_at AS ObservedAt,
                    previous_observed_at AS PreviousObservedAt,
                    message AS Message,
                    event_metadata::text AS EventMetadataJson,
                    evaluated_at AS EvaluatedAt
                FROM skyweb.vw_alert_rule_events
                WHERE user_id = @UserId
                  AND alert_key = @AlertKey
                ORDER BY evaluated_at DESC
                LIMIT @Limit
            ",
            new { UserId = userId, AlertKey = normalizedAlertKey, Limit = limit });

        return rows.Select(SanitizeAlertEvent).ToList();
    }

    public async Task<object> CreateAlertRuleAsync(Guid userId, JsonElement body)
    {
        var alert = NormalizeAlertBody(body);
        await ValidateAlertTargetAsync(alert.TargetType, alert.IndicatorCode, alert.ViewKey, alert.MetricKey);

        var alertKey = await CreateUniqueAlertKeyAsync(userId, alert.Title, alert.AlertKey);

        using var connection = _connectionFactory.CreateConnection();
        var createdAlertKey = await connection.ExecuteScalarAsync<string>(
            @"
                INSERT INTO skyweb.alert_rules (
                    user_id,
                    alert_key,
                    title,
                    description,
                    target_type,
                    indicator_code,
                    view_key,
                    metric_key,
                    condition_type,
                    threshold_value,
                    severity,
                    active
                )
                VALUES (@UserId, @AlertKey, @Title, @Description, @TargetType, @IndicatorCode, @ViewKey, @MetricKey, @ConditionType, @ThresholdValue, @Severity, @Active)
                RETURNING alert_key
            ",
            new
            {
                UserId = userId,
                AlertKey = alertKey,
                alert.Title,
                alert.Description,
                alert.TargetType,
                alert.IndicatorCode,
                alert.ViewKey,
                alert.MetricKey,
                alert.ConditionType,
                alert.ThresholdValue,
                alert.Severity,
                alert.Active
            });

        var persistedAlertKey = createdAlertKey ?? alertKey;
        return await GetAlertRuleAsync(userId, persistedAlertKey)
            ?? throw new ApiException(
                StatusCodes.Status500InternalServerError,
                "Alert rule was created but could not be reloaded.",
                new { alertKey = persistedAlertKey });
    }

    public async Task<object> UpdateAlertRuleAsync(Guid userId, string alertKey, JsonElement body)
    {
        var normalizedAlertKey = NormalizeAlertKey(alertKey);
        var patch = NormalizeAlertPatchBody(body);

        if (patch.Count == 0)
        {
            var current = await GetAlertRuleAsync(userId, normalizedAlertKey);
            if (current is null)
            {
                throw new ApiException(StatusCodes.Status404NotFound, "Alert rule not found.", new { alertKey = normalizedAlertKey });
            }

            return current;
        }

        if (patch.ContainsKey("targetType"))
        {
            await ValidateAlertTargetAsync(
                Convert.ToString(patch["targetType"]),
                Convert.ToString(patch["indicatorCode"]),
                Convert.ToString(patch["viewKey"]),
                Convert.ToString(patch["metricKey"]));
        }

        var assignments = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);
        parameters.Add("AlertKey", normalizedAlertKey);

        AddAssignmentIfPresent(patch, "title", "title", assignments, parameters);
        AddAssignmentIfPresent(patch, "description", "description", assignments, parameters);
        AddAssignmentIfPresent(patch, "targetType", "target_type", assignments, parameters);
        AddAssignmentIfPresent(patch, "indicatorCode", "indicator_code", assignments, parameters);
        AddAssignmentIfPresent(patch, "viewKey", "view_key", assignments, parameters);
        AddAssignmentIfPresent(patch, "metricKey", "metric_key", assignments, parameters);
        AddAssignmentIfPresent(patch, "conditionType", "condition_type", assignments, parameters);
        AddAssignmentIfPresent(patch, "thresholdValue", "threshold_value", assignments, parameters);
        AddAssignmentIfPresent(patch, "severity", "severity", assignments, parameters);
        AddAssignmentIfPresent(patch, "active", "active", assignments, parameters);

        using var connection = _connectionFactory.CreateConnection();
        var updatedAlertKey = await connection.ExecuteScalarAsync<string?>(
            $@"
                UPDATE skyweb.alert_rules
                SET {string.Join(", ", assignments)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
                  AND alert_key = @AlertKey
                RETURNING alert_key
            ",
            parameters);

        if (string.IsNullOrWhiteSpace(updatedAlertKey))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Alert rule not found.", new { alertKey = normalizedAlertKey });
        }

        return (await GetAlertRuleAsync(userId, normalizedAlertKey))!;
    }

    public async Task<RemoveAlertRuleResult> RemoveAlertRuleAsync(Guid userId, string alertKey)
    {
        var normalizedAlertKey = NormalizeAlertKey(alertKey);
        using var connection = _connectionFactory.CreateConnection();
        var removedAlertKey = await connection.ExecuteScalarAsync<string?>(
            @"
                DELETE FROM skyweb.alert_rules
                WHERE user_id = @UserId
                  AND alert_key = @AlertKey
                RETURNING alert_key
            ",
            new { UserId = userId, AlertKey = normalizedAlertKey });

        return new RemoveAlertRuleResult(
            Removed: !string.IsNullOrWhiteSpace(removedAlertKey),
            AlertKey: normalizedAlertKey);
    }

    public async Task<AlertNotificationListResult> ListAlertNotificationsAsync(Guid userId, IReadOnlyDictionary<string, string?> filters)
    {
        var clauses = new List<string> { "user_id = @UserId" };
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);

        var status = NormalizeNotificationStatus(GetFilter(filters, "status"), fallback: "open");
        var limit = NormalizeLimit(GetFilter(filters, "limit"), fallback: 25, max: MaxNotificationLimit);

        if (!string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            parameters.Add("Status", status);
            clauses.Add("notification_status = @Status");
        }

        var alertKey = GetFilter(filters, "alertKey") ?? GetFilter(filters, "alert_key");
        if (!string.IsNullOrWhiteSpace(alertKey))
        {
            parameters.Add("AlertKey", NormalizeAlertKey(alertKey));
            clauses.Add("alert_key = @AlertKey");
        }

        var severity = GetFilter(filters, "severity");
        if (!string.IsNullOrWhiteSpace(severity))
        {
            parameters.Add("Severity", NormalizeSeverity(severity));
            clauses.Add("severity = @Severity");
        }

        using var connection = _connectionFactory.CreateConnection();
        var whereSql = string.Join(" AND ", clauses);
        var total = await connection.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*)::int AS total_count FROM skyweb.vw_alert_notifications WHERE {whereSql}",
            parameters);

        parameters.Add("Limit", limit);
        var rows = (await connection.QueryAsync<AlertNotificationRow>(
            $@"
                SELECT
                    notification_id AS NotificationId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    alert_id AS AlertId,
                    alert_key AS AlertKey,
                    event_id AS EventId,
                    notification_status AS NotificationStatus,
                    title AS Title,
                    message AS Message,
                    severity AS Severity,
                    target_type AS TargetType,
                    indicator_code AS IndicatorCode,
                    view_key AS ViewKey,
                    metric_key AS MetricKey,
                    observed_value AS ObservedValue,
                    previous_value AS PreviousValue,
                    threshold_value AS ThresholdValue,
                    observed_at AS ObservedAt,
                    evaluated_at AS EvaluatedAt,
                    event_metadata::text AS EventMetadataJson,
                    acknowledged_at AS AcknowledgedAt,
                    dismissed_at AS DismissedAt,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_alert_notifications
                WHERE {whereSql}
                ORDER BY
                    CASE notification_status
                        WHEN 'open' THEN 0
                        WHEN 'acknowledged' THEN 1
                        WHEN 'dismissed' THEN 2
                        ELSE 3
                    END,
                    evaluated_at DESC,
                    created_at DESC
                LIMIT @Limit
            ",
            parameters)).ToList();

        var items = rows.Select(SanitizeAlertNotification).ToList();
        return new AlertNotificationListResult(total, SummarizeNotifications(items), items);
    }

    public async Task<object> AcknowledgeAlertNotificationAsync(Guid userId, string notificationId)
    {
        return await UpdateAlertNotificationStatusAsync(userId, notificationId, "acknowledged");
    }

    public async Task<object> DismissAlertNotificationAsync(Guid userId, string notificationId)
    {
        return await UpdateAlertNotificationStatusAsync(userId, notificationId, "dismissed");
    }

    public async Task<AcknowledgeAllResult> AcknowledgeAllAlertNotificationsAsync(Guid userId, JsonElement body)
    {
        var (clauses, parameters) = BuildOpenNotificationBulkFilter(userId, body);
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<Guid>(
            $@"
                UPDATE skyweb.alert_notifications
                SET notification_status = 'acknowledged',
                    acknowledged_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE {string.Join(" AND ", clauses)}
                RETURNING notification_id
            ",
            parameters);

        return new AcknowledgeAllResult(rows.Count());
    }

    public async Task<DismissAllResult> DismissAllAlertNotificationsAsync(Guid userId, JsonElement body)
    {
        var (clauses, parameters) = BuildOpenNotificationBulkFilter(userId, body);
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<Guid>(
            $@"
                UPDATE skyweb.alert_notifications
                SET notification_status = 'dismissed',
                    dismissed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE {string.Join(" AND ", clauses)}
                RETURNING notification_id
            ",
            parameters);

        return new DismissAllResult(rows.Count());
    }

    private async Task<AlertRuleRow?> GetAlertRowAsync(Guid userId, string alertKey)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<AlertRuleRow>(
            @"
                SELECT
                    alert_id AS AlertId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    alert_key AS AlertKey,
                    title AS Title,
                    description AS Description,
                    target_type AS TargetType,
                    indicator_code AS IndicatorCode,
                    view_key AS ViewKey,
                    metric_key AS MetricKey,
                    condition_type AS ConditionType,
                    threshold_value AS ThresholdValue,
                    severity AS Severity,
                    active AS Active,
                    evaluation_metadata::text AS EvaluationMetadataJson,
                    last_status AS LastStatus,
                    last_message AS LastMessage,
                    last_observed_value AS LastObservedValue,
                    last_previous_value AS LastPreviousValue,
                    last_evaluated_at AS LastEvaluatedAt,
                    last_triggered_at AS LastTriggeredAt,
                    event_count AS EventCount,
                    triggered_event_count AS TriggeredEventCount,
                    latest_event_at AS LatestEventAt,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_alert_rules
                WHERE user_id = @UserId
                  AND alert_key = @AlertKey
                LIMIT 1
            ",
            new { UserId = userId, AlertKey = alertKey });
    }

    private async Task<object> UpdateAlertNotificationStatusAsync(Guid userId, string notificationId, string status)
    {
        var normalizedNotificationId = NormalizeUuid(notificationId, "notificationId");
        var normalizedStatus = NormalizeNotificationStatus(status, fallback: "acknowledged");

        if (string.Equals(normalizedStatus, "all", StringComparison.OrdinalIgnoreCase))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Notification status cannot be all for update.", new
            {
                fieldName = "status",
                status
            });
        }

        using var connection = _connectionFactory.CreateConnection();
        var updatedId = await connection.ExecuteScalarAsync<Guid?>(
            @"
                UPDATE skyweb.alert_notifications
                SET notification_status = @Status,
                    acknowledged_at = CASE WHEN @Status = 'acknowledged' THEN CURRENT_TIMESTAMP ELSE acknowledged_at END,
                    dismissed_at = CASE WHEN @Status = 'dismissed' THEN CURRENT_TIMESTAMP ELSE dismissed_at END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
                  AND notification_id = @NotificationId
                RETURNING notification_id
            ",
            new { UserId = userId, NotificationId = normalizedNotificationId, Status = normalizedStatus });

        if (updatedId is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Alert notification not found.", new
            {
                notificationId = normalizedNotificationId
            });
        }

        var row = await connection.QueryFirstOrDefaultAsync<AlertNotificationRow>(
            @"
                SELECT
                    notification_id AS NotificationId,
                    user_id AS UserId,
                    email AS Email,
                    username AS Username,
                    alert_id AS AlertId,
                    alert_key AS AlertKey,
                    event_id AS EventId,
                    notification_status AS NotificationStatus,
                    title AS Title,
                    message AS Message,
                    severity AS Severity,
                    target_type AS TargetType,
                    indicator_code AS IndicatorCode,
                    view_key AS ViewKey,
                    metric_key AS MetricKey,
                    observed_value AS ObservedValue,
                    previous_value AS PreviousValue,
                    threshold_value AS ThresholdValue,
                    observed_at AS ObservedAt,
                    evaluated_at AS EvaluatedAt,
                    event_metadata::text AS EventMetadataJson,
                    acknowledged_at AS AcknowledgedAt,
                    dismissed_at AS DismissedAt,
                    created_at AS CreatedAt,
                    updated_at AS UpdatedAt
                FROM skyweb.vw_alert_notifications
                WHERE user_id = @UserId
                  AND notification_id = @NotificationId
                LIMIT 1
            ",
            new { UserId = userId, NotificationId = normalizedNotificationId });

        return SanitizeAlertNotification(row!);
    }

    private async Task ValidateAlertTargetAsync(string? targetType, string? indicatorCode, string? viewKey, string? metricKey)
    {
        var normalizedTargetType = NormalizeTargetType(targetType);
        if (string.Equals(normalizedTargetType, "indicator", StringComparison.OrdinalIgnoreCase))
        {
            await _macroReadService.GetMacroIndicatorAsync(NormalizeIndicatorCode(indicatorCode));
            return;
        }

        var normalizedViewKey = NormalizeViewKey(viewKey);
        var normalizedMetricKey = NormalizeMetricKey(metricKey);
        var payload = await _macroReadService.GetMacroViewColumnsAsync(normalizedViewKey);
        var columns = SkyWebJson.GetObjectArrayProperty(payload, "columns");
        var column = columns.FirstOrDefault(candidate =>
        {
            var fieldName = GetString(candidate, "fieldName");
            var columnName = GetString(candidate, "columnName");
            return string.Equals(fieldName, normalizedMetricKey, StringComparison.Ordinal) ||
                   string.Equals(ToCamelCase(columnName ?? string.Empty), normalizedMetricKey, StringComparison.Ordinal);
        });

        if (column is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "View metric not found.", new
            {
                viewKey = normalizedViewKey,
                metricKey = normalizedMetricKey
            });
        }

        var dataType = GetString(column, "dataType");
        if (dataType is null || !NumericDataTypes.Contains(dataType))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "View metric must be numeric for alerts.", new
            {
                viewKey = normalizedViewKey,
                metricKey = normalizedMetricKey,
                dataType
            });
        }
    }

    private async Task<string> CreateUniqueAlertKeyAsync(Guid userId, string title, string? requestedKey)
    {
        var baseKey = requestedKey is not null ? NormalizeAlertKey(requestedKey) : Slugify(title) ?? "alert";
        var candidateKey = baseKey;
        var suffix = 2;

        using var connection = _connectionFactory.CreateConnection();
        while (suffix < 1000)
        {
            var existing = await connection.ExecuteScalarAsync<string?>(
                @"
                    SELECT alert_key
                    FROM skyweb.alert_rules
                    WHERE user_id = @UserId
                      AND alert_key = @AlertKey
                    LIMIT 1
                ",
                new { UserId = userId, AlertKey = candidateKey });

            if (string.IsNullOrWhiteSpace(existing))
            {
                return candidateKey;
            }

            candidateKey = $"{baseKey[..Math.Min(baseKey.Length, 120)]}-{suffix}";
            suffix += 1;
        }

        throw new ApiException(StatusCodes.Status409Conflict, "Unable to create a unique alert key.", new { title });
    }

    private static object SanitizeAlertRule(AlertRuleRow row, IReadOnlyList<object>? events = null)
    {
        return new
        {
            alertId = row.AlertId,
            userId = row.UserId,
            email = row.Email,
            username = row.Username,
            alertKey = row.AlertKey,
            title = row.Title,
            description = row.Description,
            targetType = row.TargetType,
            indicatorCode = row.IndicatorCode,
            viewKey = row.ViewKey,
            metricKey = row.MetricKey,
            conditionType = row.ConditionType,
            thresholdValue = ToDouble(row.ThresholdValue),
            severity = row.Severity,
            active = row.Active,
            evaluationMetadata = SkyWebJson.ParseObjectJson(row.EvaluationMetadataJson),
            lastStatus = row.LastStatus,
            lastMessage = row.LastMessage,
            lastObservedValue = ToDouble(row.LastObservedValue),
            lastPreviousValue = ToDouble(row.LastPreviousValue),
            lastEvaluatedAt = row.LastEvaluatedAt,
            lastTriggeredAt = row.LastTriggeredAt,
            eventCount = row.EventCount,
            triggeredEventCount = row.TriggeredEventCount,
            latestEventAt = row.LatestEventAt,
            createdAt = row.CreatedAt,
            updatedAt = row.UpdatedAt,
            events = events ?? Array.Empty<object>()
        };
    }

    private static object SanitizeAlertEvent(AlertEventRow row)
    {
        return new
        {
            eventId = row.EventId,
            alertId = row.AlertId,
            userId = row.UserId,
            alertKey = row.AlertKey,
            alertTitle = row.AlertTitle,
            targetType = row.TargetType,
            indicatorCode = row.IndicatorCode,
            viewKey = row.ViewKey,
            metricKey = row.MetricKey,
            conditionType = row.ConditionType,
            eventStatus = row.EventStatus,
            observedValue = ToDouble(row.ObservedValue),
            previousValue = ToDouble(row.PreviousValue),
            thresholdValue = ToDouble(row.ThresholdValue),
            observedAt = row.ObservedAt,
            previousObservedAt = row.PreviousObservedAt,
            message = row.Message,
            eventMetadata = SkyWebJson.ParseObjectJson(row.EventMetadataJson),
            evaluatedAt = row.EvaluatedAt
        };
    }

    private static object SanitizeAlertNotification(AlertNotificationRow row)
    {
        return new
        {
            notificationId = row.NotificationId,
            userId = row.UserId,
            alertId = row.AlertId,
            alertKey = row.AlertKey,
            eventId = row.EventId,
            notificationStatus = row.NotificationStatus,
            title = row.Title,
            message = row.Message,
            severity = row.Severity,
            targetType = row.TargetType,
            indicatorCode = row.IndicatorCode,
            viewKey = row.ViewKey,
            metricKey = row.MetricKey,
            observedValue = ToDouble(row.ObservedValue),
            previousValue = ToDouble(row.PreviousValue),
            thresholdValue = ToDouble(row.ThresholdValue),
            observedAt = row.ObservedAt,
            evaluatedAt = row.EvaluatedAt,
            eventMetadata = SkyWebJson.ParseObjectJson(row.EventMetadataJson),
            acknowledgedAt = row.AcknowledgedAt,
            dismissedAt = row.DismissedAt,
            createdAt = row.CreatedAt,
            updatedAt = row.UpdatedAt
        };
    }

    private static AlertInput NormalizeAlertBody(JsonElement body)
    {
        var targetType = NormalizeTargetType(
            SkyWebSavedViewsService.GetStringProperty(body, "targetType") ??
            SkyWebSavedViewsService.GetStringProperty(body, "target_type") ??
            "indicator");

        return new AlertInput
        {
            AlertKey = SkyWebSavedViewsService.GetStringProperty(body, "alertKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "alert_key"),
            Title = SkyWebSavedViewsService.NormalizeRequiredString(
                SkyWebSavedViewsService.GetStringProperty(body, "title"),
                "title",
                MaxTitleLength),
            Description = SkyWebSavedViewsService.NormalizeOptionalString(
                SkyWebSavedViewsService.GetProperty(body, "description"),
                "description",
                MaxDescriptionLength),
            TargetType = targetType,
            IndicatorCode = targetType == "indicator"
                ? NormalizeIndicatorCode(SkyWebSavedViewsService.GetStringProperty(body, "indicatorCode") ?? SkyWebSavedViewsService.GetStringProperty(body, "indicator_code"))
                : null,
            ViewKey = targetType == "view_metric"
                ? NormalizeViewKey(SkyWebSavedViewsService.GetStringProperty(body, "viewKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "view_key"))
                : null,
            MetricKey = targetType == "view_metric"
                ? NormalizeMetricKey(SkyWebSavedViewsService.GetStringProperty(body, "metricKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "metric_key"))
                : null,
            ConditionType = NormalizeConditionType(SkyWebSavedViewsService.GetStringProperty(body, "conditionType") ?? SkyWebSavedViewsService.GetStringProperty(body, "condition_type")),
            ThresholdValue = NormalizeThresholdValue(SkyWebSavedViewsService.GetProperty(body, "thresholdValue") ?? SkyWebSavedViewsService.GetProperty(body, "threshold_value")),
            Severity = NormalizeSeverity(SkyWebSavedViewsService.GetStringProperty(body, "severity")),
            Active = SkyWebSavedViewsService.NormalizeBoolean(SkyWebSavedViewsService.GetProperty(body, "active"), fallback: true)
        };
    }

    private static IReadOnlyDictionary<string, object?> NormalizeAlertPatchBody(JsonElement body)
    {
        var patch = new Dictionary<string, object?>();

        if (SkyWebJson.TryGetProperty(body, "title", out var title))
        {
            patch["title"] = SkyWebSavedViewsService.NormalizeRequiredString(
                SkyWebJson.NormalizeNullableString(title),
                "title",
                MaxTitleLength);
        }

        if (SkyWebJson.TryGetProperty(body, "description", out var description))
        {
            patch["description"] = SkyWebSavedViewsService.NormalizeOptionalString(description, "description", MaxDescriptionLength);
        }

        if (SkyWebJson.TryGetProperty(body, "conditionType", out var conditionType) ||
            SkyWebJson.TryGetProperty(body, "condition_type", out conditionType))
        {
            patch["conditionType"] = NormalizeConditionType(SkyWebJson.NormalizeNullableString(conditionType));
        }

        if (SkyWebJson.TryGetProperty(body, "thresholdValue", out var thresholdValue) ||
            SkyWebJson.TryGetProperty(body, "threshold_value", out thresholdValue))
        {
            patch["thresholdValue"] = NormalizeThresholdValue(thresholdValue);
        }

        if (SkyWebJson.TryGetProperty(body, "severity", out var severity))
        {
            patch["severity"] = NormalizeSeverity(SkyWebJson.NormalizeNullableString(severity));
        }

        if (SkyWebJson.TryGetProperty(body, "active", out var active))
        {
            patch["active"] = SkyWebSavedViewsService.NormalizeBoolean(active, fallback: true);
        }

        var targetWasProvided =
            SkyWebJson.TryGetProperty(body, "targetType", out _) ||
            SkyWebJson.TryGetProperty(body, "target_type", out _) ||
            SkyWebJson.TryGetProperty(body, "indicatorCode", out _) ||
            SkyWebJson.TryGetProperty(body, "indicator_code", out _) ||
            SkyWebJson.TryGetProperty(body, "viewKey", out _) ||
            SkyWebJson.TryGetProperty(body, "view_key", out _) ||
            SkyWebJson.TryGetProperty(body, "metricKey", out _) ||
            SkyWebJson.TryGetProperty(body, "metric_key", out _);

        if (targetWasProvided)
        {
            var targetType = NormalizeTargetType(
                SkyWebSavedViewsService.GetStringProperty(body, "targetType") ??
                SkyWebSavedViewsService.GetStringProperty(body, "target_type"));
            patch["targetType"] = targetType;
            patch["indicatorCode"] = targetType == "indicator"
                ? NormalizeIndicatorCode(SkyWebSavedViewsService.GetStringProperty(body, "indicatorCode") ?? SkyWebSavedViewsService.GetStringProperty(body, "indicator_code"))
                : null;
            patch["viewKey"] = targetType == "view_metric"
                ? NormalizeViewKey(SkyWebSavedViewsService.GetStringProperty(body, "viewKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "view_key"))
                : null;
            patch["metricKey"] = targetType == "view_metric"
                ? NormalizeMetricKey(SkyWebSavedViewsService.GetStringProperty(body, "metricKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "metric_key"))
                : null;
        }

        return patch;
    }

    private static (List<string> Clauses, DynamicParameters Parameters) BuildOpenNotificationBulkFilter(Guid userId, JsonElement body)
    {
        var clauses = new List<string> { "user_id = @UserId", "notification_status = 'open'" };
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);

        var alertKey = SkyWebSavedViewsService.GetStringProperty(body, "alertKey") ?? SkyWebSavedViewsService.GetStringProperty(body, "alert_key");
        if (!string.IsNullOrWhiteSpace(alertKey))
        {
            parameters.Add("AlertKey", NormalizeAlertKey(alertKey));
            clauses.Add("alert_id IN (SELECT alert_id FROM skyweb.alert_rules WHERE user_id = @UserId AND alert_key = @AlertKey)");
        }

        var severity = SkyWebSavedViewsService.GetStringProperty(body, "severity");
        if (!string.IsNullOrWhiteSpace(severity))
        {
            parameters.Add("Severity", NormalizeSeverity(severity));
            clauses.Add("severity = @Severity");
        }

        return (clauses, parameters);
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

        parameters.Add(patchKey, patch[patchKey]);
        assignments.Add($"{columnName} = @{patchKey}");
    }

    private static string NormalizeAlertKey(string? value)
    {
        var normalized = SkyWebSavedViewsService.NormalizeRequiredString(value, "alertKey")
            .Replace("_", "-")
            .ToLowerInvariant();

        if (!Regex.IsMatch(normalized, "^[a-z0-9][a-z0-9-]{0,127}$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "alertKey contains invalid characters.", new
            {
                fieldName = "alertKey",
                value
            });
        }

        return normalized;
    }

    private static string NormalizeTargetType(string? value)
    {
        var normalized = (value ?? "indicator").Trim().ToLowerInvariant();
        if (!AllowedTargetTypes.Contains(normalized))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid alert target type.", new
            {
                fieldName = "targetType",
                value,
                allowedValues = AllowedTargetTypes.ToArray()
            });
        }

        return normalized;
    }

    private static string NormalizeConditionType(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        if (!AllowedConditions.Contains(normalized))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid alert condition type.", new
            {
                fieldName = "conditionType",
                value,
                allowedValues = AllowedConditions.ToArray()
            });
        }

        return normalized;
    }

    private static string NormalizeSeverity(string? value, string fallback = "medium")
    {
        var normalized = (string.IsNullOrWhiteSpace(value) ? fallback : value).Trim().ToLowerInvariant();
        if (!AllowedSeverities.Contains(normalized))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid alert severity.", new
            {
                fieldName = "severity",
                value,
                allowedValues = AllowedSeverities.ToArray()
            });
        }

        return normalized;
    }

    private static string NormalizeNotificationStatus(string? value, string fallback = "open")
    {
        var normalized = (string.IsNullOrWhiteSpace(value) ? fallback : value).Trim().ToLowerInvariant();
        if (!AllowedNotificationStatuses.Contains(normalized))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid alert notification status.", new
            {
                fieldName = "status",
                value,
                allowedValues = AllowedNotificationStatuses.ToArray()
            });
        }

        return normalized;
    }

    private static string NormalizeIndicatorCode(string? value)
    {
        var normalized = SkyWebSavedViewsService.NormalizeRequiredString(value, "indicatorCode").ToUpperInvariant();
        if (!Regex.IsMatch(normalized, "^[A-Z0-9_]+$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "indicatorCode contains invalid characters.", new
            {
                fieldName = "indicatorCode",
                value
            });
        }

        return normalized;
    }

    private static string NormalizeViewKey(string? value)
    {
        return SkyWebSavedViewsService.NormalizeViewKey(value);
    }

    private static string NormalizeMetricKey(string? value)
    {
        var normalized = SkyWebSavedViewsService.NormalizeRequiredString(value, "metricKey");
        var camelized = ToCamelCase(normalized);
        if (!Regex.IsMatch(camelized, "^[A-Za-z][A-Za-z0-9_]{0,127}$"))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "metricKey contains invalid characters.", new
            {
                fieldName = "metricKey",
                value
            });
        }

        return camelized;
    }

    private static decimal NormalizeThresholdValue(JsonElement? value)
    {
        if (value is null || value.Value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "thresholdValue is required.", new { fieldName = "thresholdValue" });
        }

        decimal numberValue;
        if (value.Value.ValueKind == JsonValueKind.Number && value.Value.TryGetDecimal(out var numeric))
        {
            numberValue = numeric;
        }
        else if (value.Value.ValueKind == JsonValueKind.String && decimal.TryParse(value.Value.GetString(), out var parsed))
        {
            numberValue = parsed;
        }
        else
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "thresholdValue must be numeric.", new
            {
                fieldName = "thresholdValue",
                value = value.Value.ToString()
            });
        }

        return numberValue;
    }

    private static Guid NormalizeUuid(string value, string fieldName)
    {
        var normalized = SkyWebSavedViewsService.NormalizeRequiredString(value, fieldName);
        if (!Guid.TryParse(normalized, out var guid))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldName} must be a valid UUID.", new
            {
                fieldName,
                value
            });
        }

        return guid;
    }

    private static bool NormalizeBoolean(string? value, bool fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        if (bool.TryParse(value, out var booleanValue))
        {
            return booleanValue;
        }

        if (int.TryParse(value, out var integerValue) && (integerValue == 0 || integerValue == 1))
        {
            return integerValue == 1;
        }

        return fallback;
    }

    private static int NormalizeLimit(string? value, int fallback, int max)
    {
        if (!int.TryParse(value, out var parsed))
        {
            parsed = fallback;
        }

        return Math.Max(1, Math.Min(parsed, max));
    }

    private static string? Slugify(string value)
    {
        var normalized = Regex.Replace(value.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-");
        normalized = Regex.Replace(normalized, "^-+|-+$", string.Empty);
        return normalized.Length == 0 ? null : normalized[..Math.Min(normalized.Length, 96)];
    }

    private static string ToCamelCase(string value)
    {
        return Regex.Replace(value, "_([a-z0-9])", match => match.Groups[1].Value.ToUpperInvariant());
    }

    private static string? GetFilter(IReadOnlyDictionary<string, string?> filters, string key)
    {
        return filters.TryGetValue(key, out var value) ? value : null;
    }

    private static string? GetString(IReadOnlyDictionary<string, object?> source, string key)
    {
        if (!source.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return value.ToString();
    }

    private static double? ToDouble(decimal? value)
    {
        return value is null ? null : Convert.ToDouble(value.Value);
    }

    private static IReadOnlyDictionary<string, object> SummarizeNotifications(IReadOnlyList<object> notifications)
    {
        var byStatus = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var bySeverity = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var notification in notifications.Select(SkyWebJson.ObjectToDictionary))
        {
            var status = GetString(notification, "notificationStatus") ?? "unknown";
            var severity = GetString(notification, "severity") ?? "unknown";
            byStatus[status] = byStatus.TryGetValue(status, out var statusCount) ? statusCount + 1 : 1;
            bySeverity[severity] = bySeverity.TryGetValue(severity, out var severityCount) ? severityCount + 1 : 1;
        }

        return new Dictionary<string, object>
        {
            ["total"] = notifications.Count,
            ["byStatus"] = byStatus,
            ["bySeverity"] = bySeverity
        };
    }

    public sealed record RemoveAlertRuleResult(bool Removed, string AlertKey);
    public sealed record AlertNotificationListResult(int Total, IReadOnlyDictionary<string, object> Summary, IReadOnlyList<object> Items);
    public sealed record AcknowledgeAllResult(int AcknowledgedCount);
    public sealed record DismissAllResult(int DismissedCount);

    private sealed class AlertInput
    {
        public string? AlertKey { get; init; }
        public required string Title { get; init; }
        public string? Description { get; init; }
        public required string TargetType { get; init; }
        public string? IndicatorCode { get; init; }
        public string? ViewKey { get; init; }
        public string? MetricKey { get; init; }
        public required string ConditionType { get; init; }
        public decimal ThresholdValue { get; init; }
        public required string Severity { get; init; }
        public bool Active { get; init; }
    }

    private sealed class AlertRuleRow
    {
        public Guid AlertId { get; init; }
        public Guid UserId { get; init; }
        public string? Email { get; init; }
        public string? Username { get; init; }
        public string? AlertKey { get; init; }
        public string? Title { get; init; }
        public string? Description { get; init; }
        public string? TargetType { get; init; }
        public string? IndicatorCode { get; init; }
        public string? ViewKey { get; init; }
        public string? MetricKey { get; init; }
        public string? ConditionType { get; init; }
        public decimal? ThresholdValue { get; init; }
        public string? Severity { get; init; }
        public bool Active { get; init; }
        public string? EvaluationMetadataJson { get; init; }
        public string? LastStatus { get; init; }
        public string? LastMessage { get; init; }
        public decimal? LastObservedValue { get; init; }
        public decimal? LastPreviousValue { get; init; }
        public DateTime? LastEvaluatedAt { get; init; }
        public DateTime? LastTriggeredAt { get; init; }
        public int EventCount { get; init; }
        public int TriggeredEventCount { get; init; }
        public DateTime? LatestEventAt { get; init; }
        public DateTime? CreatedAt { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }

    private sealed class AlertEventRow
    {
        public Guid EventId { get; init; }
        public Guid AlertId { get; init; }
        public Guid UserId { get; init; }
        public string? Email { get; init; }
        public string? Username { get; init; }
        public string? AlertKey { get; init; }
        public string? AlertTitle { get; init; }
        public string? TargetType { get; init; }
        public string? IndicatorCode { get; init; }
        public string? ViewKey { get; init; }
        public string? MetricKey { get; init; }
        public string? ConditionType { get; init; }
        public string? EventStatus { get; init; }
        public decimal? ObservedValue { get; init; }
        public decimal? PreviousValue { get; init; }
        public decimal? ThresholdValue { get; init; }
        public DateOnly? ObservedAt { get; init; }
        public DateOnly? PreviousObservedAt { get; init; }
        public string? Message { get; init; }
        public string? EventMetadataJson { get; init; }
        public DateTime? EvaluatedAt { get; init; }
    }

    private sealed class AlertNotificationRow
    {
        public Guid NotificationId { get; init; }
        public Guid UserId { get; init; }
        public string? Email { get; init; }
        public string? Username { get; init; }
        public Guid AlertId { get; init; }
        public string? AlertKey { get; init; }
        public Guid EventId { get; init; }
        public string? NotificationStatus { get; init; }
        public string? Title { get; init; }
        public string? Message { get; init; }
        public string? Severity { get; init; }
        public string? TargetType { get; init; }
        public string? IndicatorCode { get; init; }
        public string? ViewKey { get; init; }
        public string? MetricKey { get; init; }
        public decimal? ObservedValue { get; init; }
        public decimal? PreviousValue { get; init; }
        public decimal? ThresholdValue { get; init; }
        public DateOnly? ObservedAt { get; init; }
        public DateTime? EvaluatedAt { get; init; }
        public string? EventMetadataJson { get; init; }
        public DateTime? AcknowledgedAt { get; init; }
        public DateTime? DismissedAt { get; init; }
        public DateTime? CreatedAt { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }
}
