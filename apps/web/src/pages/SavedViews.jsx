import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
import { formatCategory, formatDateTime, formatRegion } from '../utils/formatters.js';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All saved views' },
  { value: 'PINNED', label: 'Pinned only' },
  { value: 'UNPINNED', label: 'Unpinned only' },
];

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority order' },
  { value: 'updated-desc', label: 'Recently updated' },
  { value: 'created-desc', label: 'Recently saved' },
  { value: 'label-asc', label: 'Title A-Z' },
  { value: 'region-asc', label: 'Region A-Z' },
  { value: 'category-asc', label: 'Category A-Z' },
];

function countUniqueValues(items = [], getter) {
  return new Set(items.map(getter).filter(Boolean)).size;
}

function getSavedViewLabel(savedView) {
  return savedView.displayLabel || savedView.view?.label || savedView.viewKey;
}

function getViewRegion(savedView) {
  return savedView.view?.region || '';
}

function getViewCategory(savedView) {
  return savedView.view?.category || '';
}

function getTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeSearchValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function comparePriority(left, right) {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  const updatedDifference = getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt);

  if (updatedDifference !== 0) {
    return updatedDifference;
  }

  return getSavedViewLabel(left).localeCompare(getSavedViewLabel(right), undefined, {
    sensitivity: 'base',
  });
}

function compareSavedViews(left, right, sortMode) {
  if (sortMode === 'updated-desc') {
    return (
      getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt) || comparePriority(left, right)
    );
  }

  if (sortMode === 'created-desc') {
    return (
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt) || comparePriority(left, right)
    );
  }

  if (sortMode === 'label-asc') {
    return getSavedViewLabel(left).localeCompare(getSavedViewLabel(right), undefined, {
      sensitivity: 'base',
    });
  }

  if (sortMode === 'region-asc') {
    return (
      formatRegion(getViewRegion(left)).localeCompare(
        formatRegion(getViewRegion(right)),
        undefined,
        {
          sensitivity: 'base',
        },
      ) || comparePriority(left, right)
    );
  }

  if (sortMode === 'category-asc') {
    return (
      formatCategory(getViewCategory(left)).localeCompare(
        formatCategory(getViewCategory(right)),
        undefined,
        { sensitivity: 'base' },
      ) || comparePriority(left, right)
    );
  }

  return comparePriority(left, right);
}

function getDraftForSavedView(savedView) {
  return {
    displayLabel: savedView.displayLabel || '',
    note: savedView.note || '',
    sortOrder: String(savedView.sortOrder ?? 0),
  };
}

function isDraftDirty(savedView, draftMetadata) {
  if (!draftMetadata) {
    return false;
  }

  const normalizedSortOrder = Number.parseInt(draftMetadata.sortOrder || '0', 10);

  return (
    draftMetadata.displayLabel !== (savedView.displayLabel || '') ||
    draftMetadata.note !== (savedView.note || '') ||
    (Number.isFinite(normalizedSortOrder) ? normalizedSortOrder : 0) !== (savedView.sortOrder || 0)
  );
}

export default function SavedViews() {
  const {
    savedViews,
    loadingSavedViews,
    savedViewsError,
    refreshSavedViews,
    removeSavedView,
    updateSavedView,
  } = useSavedViews();
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const [editingViewKey, setEditingViewKey] = useState(null);
  const [draftMetadata, setDraftMetadata] = useState(null);
  const [updatingViewKey, setUpdatingViewKey] = useState('');
  const [searchText, setSearchText] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortMode, setSortMode] = useState('priority');

  const pinnedCount = savedViews.filter((savedView) => savedView.pinned).length;
  const regionCount = countUniqueValues(savedViews, getViewRegion);
  const categoryCount = countUniqueValues(savedViews, getViewCategory);

  const regionOptions = useMemo(
    () =>
      Array.from(new Set(savedViews.map(getViewRegion).filter(Boolean))).sort((left, right) =>
        formatRegion(left).localeCompare(formatRegion(right), undefined, { sensitivity: 'base' }),
      ),
    [savedViews],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(savedViews.map(getViewCategory).filter(Boolean))).sort((left, right) =>
        formatCategory(left).localeCompare(formatCategory(right), undefined, {
          sensitivity: 'base',
        }),
      ),
    [savedViews],
  );

  const filteredSavedViews = useMemo(() => {
    const normalizedSearchText = normalizeSearchValue(searchText);

    return savedViews
      .filter((savedView) => {
        if (regionFilter !== 'ALL' && getViewRegion(savedView) !== regionFilter) {
          return false;
        }

        if (categoryFilter !== 'ALL' && getViewCategory(savedView) !== categoryFilter) {
          return false;
        }

        if (statusFilter === 'PINNED' && !savedView.pinned) {
          return false;
        }

        if (statusFilter === 'UNPINNED' && savedView.pinned) {
          return false;
        }

        if (!normalizedSearchText) {
          return true;
        }

        const searchableText = [
          getSavedViewLabel(savedView),
          savedView.note,
          savedView.viewKey,
          savedView.view?.description,
          getViewRegion(savedView),
          getViewCategory(savedView),
        ]
          .map(normalizeSearchValue)
          .join(' ');

        return searchableText.includes(normalizedSearchText);
      })
      .sort((left, right) => compareSavedViews(left, right, sortMode));
  }, [categoryFilter, regionFilter, savedViews, searchText, sortMode, statusFilter]);

  const filtersActive =
    searchText.trim() ||
    regionFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    sortMode !== 'priority';

  function resetFilters() {
    setSearchText('');
    setRegionFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setSortMode('priority');
  }

  function clearActionState() {
    setActionError(null);
    setActionNotice('');
  }

  async function handleRemoveSavedView(viewKey) {
    clearActionState();
    setUpdatingViewKey(viewKey);

    try {
      await removeSavedView(viewKey);
      setActionNotice('Saved macro view removed.');

      if (editingViewKey === viewKey) {
        setEditingViewKey(null);
        setDraftMetadata(null);
      }
    } catch (error) {
      setActionError(error);
    } finally {
      setUpdatingViewKey('');
    }
  }

  async function handlePinnedToggle(savedView) {
    clearActionState();
    setUpdatingViewKey(savedView.viewKey);

    try {
      const nextPinnedState = !savedView.pinned;
      await updateSavedView(savedView.viewKey, { pinned: nextPinnedState });
      setActionNotice(nextPinnedState ? 'Saved view pinned.' : 'Saved view unpinned.');
    } catch (error) {
      setActionError(error);
    } finally {
      setUpdatingViewKey('');
    }
  }

  function handleStartEdit(savedView) {
    clearActionState();
    setEditingViewKey(savedView.viewKey);
    setDraftMetadata(getDraftForSavedView(savedView));
  }

  function handleCancelEdit() {
    setEditingViewKey(null);
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
        note: draftMetadata?.note || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      });
      setEditingViewKey(null);
      setDraftMetadata(null);
      setActionNotice('Saved view metadata updated.');
    } catch (error) {
      setActionError(error);
    } finally {
      setUpdatingViewKey('');
    }
  }

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Member dashboard</div>
          <h1>{SKYWEB_PRODUCT_NAME} saved views</h1>
          <p>
            Your private SkyWeb Analytics watchlist now supports pinning, notes, ordering, filters,
            and sort controls for the macro views that matter most.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshSavedViews} type="button">
            Refresh saved views
          </button>
          <Link className="btn skyweb-btn-ghost" to="/dashboard">
            Open dashboard
          </Link>
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
          {actionNotice && (
            <div className="skyweb-profile-notice skyweb-detail-notice">{actionNotice}</div>
          )}

          {actionError && (
            <div className="skyweb-auth-alert skyweb-detail-notice">
              {actionError.message || 'Unable to update saved macro views.'}
            </div>
          )}

          <section className="skyweb-metric-grid skyweb-saved-metrics">
            <StatCard label="Saved views" value={savedViews.length} detail="Private watchlist" />
            <StatCard label="Pinned" value={pinnedCount} detail="Prioritized surfaces" />
            <StatCard label="Regions" value={regionCount} detail="Coverage groups" />
            <StatCard
              label="Visible"
              value={filteredSavedViews.length}
              detail={filtersActive ? 'After filters' : 'Current shelf'}
            />
          </section>

          {savedViews.length === 0 ? (
            <section className="skyweb-page-card skyweb-saved-empty-card">
              <div className="skyweb-card-kicker">Watchlist empty</div>
              <h2>No saved macro views yet</h2>
              <p>
                Open a macro view detail page and hit “Save view” to start building your private
                SkyWeb Analytics watchlist. This is the runway for saved dashboards and alert
                surfaces.
              </p>
              <Link className="btn skyweb-btn-primary" to="/macro/views">
                Choose first view
              </Link>
            </section>
          ) : (
            <>
              <section className="skyweb-page-card skyweb-saved-controls-card">
                <div>
                  <div className="skyweb-card-kicker">Saved view controls</div>
                  <h2>Shape the command shelf</h2>
                  <p>
                    Search, filter, and sort saved views. Pin the important surfaces, then use order
                    numbers and notes to make this shelf feel deliberate instead of just collected.
                  </p>
                </div>

                <div className="skyweb-saved-toolbar">
                  <label>
                    <span>Search</span>
                    <input
                      className="form-control"
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search saved views, notes, regions..."
                      type="search"
                      value={searchText}
                    />
                  </label>

                  <label>
                    <span>Region</span>
                    <select
                      className="form-select"
                      onChange={(event) => setRegionFilter(event.target.value)}
                      value={regionFilter}
                    >
                      <option value="ALL">All regions</option>
                      {regionOptions.map((region) => (
                        <option key={region} value={region}>
                          {formatRegion(region)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Category</span>
                    <select
                      className="form-select"
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      value={categoryFilter}
                    >
                      <option value="ALL">All categories</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {formatCategory(category)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Status</span>
                    <select
                      className="form-select"
                      onChange={(event) => setStatusFilter(event.target.value)}
                      value={statusFilter}
                    >
                      {STATUS_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Sort</span>
                    <select
                      className="form-select"
                      onChange={(event) => setSortMode(event.target.value)}
                      value={sortMode}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className="btn skyweb-btn-ghost skyweb-saved-reset-button"
                    disabled={!filtersActive}
                    onClick={resetFilters}
                    type="button"
                  >
                    Reset filters
                  </button>
                </div>
              </section>

              {filteredSavedViews.length === 0 ? (
                <section className="skyweb-page-card skyweb-saved-empty-card">
                  <div className="skyweb-card-kicker">No matches</div>
                  <h2>No saved views match those filters</h2>
                  <p>
                    The saved shelf still has {savedViews.length} item(s). Clear the filters to
                    bring the full lineup back.
                  </p>
                  <button className="btn skyweb-btn-primary" onClick={resetFilters} type="button">
                    Clear filters
                  </button>
                </section>
              ) : (
                <section className="skyweb-saved-view-stack">
                  {filteredSavedViews.map((savedView) => {
                    const editing = editingViewKey === savedView.viewKey;
                    const updating = updatingViewKey === savedView.viewKey;
                    const draftDirty = isDraftDirty(savedView, draftMetadata);

                    return (
                      <article className="skyweb-saved-view-row" key={savedView.viewKey}>
                        <div className="skyweb-saved-view-main">
                          {savedView.view ? (
                            <ViewCard
                              saved
                              view={{ ...savedView.view, label: getSavedViewLabel(savedView) }}
                            />
                          ) : (
                            <div className="skyweb-page-card">
                              <div className="skyweb-card-kicker">Saved view</div>
                              <h2>{getSavedViewLabel(savedView)}</h2>
                              <p>
                                This saved record exists, but the macro view metadata is not
                                currently available from SkyServer.
                              </p>
                            </div>
                          )}
                        </div>

                        <aside className="skyweb-saved-view-sidecar">
                          <div className="skyweb-saved-sidecar-topline">
                            <div>
                              <div className="skyweb-card-kicker">Saved metadata</div>
                              <h3>{getSavedViewLabel(savedView)}</h3>
                            </div>
                            {savedView.pinned ? (
                              <span className="skyweb-saved-pill">Pinned</span>
                            ) : (
                              <span className="skyweb-saved-pill skyweb-saved-pill-muted">
                                Unpinned
                              </span>
                            )}
                          </div>

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
                                {savedView.view?.category
                                  ? formatCategory(savedView.view.category)
                                  : '—'}
                              </dd>
                            </div>
                            <div>
                              <dt>Order</dt>
                              <dd>{savedView.sortOrder ?? 0}</dd>
                            </div>
                            <div>
                              <dt>Saved</dt>
                              <dd>
                                {savedView.createdAt ? formatDateTime(savedView.createdAt) : '—'}
                              </dd>
                            </div>
                            <div>
                              <dt>Updated</dt>
                              <dd>
                                {savedView.updatedAt ? formatDateTime(savedView.updatedAt) : '—'}
                              </dd>
                            </div>
                          </dl>

                          {editing ? (
                            <div className="skyweb-saved-editor">
                              <label>
                                <span>Custom label</span>
                                <input
                                  className="form-control"
                                  maxLength={160}
                                  onChange={(event) =>
                                    updateDraftField('displayLabel', event.target.value)
                                  }
                                  placeholder={savedView.view?.label || savedView.viewKey}
                                  value={draftMetadata?.displayLabel || ''}
                                />
                              </label>
                              <label>
                                <span>Note</span>
                                <textarea
                                  className="form-control"
                                  maxLength={800}
                                  onChange={(event) => updateDraftField('note', event.target.value)}
                                  placeholder="Add a private note about why this view matters."
                                  value={draftMetadata?.note || ''}
                                />
                              </label>
                              <label>
                                <span>Display order</span>
                                <input
                                  className="form-control"
                                  onChange={(event) =>
                                    updateDraftField('sortOrder', event.target.value)
                                  }
                                  step="1"
                                  type="number"
                                  value={draftMetadata?.sortOrder || '0'}
                                />
                              </label>
                              <div className="skyweb-saved-editor-actions">
                                <button
                                  className="btn skyweb-btn-ghost"
                                  disabled={updating}
                                  onClick={handleCancelEdit}
                                  type="button"
                                >
                                  Cancel
                                </button>
                                <button
                                  className="btn skyweb-btn-primary"
                                  disabled={updating || !draftDirty}
                                  onClick={() => handleSaveMetadata(savedView)}
                                  type="button"
                                >
                                  {updating ? 'Saving...' : 'Save metadata'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {savedView.note ? (
                                <p className="skyweb-saved-note">{savedView.note}</p>
                              ) : (
                                <p className="skyweb-saved-note skyweb-saved-note-muted">
                                  No saved note yet. Add one to capture the reason this view belongs
                                  on your shelf.
                                </p>
                              )}

                              <div className="skyweb-saved-actions">
                                <button
                                  className="btn skyweb-btn-ghost"
                                  disabled={updating}
                                  onClick={() => handlePinnedToggle(savedView)}
                                  type="button"
                                >
                                  {updating
                                    ? 'Updating...'
                                    : savedView.pinned
                                      ? 'Unpin view'
                                      : 'Pin view'}
                                </button>
                                <button
                                  className="btn skyweb-btn-ghost"
                                  disabled={updating}
                                  onClick={() => handleStartEdit(savedView)}
                                  type="button"
                                >
                                  Edit metadata
                                </button>
                                <button
                                  className="btn skyweb-btn-ghost"
                                  disabled={updating}
                                  onClick={() => handleRemoveSavedView(savedView.viewKey)}
                                  type="button"
                                >
                                  Remove saved view
                                </button>
                              </div>
                            </>
                          )}
                        </aside>
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
