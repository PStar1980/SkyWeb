import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/PageState.jsx';
import StatCard from '../components/StatCard.jsx';
import authService from '../services/authService.js';
import {
  formatColumnLabel,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../utils/formatters.js';

function getTargetLabel(alert) {
  if (!alert) {
    return 'Alert target';
  }

  if (alert.targetType === 'indicator') {
    return alert.indicatorCode || 'Indicator';
  }

  return `${alert.viewKey || 'View'} · ${formatColumnLabel(alert.metricKey || '')}`;
}

function getTargetLink(alert) {
  if (!alert) {
    return '/macro/alerts';
  }

  if (alert.targetType === 'indicator' && alert.indicatorCode) {
    return `/macro/indicators/${encodeURIComponent(alert.indicatorCode)}`;
  }

  if (alert.targetType === 'view_metric' && alert.viewKey) {
    return `/macro/views/${encodeURIComponent(alert.viewKey)}`;
  }

  return '/macro/alerts';
}

function getStatusTone(status) {
  if (status === 'triggered') {
    return 'warning';
  }

  if (status === 'error') {
    return 'danger';
  }

  if (status === 'ok') {
    return 'success';
  }

  return 'default';
}

function eventDelta(event) {
  const latest = Number(event?.observedValue);
  const previous = Number(event?.previousValue);

  if (!Number.isFinite(latest) || !Number.isFinite(previous)) {
    return '—';
  }

  return formatNumber(latest - previous);
}

export default function MacroAlertDetail() {
  const { alertKey } = useParams();
  const [alert, setAlert] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  async function loadAlertDetail() {
    const [alertPayload, eventsPayload] = await Promise.all([
      authService.getAlert(alertKey),
      authService.listAlertEvents(alertKey, { limit: 100 }),
    ]);

    setAlert(alertPayload.item || null);
    setEvents(eventsPayload.items || alertPayload.item?.events || []);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [alertPayload, eventsPayload] = await Promise.all([
          authService.getAlert(alertKey),
          authService.listAlertEvents(alertKey, { limit: 100 }),
        ]);

        if (!active) {
          return;
        }

        setAlert(alertPayload.item || null);
        setEvents(eventsPayload.items || alertPayload.item?.events || []);
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

    load();

    return () => {
      active = false;
    };
  }, [alertKey]);

  const triggeredEvents = useMemo(
    () => events.filter((event) => event.eventStatus === 'triggered'),
    [events],
  );
  const errorEvents = useMemo(
    () => events.filter((event) => event.eventStatus === 'error'),
    [events],
  );

  async function handleEvaluate() {
    setEvaluating(true);
    setMessage('');
    setError(null);

    try {
      await authService.evaluateAlert(alertKey);
      await loadAlertDetail();
      setMessage('Alert evaluated and history refreshed.');
    } catch (evaluateError) {
      setError(evaluateError);
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return <LoadingState>Loading alert rule...</LoadingState>;
  }

  if (error) {
    return <ErrorState title="Alert detail failed to load.">{error.message}</ErrorState>;
  }

  if (!alert) {
    return <ErrorState title="Alert rule not found.">This alert rule is unavailable.</ErrorState>;
  }

  return (
    <>
      <header className="skyweb-page-header skyweb-alert-detail-header">
        <div>
          <div className="skyweb-kicker">Macro alert detail</div>
          <h1>{alert.title}</h1>
          <p>
            Inspect the evaluation trail for this rule. Each manual or scheduled evaluation becomes
            an event so the alert can explain what it saw and why it fired or stayed quiet.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <Link className="skyweb-btn skyweb-btn-secondary" to="/macro/alerts">
            Back to alerts
          </Link>
          <Link className="skyweb-btn skyweb-btn-secondary" to={getTargetLink(alert)}>
            Open target
          </Link>
          <button
            className="skyweb-btn skyweb-btn-primary"
            disabled={evaluating}
            onClick={handleEvaluate}
            type="button"
          >
            {evaluating ? 'Evaluating...' : 'Evaluate now'}
          </button>
        </div>
      </header>

      {message && <div className="skyweb-success">{message}</div>}
      {error && <ErrorState title="Alert action failed.">{error.message}</ErrorState>}

      <section className="skyweb-metric-grid skyweb-alert-detail-metrics">
        <StatCard
          label="Status"
          value={alert.lastStatus || 'Never'}
          detail={alert.active ? 'Active rule' : 'Disabled rule'}
        />
        <StatCard
          label="Latest value"
          value={formatNumber(alert.lastObservedValue)}
          detail={formatDate(alert.lastEvaluatedAt)}
        />
        <StatCard
          label="Threshold"
          value={formatNumber(alert.thresholdValue)}
          detail={formatColumnLabel(alert.conditionType)}
        />
        <StatCard
          label="Events"
          value={events.length}
          detail={`${triggeredEvents.length} triggered`}
        />
      </section>

      <section className="skyweb-card skyweb-alert-detail-card">
        <div className="skyweb-card-kicker">Rule context</div>
        <div className="skyweb-alert-detail-layout">
          <div>
            <h2>{getTargetLabel(alert)}</h2>
            <p>{alert.description || 'No rule description has been added yet.'}</p>
            {alert.lastMessage && <p className="skyweb-alert-message">{alert.lastMessage}</p>}
          </div>
          <dl className="skyweb-alert-rule-grid skyweb-alert-detail-grid">
            <div>
              <dt>Target type</dt>
              <dd>{formatColumnLabel(alert.targetType)}</dd>
            </div>
            <div>
              <dt>Severity</dt>
              <dd>{formatColumnLabel(alert.severity)}</dd>
            </div>
            <div>
              <dt>Triggered</dt>
              <dd>{formatDateTime(alert.lastTriggeredAt)}</dd>
            </div>
            <div>
              <dt>Previous value</dt>
              <dd>{formatNumber(alert.lastPreviousValue)}</dd>
            </div>
            <div>
              <dt>Triggered events</dt>
              <dd>{triggeredEvents.length}</dd>
            </div>
            <div>
              <dt>Error events</dt>
              <dd>{errorEvents.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="skyweb-table-card">
        <div className="skyweb-table-header">
          <div>
            <div className="skyweb-card-kicker">Evaluation history</div>
            <h2>{events.length} event(s)</h2>
            <p>
              Showing the latest stored evaluation events for this alert rule. Manual and scheduled
              evaluations append to this audit trail.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="skyweb-empty-inline">
            No evaluation events yet. Run the rule once to create its first history entry.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table skyweb-table skyweb-alert-event-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Evaluated</th>
                  <th>Observed date</th>
                  <th>Observed</th>
                  <th>Previous</th>
                  <th>Δ</th>
                  <th>Threshold</th>
                  <th>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.eventId}>
                    <td>
                      <span
                        className={`skyweb-status-pill skyweb-status-pill-${getStatusTone(event.eventStatus)}`}
                      >
                        {event.eventStatus || '—'}
                      </span>
                    </td>
                    <td>{formatDateTime(event.evaluatedAt)}</td>
                    <td>{formatDate(event.observedAt)}</td>
                    <td>{formatNumber(event.observedValue)}</td>
                    <td>{formatNumber(event.previousValue)}</td>
                    <td>{eventDelta(event)}</td>
                    <td>{formatNumber(event.thresholdValue)}</td>
                    <td>{formatColumnLabel(event.eventMetadata?.evaluationSource || 'manual')}</td>
                    <td>{event.message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
