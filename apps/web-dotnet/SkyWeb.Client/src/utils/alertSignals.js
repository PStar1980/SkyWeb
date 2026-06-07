import { formatColumnLabel } from './formatters.js';

export const ALERT_SIGNALS_CHANGED_EVENT = 'skyweb:alert-signals-changed';

export const DEFAULT_ALERT_PREFERENCES = Object.freeze({
  inAppEnabled: true,
  minimumSeverity: 'low',
  notifyLow: true,
  notifyMedium: true,
  notifyHigh: true,
  notifyCritical: true,
  deliveryMode: 'immediate',
  digestCadence: 'daily',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  quietHoursTimezone: 'America/Toronto',
  emailEnabled: false,
  browserEnabled: false,
});

export const ALERT_SEVERITY_OPTIONS = Object.freeze([
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]);

const SEVERITY_PRIORITY = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SEVERITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const ALERT_STATUS_LABELS = {
  never: 'Never evaluated',
  ok: 'Not triggered',
  triggered: 'Triggered',
  error: 'Evaluation error',
  disabled: 'Disabled',
};

const NOTIFICATION_STATUS_LABELS = {
  open: 'Open signal',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
};

function normalizeBooleanPreference(value, fallback) {
  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }

  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }

  return fallback;
}

function normalizeSeverity(value, fallback = 'low') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return SEVERITY_PRIORITY[normalized] ? normalized : fallback;
}

function normalizeOption(value, allowedValues, fallback) {
  const normalized = String(value || '').trim();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function normalizeTimePreference(value, fallback) {
  const normalized = String(value || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : fallback;
}

export function normalizeAlertPreferences(preferences = {}) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};

  return {
    inAppEnabled: normalizeBooleanPreference(
      source.inAppEnabled,
      DEFAULT_ALERT_PREFERENCES.inAppEnabled,
    ),
    minimumSeverity: normalizeSeverity(
      source.minimumSeverity,
      DEFAULT_ALERT_PREFERENCES.minimumSeverity,
    ),
    notifyLow: normalizeBooleanPreference(source.notifyLow, DEFAULT_ALERT_PREFERENCES.notifyLow),
    notifyMedium: normalizeBooleanPreference(
      source.notifyMedium,
      DEFAULT_ALERT_PREFERENCES.notifyMedium,
    ),
    notifyHigh: normalizeBooleanPreference(source.notifyHigh, DEFAULT_ALERT_PREFERENCES.notifyHigh),
    notifyCritical: normalizeBooleanPreference(
      source.notifyCritical,
      DEFAULT_ALERT_PREFERENCES.notifyCritical,
    ),
    deliveryMode: normalizeOption(
      source.deliveryMode,
      ['immediate', 'digest'],
      DEFAULT_ALERT_PREFERENCES.deliveryMode,
    ),
    digestCadence: normalizeOption(
      source.digestCadence,
      ['daily', 'weekly'],
      DEFAULT_ALERT_PREFERENCES.digestCadence,
    ),
    quietHoursEnabled: normalizeBooleanPreference(
      source.quietHoursEnabled,
      DEFAULT_ALERT_PREFERENCES.quietHoursEnabled,
    ),
    quietHoursStart: normalizeTimePreference(
      source.quietHoursStart,
      DEFAULT_ALERT_PREFERENCES.quietHoursStart,
    ),
    quietHoursEnd: normalizeTimePreference(
      source.quietHoursEnd,
      DEFAULT_ALERT_PREFERENCES.quietHoursEnd,
    ),
    quietHoursTimezone:
      String(source.quietHoursTimezone || '').trim() ||
      DEFAULT_ALERT_PREFERENCES.quietHoursTimezone,
    emailEnabled: normalizeBooleanPreference(
      source.emailEnabled,
      DEFAULT_ALERT_PREFERENCES.emailEnabled,
    ),
    browserEnabled: normalizeBooleanPreference(
      source.browserEnabled,
      DEFAULT_ALERT_PREFERENCES.browserEnabled,
    ),
  };
}

export function notifyAlertSignalsChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(ALERT_SIGNALS_CHANGED_EVENT));
}

export function getSeverityLabel(severity = '') {
  const normalized = String(severity || '').toLowerCase();
  return SEVERITY_LABELS[normalized] || formatColumnLabel(severity || 'Medium');
}

export function getSeverityTone(severity = '') {
  const normalized = String(severity || '').toLowerCase();

  if (normalized === 'critical') {
    return 'critical';
  }

  if (normalized === 'high') {
    return 'danger';
  }

  if (normalized === 'medium') {
    return 'warning';
  }

  if (normalized === 'low') {
    return 'success';
  }

  return 'default';
}

export function getHighestSeverity(items = []) {
  return items.reduce((highest, item) => {
    const severity = String(item?.severity || '').toLowerCase();
    const highestSeverity = String(highest || '').toLowerCase();

    if ((SEVERITY_PRIORITY[severity] || 0) > (SEVERITY_PRIORITY[highestSeverity] || 0)) {
      return severity;
    }

    return highest;
  }, '');
}

export function meetsMinimumSeverity(severity = '', minimumSeverity = 'low') {
  const severityValue = SEVERITY_PRIORITY[String(severity || '').toLowerCase()] || 0;
  const minimumValue = SEVERITY_PRIORITY[String(minimumSeverity || 'low').toLowerCase()] || 1;
  return severityValue >= minimumValue;
}

export function isSeverityEnabled(severity = '', preferences = DEFAULT_ALERT_PREFERENCES) {
  const normalized = String(severity || '').toLowerCase();
  const nextPreferences = normalizeAlertPreferences(preferences);

  if (normalized === 'critical') {
    return nextPreferences.notifyCritical;
  }

  if (normalized === 'high') {
    return nextPreferences.notifyHigh;
  }

  if (normalized === 'medium') {
    return nextPreferences.notifyMedium;
  }

  if (normalized === 'low') {
    return nextPreferences.notifyLow;
  }

  return true;
}

export function shouldSurfaceAlertNotification(
  notification = {},
  preferences = DEFAULT_ALERT_PREFERENCES,
) {
  const nextPreferences = normalizeAlertPreferences(preferences);

  if (!nextPreferences.inAppEnabled) {
    return false;
  }

  if (notification.notificationStatus && notification.notificationStatus !== 'open') {
    return false;
  }

  const severity = String(notification.severity || 'medium').toLowerCase();

  return (
    meetsMinimumSeverity(severity, nextPreferences.minimumSeverity) &&
    isSeverityEnabled(severity, nextPreferences)
  );
}

export function getSurfacedAlertNotifications(
  notifications = [],
  preferences = DEFAULT_ALERT_PREFERENCES,
) {
  return notifications.filter((notification) =>
    shouldSurfaceAlertNotification(notification, preferences),
  );
}

export function getAlertStatusLabel(status = '', active = true) {
  if (!active) {
    return ALERT_STATUS_LABELS.disabled;
  }

  const normalized = String(status || 'never').toLowerCase();
  return ALERT_STATUS_LABELS[normalized] || formatColumnLabel(normalized);
}

export function getAlertStatusTone(status = '', active = true) {
  if (!active) {
    return 'muted';
  }

  const normalized = String(status || 'never').toLowerCase();

  if (normalized === 'triggered') {
    return 'warning';
  }

  if (normalized === 'error') {
    return 'danger';
  }

  if (normalized === 'ok') {
    return 'success';
  }

  if (normalized === 'never') {
    return 'muted';
  }

  return 'default';
}

export function getNotificationStatusLabel(status = '') {
  const normalized = String(status || '').toLowerCase();
  return NOTIFICATION_STATUS_LABELS[normalized] || formatColumnLabel(normalized || 'Open');
}

export function getNotificationTone(notification = {}) {
  const status = String(notification.notificationStatus || '').toLowerCase();

  if (status === 'dismissed') {
    return 'muted';
  }

  if (status === 'acknowledged') {
    return 'success';
  }

  return getSeverityTone(notification.severity);
}

export function getNotificationTargetLabel(notification = {}) {
  if (notification.targetType === 'indicator') {
    return notification.indicatorCode || 'Indicator';
  }

  return `${notification.viewKey || 'View'} · ${formatColumnLabel(notification.metricKey || '')}`;
}

export function getNotificationTargetLink(notification = {}) {
  if (notification.targetType === 'indicator' && notification.indicatorCode) {
    return `/macro/indicators/${encodeURIComponent(notification.indicatorCode)}`;
  }

  if (notification.targetType === 'view_metric' && notification.viewKey) {
    return `/macro/views/${encodeURIComponent(notification.viewKey)}`;
  }

  return '/macro/alerts';
}

export function getLatestAlertEvaluationDate(alerts = [], notifications = []) {
  const values = [
    ...alerts.map((alert) => alert?.lastEvaluatedAt || alert?.lastTriggeredAt),
    ...notifications.map((notification) => notification?.evaluatedAt || notification?.createdAt),
  ].filter(Boolean);

  const dates = values
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());

  return dates[0] || null;
}

export function summarizeAlertSurface(alerts = [], notifications = []) {
  const openNotifications = notifications.filter(
    (notification) => notification.notificationStatus === 'open',
  );
  const triggeredAlerts = alerts.filter((alert) => alert.lastStatus === 'triggered');
  const highestOpenSeverity = getHighestSeverity(openNotifications);
  const highestTriggeredSeverity = getHighestSeverity(triggeredAlerts);

  return {
    openNotifications,
    triggeredAlerts,
    openCount: openNotifications.length,
    triggeredCount: triggeredAlerts.length,
    highestSeverity: highestOpenSeverity || highestTriggeredSeverity || '',
    lastEvaluatedAt: getLatestAlertEvaluationDate(alerts, notifications),
  };
}
