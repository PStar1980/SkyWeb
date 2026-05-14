import { useEffect, useMemo, useState } from 'react';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import macroService from '../services/macroService.js';
import { formatCategory, formatRegion } from '../utils/formatters.js';

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

function getUniqueValues(items, key) {
  return Array.from(new Set(items.map((item) => item[key]).filter(Boolean))).sort();
}

export default function MacroViews() {
  const [views, setViews] = useState([]);
  const [filter, setFilter] = useState('');
  const [region, setRegion] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const regions = useMemo(() => ['ALL', ...getUniqueValues(views, 'region')], [views]);
  const categories = useMemo(() => ['ALL', ...getUniqueValues(views, 'category')], [views]);

  const filteredViews = useMemo(
    () =>
      views.filter((view) => {
        if (region !== 'ALL' && view.region !== region) {
          return false;
        }

        if (category !== 'ALL' && view.category !== category) {
          return false;
        }

        return matchesFilter(view, filter);
      }),
    [category, filter, region, views],
  );

  useEffect(() => {
    let active = true;

    async function loadViews() {
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

        const summaryViews = summaryPayload.views || [];
        const listViews = viewPayload.items || [];
        const viewsByKey = new Map(listViews.map((view) => [view.viewKey, view]));
        const mergedViews = summaryViews.length
          ? summaryViews.map((view) => ({ ...(viewsByKey.get(view.viewKey) || {}), ...view }))
          : listViews;

        setViews(mergedViews);
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

      <section className="skyweb-toolbar skyweb-toolbar-three">
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
              {regionOption === 'ALL' ? 'All regions' : formatRegion(regionOption)}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((categoryOption) => (
            <option key={categoryOption} value={categoryOption}>
              {categoryOption === 'ALL' ? 'All categories' : formatCategory(categoryOption)}
            </option>
          ))}
        </select>
      </section>

      {loading && <LoadingState>Loading macro views...</LoadingState>}
      {!loading && error && (
        <ErrorState title="Views unavailable.">
          {error.status === 401 || error.status === 403
            ? 'SkyServer public macro API is unavailable. Confirm the API is running and /api/public/macro is mounted.'
            : error.message}
        </ErrorState>
      )}

      {!loading && !error && (
        <>
          <div className="skyweb-results-summary">
            Showing {filteredViews.length} of {views.length} macro view(s).
          </div>
          <section className="skyweb-view-grid">
            {filteredViews.map((view) => (
              <ViewCard key={view.viewKey} view={view} />
            ))}

            {filteredViews.length === 0 && <EmptyState>No macro views matched.</EmptyState>}
          </section>
        </>
      )}
    </>
  );
}
