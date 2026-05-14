import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import macroService from '../services/macroService.js';

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

export default function MacroOverview() {
  const [summary, setSummary] = useState(null);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const groupedViews = useMemo(() => groupViewsByRegion(views), [views]);

  useEffect(() => {
    let active = true;

    async function loadMacroOverview() {
      setLoading(true);
      setError(null);

      try {
        const [summaryPayload, viewPayload] = await Promise.all([
          macroService.getSummary(),
          macroService.listViews(),
        ]);

        if (!active) {
          return;
        }

        setSummary(summaryPayload);
        setViews(viewPayload.items || []);
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
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Macro dashboards</div>
          <h1>SkyWeb Macro Overview</h1>
          <p>
            A public-facing gateway for curated macroeconomic views powered by SkyServer public
            APIs.
          </p>
        </div>
        <Link className="btn skyweb-btn-ghost" to="/macro/views">
          View all macro views
        </Link>
      </header>

      {loading && <div className="skyweb-loading">Loading macro overview...</div>}

      {!loading && error && (
        <section className="skyweb-alert">
          <strong>Macro API unavailable.</strong>
          <p>{getErrorMessage(error)}</p>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="skyweb-metric-grid">
            <article className="skyweb-metric-card">
              <span>Macro views</span>
              <strong>{summary?.viewCount ?? views.length}</strong>
            </article>
            <article className="skyweb-metric-card">
              <span>Indicators</span>
              <strong>{summary?.indicatorCount ?? '—'}</strong>
            </article>
            <article className="skyweb-metric-card">
              <span>Regions</span>
              <strong>{Object.keys(groupedViews).length}</strong>
            </article>
            <article className="skyweb-metric-card">
              <span>API mode</span>
              <strong>{import.meta.env.VITE_MACRO_API_PREFIX || '/macro'}</strong>
            </article>
          </section>

          <section className="skyweb-section-grid">
            {Object.entries(groupedViews).map(([region, regionViews]) => (
              <article className="skyweb-card" key={region}>
                <div className="skyweb-card-kicker">{region}</div>
                <h2>{regionViews.length} view(s)</h2>
                <div className="skyweb-chip-list">
                  {regionViews.slice(0, 8).map((view) => (
                    <Link
                      className="skyweb-chip"
                      key={view.viewKey}
                      to={`/macro/views/${view.viewKey}`}
                    >
                      {view.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </>
  );
}
