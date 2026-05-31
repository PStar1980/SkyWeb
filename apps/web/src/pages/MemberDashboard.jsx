import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardSurface from '../components/DashboardSurface.jsx';
import StatCard from '../components/StatCard.jsx';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboards } from '../context/DashboardsContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
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

function getTotalRows(savedViews = []) {
  return savedViews.reduce((sum, savedView) => {
    const rows = Number(savedView.view?.stats?.totalRows ?? savedView.view?.totalRows ?? 0);
    return Number.isFinite(rows) ? sum + rows : sum;
  }, 0);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
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

function DefaultDashboardBoard({ dashboard, displayName, refreshDashboards }) {
  return (
    <>
      <header className="skyweb-page-header skyweb-member-dashboard-header">
        <div>
          <div className="skyweb-kicker">Personal command board</div>
          <h1>{dashboard.title}</h1>
          <p>
            {displayName}, your default custom dashboard is now the primary cockpit. It renders from
            the dashboard builder definition, so saved views become reusable analytics blocks
            instead of a loose watchlist.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshDashboards} type="button">
            Refresh dashboard
          </button>
          <Link className="btn skyweb-btn-ghost" to={`/dashboards/${dashboard.dashboardKey}`}>
            Open viewer
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
          <div className="skyweb-card-kicker">Default dashboard live</div>
          <h2>Custom dashboard is driving `/dashboard`</h2>
          <p>
            Phase 7.5 promotes dashboard definitions into the default landing surface. Change the
            default from the dashboard builder whenever you want a different cockpit in command.
          </p>
        </div>
        <div className="skyweb-pulse-stack">
          <span>Default board</span>
          <strong>{dashboard.dashboardKey}</strong>
        </div>
      </section>

      <DashboardSurface
        dashboard={dashboard}
        emptyAction={
          <Link className="skyweb-card-link" to="/dashboards">
            Add dashboard items →
          </Link>
        }
      />
    </>
  );
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { dashboardsError, defaultDashboard, loadingDashboards, refreshDashboards } =
    useDashboards();
  const { loadingSavedViews, refreshSavedViews, savedViews, savedViewsError } = useSavedViews();

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
  const pinnedRows = getTotalRows(pinnedSavedViews);
  const displayName = user?.displayName || user?.username || 'SkyWeb Analytics member';
  const defaultRegion = preferences?.defaultMacroRegion || 'ALL';
  const defaultCategory = preferences?.defaultMacroCategory || 'ALL';
  const loading = loadingDashboards || (!defaultDashboard && loadingSavedViews);
  const error = dashboardsError || (!defaultDashboard ? savedViewsError : null);

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

  if (defaultDashboard) {
    return (
      <DefaultDashboardBoard
        dashboard={defaultDashboard}
        displayName={displayName}
        refreshDashboards={refreshDashboards}
      />
    );
  }

  return (
    <>
      <header className="skyweb-page-header skyweb-member-dashboard-header">
        <div>
          <div className="skyweb-kicker">Personal command board</div>
          <h1>{SKYWEB_PRODUCT_NAME} Dashboard</h1>
          <p>
            {displayName}, your pinned macro views now roll up into a private dashboard. This is the
            fallback command board until you mark a custom dashboard as the default cockpit.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshSavedViews} type="button">
            Refresh dashboard
          </button>
          <Link className="btn skyweb-btn-ghost" to="/saved">
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
              : 'Pin views or set a default dashboard'}
          </h2>
          <p>
            Your pinned saved views still work as a fallback command board. For the full Phase 7.5
            cockpit, create a custom dashboard and mark it as default from the builder.
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
              <strong>No pinned views or default dashboard yet.</strong>
              <p>
                Showing your saved shelf as a preview. Pin saved views or set a custom dashboard as
                default to promote it into this route.
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
                Set default dashboard →
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
                  Add notes to pinned views on the saved page, and they will appear here.
                </EmptyState>
              )}
            </article>

            <article className="skyweb-card">
              <div className="skyweb-card-kicker">Next move</div>
              <h2>Promote a custom dashboard</h2>
              <p>
                Phase 7.5 lets `/dashboard` render a default custom dashboard. Use the builder to
                mark one board as default and this fallback surface will hand over the wheel.
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
