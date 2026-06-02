import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import StoryCard from '../components/StoryCard.jsx';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import macroService from '../services/macroService.js';
import {
  buildOverviewStories,
  buildViewSearchPath,
  getFeaturedStoryViews,
  getViewRowCount,
  summarizeViewGroups,
} from '../utils/macroStory.js';
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

function getLatestDateFromViews(views = []) {
  return getMaxDate(views.map((view) => view?.stats?.maxDate || view?.maxDate).filter(Boolean));
}

function getCategoryDescription(category = '') {
  const normalized = String(category || '').toLowerCase();

  const descriptions = {
    inflation: 'Price pressure, CPI/PCE movement, and inflation divergence surfaces.',
    rates: 'Policy rates, yield curve shape, credit yields, and funding pressure.',
    growth: 'Output, production, and momentum signals across the business cycle.',
    labor: 'Employment, earnings, claims, and labor-market slack context.',
    credit: 'Financial conditions, leverage, stress, and credit-risk context.',
    housing: 'Housing starts, permits, and residential momentum indicators.',
    trade: 'Cross-border, FX, and external-balance data surfaces.',
    liquidity: 'Liquidity, money-market, and financial plumbing views.',
    macro_regime: 'Composite signals intended to frame the broader macro backdrop.',
  };

  return descriptions[normalized] || 'Curated macro view group with shared analytical purpose.';
}

function CoverageRow({ item, label, to }) {
  const sharePercent = Math.round((item.rowShare || 0) * 100);

  return (
    <Link className="skyweb-coverage-bar-row" to={to}>
      <div className="skyweb-coverage-row-main">
        <span>{label}</span>
        <strong>{item.viewCount} view(s)</strong>
      </div>
      <div className="skyweb-coverage-bar-track" aria-hidden="true">
        <span style={{ width: `${Math.max(6, sharePercent)}%` }} />
      </div>
      <small>
        {formatNumber(item.rows, { compact: true })} rows · latest{' '}
        {item.latestDate ? formatDate(item.latestDate) : '—'}
      </small>
    </Link>
  );
}

export default function MacroOverview() {
  const [summary, setSummary] = useState(null);
  const [views, setViews] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const featuredViews = useMemo(() => getFeaturedStoryViews(views), [views]);
  const overviewStories = useMemo(
    () => buildOverviewStories(views, indicators).filter(Boolean),
    [indicators, views],
  );
  const categoryLanes = useMemo(
    () => summarizeViewGroups(views, 'category', { priority: 'category' }).slice(0, 6),
    [views],
  );
  const regionCoverage = useMemo(
    () => summarizeViewGroups(views, 'region', { priority: 'region' }),
    [views],
  );
  const latestDate = useMemo(() => getLatestDateFromViews(views), [views]);
  const totalRows = useMemo(
    () => views.reduce((sum, view) => sum + getViewRowCount(view), 0),
    [views],
  );
  const freshestViews = useMemo(
    () =>
      [...views]
        .filter((view) => view?.stats?.maxDate || view?.maxDate)
        .sort((left, right) => {
          const leftDate = new Date(left?.stats?.maxDate || left?.maxDate).getTime();
          const rightDate = new Date(right?.stats?.maxDate || right?.maxDate).getTime();
          return rightDate - leftDate;
        })
        .slice(0, 5),
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
          <div className="skyweb-kicker">Macro overview</div>
          <h1>Macro Overview</h1>
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

      {loading && <LoadingState>Loading macro overview...</LoadingState>}

      {!loading && error && (
        <ErrorState title="Macro API unavailable.">{getErrorMessage(error)}</ErrorState>
      )}

      {!loading && !error && (
        <>
          <section className="skyweb-dashboard-pulse skyweb-dashboard-pulse-story">
            <div>
              <div className="skyweb-card-kicker">Public data surface</div>
              <h2>Macro layer online</h2>
              <p>
                {views.length} curated view(s), {indicators.length} active indicator(s), and{' '}
                {formatNumber(totalRows, { compact: true })} combined public rows are available for
                exploration. Start with the freshest updates, the deepest histories, or the
                cross-border comparison surfaces.
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
            <StatCard label="Regions" value={regionCoverage.length} detail="Coverage groups" />
            <StatCard
              label="Rows"
              value={formatNumber(totalRows, { compact: true })}
              detail="Combined view rows"
            />
          </section>

          <section className="skyweb-dashboard-section">
            <div className="skyweb-section-heading">
              <div>
                <div className="skyweb-card-kicker">Signal board</div>
                <h2>What to inspect first</h2>
              </div>
              <Link className="skyweb-card-link" to="/macro/views">
                Browse all →
              </Link>
            </div>
            <div className="skyweb-story-grid">
              {overviewStories.map((story) => (
                <StoryCard key={story.key} {...story} />
              ))}
            </div>
          </section>

          <section className="skyweb-dashboard-section">
            <div className="skyweb-section-heading">
              <div>
                <div className="skyweb-card-kicker">Featured views</div>
                <h2>High-context macro surfaces</h2>
                <p className="skyweb-section-copy">
                  Prioritized for comparison value, current data, category importance, and row
                  coverage.
                </p>
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

          <section className="skyweb-dashboard-section">
            <div className="skyweb-section-heading">
              <div>
                <div className="skyweb-card-kicker">Decision lanes</div>
                <h2>Explore by macro question</h2>
                <p className="skyweb-section-copy">
                  Categories are now treated like analytical lanes, not just tags.
                </p>
              </div>
            </div>
            <div className="skyweb-lane-grid">
              {categoryLanes.map((lane) => (
                <Link
                  className="skyweb-lane-card"
                  key={lane.key}
                  to={buildViewSearchPath({ category: lane.key })}
                >
                  <div className="skyweb-card-kicker">{formatCategory(lane.key)}</div>
                  <h3>{lane.leadingView?.label || `${formatCategory(lane.key)} surface`}</h3>
                  <p>{getCategoryDescription(lane.key)}</p>
                  <dl>
                    <div>
                      <dt>Views</dt>
                      <dd>{lane.viewCount}</dd>
                    </div>
                    <div>
                      <dt>Rows</dt>
                      <dd>{formatNumber(lane.rows, { compact: true })}</dd>
                    </div>
                    <div>
                      <dt>Latest</dt>
                      <dd>{lane.latestDate ? formatDate(lane.latestDate) : '—'}</dd>
                    </div>
                  </dl>
                  <span className="skyweb-card-link">Open lane →</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="skyweb-dashboard-two-column">
            <article className="skyweb-card">
              <div className="skyweb-card-kicker">Regional coverage</div>
              <h2>Where the data lives</h2>
              <p>Quickly jump into the U.S., Canada, or cross-border comparison surfaces.</p>
              <div className="skyweb-coverage-list skyweb-coverage-bar-list">
                {regionCoverage.map((item) => (
                  <CoverageRow
                    item={item}
                    key={item.key}
                    label={formatRegion(item.key)}
                    to={buildViewSearchPath({ region: item.key })}
                  />
                ))}
              </div>
            </article>

            <article className="skyweb-card">
              <div className="skyweb-card-kicker">Recently refreshed</div>
              <h2>Fresh public rows</h2>
              <p>The newest view surfaces currently available through the public macro API.</p>
              <div className="skyweb-fresh-list">
                {freshestViews.map((view) => (
                  <Link
                    className="skyweb-fresh-row"
                    key={view.viewKey}
                    to={`/macro/views/${view.viewKey}`}
                  >
                    <span>{view.label}</span>
                    <strong>{formatDate(view?.stats?.maxDate || view?.maxDate)}</strong>
                  </Link>
                ))}
              </div>
            </article>
          </section>

          <section className="skyweb-dashboard-section skyweb-screenshot-section">
            <div className="skyweb-section-heading">
              <div>
                <div className="skyweb-card-kicker">Portfolio proof</div>
                <h2>Built as a public evidence surface</h2>
                <p className="skyweb-section-copy">
                  SkyWeb Analytics now gives the Sky ecosystem a visible layer: live data, curated
                  macro stories, chart previews, route-driven catalogs, and a private member runway.
                </p>
              </div>
              <Link className="skyweb-card-link" to="/account">
                Member layer →
              </Link>
            </div>
            <div className="skyweb-proof-strip">
              <article>
                <span>Public API</span>
                <strong>{summary?.viewCount ?? views.length} views</strong>
                <p>Curated SkyServer macro surfaces exposed through safe public endpoints.</p>
              </article>
              <article>
                <span>Data coverage</span>
                <strong>{formatNumber(totalRows, { compact: true })} rows</strong>
                <p>Combined public rows available for dashboard, catalog, and drilldown views.</p>
              </article>
              <article>
                <span>Exploration</span>
                <strong>{categoryLanes.length} lanes</strong>
                <p>Category-driven paths that turn raw tables into guided macro questions.</p>
              </article>
            </div>
          </section>
        </>
      )}
    </>
  );
}
