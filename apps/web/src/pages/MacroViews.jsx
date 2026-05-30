import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
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

function shouldUsePreferenceFilters(searchParams) {
  return !searchParams.has('region') && !searchParams.has('category');
}

function getScopedParam(searchParams, key, preferenceValue = 'ALL') {
  if (searchParams.has(key)) {
    return searchParams.get(key) || 'ALL';
  }

  return shouldUsePreferenceFilters(searchParams) ? preferenceValue || 'ALL' : 'ALL';
}

function getSelectOptions(items, key, selectedValue) {
  const values = getUniqueValues(items, key).filter((value) => value !== 'ALL');

  if (selectedValue && selectedValue !== 'ALL' && !values.includes(selectedValue)) {
    values.unshift(selectedValue);
  }

  return ['ALL', ...values];
}

function getPreferenceFilterSummary({ region, category }) {
  const filters = [];

  if (region && region !== 'ALL') {
    filters.push(`Region: ${formatRegion(region)}`);
  }

  if (category && category !== 'ALL') {
    filters.push(`Category: ${formatCategory(category)}`);
  }

  return filters.join(' · ');
}

export default function MacroViews() {
  const { isAuthenticated } = useAuth();
  const { loadingPreferences, preferences } = usePreferences();
  const { isViewSaved } = useSavedViews();
  const [searchParams, setSearchParams] = useSearchParams();
  const preferredRegion = preferences.defaultMacroRegion || 'ALL';
  const preferredCategory = preferences.defaultMacroCategory || 'ALL';
  const [views, setViews] = useState([]);
  const [filter, setFilter] = useState(() => searchParams.get('q') || '');
  const [region, setRegion] = useState(() =>
    getScopedParam(searchParams, 'region', preferredRegion),
  );
  const [category, setCategory] = useState(() =>
    getScopedParam(searchParams, 'category', preferredCategory),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const regions = useMemo(() => getSelectOptions(views, 'region', region), [region, views]);
  const categories = useMemo(
    () => getSelectOptions(views, 'category', category),
    [category, views],
  );
  const usingPreferenceFilters =
    !searchParams.has('region') &&
    !searchParams.has('category') &&
    (region !== 'ALL' || category !== 'ALL');
  const preferenceFilterSummary = getPreferenceFilterSummary({ region, category });

  function updateFilter(key, value, setter) {
    setter(value);

    const nextParams = new URLSearchParams(searchParams);

    if (key === 'q') {
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    } else {
      nextParams.set(key, value || 'ALL');
    }

    setSearchParams(nextParams, { replace: true });
  }

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
    setFilter(searchParams.get('q') || '');
    setRegion(getScopedParam(searchParams, 'region', preferredRegion));
    setCategory(getScopedParam(searchParams, 'category', preferredCategory));
  }, [preferredCategory, preferredRegion, searchParams]);

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
        {isAuthenticated && (
          <div className="skyweb-header-actions">
            <Link className="btn skyweb-btn-ghost" to="/saved">
              Open saved views
            </Link>
          </div>
        )}
      </header>

      <section className="skyweb-toolbar skyweb-toolbar-three">
        <input
          className="form-control"
          placeholder="Search views..."
          value={filter}
          onChange={(event) => updateFilter('q', event.target.value, setFilter)}
        />
        <select
          className="form-select"
          value={region}
          onChange={(event) => updateFilter('region', event.target.value, setRegion)}
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
          onChange={(event) => updateFilter('category', event.target.value, setCategory)}
        >
          {categories.map((categoryOption) => (
            <option key={categoryOption} value={categoryOption}>
              {categoryOption === 'ALL' ? 'All categories' : formatCategory(categoryOption)}
            </option>
          ))}
        </select>
      </section>

      {usingPreferenceFilters && !loadingPreferences && preferenceFilterSummary && (
        <div className="skyweb-preference-filter-note">
          Personal defaults applied · {preferenceFilterSummary}. Change a filter to make the URL
          selection take over.
        </div>
      )}

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
              <ViewCard key={view.viewKey} saved={isViewSaved(view.viewKey)} view={view} />
            ))}

            {filteredViews.length === 0 && <EmptyState>No macro views matched.</EmptyState>}
          </section>
        </>
      )}
    </>
  );
}
