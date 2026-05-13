import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import macroService from '../services/macroService.js';

function matchesFilter(view, filter) {
  if (!filter) {
    return true;
  }

  const haystack = [view.viewKey, view.label, view.region, view.category, view.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(filter.toLowerCase());
}

export default function MacroViews() {
  const [views, setViews] = useState([]);
  const [filter, setFilter] = useState('');
  const [region, setRegion] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const regions = useMemo(
    () => ['ALL', ...Array.from(new Set(views.map((view) => view.region).filter(Boolean))).sort()],
    [views],
  );

  const filteredViews = useMemo(
    () =>
      views.filter((view) => {
        if (region !== 'ALL' && view.region !== region) {
          return false;
        }

        return matchesFilter(view, filter);
      }),
    [filter, region, views],
  );

  useEffect(() => {
    let active = true;

    async function loadViews() {
      setLoading(true);
      setError(null);

      try {
        const payload = await macroService.listViews();

        if (active) {
          setViews(payload.items || []);
        }
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

    loadViews();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Macro catalog</div>
          <h1>Macro Views</h1>
          <p>Browse curated SkyServer macro views by region, category, and purpose.</p>
        </div>
      </header>

      <section className="skyweb-toolbar">
        <input
          className="form-control"
          placeholder="Search views..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select
          className="form-select"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
        >
          {regions.map((regionOption) => (
            <option key={regionOption} value={regionOption}>
              {regionOption === 'ALL' ? 'All regions' : regionOption}
            </option>
          ))}
        </select>
      </section>

      {loading && <div className="skyweb-loading">Loading macro views...</div>}
      {!loading && error && (
        <section className="skyweb-alert">
          <strong>Views unavailable.</strong>
          <p>
            {error.status === 401 || error.status === 403
              ? 'Public macro API is coming in Phase 9.1.'
              : error.message}
          </p>
        </section>
      )}

      {!loading && !error && (
        <section className="skyweb-view-grid">
          {filteredViews.map((view) => (
            <Link
              className="skyweb-view-card"
              key={view.viewKey}
              to={`/macro/views/${view.viewKey}`}
            >
              <div className="skyweb-card-kicker">
                {view.region || 'Macro'} · {view.category || 'view'}
              </div>
              <h2>{view.label}</h2>
              <p>{view.description}</p>
              <span className="skyweb-card-link">Open view →</span>
            </Link>
          ))}

          {filteredViews.length === 0 && (
            <div className="skyweb-empty">No macro views matched.</div>
          )}
        </section>
      )}
    </>
  );
}
