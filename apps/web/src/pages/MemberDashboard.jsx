import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardSurface from '../components/DashboardSurface.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import StatCard from '../components/StatCard.jsx';
import ViewCard from '../components/ViewCard.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboards } from '../context/DashboardsContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
import authService from '../services/authService.js';
import {
  ALERT_SIGNALS_CHANGED_EVENT,
  getSeverityLabel,
  getSeverityTone,
  summarizeAlertSurface,
} from '../utils/alertSignals.js';
import { formatCategory, formatDateTime, formatRegion } from '../utils/formatters.js';

function countUniqueValues(items = [], getter) {
  return new Set(items.map(getter).filter(Boolean)).size;
}

function getSavedViewLabel(savedView = {}) {
  return savedView.displayLabel || savedView.view?.label || savedView.viewKey || 'Saved view';
}

function getViewRegion(savedView = {}) {
  return savedView.view?.region || '';
}

function getViewCategory(savedView = {}) {
  return savedView.view?.category || '';
}

function getDashboardItemRegion(item = {}) {
  return item.view?.region || item.indicator?.source || '';
}

function getDashboardItemCategory(item = {}) {
  return item.view?.category || item.indicator?.frequency || '';
}

function getSavedViewRows(savedViews = []) {
  return savedViews.reduce((sum, savedView) => {
    const rows = Number(savedView.view?.stats?.totalRows ?? savedView.view?.totalRows ?? 0);
    return Number.isFinite(rows) ? sum + rows : sum;
  }, 0);
}

function getDashboardRows(dashboard = {}) {
  const items = Array.isArray(dashboard.items) ? dashboard.items : [];

  return items.reduce((sum, item) => {
    const rows = Number(
      item.view?.stats?.totalRows ??
        item.view?.totalRows ??
        item.indicator?.stats?.totalRows ??
        item.indicator?.totalRows ??
        0,
    );
    return Number.isFinite(rows) ? sum + rows : sum;
  }, 0);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function getLayoutLabel(layoutPreset = '') {
  const labels = {
    executive: 'Executive',
    research: 'Research',
    compact: 'Compact',
  };

  return labels[layoutPreset] || layoutPreset || 'Dashboard';
}

function getDashboardOptionLabel(dashboard = {}) {
  const itemCount = Number.isFinite(Number(dashboard.itemCount))
    ? Number(dashboard.itemCount)
    : dashboard.items?.length || 0;
  const defaultText = dashboard.isDefault ? ' · default' : '';

  return `${dashboard.title || dashboard.dashboardKey} (${itemCount} item${itemCount === 1 ? '' : 's'}${defaultText})`;
}

function getAlertSummaryTone(alertSummary = {}) {
  if (alertSummary.openCount > 0) {
    return getSeverityTone(alertSummary.highestSeverity || 'medium');
  }

  if (alertSummary.triggeredCount > 0) {
    return 'warning';
  }

  return 'success';
}

function AlertSummaryCard({ alertSummary }) {
  const tone = getAlertSummaryTone(alertSummary);
  const highestSeverity = alertSummary.highestSeverity
    ? getSeverityLabel(alertSummary.highestSeverity)
    : 'None';

  return (
    <section className={`skyweb-alert-dashboard-card skyweb-alert-dashboard-card-${tone}`}>
      <div>
        <div className="skyweb-card-kicker">Alert notification center</div>
        <h2>
          {alertSummary.openCount > 0
            ? `${alertSummary.openCount} open signal${alertSummary.openCount === 1 ? '' : 's'}`
            : 'No open signals'}
        </h2>
        <p>
          Dashboard-facing summary of the alert queue. Acknowledge means reviewed; dismiss clears
          the open signal while preserving the rule event history.
        </p>
      </div>
      <dl className="skyweb-alert-dashboard-grid">
        <div>
          <dt>Open signals</dt>
          <dd>{alertSummary.openCount}</dd>
        </div>
        <div>
          <dt>Triggered rules</dt>
          <dd>{alertSummary.triggeredCount}</dd>
        </div>
        <div>
          <dt>Highest severity</dt>
          <dd>
            <span className={`skyweb-status-pill skyweb-status-pill-${tone}`}>
              {highestSeverity}
            </span>
          </dd>
        </div>
        <div>
          <dt>Last evaluated</dt>
          <dd>{formatDateTime(alertSummary.lastEvaluatedAt)}</dd>
        </div>
      </dl>
      <Link className="skyweb-card-link" to="/macro/alerts">
        Open alerts →
      </Link>
    </section>
  );
}

function SavedViewNote({ savedView }) {
  return (
    <article className="skyweb-dashboard-note-card">
      <div className="skyweb-card-kicker">
        {savedView.view?.region ? formatRegion(savedView.view.region) : 'Saved view'}
      </div>
      <h3>{getSavedViewLabel(savedView)}</h3>
      <p>{savedView.note}</p>
      <Link className="skyweb-card-link" to={`/macro/views/${savedView.viewKey}`}>
        Open view →
      </Link>
    </article>
  );
}

function DashboardSwitcher({ dashboards, onChange, selectedDashboardKey }) {
  if (dashboards.length <= 1) {
    return null;
  }

  return (
    <label className="skyweb-dashboard-switcher">
      <span>Active dashboard</span>
      <select
        className="form-control"
        onChange={(event) => onChange(event.target.value)}
        value={selectedDashboardKey}
      >
        {dashboards.map((dashboard) => (
          <option key={dashboard.dashboardKey} value={dashboard.dashboardKey}>
            {getDashboardOptionLabel(dashboard)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DefaultDashboardBoard({
  alertSummary,
  dashboard,
  dashboards,
  displayName,
  refreshDashboards,
  selectedDashboardKey,
  setSelectedDashboardKey,
}) {
  const items = Array.isArray(dashboard.items) ? dashboard.items : [];
  const rows = getDashboardRows(dashboard);
  const regionCount = countUniqueValues(items, getDashboardItemRegion);
  const categoryCount = countUniqueValues(items, getDashboardItemCategory);
  const layoutLabel = getLayoutLabel(dashboard.layoutPreset);

  return (
    <>
      <header className="skyweb-page-header skyweb-member-dashboard-header">
        <div>
          <div className="skyweb-kicker">Macro dashboard</div>
          <h1>{dashboard.title}</h1>
          <p>
            {dashboard.description ||
              `${displayName}, this custom dashboard is built from direct indicators, saved macro views, and reusable analytics blocks.`}
          </p>
        </div>
        <div className="skyweb-header-actions">
          <DashboardSwitcher
            dashboards={dashboards}
            onChange={setSelectedDashboardKey}
            selectedDashboardKey={selectedDashboardKey}
          />
          <button className="btn skyweb-btn-ghost" onClick={refreshDashboards} type="button">
            Refresh dashboard
          </button>
          <Link className="btn skyweb-btn-ghost" to={`/dashboards/${dashboard.dashboardKey}`}>
            Open viewer
          </Link>
          <Link
            className="btn skyweb-btn-ghost"
            to={`/dashboards/${dashboard.dashboardKey}/presentation`}
          >
            Presentation view
          </Link>
          <Link className="btn skyweb-btn-ghost" to="/dashboards">
            Dashboard builder
          </Link>
          <Link className="btn skyweb-btn-primary" to="/macro/views">
            Browse views
          </Link>
        </div>
      </header>

      <section className="skyweb-metric-grid skyweb-member-dashboard-summary">
        <StatCard label="Layout" value={layoutLabel} detail="Dashboard preset" />
        <StatCard label="Items" value={items.length} detail="Dashboard blocks" />
        <StatCard label="Rows" value={formatCompactNumber(rows)} detail="Covered history" />
        <StatCard
          label="Lanes"
          value={`${regionCount}/${categoryCount}`}
          detail="Regions / categories"
        />
      </section>

      <AlertSummaryCard alertSummary={alertSummary} />

      <DashboardSurface
        dashboard={dashboard}
        emptyAction={
          <Link className="skyweb-card-link" to="/dashboards">
            Add dashboard items →
          </Link>
        }
        hideHero
        hideMetrics
        hideSummary
      />
    </>
  );
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { dashboards, dashboardsError, defaultDashboard, loadingDashboards, refreshDashboards } =
    useDashboards();
  const { loadingSavedViews, refreshSavedViews, savedViews, savedViewsError } = useSavedViews();
  const [selectedDashboardKey, setSelectedDashboardKey] = useState('');
  const [alertSurface, setAlertSurface] = useState({ alerts: [], notifications: [] });

  const pinnedSavedViews = useMemo(
    () => savedViews.filter((savedView) => savedView.pinned && savedView.view),
    [savedViews],
  );
  const fallbackSavedViews = useMemo(
    () => savedViews.filter((savedView) => savedView.view).slice(0, 4),
    [savedViews],
  );
  const dashboardViews = pinnedSavedViews.length > 0 ? pinnedSavedViews : fallbackSavedViews;
  const noteViews = useMemo(
    () => pinnedSavedViews.filter((savedView) => savedView.note).slice(0, 3),
    [pinnedSavedViews],
  );
  const regionCount = countUniqueValues(pinnedSavedViews, getViewRegion);
  const categoryCount = countUniqueValues(pinnedSavedViews, getViewCategory);
  const pinnedRows = getSavedViewRows(pinnedSavedViews);
  const displayName = user?.displayName || user?.username || 'SkyWeb Analytics member';
  const defaultRegion = preferences?.defaultMacroRegion || 'ALL';
  const defaultCategory = preferences?.defaultMacroCategory || 'ALL';
  const activeDashboard = useMemo(
    () =>
      dashboards.find((dashboard) => dashboard.dashboardKey === selectedDashboardKey) ||
      defaultDashboard ||
      dashboards[0] ||
      null,
    [dashboards, defaultDashboard, selectedDashboardKey],
  );
  const alertSummary = useMemo(
    () => summarizeAlertSurface(alertSurface.alerts, alertSurface.notifications),
    [alertSurface],
  );
  const loading = loadingDashboards || (!activeDashboard && loadingSavedViews);
  const error = dashboardsError || (!activeDashboard ? savedViewsError : null);

  useEffect(() => {
    if (
      selectedDashboardKey &&
      dashboards.some((dashboard) => dashboard.dashboardKey === selectedDashboardKey)
    ) {
      return;
    }

    setSelectedDashboardKey(defaultDashboard?.dashboardKey || dashboards[0]?.dashboardKey || '');
  }, [dashboards, defaultDashboard, selectedDashboardKey]);

  useEffect(() => {
    let active = true;

    async function loadAlertSurface() {
      try {
        const [alertsPayload, notificationsPayload] = await Promise.all([
          authService.listAlerts(),
          authService.listAlertNotifications({ status: 'open', limit: 25 }),
        ]);

        if (active) {
          setAlertSurface({
            alerts: alertsPayload.items || [],
            notifications: notificationsPayload.items || [],
          });
        }
      } catch {
        if (active) {
          setAlertSurface({ alerts: [], notifications: [] });
        }
      }
    }

    function handleSignalsChanged() {
      loadAlertSurface();
    }

    loadAlertSurface();
    window.addEventListener(ALERT_SIGNALS_CHANGED_EVENT, handleSignalsChanged);

    return () => {
      active = false;
      window.removeEventListener(ALERT_SIGNALS_CHANGED_EVENT, handleSignalsChanged);
    };
  }, []);

  if (loading) {
    return <LoadingState>Loading your dashboard...</LoadingState>;
  }

  if (error) {
    return (
      <ErrorState title="Dashboard unavailable.">
        {error.message || 'Unable to load your member dashboard.'}
      </ErrorState>
    );
  }

  if (activeDashboard) {
    return (
      <DefaultDashboardBoard
        alertSummary={alertSummary}
        dashboard={activeDashboard}
        dashboards={dashboards}
        displayName={displayName}
        refreshDashboards={refreshDashboards}
        selectedDashboardKey={activeDashboard.dashboardKey}
        setSelectedDashboardKey={setSelectedDashboardKey}
      />
    );
  }

  return (
    <>
      <header className="skyweb-page-header skyweb-member-dashboard-header">
        <div>
          <div className="skyweb-kicker">Macro dashboard</div>
          <h1>{SKYWEB_PRODUCT_NAME} Dashboard</h1>
          <p>
            {displayName}, your pinned macro views now roll up into a private dashboard. This is the
            fallback command board until you create a custom dashboard cockpit.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshSavedViews} type="button">
            Refresh dashboard
          </button>
          <Link className="btn skyweb-btn-ghost" to="/macro/views?status=SAVED">
            Manage saved views
          </Link>
          <Link className="btn skyweb-btn-ghost" to="/dashboards">
            Dashboard builder
          </Link>
          <Link className="btn skyweb-btn-primary" to="/macro/views">
            Browse views
          </Link>
        </div>
      </header>

      <section className="skyweb-dashboard-pulse skyweb-member-dashboard-pulse">
        <div>
          <div className="skyweb-card-kicker">Pinned dashboard surface</div>
          <h2>
            {pinnedSavedViews.length > 0
              ? 'Pinned views are live'
              : 'Pin views or create a custom dashboard'}
          </h2>
          <p>
            Your pinned saved views still work as a fallback command board. Create a custom
            dashboard in the builder whenever you want a richer macro cockpit.
          </p>
        </div>
        <div className="skyweb-pulse-stack">
          <span>Current lens</span>
          <strong>
            {defaultRegion === 'ALL' ? 'All regions' : formatRegion(defaultRegion)} ·{' '}
            {defaultCategory === 'ALL' ? 'All categories' : formatCategory(defaultCategory)}
          </strong>
        </div>
      </section>

      <section className="skyweb-metric-grid skyweb-saved-metrics">
        <StatCard label="Pinned views" value={pinnedSavedViews.length} detail="Dashboard inputs" />
        <StatCard label="Saved views" value={savedViews.length} detail="Private shelf" />
        <StatCard
          label="Pinned rows"
          value={formatCompactNumber(pinnedRows)}
          detail="Covered history"
        />
        <StatCard
          label="Pinned lanes"
          value={`${regionCount}/${categoryCount}`}
          detail="Regions / categories"
        />
      </section>

      <AlertSummaryCard alertSummary={alertSummary} />

      {savedViews.length === 0 ? (
        <section className="skyweb-page-card skyweb-saved-empty-card">
          <div className="skyweb-card-kicker">Dashboard empty</div>
          <h2>No saved macro views yet</h2>
          <p>
            Save macro views first, then pin the most important surfaces. Once you do, this page
            becomes your personalized {SKYWEB_PRODUCT_NAME} command board.
          </p>
          <Link className="btn skyweb-btn-primary" to="/macro/views">
            Choose first view
          </Link>
        </section>
      ) : (
        <>
          {pinnedSavedViews.length === 0 && (
            <section className="skyweb-alert skyweb-detail-notice">
              <strong>No pinned views or custom dashboard yet.</strong>
              <p>
                Showing your saved shelf as a preview. Pin saved views or build a custom dashboard
                to promote it into this route.
              </p>
            </section>
          )}

          <section className="skyweb-dashboard-section">
            <div className="skyweb-section-heading">
              <div>
                <div className="skyweb-card-kicker">Pinned macro board</div>
                <h2>{pinnedSavedViews.length > 0 ? 'Priority surfaces' : 'Saved-view preview'}</h2>
                <p className="skyweb-section-copy">
                  This board uses saved metadata from your watchlist: custom labels, pin status,
                  notes, and display order.
                </p>
              </div>
              <Link className="skyweb-card-link" to="/dashboards">
                Open dashboard builder →
              </Link>
            </div>

            <div className="skyweb-member-dashboard-grid">
              {dashboardViews.map((savedView) => (
                <ViewCard
                  key={savedView.viewKey}
                  saved
                  view={{ ...savedView.view, label: getSavedViewLabel(savedView) }}
                />
              ))}
            </div>
          </section>

          <section className="skyweb-dashboard-two-column skyweb-member-dashboard-lower">
            <article className="skyweb-card">
              <div className="skyweb-card-kicker">Saved notes</div>
              <h2>Why these views matter</h2>
              <p>Notes from pinned saved views surface here so the dashboard carries context.</p>
              {noteViews.length > 0 ? (
                <div className="skyweb-dashboard-note-list">
                  {noteViews.map((savedView) => (
                    <SavedViewNote key={savedView.viewKey} savedView={savedView} />
                  ))}
                </div>
              ) : (
                <EmptyState>
                  Add notes on individual macro view detail pages, and they will appear here.
                </EmptyState>
              )}
            </article>

            <article className="skyweb-card">
              <div className="skyweb-card-kicker">Next move</div>
              <h2>Build a custom dashboard</h2>
              <p>
                Use the builder to group saved macro views into named dashboards. Once a custom
                dashboard exists, this Macro Dashboard page lets you switch across them from the
                top.
              </p>
              <dl className="skyweb-detail-list skyweb-dashboard-detail-list">
                <div>
                  <dt>Primary route</dt>
                  <dd>/dashboard</dd>
                </div>
                <div>
                  <dt>Fallback source</dt>
                  <dd>Saved macro views</dd>
                </div>
                <div>
                  <dt>Last saved update</dt>
                  <dd>
                    {savedViews[0]?.updatedAt ? formatDateTime(savedViews[0].updatedAt) : '—'}
                  </dd>
                </div>
              </dl>
              <div className="skyweb-profile-actions">
                <Link className="btn skyweb-btn-primary" to="/dashboards">
                  Open dashboard builder
                </Link>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}
