import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/PageState.jsx';
import StatCard from '../components/StatCard.jsx';
import authService from '../services/authService.js';
import {
  ALERT_SEVERITY_OPTIONS,
  getHighestSeverity,
  getNotificationStatusLabel,
  getNotificationTargetLabel,
  getNotificationTargetLink,
  getNotificationTone,
  getSeverityLabel,
} from '../utils/alertSignals.js';
import { formatDate, formatDateTime, formatNumber } from '../utils/formatters.js';

const STATUS_OPTIONS = [
  ['open', 'Open signals'],
  ['acknowledged', 'Acknowledged'],
  ['dismissed', 'Dismissed'],
  ['all', 'All history'],
];

const SEVERITY_FILTER_OPTIONS = [
  ['all', 'All severities'],
  ...ALERT_SEVERITY_OPTIONS.map((option) => [option.value, option.label]),
];

const SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['severity', 'Highest severity'],
  ['status', 'Status priority'],
];

const SEVERITY_PRIORITY = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const STATUS_PRIORITY = {
  open: 3,
  acknowledged: 2,
  dismissed: 1,
};

function getSignalDate(notification) {
  return notification?.evaluatedAt || notification?.createdAt || notification?.updatedAt || '';
}

function getSignalTimestamp(notification) {
  const date = new Date(getSignalDate(notification));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortSignals(items = [], sortMode = 'newest') {
  return [...items].sort((left, right) => {
    if (sortMode === 'oldest') {
      return getSignalTimestamp(left) - getSignalTimestamp(right);
    }

    if (sortMode === 'severity') {
      const severityDifference =
        (SEVERITY_PRIORITY[String(right.severity || '').toLowerCase()] || 0) -
        (SEVERITY_PRIORITY[String(left.severity || '').toLowerCase()] || 0);

      return severityDifference || getSignalTimestamp(right) - getSignalTimestamp(left);
    }

    if (sortMode === 'status') {
      const statusDifference =
        (STATUS_PRIORITY[String(right.notificationStatus || '').toLowerCase()] || 0) -
        (STATUS_PRIORITY[String(left.notificationStatus || '').toLowerCase()] || 0);

      return statusDifference || getSignalTimestamp(right) - getSignalTimestamp(left);
    }

    return getSignalTimestamp(right) - getSignalTimestamp(left);
  });
}

function buildNotificationQuery(filters = {}) {
  const query = {
    status: filters.status,
    limit: 100,
  };

  if (filters.severity !== 'all') {
    query.severity = filters.severity;
  }

  return query;
}

function getOpenBulkFilters(filters = {}) {
  if (filters.severity === 'all') {
    return {};
  }

  return { severity: filters.severity };
}

export default function MacroAlertSignals() {
  const [notifications, setNotifications] = useState([]);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [statusTotals, setStatusTotals] = useState({ open: 0, acknowledged: 0, dismissed: 0 });
  const [filters, setFilters] = useState({ status: 'open', severity: 'all', sort: 'newest' });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const sortedNotifications = useMemo(
    () => sortSignals(notifications, filters.sort),
    [notifications, filters.sort],
  );
  const openVisibleCount = useMemo(
    () => sortedNotifications.filter((item) => item.notificationStatus === 'open').length,
    [sortedNotifications],
  );
  const highestSeverity = getHighestSeverity(sortedNotifications);
  const totalSignals = statusTotals.open + statusTotals.acknowledged + statusTotals.dismissed;

  async function loadSignals(nextFilters = filters) {
    setLoading(true);
    setError(null);

    try {
      const [displayPayload, openPayload, acknowledgedPayload, dismissedPayload] =
        await Promise.all([
          authService.listAlertNotifications(buildNotificationQuery(nextFilters)),
          authService.listAlertNotifications({ status: 'open', limit: 1 }),
          authService.listAlertNotifications({ status: 'acknowledged', limit: 1 }),
          authService.listAlertNotifications({ status: 'dismissed', limit: 1 }),
        ]);

      setNotifications(displayPayload.items || []);
      setDisplayTotal(displayPayload.total || 0);
      setStatusTotals({
        open: openPayload.total || 0,
        acknowledged: acknowledgedPayload.total || 0,
        dismissed: dismissedPayload.total || 0,
      });
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadActiveSignals() {
      setLoading(true);
      setError(null);
      setMessage('');

      try {
        const [displayPayload, openPayload, acknowledgedPayload, dismissedPayload] =
          await Promise.all([
            authService.listAlertNotifications(buildNotificationQuery(filters)),
            authService.listAlertNotifications({ status: 'open', limit: 1 }),
            authService.listAlertNotifications({ status: 'acknowledged', limit: 1 }),
            authService.listAlertNotifications({ status: 'dismissed', limit: 1 }),
          ]);

        if (!active) {
          return;
        }

        setNotifications(displayPayload.items || []);
        setDisplayTotal(displayPayload.total || 0);
        setStatusTotals({
          open: openPayload.total || 0,
          acknowledged: acknowledgedPayload.total || 0,
          dismissed: dismissedPayload.total || 0,
        });
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

    loadActiveSignals();

    return () => {
      active = false;
    };
  }, [filters]);

  function updateFilter(fieldName, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [fieldName]: value,
    }));
    setMessage('');
    setError(null);
  }

  async function handleAcknowledgeNotification(notification) {
    setActionId(notification.notificationId);
    setMessage('');
    setError(null);

    try {
      await authService.acknowledgeAlertNotification(notification.notificationId);
      await loadSignals(filters);
      setMessage('Signal acknowledged. Event history remains attached to the alert rule.');
    } catch (actionError) {
      setError(actionError);
    } finally {
      setActionId(null);
    }
  }

  async function handleDismissNotification(notification) {
    setActionId(notification.notificationId);
    setMessage('');
    setError(null);

    try {
      await authService.dismissAlertNotification(notification.notificationId);
      await loadSignals(filters);
      setMessage('Signal dismissed from the open queue. Event history remains permanent.');
    } catch (actionError) {
      setError(actionError);
    } finally {
      setActionId(null);
    }
  }

  async function handleAcknowledgeMatchingOpen() {
    setActionId('__acknowledge_matching__');
    setMessage('');
    setError(null);

    try {
      const payload = await authService.acknowledgeAllAlertNotifications(
        getOpenBulkFilters(filters),
      );
      await loadSignals(filters);
      setMessage(`${payload.acknowledgedCount || 0} open signal(s) acknowledged.`);
    } catch (actionError) {
      setError(actionError);
    } finally {
      setActionId(null);
    }
  }

  async function handleDismissMatchingOpen() {
    setActionId('__dismiss_matching__');
    setMessage('');
    setError(null);

    try {
      const payload = await authService.dismissAllAlertNotifications(getOpenBulkFilters(filters));
      await loadSignals(filters);
      setMessage(`${payload.dismissedCount || 0} open signal(s) dismissed.`);
    } catch (actionError) {
      setError(actionError);
    } finally {
      setActionId(null);
    }
  }

  return (
    <>
      <header className="skyweb-page-header skyweb-signal-center-header">
        <div>
          <div className="skyweb-kicker">Macro alerts</div>
          <h1>Signal center</h1>
          <p>
            Review triggered macro notifications in one dedicated queue. Acknowledge means reviewed;
            dismiss clears the open signal. Neither action deletes the alert-rule event history.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <Link className="skyweb-btn skyweb-btn-secondary" to="/macro/alerts">
            Back to alert rules
          </Link>
          <Link className="skyweb-btn skyweb-btn-primary" to="/macro/alerts/preferences">
            Alert preferences
          </Link>
        </div>
      </header>

      <section className="skyweb-metric-grid skyweb-signal-center-summary">
        <StatCard label="Open" value={statusTotals.open} detail="Needs review" />
        <StatCard label="Acknowledged" value={statusTotals.acknowledged} detail="Reviewed queue" />
        <StatCard label="Dismissed" value={statusTotals.dismissed} detail="Cleared from open" />
        <StatCard label="Total history" value={totalSignals} detail="Notifications retained" />
        <StatCard
          label="Highest visible"
          value={highestSeverity ? getSeverityLabel(highestSeverity) : '—'}
          detail="Current filter set"
        />
      </section>

      <section className="skyweb-card skyweb-signal-center-controls mb-4">
        <div>
          <div className="skyweb-card-kicker">Signal filters</div>
          <h2>Notification queue</h2>
          <p>
            Showing {sortedNotifications.length} of {displayTotal} matching signal(s). The center
            loads up to the latest 100 matching rows for this pass.
          </p>
        </div>
        <div className="skyweb-signal-filter-grid">
          <label>
            Status
            <select
              className="form-select"
              onChange={(event) => updateFilter('status', event.target.value)}
              value={filters.status}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              className="form-select"
              onChange={(event) => updateFilter('severity', event.target.value)}
              value={filters.severity}
            >
              {SEVERITY_FILTER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select
              className="form-select"
              onChange={(event) => updateFilter('sort', event.target.value)}
              value={filters.sort}
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="skyweb-signal-bulk-actions">
          <button
            className="skyweb-btn skyweb-btn-secondary"
            disabled={actionId === '__acknowledge_matching__' || statusTotals.open === 0}
            onClick={handleAcknowledgeMatchingOpen}
            type="button"
          >
            {actionId === '__acknowledge_matching__' ? 'Acknowledging...' : 'Acknowledge open'}
          </button>
          <button
            className="skyweb-btn skyweb-btn-danger"
            disabled={actionId === '__dismiss_matching__' || statusTotals.open === 0}
            onClick={handleDismissMatchingOpen}
            type="button"
          >
            {actionId === '__dismiss_matching__' ? 'Dismissing...' : 'Dismiss open'}
          </button>
          {filters.severity !== 'all' && (
            <span className="skyweb-signal-bulk-note">
              Bulk actions apply only to open {getSeverityLabel(filters.severity).toLowerCase()}{' '}
              signals.
            </span>
          )}
        </div>
      </section>

      {message && <div className="skyweb-success">{message}</div>}
      {error && <ErrorState title="Signal center unavailable.">{error.message}</ErrorState>}
      {loading && <LoadingState>Loading alert signals...</LoadingState>}

      {!loading && !error && sortedNotifications.length === 0 && (
        <div className="skyweb-empty-inline">No signals match this filter set.</div>
      )}

      {!loading && !error && sortedNotifications.length > 0 && (
        <section className="skyweb-alert-signal-list skyweb-signal-center-list">
          {sortedNotifications.map((notification) => (
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
                    Evaluated {formatDateTime(notification.evaluatedAt)}
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
                  <div>
                    <dt>Acknowledged</dt>
                    <dd>{formatDateTime(notification.acknowledgedAt)}</dd>
                  </div>
                  <div>
                    <dt>Dismissed</dt>
                    <dd>{formatDateTime(notification.dismissedAt)}</dd>
                  </div>
                </dl>
              </div>
              <div className="skyweb-alert-actions">
                {notification.notificationStatus === 'open' && (
                  <>
                    <button
                      className="skyweb-btn skyweb-btn-secondary"
                      disabled={actionId === notification.notificationId}
                      onClick={() => handleAcknowledgeNotification(notification)}
                      type="button"
                    >
                      Acknowledge
                    </button>
                    <button
                      className="skyweb-btn skyweb-btn-danger"
                      disabled={actionId === notification.notificationId}
                      onClick={() => handleDismissNotification(notification)}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </>
                )}
                <Link
                  className="skyweb-link-action"
                  to={`/macro/alerts/${encodeURIComponent(notification.alertKey)}`}
                >
                  Open rule →
                </Link>
                <Link className="skyweb-link-action" to={getNotificationTargetLink(notification)}>
                  Open target →
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && !error && openVisibleCount > 0 && (
        <p className="skyweb-signal-center-footnote">
          {openVisibleCount} visible signal(s) are still open. Acknowledging or dismissing clears
          the navbar Signals pill once no surfaced open items remain.
        </p>
      )}
    </>
  );
}
