import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
import { formatCategory, formatDateTime, formatRegion } from '../utils/formatters.js';

function countUniqueValues(items = [], getter) {
  return new Set(items.map(getter).filter(Boolean)).size;
}

function getSavedViewLabel(savedView) {
  return savedView.displayLabel || savedView.view?.label || savedView.viewKey;
}

export default function SavedViews() {
  const { savedViews, loadingSavedViews, savedViewsError, refreshSavedViews, removeSavedView } =
    useSavedViews();
  const [actionError, setActionError] = useState(null);

  const pinnedCount = savedViews.filter((savedView) => savedView.pinned).length;
  const regionCount = countUniqueValues(savedViews, (savedView) => savedView.view?.region);
  const categoryCount = countUniqueValues(savedViews, (savedView) => savedView.view?.category);

  async function handleRemoveSavedView(viewKey) {
    setActionError(null);

    try {
      await removeSavedView(viewKey);
    } catch (error) {
      setActionError(error);
    }
  }

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Member dashboard</div>
          <h1>Saved macro views</h1>
          <p>
            Your first personalized SkyWeb watchlist surface. Save macro views from any drilldown
            page, then return here for a private command shelf of the views that matter most.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshSavedViews} type="button">
            Refresh saved views
          </button>
          <Link className="btn skyweb-btn-primary" to="/macro/views">
            Browse views
          </Link>
        </div>
      </header>

      {loadingSavedViews && <LoadingState>Loading saved macro views...</LoadingState>}

      {!loadingSavedViews && savedViewsError && (
        <ErrorState title="Saved views unavailable.">
          {savedViewsError.message || 'Unable to load saved macro views.'}
        </ErrorState>
      )}

      {!loadingSavedViews && !savedViewsError && (
        <>
          {actionError && (
            <div className="skyweb-auth-alert skyweb-detail-notice">
              {actionError.message || 'Unable to update saved macro views.'}
            </div>
          )}

          <section className="skyweb-metric-grid skyweb-saved-metrics">
            <StatCard label="Saved views" value={savedViews.length} detail="Private watchlist" />
            <StatCard label="Pinned" value={pinnedCount} detail="Prioritized surfaces" />
            <StatCard label="Regions" value={regionCount} detail="Coverage groups" />
            <StatCard label="Categories" value={categoryCount} detail="Macro lanes" />
          </section>

          {savedViews.length === 0 ? (
            <section className="skyweb-page-card skyweb-saved-empty-card">
              <div className="skyweb-card-kicker">Watchlist empty</div>
              <h2>No saved macro views yet</h2>
              <p>
                Open a macro view detail page and hit “Save view” to start building your private
                SkyWeb watchlist. This is the runway for saved dashboards and alert surfaces.
              </p>
              <Link className="btn skyweb-btn-primary" to="/macro/views">
                Choose first view
              </Link>
            </section>
          ) : (
            <section className="skyweb-saved-view-stack">
              {savedViews.map((savedView) => (
                <article className="skyweb-saved-view-row" key={savedView.viewKey}>
                  <div className="skyweb-saved-view-main">
                    {savedView.view ? (
                      <ViewCard saved view={savedView.view} />
                    ) : (
                      <div className="skyweb-page-card">
                        <div className="skyweb-card-kicker">Saved view</div>
                        <h2>{getSavedViewLabel(savedView)}</h2>
                        <p>
                          This saved record exists, but the macro view metadata is not currently
                          available from SkyServer.
                        </p>
                      </div>
                    )}
                  </div>

                  <aside className="skyweb-saved-view-sidecar">
                    <div className="skyweb-card-kicker">Saved metadata</div>
                    <h3>{getSavedViewLabel(savedView)}</h3>
                    <dl className="skyweb-detail-list skyweb-saved-detail-list">
                      <div>
                        <dt>Region</dt>
                        <dd>
                          {savedView.view?.region ? formatRegion(savedView.view.region) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Category</dt>
                        <dd>
                          {savedView.view?.category ? formatCategory(savedView.view.category) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Saved</dt>
                        <dd>{savedView.createdAt ? formatDateTime(savedView.createdAt) : '—'}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{savedView.updatedAt ? formatDateTime(savedView.updatedAt) : '—'}</dd>
                      </div>
                    </dl>
                    {savedView.note && <p className="skyweb-saved-note">{savedView.note}</p>}
                    <button
                      className="btn skyweb-btn-ghost"
                      onClick={() => handleRemoveSavedView(savedView.viewKey)}
                      type="button"
                    >
                      Remove saved view
                    </button>
                  </aside>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}
