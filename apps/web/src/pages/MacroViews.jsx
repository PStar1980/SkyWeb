import { useEffect, useMemo, useState } from 'react';
import MacroViewCatalogCard from '../components/MacroViewCatalogCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
import macroService from '../services/macroService.js';
import { formatCategory, formatRegion } from '../utils/formatters.js';
import { useSearchParams } from 'react-router-dom';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All views' },
  { value: 'SAVED', label: 'Saved only' },
  { value: 'UNSAVED', label: 'Unsaved only' },
  { value: 'PINNED', label: 'Pinned only' },
  { value: 'UNPINNED', label: 'Unpinned saved' },
];

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

function getStatusParam(searchParams) {
  const candidateValue = searchParams.get('status') || 'ALL';

  return STATUS_FILTERS.some((option) => option.value === candidateValue) ? candidateValue : 'ALL';
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

function getDraftForSavedView(savedView) {
  return {
    displayLabel: savedView?.displayLabel || '',
    sortOrder: String(savedView?.sortOrder ?? 0),
  };
}

function isDraftDirty(savedView, draftMetadata) {
  if (!savedView || !draftMetadata) {
    return false;
  }

  const normalizedSortOrder = Number.parseInt(draftMetadata.sortOrder || '0', 10);

  return (
    draftMetadata.displayLabel !== (savedView.displayLabel || '') ||
    (Number.isFinite(normalizedSortOrder) ? normalizedSortOrder : 0) !== (savedView.sortOrder || 0)
  );
}

export default function MacroViews() {
  const { isAuthenticated } = useAuth();
  const { loadingPreferences, preferences } = usePreferences();
  const { loadingSavedViews, removeSavedView, saveSavedView, savedViews, updateSavedView } =
    useSavedViews();
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
  const [statusFilter, setStatusFilter] = useState(() => getStatusParam(searchParams));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState(null);
  const [editingViewKey, setEditingViewKey] = useState('');
  const [draftMetadata, setDraftMetadata] = useState(null);
  const [updatingViewKey, setUpdatingViewKey] = useState('');

  const savedViewMap = useMemo(
    () => new Map(savedViews.map((savedView) => [savedView.viewKey, savedView])),
    [savedViews],
  );
  const savedCount = savedViews.length;
  const pinnedCount = savedViews.filter((savedView) => savedView.pinned).length;
  const visibleSavedCount = views.filter((view) => savedViewMap.has(view.viewKey)).length;
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
    } else if (key === 'status') {
      if (value && value !== 'ALL') {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    } else {
      nextParams.set(key, value || 'ALL');
    }

    setSearchParams(nextParams, { replace: true });
  }

  function clearActionState() {
    setActionNotice('');
    setActionError(null);
  }

  async function handleSaveView(view) {
    clearActionState();
    setUpdatingViewKey(view.viewKey);

    try {
      await saveSavedView({
        viewKey: view.viewKey,
        displayLabel: view.label || view.viewKey,
        pinned: false,
        sortOrder: 0,
      });
      setActionNotice(
        `${view.label || view.viewKey} saved. Pin it when you want it on dashboards.`,
      );
    } catch (saveError) {
      setActionError(saveError);
    } finally {
      setUpdatingViewKey('');
    }
  }

  async function handleRemoveSavedView(viewKey) {
    clearActionState();
    setUpdatingViewKey(viewKey);

    try {
      await removeSavedView(viewKey);
      setActionNotice('Saved macro view removed.');

      if (editingViewKey === viewKey) {
        setEditingViewKey('');
        setDraftMetadata(null);
      }
    } catch (removeError) {
      setActionError(removeError);
    } finally {
      setUpdatingViewKey('');
    }
  }

  async function handlePinToggle(savedView) {
    clearActionState();
    setUpdatingViewKey(savedView.viewKey);

    try {
      const nextPinnedState = !savedView.pinned;
      await updateSavedView(savedView.viewKey, { pinned: nextPinnedState });
      setActionNotice(nextPinnedState ? 'Saved view pinned.' : 'Saved view unpinned.');
    } catch (pinError) {
      setActionError(pinError);
    } finally {
      setUpdatingViewKey('');
    }
  }

  function handleEditMetadata(savedView) {
    clearActionState();
    setEditingViewKey(savedView.viewKey);
    setDraftMetadata(getDraftForSavedView(savedView));
  }

  function handleCancelEdit() {
    setEditingViewKey('');
    setDraftMetadata(null);
  }

  function updateDraftField(fieldName, value) {
    setDraftMetadata((currentDraft) => ({
      ...(currentDraft || {}),
      [fieldName]: value,
    }));
  }

  async function handleSaveMetadata(savedView) {
    clearActionState();
    setUpdatingViewKey(savedView.viewKey);

    try {
      const sortOrder = Number.parseInt(draftMetadata?.sortOrder || '0', 10);
      await updateSavedView(savedView.viewKey, {
        displayLabel: draftMetadata?.displayLabel || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      });
      setEditingViewKey('');
      setDraftMetadata(null);
      setActionNotice('Saved view metadata updated.');
    } catch (metadataError) {
      setActionError(metadataError);
    } finally {
      setUpdatingViewKey('');
    }
  }

  const filteredViews = useMemo(
    () =>
      views.filter((view) => {
        const savedView = savedViewMap.get(view.viewKey);

        if (region !== 'ALL' && view.region !== region) {
          return false;
        }

        if (category !== 'ALL' && view.category !== category) {
          return false;
        }

        if (statusFilter === 'SAVED' && !savedView) {
          return false;
        }

        if (statusFilter === 'UNSAVED' && savedView) {
          return false;
        }

        if (statusFilter === 'PINNED' && !savedView?.pinned) {
          return false;
        }

        if (statusFilter === 'UNPINNED' && (!savedView || savedView.pinned)) {
          return false;
        }

        return matchesFilter(view, filter);
      }),
    [category, filter, region, savedViewMap, statusFilter, views],
  );

  useEffect(() => {
    setFilter(searchParams.get('q') || '');
    setRegion(getScopedParam(searchParams, 'region', preferredRegion));
    setCategory(getScopedParam(searchParams, 'category', preferredCategory));
    setStatusFilter(getStatusParam(searchParams));
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
          <p>
            Browse every curated macro surface and manage saved, pinned, and ordered views directly
            from the catalog cards.
          </p>
        </div>
      </header>

      {isAuthenticated && (
        <section className="skyweb-metric-grid skyweb-catalog-saved-metrics">
          <StatCard label="Saved views" value={savedCount} detail="Private watchlist" />
          <StatCard label="Pinned" value={pinnedCount} detail="Dashboard inputs" />
          <StatCard label="In catalog" value={visibleSavedCount} detail="Matched public views" />
          <StatCard label="Visible" value={filteredViews.length} detail="After current filters" />
        </section>
      )}

      <section
        className={`skyweb-toolbar ${isAuthenticated ? 'skyweb-toolbar-four' : 'skyweb-toolbar-three'}`}
      >
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
        {isAuthenticated && (
          <select
            className="form-select"
            value={statusFilter}
            onChange={(event) => updateFilter('status', event.target.value, setStatusFilter)}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </section>

      {usingPreferenceFilters && !loadingPreferences && preferenceFilterSummary && (
        <div className="skyweb-preference-filter-note">
          Personal defaults applied · {preferenceFilterSummary}. Change a filter to make the URL
          selection take over.
        </div>
      )}

      {actionNotice && (
        <div className="skyweb-profile-notice skyweb-detail-notice">{actionNotice}</div>
      )}
      {actionError && (
        <div className="skyweb-auth-alert skyweb-detail-notice">
          {actionError.message || 'Unable to update saved macro views.'}
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
            {loadingSavedViews && isAuthenticated ? ' Syncing saved controls...' : ''}
          </div>
          <section className="skyweb-view-grid">
            {filteredViews.map((view) => {
              const savedView = savedViewMap.get(view.viewKey) || null;
              const editing = editingViewKey === view.viewKey;
              const updating = updatingViewKey === view.viewKey;

              return (
                <MacroViewCatalogCard
                  draftDirty={isDraftDirty(savedView, draftMetadata)}
                  draftMetadata={editing ? draftMetadata : null}
                  editing={editing}
                  isAuthenticated={isAuthenticated}
                  key={view.viewKey}
                  onCancelEdit={handleCancelEdit}
                  onDraftChange={updateDraftField}
                  onEditMetadata={handleEditMetadata}
                  onPinToggle={handlePinToggle}
                  onRemoveSaved={handleRemoveSavedView}
                  onSaveMetadata={handleSaveMetadata}
                  onSaveView={handleSaveView}
                  savedView={savedView}
                  updating={updating}
                  view={view}
                />
              );
            })}

            {filteredViews.length === 0 && <EmptyState>No macro views matched.</EmptyState>}
          </section>
        </>
      )}
    </>
  );
}
