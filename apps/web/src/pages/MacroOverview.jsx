import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import macroService from '../services/macroService.js';
import {
  formatCategory,
  formatDate,
  formatNumber,
  formatRegion,
  getMaxDate,
} from '../utils/formatters.js';

function getErrorMessage(error) {
  if (!error) {
    return '';
  }

  if (error.status === 401 || error.status === 403) {
    return 'SkyServer public macro endpoints are unavailable. Confirm the SkyServer API is running and /api/public/macro is mounted.';
  }

  return error.message || 'Unable to load macro overview.';
}

function groupViewsByRegion(views = []) {
  return views.reduce((groups, view) => {
    const region = view.region || 'OTHER';
    groups[region] = groups[region] || [];
    groups[region].push(view);
    return groups;
  }, {});
}

function groupViewsByCategory(views = []) {
  return views.reduce((groups, view) => {
    const category = view.category || 'macro';
    groups[category] = groups[category] || [];
    groups[category].push(view);
    return groups;
  }, {});
}

function getLatestDateFromViews(views = []) {
  return getMaxDate(views.map((view) => view?.stats?.maxDate || view?.maxDate).filter(Boolean));
}

function sortFeaturedViews(views = []) {
  return [...views]
    .sort((left, right) => {
      const leftRows = left?.stats?.totalRows || 0;
      const rightRows = right?.stats?.totalRows || 0;
      return rightRows - leftRows;
    })
    .slice(0, 6);
}

export default function MacroOverview() {
  const [summary, setSummary] = useState(null);
  const [views, setViews] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const groupedViews = useMemo(() => groupViewsByRegion(views), [views]);
  const groupedCategories = useMemo(() => groupViewsByCategory(views), [views]);
  const featuredViews = useMemo(() => sortFeaturedViews(views), [views]);
  const latestDate = useMemo(() => getLatestDateFromViews(views), [views]);
  const totalRows = useMemo(
    () => views.reduce((sum, view) => sum + Number(view?.stats?.totalRows || 0), 0),
    [views],
  );

  useEffect(() => {
    let active = true;

    async function loadMacroOverview() {
      setLoading(true);
      setError(null);

      try {
        const [summaryPayload, viewPayload, indicatorPayload] = await Promise.all([
          macroService.getSummary(),
          macroService.listViews(),
          macroService.listIndicators({ limit: 500, active: true }),
        ]);

        if (!active) {
          return;
        }

        const summaryViews = summaryPayload.views || [];
        const listViews = viewPayload.items || [];
        const viewsByKey = new Map(listViews.map((view) => [view.viewKey, view]));
        const mergedViews = summaryViews.length
          ? summaryViews.map((view) => ({ ...(viewsByKey.get(view.viewKey) || {}), ...view }))
          : listViews;

        setSummary(summaryPayload);
        setViews(mergedViews);
        setIndicators(indicatorPayload.items || []);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMacroOverview();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="skyweb-page-header skyweb-dashboard-header">
        <div>
          <div className="skyweb-kicker">Macro dashboards</div>
          <h1>SkyWeb Macro Dashboard</h1>
          <p>
            A public-facing command center for curated macroeconomic views powered by SkyServer
            public APIs.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <Link className="btn skyweb-btn-ghost" to="/macro/indicators">
            Browse indicators
          </Link>
          <Link className="btn skyweb-btn-primary" to="/macro/views">
            View all macro views
          </Link>
        </div>
      </header>

      {loading && <LoadingState>Loading macro dashboard...</LoadingState>}

      {!loading && error && (
        <ErrorState title="Macro API unavailable.">{getErrorMessage(error)}</ErrorState>
      )}

      {!loading && !error && (
        <>
          <section className="skyweb-dashboard-pulse">
            <div>
              <div className="skyweb-card-kicker">Public data surface</div>
              <h2>Macro layer online</h2>
              <p>
                {views.length} curated view(s), {indicators.length} active indicator(s), and{' '}
                {formatNumber(totalRows, { compact: true })} combined public rows are available for
                exploration.
              </p>
            </div>
            <div className="skyweb-pulse-stack">
              <span>Latest data</span>
              <strong>{latestDate ? formatDate(latestDate) : '—'}</strong>
            </div>
          </section>

          <section className="skyweb-metric-grid">
            <StatCard
              label="Macro views"
              value={summary?.viewCount ?? views.length}
              detail="Curated public views"
            />
            <StatCard
              label="Indicators"
              value={summary?.indicatorCount ?? indicators.length}
              detail="Active source series"
            />
            <StatCard
              label="Regions"
              value={Object.keys(groupedViews).length}
              detail="Coverage groups"
            />
            <StatCard
              label="Rows"
              value={formatNumber(totalRows, { compact: true })}
              detail="Combined view rows"
            />
          </section>

          <section className="skyweb-dashboard-section">
            <div className="skyweb-section-heading">
              <div>
                <div className="skyweb-card-kicker">Featured views</div>
                <h2>High-coverage macro surfaces</h2>
              </div>
              <Link className="skyweb-card-link" to="/macro/views">
                Browse all →
              </Link>
            </div>
            {featuredViews.length > 0 ? (
              <div className="skyweb-view-grid skyweb-featured-grid">
                {featuredViews.map((view) => (
                  <ViewCard key={view.viewKey} view={view} />
                ))}
              </div>
            ) : (
              <EmptyState>No featured views returned.</EmptyState>
            )}
          </section>

          <section className="skyweb-dashboard-two-column">
            <article className="skyweb-card">
              <div className="skyweb-card-kicker">Regional coverage</div>
              <h2>Views by region</h2>
              <div className="skyweb-coverage-list">
                {Object.entries(groupedViews).map(([region, regionViews]) => (
                  <div className="skyweb-coverage-row" key={region}>
                    <span>{formatRegion(region)}</span>
                    <strong>{regionViews.length}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="skyweb-card">
              <div className="skyweb-card-kicker">Category coverage</div>
              <h2>Views by category</h2>
              <div className="skyweb-chip-list">
                {Object.entries(groupedCategories).map(([category, categoryViews]) => (
                  <span className="skyweb-chip skyweb-chip-static" key={category}>
                    {formatCategory(category)} · {categoryViews.length}
                  </span>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}
