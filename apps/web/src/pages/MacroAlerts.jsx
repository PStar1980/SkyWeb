import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import StatCard from '../components/StatCard.jsx';
import authService from '../services/authService.js';
import macroService from '../services/macroService.js';
import {
  getAlertStatusLabel,
  getAlertStatusTone,
  getNotificationStatusLabel,
  getNotificationTargetLabel,
  getNotificationTargetLink,
  getNotificationTone,
  getSeverityLabel,
  getSeverityTone,
} from '../utils/alertSignals.js';
import {
  formatColumnLabel,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../utils/formatters.js';

const CONDITION_OPTIONS = [
  ['above', 'Above threshold'],
  ['below', 'Below threshold'],
  ['crosses_above', 'Crosses above'],
  ['crosses_below', 'Crosses below'],
  ['changes_by', 'Changes by'],
  ['percent_changes_by', 'Percent changes by'],
];

const SEVERITY_OPTIONS = [
  ['low', 'Low'],
  ['medium', 'Medium'],
  ['high', 'High'],
  ['critical', 'Critical'],
];

const DEFAULT_FORM = {
  title: '',
  description: '',
  targetType: 'indicator',
  indicatorCode: '',
  viewKey: '',
  metricKey: '',
  conditionType: 'above',
  thresholdValue: '',
  severity: 'medium',
  active: true,
};

function getAlertTargetLabel(alert) {
  if (alert.targetType === 'indicator') {
    return alert.indicatorCode || 'Indicator';
  }

  return `${alert.viewKey || 'View'} · ${formatColumnLabel(alert.metricKey || '')}`;
}

function getNumericViewColumns(columns = []) {
  const numericTypes = new Set([
    'bigint',
    'decimal',
    'double precision',
    'integer',
    'numeric',
    'real',
    'smallint',
  ]);

  return columns.filter((column) => numericTypes.has(String(column.dataType || '').toLowerCase()));
}

export default function MacroAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [views, setViews] = useState([]);
  const [viewColumns, setViewColumns] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluatingKey, setEvaluatingKey] = useState(null);
  const [notificationActionId, setNotificationActionId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const numericViewColumns = useMemo(() => getNumericViewColumns(viewColumns), [viewColumns]);
  const activeAlerts = useMemo(() => alerts.filter((alert) => alert.active), [alerts]);
  const triggeredAlerts = useMemo(
    () => alerts.filter((alert) => alert.lastStatus === 'triggered'),
    [alerts],
  );
  const neverEvaluatedAlerts = useMemo(
    () => alerts.filter((alert) => alert.lastStatus === 'never'),
    [alerts],
  );
  const openNotifications = useMemo(
    () => notifications.filter((notification) => notification.notificationStatus === 'open'),
    [notifications],
  );

  async function loadAlerts() {
    const payload = await authService.listAlerts();
    setAlerts(payload.items || []);
  }

  async function loadNotifications() {
    const payload = await authService.listAlertNotifications({ status: 'open', limit: 25 });
    setNotifications(payload.items || []);
  }

  async function refreshAlertSurface() {
    await Promise.all([loadAlerts(), loadNotifications()]);
  }

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      setLoading(true);
      setError(null);

      try {
        const [alertsPayload, notificationsPayload, indicatorsPayload, viewsPayload] =
          await Promise.all([
            authService.listAlerts(),
            authService.listAlertNotifications({ status: 'open', limit: 25 }),
            macroService.listIndicators({ limit: 5000, active: true }),
            macroService.listViews({ includeStats: true }),
          ]);

        if (!active) {
          return;
        }

        const loadedIndicators = indicatorsPayload.items || [];
        const loadedViews = viewsPayload.items || [];

        setAlerts(alertsPayload.items || []);
        setNotifications(notificationsPayload.items || []);
        setIndicators(loadedIndicators);
        setViews(loadedViews);
        setForm((currentForm) => ({
          ...currentForm,
          indicatorCode: currentForm.indicatorCode || loadedIndicators[0]?.indicatorCode || '',
          viewKey: currentForm.viewKey || loadedViews[0]?.viewKey || '',
        }));
      } catch (loadError) {
        if (active) {
          setError(loadError);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadViewColumns() {
      if (form.targetType !== 'view_metric' || !form.viewKey) {
        setViewColumns([]);
        return;
      }

      try {
        const payload = await macroService.getViewColumns(form.viewKey);

        if (!active) {
          return;
        }

        const columns = payload.columns || [];
        const numericColumns = getNumericViewColumns(columns);
        setViewColumns(columns);
        setForm((currentForm) => ({
          ...currentForm,
          metricKey:
            currentForm.metricKey &&
            numericColumns.some((column) => column.fieldName === currentForm.metricKey)
              ? currentForm.metricKey
              : numericColumns[0]?.fieldName || '',
        }));
      } catch (loadError) {
        if (active) {
          setViewColumns([]);
          setError(loadError);
        }
      }
    }

    loadViewColumns();

    return () => {
      active = false;
    };
  }, [form.targetType, form.viewKey]);

  function updateForm(fieldName, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  }

  async function handleCreateAlert(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        targetType: form.targetType,
        conditionType: form.conditionType,
        thresholdValue: form.thresholdValue,
        severity: form.severity,
        active: form.active,
      };

      if (form.targetType === 'indicator') {
        payload.indicatorCode = form.indicatorCode;
      } else {
        payload.viewKey = form.viewKey;
        payload.metricKey = form.metricKey;
      }

      await authService.createAlert(payload);
      await refreshAlertSurface();
      setForm((currentForm) => ({
        ...DEFAULT_FORM,
        indicatorCode: currentForm.indicatorCode,
        viewKey: currentForm.viewKey,
        metricKey: currentForm.metricKey,
      }));
      setMessage('Alert rule created.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAlert(alert) {
    setMessage('');
    setError(null);

    try {
      await authService.updateAlert(alert.alertKey, { active: !alert.active });
      await refreshAlertSurface();
      setMessage(alert.active ? 'Alert disabled.' : 'Alert enabled.');
    } catch (toggleError) {
      setError(toggleError);
    }
  }

  async function handleEvaluateAlert(alert) {
    setEvaluatingKey(alert.alertKey);
    setMessage('');
    setError(null);

    try {
      await authService.evaluateAlert(alert.alertKey);
      await refreshAlertSurface();
      setMessage('Alert evaluated manually.');
    } catch (evaluateError) {
      setError(evaluateError);
    } finally {
      setEvaluatingKey(null);
    }
  }

  async function handleEvaluateAll() {
    setEvaluatingKey('__all__');
    setMessage('');
    setError(null);

    try {
      const payload = await authService.evaluateAlerts({ active: true });
      await refreshAlertSurface();
      setMessage(`${payload.total || 0} active alert(s) evaluated.`);
    } catch (evaluateError) {
      setError(evaluateError);
    } finally {
      setEvaluatingKey(null);
    }
  }

  async function handleRemoveAlert(alert) {
    setMessage('');
    setError(null);

    try {
      await authService.removeAlert(alert.alertKey);
      await refreshAlertSurface();
      setMessage('Alert removed.');
    } catch (removeError) {
      setError(removeError);
    }
  }

  async function handleAcknowledgeNotification(notification) {
    setNotificationActionId(notification.notificationId);
    setMessage('');
    setError(null);

    try {
      await authService.acknowledgeAlertNotification(notification.notificationId);
      await loadNotifications();
      setMessage('Alert signal acknowledged.');
    } catch (actionError) {
      setError(actionError);
    } finally {
      setNotificationActionId(null);
    }
  }

  async function handleDismissNotification(notification) {
    setNotificationActionId(notification.notificationId);
    setMessage('');
    setError(null);

    try {
      await authService.dismissAlertNotification(notification.notificationId);
      await loadNotifications();
      setMessage('Alert signal dismissed.');
    } catch (actionError) {
      setError(actionError);
    } finally {
      setNotificationActionId(null);
    }
  }

  async function handleAcknowledgeAllSignals() {
    setNotificationActionId('__all__');
    setMessage('');
    setError(null);

    try {
      const payload = await authService.acknowledgeAllAlertNotifications();
      await loadNotifications();
      setMessage(`${payload.acknowledgedCount || 0} alert signal(s) acknowledged.`);
    } catch (actionError) {
      setError(actionError);
    } finally {
      setNotificationActionId(null);
    }
  }

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Macro alerts</div>
          <h1>Macro alert rules</h1>
          <p>
            Create threshold watches for indicators or view metrics. Triggered rules now surface as
            open signals across the app while the permanent event history stays attached to each
            rule.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button
            className="skyweb-btn skyweb-btn-secondary"
            disabled={evaluatingKey === '__all__' || activeAlerts.length === 0}
            onClick={handleEvaluateAll}
            type="button"
          >
            {evaluatingKey === '__all__' ? 'Evaluating...' : 'Evaluate active alerts'}
          </button>
          <Link className="skyweb-btn skyweb-btn-secondary" to="/macro/alerts/preferences">
            Alert preferences
          </Link>
          <Link className="skyweb-btn skyweb-btn-primary" to="/macro/indicators">
            Browse indicators
          </Link>
        </div>
      </header>

      {message && <div className="skyweb-success">{message}</div>}
      {error && <ErrorState title="Alert action failed.">{error.message}</ErrorState>}

      {!loading && (
        <section className="skyweb-metric-grid skyweb-alert-metrics">
          <StatCard label="Alert rules" value={alerts.length} detail="Configured watches" />
          <StatCard label="Active" value={activeAlerts.length} detail="Currently evaluated" />
          <StatCard
            label="Signals"
            value={openNotifications.length}
            detail="Open triggered notices"
          />
          <StatCard
            label="Triggered"
            value={triggeredAlerts.length}
            detail="Last evaluation state"
          />
          <StatCard label="Pending" value={neverEvaluatedAlerts.length} detail="Never evaluated" />
        </section>
      )}

      {loading && <LoadingState>Loading alert rules...</LoadingState>}

      {!loading && (
        <section className="skyweb-card skyweb-alert-signal-board mb-4">
          <div className="skyweb-table-header">
            <div>
              <div className="skyweb-card-kicker">Triggered signals</div>
              <h2>{openNotifications.length} open signal(s)</h2>
              <p>
                Open means the watched condition fired and still needs review. Acknowledge means you
                saw it; dismiss removes it from the open queue. Either way, the event history
                remains permanent.
              </p>
            </div>
            {openNotifications.length > 0 && (
              <button
                className="skyweb-btn skyweb-btn-secondary"
                disabled={notificationActionId === '__all__'}
                onClick={handleAcknowledgeAllSignals}
                type="button"
              >
                {notificationActionId === '__all__' ? 'Acknowledging...' : 'Acknowledge all'}
              </button>
            )}
          </div>

          {openNotifications.length === 0 ? (
            <div className="skyweb-empty-inline">
              No open alert signals. Quiet board, clean air.
            </div>
          ) : (
            <div className="skyweb-alert-signal-list">
              {openNotifications.map((notification) => (
                <article
                  className={`skyweb-alert-signal-card skyweb-alert-signal-card-${getNotificationTone(notification)}`}
                  key={notification.notificationId}
                >
                  <div>
                    <div className="skyweb-alert-card-topline">
                      <span
                        className={`skyweb-status-pill skyweb-status-pill-${getNotificationTone(notification)}`}
                      >
                        {getSeverityLabel(notification.severity)}
                      </span>
                      <span className="skyweb-mini-pill">
                        {getNotificationStatusLabel(notification.notificationStatus)}
                      </span>
                      <span className="skyweb-mini-pill">
                        {formatDateTime(notification.evaluatedAt)}
                      </span>
                    </div>
                    <h3>{notification.title}</h3>
                    <p>{notification.message || 'Triggered alert evaluation.'}</p>
                    <dl className="skyweb-alert-rule-grid">
                      <div>
                        <dt>Target</dt>
                        <dd>{getNotificationTargetLabel(notification)}</dd>
                      </div>
                      <div>
                        <dt>Observed</dt>
                        <dd>{formatNumber(notification.observedValue)}</dd>
                      </div>
                      <div>
                        <dt>Threshold</dt>
                        <dd>{formatNumber(notification.thresholdValue)}</dd>
                      </div>
                      <div>
                        <dt>Observed date</dt>
                        <dd>{formatDate(notification.observedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="skyweb-alert-actions">
                    <button
                      className="skyweb-btn skyweb-btn-secondary"
                      disabled={notificationActionId === notification.notificationId}
                      onClick={() => handleAcknowledgeNotification(notification)}
                      type="button"
                    >
                      Acknowledge
                    </button>
                    <button
                      className="skyweb-btn skyweb-btn-danger"
                      disabled={notificationActionId === notification.notificationId}
                      onClick={() => handleDismissNotification(notification)}
                      type="button"
                    >
                      Dismiss
                    </button>
                    <Link
                      className="skyweb-link-action"
                      to={`/macro/alerts/${encodeURIComponent(notification.alertKey)}`}
                    >
                      Open rule →
                    </Link>
                    <Link
                      className="skyweb-link-action"
                      to={getNotificationTargetLink(notification)}
                    >
                      Open target →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && (
        <section className="skyweb-card skyweb-alert-builder mb-4">
          <div className="skyweb-card-kicker">Create alert</div>
          <h2>Define a macro watch</h2>
          <p>
            Start with a direct indicator alert for single-series monitoring, or choose a metric
            from an analytical view when you need a grouped lens. Severity controls how loudly the
            signal appears after it fires.
          </p>

          <form onSubmit={handleCreateAlert}>
            <div className="skyweb-form-grid skyweb-form-grid-three">
              <label>
                Alert title
                <input
                  className="form-control"
                  onChange={(event) => updateForm('title', event.target.value)}
                  placeholder="USD/CAD above 1.40"
                  required
                  value={form.title}
                />
              </label>
              <label>
                Target type
                <select
                  className="form-select"
                  onChange={(event) => updateForm('targetType', event.target.value)}
                  value={form.targetType}
                >
                  <option value="indicator">Indicator</option>
                  <option value="view_metric">View metric</option>
                </select>
              </label>
              <label>
                Severity
                <select
                  className="form-select"
                  onChange={(event) => updateForm('severity', event.target.value)}
                  value={form.severity}
                >
                  {SEVERITY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {form.targetType === 'indicator' && (
              <label className="skyweb-form-field-full">
                Indicator
                <select
                  className="form-select"
                  onChange={(event) => updateForm('indicatorCode', event.target.value)}
                  required
                  value={form.indicatorCode}
                >
                  {indicators.map((indicator) => (
                    <option key={indicator.indicatorCode} value={indicator.indicatorCode}>
                      {indicator.indicatorCode} · {indicator.description || indicator.source}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {form.targetType === 'view_metric' && (
              <div className="skyweb-form-grid skyweb-form-grid-two">
                <label>
                  Analytical view
                  <select
                    className="form-select"
                    onChange={(event) => updateForm('viewKey', event.target.value)}
                    required
                    value={form.viewKey}
                  >
                    {views.map((view) => (
                      <option key={view.viewKey} value={view.viewKey}>
                        {view.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Metric
                  <select
                    className="form-select"
                    onChange={(event) => updateForm('metricKey', event.target.value)}
                    required
                    value={form.metricKey}
                  >
                    {numericViewColumns.map((column) => (
                      <option key={column.fieldName} value={column.fieldName}>
                        {formatColumnLabel(column.fieldName)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="skyweb-form-grid skyweb-form-grid-three">
              <label>
                Condition
                <select
                  className="form-select"
                  onChange={(event) => updateForm('conditionType', event.target.value)}
                  value={form.conditionType}
                >
                  {CONDITION_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Threshold
                <input
                  className="form-control"
                  onChange={(event) => updateForm('thresholdValue', event.target.value)}
                  placeholder="1.40"
                  required
                  step="any"
                  type="number"
                  value={form.thresholdValue}
                />
              </label>
              <label className="skyweb-check-field">
                <input
                  checked={form.active}
                  onChange={(event) => updateForm('active', event.target.checked)}
                  type="checkbox"
                />
                Active alert
              </label>
            </div>

            <label className="skyweb-form-field-full">
              Description
              <textarea
                className="form-control"
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Optional context for why this threshold matters."
                value={form.description}
              />
            </label>

            <button className="skyweb-btn skyweb-btn-primary" disabled={saving} type="submit">
              {saving ? 'Creating...' : 'Create alert'}
            </button>
          </form>
        </section>
      )}

      {!loading && (
        <section className="skyweb-table-card">
          <div className="skyweb-table-header">
            <div>
              <div className="skyweb-card-kicker">Alert inventory</div>
              <h2>{alerts.length} alert rule(s)</h2>
            </div>
          </div>

          {alerts.length === 0 && (
            <EmptyState>
              No alert rules yet. Create one above to start watching a macro threshold.
            </EmptyState>
          )}

          {alerts.length > 0 && (
            <div className="skyweb-alert-list">
              {alerts.map((alert) => (
                <article className="skyweb-alert-rule-card" key={alert.alertKey}>
                  <div>
                    <div className="skyweb-alert-card-topline">
                      <span
                        className={`skyweb-status-pill skyweb-status-pill-${getAlertStatusTone(
                          alert.lastStatus,
                          alert.active,
                        )}`}
                      >
                        {getAlertStatusLabel(alert.lastStatus, alert.active)}
                      </span>
                      <span
                        className={`skyweb-status-pill skyweb-status-pill-${getSeverityTone(alert.severity)}`}
                      >
                        {getSeverityLabel(alert.severity)}
                      </span>
                      <span className="skyweb-mini-pill">{alert.targetType}</span>
                    </div>
                    <h3>{alert.title}</h3>
                    <p>{alert.description || 'No alert description yet.'}</p>
                    <dl className="skyweb-alert-rule-grid">
                      <div>
                        <dt>Target</dt>
                        <dd>{getAlertTargetLabel(alert)}</dd>
                      </div>
                      <div>
                        <dt>Condition</dt>
                        <dd>{formatColumnLabel(alert.conditionType)}</dd>
                      </div>
                      <div>
                        <dt>Threshold</dt>
                        <dd>{formatNumber(alert.thresholdValue)}</dd>
                      </div>
                      <div>
                        <dt>Latest</dt>
                        <dd>{formatNumber(alert.lastObservedValue)}</dd>
                      </div>
                      <div>
                        <dt>Evaluated</dt>
                        <dd>{formatDateTime(alert.lastEvaluatedAt)}</dd>
                      </div>
                      <div>
                        <dt>Triggered</dt>
                        <dd>{formatDateTime(alert.lastTriggeredAt)}</dd>
                      </div>
                      <div>
                        <dt>Events</dt>
                        <dd>{formatNumber(alert.eventCount || 0)}</dd>
                      </div>
                    </dl>
                    {alert.lastMessage && (
                      <p className="skyweb-alert-message">{alert.lastMessage}</p>
                    )}
                  </div>
                  <div className="skyweb-alert-actions">
                    <button
                      className="skyweb-btn skyweb-btn-secondary"
                      disabled={evaluatingKey === alert.alertKey}
                      onClick={() => handleEvaluateAlert(alert)}
                      type="button"
                    >
                      {evaluatingKey === alert.alertKey ? 'Evaluating...' : 'Evaluate'}
                    </button>
                    <button
                      className="skyweb-btn skyweb-btn-secondary"
                      onClick={() => handleToggleAlert(alert)}
                      type="button"
                    >
                      {alert.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      className="skyweb-btn skyweb-btn-danger"
                      onClick={() => handleRemoveAlert(alert)}
                      type="button"
                    >
                      Remove
                    </button>
                    <Link
                      className="skyweb-link-action"
                      to={`/macro/alerts/${encodeURIComponent(alert.alertKey)}`}
                    >
                      Open rule →
                    </Link>
                    {alert.targetType === 'indicator' && alert.indicatorCode && (
                      <Link
                        className="skyweb-link-action"
                        to={`/macro/indicators/${encodeURIComponent(alert.indicatorCode)}`}
                      >
                        Open indicator →
                      </Link>
                    )}
                    {alert.targetType === 'view_metric' && alert.viewKey && (
                      <Link
                        className="skyweb-link-action"
                        to={`/macro/views/${encodeURIComponent(alert.viewKey)}`}
                      >
                        Open view →
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
