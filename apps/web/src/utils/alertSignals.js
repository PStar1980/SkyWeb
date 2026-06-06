import { formatColumnLabel } from './formatters.js';

export const ALERT_SIGNALS_CHANGED_EVENT = 'skyweb:alert-signals-changed';

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
