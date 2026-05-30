import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useAuth } from '../context/AuthContext.jsx';
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

export default function MemberDashboard() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
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

  return (
    <>
      <header className="skyweb-page-header skyweb-member-dashboard-header">
        <div>
          <div className="skyweb-kicker">Personal command board</div>
          <h1>{SKYWEB_PRODUCT_NAME} Dashboard</h1>
          <p>
            {displayName}, your pinned macro views now roll up into a private dashboard. This is the
            first composed member surface: saved views become the building blocks, and pinned views
            become the cockpit.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshSavedViews} type="button">
            Refresh dashboard
          </button>
          <Link className="btn skyweb-btn-ghost" to="/saved">
            Manage saved views
          </Link>
          <Link className="btn skyweb-btn-primary" to="/macro/views">
            Browse views
          </Link>
        </div>
      </header>

      {loadingSavedViews && <LoadingState>Loading your dashboard...</LoadingState>}

      {!loadingSavedViews && savedViewsError && (
        <ErrorState title="Dashboard unavailable.">
          {savedViewsError.message || 'Unable to load your saved macro dashboard.'}
        </ErrorState>
      )}

      {!loadingSavedViews && !savedViewsError && (
        <>
          <section className="skyweb-dashboard-pulse skyweb-member-dashboard-pulse">
            <div>
              <div className="skyweb-card-kicker">Pinned dashboard surface</div>
              <h2>
                {pinnedSavedViews.length > 0
                  ? 'Pinned views are live'
                  : 'Pin views to shape this dashboard'}
              </h2>
              <p>
                Phase 7.3 turns your saved-view shelf into a dashboard surface. Pin the most useful
                macro views, add notes and order values on the saved page, then return here for the
                clean executive view.
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
            <StatCard
              label="Pinned views"
              value={pinnedSavedViews.length}
              detail="Dashboard inputs"
            />
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
                  <strong>No pinned views yet.</strong>
                  <p>
                    Showing your saved shelf as a preview. Pin one or more views on the saved page
                    to promote them into this dashboard.
                  </p>
                </section>
              )}

              <section className="skyweb-dashboard-section">
                <div className="skyweb-section-heading">
                  <div>
                    <div className="skyweb-card-kicker">Pinned macro board</div>
                    <h2>
                      {pinnedSavedViews.length > 0 ? 'Priority surfaces' : 'Saved-view preview'}
                    </h2>
                    <p className="skyweb-section-copy">
                      This board uses saved metadata from your watchlist: custom labels, pin status,
                      notes, and display order.
                    </p>
                  </div>
                  <Link className="skyweb-card-link" to="/saved">
                    Tune saved views →
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
                  <p>
                    Notes from pinned saved views surface here so the dashboard carries context, not
                    just cards.
                  </p>
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
                  <h2>From watchlist to dashboard composer</h2>
                  <p>
                    This member dashboard is intentionally composed from pinned saved views. The
                    next larger step can promote this into configurable dashboard sections, saved
                    layouts, and alert-ready macro tiles.
                  </p>
                  <dl className="skyweb-detail-list skyweb-dashboard-detail-list">
                    <div>
                      <dt>Primary route</dt>
                      <dd>/dashboard</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
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
                    <Link className="btn skyweb-btn-primary" to="/saved">
                      Edit dashboard inputs
                    </Link>
                    <Link className="btn skyweb-btn-ghost" to="/account">
                      Update preferences
                    </Link>
                  </div>
                </article>
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
