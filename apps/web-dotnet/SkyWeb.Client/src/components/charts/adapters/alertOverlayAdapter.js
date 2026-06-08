import { formatColumnLabel, formatDate } from '../../../utils/formatters.js';

const EMPTY_OVERLAYS = Object.freeze({ events: [], thresholds: [] });

function normalizeKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeIndicatorCode(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizeSeverity(value = 'medium') {
  const severity = normalizeKey(value);
  return ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium';
}

function getAlertMetricKey(alertRule = {}) {
  if (alertRule.targetMetricKey) {
    return normalizeKey(alertRule.targetMetricKey);
  }

  if (alertRule.metricKey) {
    return normalizeKey(alertRule.metricKey);
  }

  return alertRule.targetType === 'indicator' ? 'value' : null;
}

function getAlertTargetLabel(alertRule = {}) {
  if (alertRule.targetType === 'indicator') {
    return alertRule.indicatorCode || 'Indicator';
  }

  return [alertRule.viewKey, formatColumnLabel(alertRule.metricKey || '')]
    .filter(Boolean)
    .join(' · ');
}

function getConditionLabel(conditionType = '') {
  return String(conditionType || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getEventDate(event = {}) {
  return (
    event.observedAt ||
    event.observedDate ||
    event.createdAt ||
    event.evaluatedAt ||
    event.dismissedAt ||
    event.acknowledgedAt ||
    null
  );
}

function getEventValue(event = {}) {
  const value = Number(
    event.observedValue ?? event.value ?? event.thresholdValue ?? event.threshold,
  );
  return Number.isFinite(value) ? value : null;
}

function adaptStatus(value = '') {
  const status = normalizeKey(value);

  if (['open', 'acknowledged', 'dismissed', 'triggered', 'not_triggered'].includes(status)) {
    return status;
  }

  return status || 'event';
}

export function alertRuleMatchesIndicator(alertRule = {}, indicatorCode = '') {
  return (
    alertRule.targetType === 'indicator' &&
    normalizeIndicatorCode(alertRule.indicatorCode) === normalizeIndicatorCode(indicatorCode)
  );
}

export function alertRuleMatchesView(alertRule = {}, viewKey = '') {
  return (
    alertRule.targetType === 'view_metric' &&
    normalizeKey(alertRule.viewKey) === normalizeKey(viewKey)
  );
}

export function adaptAlertRuleToThreshold(alertRule = {}) {
  const threshold = Number(alertRule.thresholdValue ?? alertRule.threshold);

  if (!Number.isFinite(threshold)) {
    return null;
  }

  const conditionLabel = getConditionLabel(alertRule.conditionType || alertRule.condition);
  const title = alertRule.title || alertRule.alertTitle || 'Alert threshold';

  return {
    id: alertRule.alertKey || title,
    alertKey: alertRule.alertKey || null,
    conditionType: alertRule.conditionType || alertRule.condition || '',
    label: conditionLabel ? `${title} · ${conditionLabel}` : title,
    metricLabel: formatColumnLabel(alertRule.metricKey || 'value'),
    operator: alertRule.conditionOperator || alertRule.condition || alertRule.conditionType || '',
    severity: normalizeSeverity(alertRule.severity),
    targetLabel: getAlertTargetLabel(alertRule),
    targetMetricKey: getAlertMetricKey(alertRule),
    value: threshold,
  };
}

export function adaptAlertEvents(events = [], alertRule = {}) {
  return events
    .map((event) => {
      const date = getEventDate(event);
      const value = getEventValue(event);

      if (!date || value === null) {
        return null;
      }

      const parsedDate = new Date(date);
      const sortTime = parsedDate.getTime();

      return {
        id: event.notificationId || event.eventId || `${alertRule.alertKey || 'alert'}-${date}`,
        alertKey: event.alertKey || alertRule.alertKey || null,
        alertTitle: event.alertTitle || event.title || alertRule.title || 'Alert event',
        date,
        eventStatus: adaptStatus(event.notificationStatus || event.eventStatus || event.status),
        label: formatDate(date),
        message: event.message || alertRule.lastMessage || 'Alert event',
        metricLabel: formatColumnLabel(event.metricKey || alertRule.metricKey || 'value'),
        severity: normalizeSeverity(event.severity || alertRule.severity),
        sortTime: Number.isFinite(sortTime) ? sortTime : null,
        targetMetricKey: getAlertMetricKey({
          ...alertRule,
          metricKey: event.metricKey || alertRule.metricKey,
        }),
        thresholdValue: Number(
          event.thresholdValue ?? alertRule.thresholdValue ?? alertRule.threshold,
        ),
        value,
      };
    })
    .filter(Boolean);
}

export function adaptAlertNotifications(notifications = [], alertRule = {}) {
  return adaptAlertEvents(notifications, alertRule).map((event) => ({
    ...event,
    eventStatus: adaptStatus(event.eventStatus),
    markerSource: 'notification',
  }));
}

export function buildChartAlertOverlays({
  alertRules = [],
  eventsByAlertKey = {},
  notificationsByAlertKey = {},
} = {}) {
  const thresholds = [];
  const events = [];

  alertRules.forEach((alertRule) => {
    const threshold = adaptAlertRuleToThreshold(alertRule);

    if (threshold) {
      thresholds.push(threshold);
    }

    const alertKey = alertRule.alertKey || '';
    const notifications = adaptAlertNotifications(
      notificationsByAlertKey[alertKey] || [],
      alertRule,
    );
    const notificationEventIds = new Set(
      (notificationsByAlertKey[alertKey] || [])
        .map((notification) => notification.eventId)
        .filter(Boolean),
    );
    const eventMarkers = adaptAlertEvents(eventsByAlertKey[alertKey] || [], alertRule).filter(
      (event) => !notificationEventIds.has(event.id),
    );

    events.push(...notifications, ...eventMarkers);
  });

  return { events, thresholds };
}

export function countAlertOverlays(overlays = EMPTY_OVERLAYS) {
  return (overlays.thresholds || []).length + (overlays.events || []).length;
}

export function filterAlertOverlaysByMetricKeys(overlays = EMPTY_OVERLAYS, metricKeys = []) {
  const keySet = new Set(metricKeys.map(normalizeKey).filter(Boolean));

  if (!keySet.size) {
    return EMPTY_OVERLAYS;
  }

  return {
    thresholds: (overlays.thresholds || []).filter(
      (threshold) =>
        !threshold.targetMetricKey || keySet.has(normalizeKey(threshold.targetMetricKey)),
    ),
    events: (overlays.events || []).filter(
      (event) => !event.targetMetricKey || keySet.has(normalizeKey(event.targetMetricKey)),
    ),
  };
}

export function hasAlertOverlays(overlays = EMPTY_OVERLAYS) {
  return countAlertOverlays(overlays) > 0;
}
