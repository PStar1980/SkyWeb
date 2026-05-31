import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import ViewCard from '../components/ViewCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useDashboards } from '../context/DashboardsContext.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
import { formatCategory, formatDateTime, formatRegion } from '../utils/formatters.js';

const LAYOUT_OPTIONS = [
  {
    value: 'executive',
    label: 'Executive',
    description: 'Balanced board for high-signal overview cards.',
  },
  {
    value: 'research',
    label: 'Research',
    description: 'Roomier board for notes and deeper analysis.',
  },
  {
    value: 'compact',
    label: 'Compact',
    description: 'Dense board for quick scanning and many views.',
  },
];

const ITEM_MODE_OPTIONS = [
  { value: 'view_card', label: 'View card' },
  { value: 'wide_card', label: 'Wide card' },
  { value: 'compact_card', label: 'Compact card' },
];

const DEFAULT_DASHBOARD_DRAFT = {
  title: '',
  description: '',
  layoutPreset: 'executive',
  sortOrder: '0',
  isDefault: false,
};

const DEFAULT_ITEM_DRAFT = {
  viewKey: '',
  itemTitle: '',
  itemNote: '',
  itemMode: 'view_card',
  sortOrder: '0',
  widthUnits: '1',
  heightUnits: '1',
};

function getSavedViewLabel(savedView = {}) {
  return savedView.displayLabel || savedView.view?.label || savedView.viewKey || 'Saved view';
}

function getDashboardItemLabel(item = {}) {
  return (
    item.itemTitle || item.savedDisplayLabel || item.view?.label || item.viewKey || 'Dashboard item'
  );
}

function getTotalDashboardItems(dashboards = []) {
  return dashboards.reduce((sum, dashboard) => sum + (dashboard.items?.length || 0), 0);
}

function getLayoutLabel(layoutPreset = '') {
  return LAYOUT_OPTIONS.find((option) => option.value === layoutPreset)?.label || layoutPreset;
}

function getItemModeLabel(itemMode = '') {
  return ITEM_MODE_OPTIONS.find((option) => option.value === itemMode)?.label || itemMode;
}

function normalizeNumberDraft(value, fallback = '0') {
  const normalized = String(value ?? '').trim();
  return normalized === '' ? fallback : normalized;
}

function getDashboardDraft(dashboard = {}) {
  return {
    title: dashboard.title || '',
    description: dashboard.description || '',
    layoutPreset: dashboard.layoutPreset || 'executive',
    sortOrder: String(dashboard.sortOrder ?? 0),
  };
}

function getItemDraft(item = {}) {
  return {
    itemTitle: item.itemTitle || '',
    itemNote: item.itemNote || '',
    itemMode: item.itemMode || 'view_card',
    sortOrder: String(item.sortOrder ?? 0),
    widthUnits: String(item.widthUnits ?? 1),
    heightUnits: String(item.heightUnits ?? 1),
  };
}

function FormStatus({ error, message }) {
  if (!error && !message) {
    return null;
  }

  return (
    <div className={error ? 'skyweb-form-status skyweb-form-status-error' : 'skyweb-form-status'}>
      {error || message}
    </div>
  );
}

function DashboardCreateCard() {
  const { createDashboard } = useDashboards();
  const [draft, setDraft] = useState(DEFAULT_DASHBOARD_DRAFT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateDraft(fieldName, value) {
    setDraft((currentDraft) => ({ ...currentDraft, [fieldName]: value }));
    setMessage('');
    setError('');
  }

  async function handleCreateDashboard(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const dashboard = await createDashboard({
        title: draft.title,
        description: draft.description,
        layoutPreset: draft.layoutPreset,
        sortOrder: Number(normalizeNumberDraft(draft.sortOrder)),
        isDefault: draft.isDefault,
      });

      setDraft(DEFAULT_DASHBOARD_DRAFT);
      setMessage(`${dashboard.title} created.`);
    } catch (createError) {
      setError(createError.message || 'Unable to create dashboard.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="skyweb-page-card skyweb-dashboard-builder-create-card">
      <div>
        <div className="skyweb-card-kicker">Create dashboard</div>
        <h2>Start a configurable board</h2>
        <p>
          Dashboards are now first-class {SKYWEB_PRODUCT_NAME} objects. Create one, choose a layout,
          then add saved macro views as building blocks.
        </p>
      </div>

      <form className="skyweb-dashboard-builder-form" onSubmit={handleCreateDashboard}>
        <label>
          <span>Dashboard title</span>
          <input
            className="form-control"
            maxLength={160}
            onChange={(event) => updateDraft('title', event.target.value)}
            placeholder="Executive macro board"
            required
            value={draft.title}
          />
        </label>
        <label>
          <span>Layout preset</span>
          <select
            className="form-select"
            onChange={(event) => updateDraft('layoutPreset', event.target.value)}
            value={draft.layoutPreset}
          >
            {LAYOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Display order</span>
          <input
            className="form-control"
            onChange={(event) => updateDraft('sortOrder', event.target.value)}
            step="1"
            type="number"
            value={draft.sortOrder}
          />
        </label>
        <label className="skyweb-dashboard-builder-check-field">
          <input
            checked={draft.isDefault}
            onChange={(event) => updateDraft('isDefault', event.target.checked)}
            type="checkbox"
          />
          <span>Make default dashboard</span>
        </label>
        <label className="skyweb-dashboard-builder-wide-field">
          <span>Description</span>
          <textarea
            className="form-control"
            maxLength={800}
            onChange={(event) => updateDraft('description', event.target.value)}
            placeholder="What this board is meant to monitor."
            value={draft.description}
          />
        </label>
        <div className="skyweb-dashboard-builder-actions">
          <button
            className="btn skyweb-btn-primary"
            disabled={saving || !draft.title.trim()}
            type="submit"
          >
            {saving ? 'Creating...' : 'Create dashboard'}
          </button>
        </div>
        <FormStatus error={error} message={message} />
      </form>
    </section>
  );
}

function DashboardItemEditor({ dashboard, item, onCancel }) {
  const { updateDashboardItem } = useDashboards();
  const [draft, setDraft] = useState(getItemDraft(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateDraft(fieldName, value) {
    setDraft((currentDraft) => ({ ...currentDraft, [fieldName]: value }));
    setError('');
  }

  async function handleSaveItem() {
    setSaving(true);
    setError('');

    try {
      await updateDashboardItem(dashboard.dashboardKey, item.itemId, {
        itemTitle: draft.itemTitle,
        itemNote: draft.itemNote,
        itemMode: draft.itemMode,
        sortOrder: Number(normalizeNumberDraft(draft.sortOrder)),
        widthUnits: Number(normalizeNumberDraft(draft.widthUnits, '1')),
        heightUnits: Number(normalizeNumberDraft(draft.heightUnits, '1')),
      });
      onCancel();
    } catch (saveError) {
      setError(saveError.message || 'Unable to update dashboard item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="skyweb-dashboard-item-editor">
      <label>
        <span>Item title</span>
        <input
          className="form-control"
          maxLength={160}
          onChange={(event) => updateDraft('itemTitle', event.target.value)}
          placeholder={item.view?.label || item.viewKey}
          value={draft.itemTitle}
        />
      </label>
      <label>
        <span>Item note</span>
        <textarea
          className="form-control"
          maxLength={800}
          onChange={(event) => updateDraft('itemNote', event.target.value)}
          placeholder="Why this belongs on the board."
          value={draft.itemNote}
        />
      </label>
      <div className="skyweb-dashboard-builder-mini-grid">
        <label>
          <span>Mode</span>
          <select
            className="form-select"
            onChange={(event) => updateDraft('itemMode', event.target.value)}
            value={draft.itemMode}
          >
            {ITEM_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Order</span>
          <input
            className="form-control"
            onChange={(event) => updateDraft('sortOrder', event.target.value)}
            step="1"
            type="number"
            value={draft.sortOrder}
          />
        </label>
        <label>
          <span>Width</span>
          <input
            className="form-control"
            max="4"
            min="1"
            onChange={(event) => updateDraft('widthUnits', event.target.value)}
            type="number"
            value={draft.widthUnits}
          />
        </label>
        <label>
          <span>Height</span>
          <input
            className="form-control"
            max="4"
            min="1"
            onChange={(event) => updateDraft('heightUnits', event.target.value)}
            type="number"
            value={draft.heightUnits}
          />
        </label>
      </div>
      <div className="skyweb-dashboard-builder-actions">
        <button className="btn skyweb-btn-ghost" disabled={saving} onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="btn skyweb-btn-primary"
          disabled={saving}
          onClick={handleSaveItem}
          type="button"
        >
          {saving ? 'Saving...' : 'Save item'}
        </button>
      </div>
      <FormStatus error={error} />
    </div>
  );
}

function DashboardItemRow({ dashboard, item }) {
  const { removeDashboardItem } = useDashboards();
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  async function handleRemoveItem() {
    setUpdating(true);
    setError('');

    try {
      await removeDashboardItem(dashboard.dashboardKey, item.itemId);
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove dashboard item.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <article className="skyweb-dashboard-builder-item-row">
      <div className="skyweb-dashboard-builder-item-main">
        {item.view ? (
          <ViewCard
            compact={item.itemMode === 'compact_card'}
            saved
            view={{ ...item.view, label: getDashboardItemLabel(item) }}
          />
        ) : (
          <div className="skyweb-page-card">
            <div className="skyweb-card-kicker">Dashboard item</div>
            <h3>{getDashboardItemLabel(item)}</h3>
            <p>Macro view metadata is not currently available from SkyServer.</p>
          </div>
        )}
      </div>
      <aside className="skyweb-dashboard-builder-item-sidecar">
        <div className="skyweb-card-kicker">Item metadata</div>
        <h3>{getDashboardItemLabel(item)}</h3>
        <dl className="skyweb-detail-list skyweb-dashboard-builder-detail-list">
          <div>
            <dt>Mode</dt>
            <dd>{getItemModeLabel(item.itemMode)}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{item.sortOrder ?? 0}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>
              {item.widthUnits ?? 1} × {item.heightUnits ?? 1}
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{item.updatedAt ? formatDateTime(item.updatedAt) : '—'}</dd>
          </div>
        </dl>

        {editing ? (
          <DashboardItemEditor
            dashboard={dashboard}
            item={item}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {item.itemNote ? (
              <p className="skyweb-saved-note">{item.itemNote}</p>
            ) : (
              <p className="skyweb-saved-note skyweb-saved-note-muted">
                No dashboard-specific note yet.
              </p>
            )}
            <div className="skyweb-dashboard-builder-actions">
              <button
                className="btn skyweb-btn-ghost"
                disabled={updating}
                onClick={() => setEditing(true)}
                type="button"
              >
                Edit item
              </button>
              <button
                className="btn skyweb-btn-ghost"
                disabled={updating}
                onClick={handleRemoveItem}
                type="button"
              >
                {updating ? 'Removing...' : 'Remove item'}
              </button>
            </div>
            <FormStatus error={error} />
          </>
        )}
      </aside>
    </article>
  );
}

function DashboardCard({ dashboard, savedViews }) {
  const { addDashboardItem, removeDashboard, setDefaultDashboard, updateDashboard } =
    useDashboards();
  const [editingDashboard, setEditingDashboard] = useState(false);
  const [dashboardDraft, setDashboardDraft] = useState(getDashboardDraft(dashboard));
  const [itemDraft, setItemDraft] = useState(DEFAULT_ITEM_DRAFT);
  const [savingDashboard, setSavingDashboard] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [removingDashboard, setRemovingDashboard] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const existingViewKeys = useMemo(
    () => new Set((dashboard.items || []).map((item) => item.viewKey)),
    [dashboard.items],
  );

  const availableSavedViews = useMemo(
    () => savedViews.filter((savedView) => !existingViewKeys.has(savedView.viewKey)),
    [existingViewKeys, savedViews],
  );

  const selectedSavedView = availableSavedViews.find(
    (savedView) => savedView.viewKey === itemDraft.viewKey,
  );

  function updateDashboardDraft(fieldName, value) {
    setDashboardDraft((currentDraft) => ({ ...currentDraft, [fieldName]: value }));
    setMessage('');
    setError('');
  }

  function updateItemDraft(fieldName, value) {
    setItemDraft((currentDraft) => ({ ...currentDraft, [fieldName]: value }));
    setMessage('');
    setError('');
  }

  function handleEditDashboard() {
    setDashboardDraft(getDashboardDraft(dashboard));
    setEditingDashboard(true);
    setMessage('');
    setError('');
  }

  async function handleSaveDashboard() {
    setSavingDashboard(true);
    setMessage('');
    setError('');

    try {
      await updateDashboard(dashboard.dashboardKey, {
        title: dashboardDraft.title,
        description: dashboardDraft.description,
        layoutPreset: dashboardDraft.layoutPreset,
        sortOrder: Number(normalizeNumberDraft(dashboardDraft.sortOrder)),
      });
      setEditingDashboard(false);
      setMessage('Dashboard settings saved.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save dashboard settings.');
    } finally {
      setSavingDashboard(false);
    }
  }

  async function handleAddItem(event) {
    event.preventDefault();
    const viewKey = itemDraft.viewKey || availableSavedViews[0]?.viewKey || '';

    if (!viewKey) {
      setError('Save a macro view before adding dashboard items.');
      return;
    }

    setAddingItem(true);
    setMessage('');
    setError('');

    try {
      await addDashboardItem(dashboard.dashboardKey, {
        viewKey,
        itemTitle: itemDraft.itemTitle,
        itemNote: itemDraft.itemNote,
        itemMode: itemDraft.itemMode,
        sortOrder: Number(normalizeNumberDraft(itemDraft.sortOrder)),
        widthUnits: Number(normalizeNumberDraft(itemDraft.widthUnits, '1')),
        heightUnits: Number(normalizeNumberDraft(itemDraft.heightUnits, '1')),
      });
      setItemDraft(DEFAULT_ITEM_DRAFT);
      setMessage('Dashboard item added.');
    } catch (addError) {
      setError(addError.message || 'Unable to add dashboard item.');
    } finally {
      setAddingItem(false);
    }
  }

  async function handleSetDefaultDashboard() {
    setSettingDefault(true);
    setMessage('');
    setError('');

    try {
      await setDefaultDashboard(dashboard.dashboardKey);
      setMessage(`${dashboard.title} is now the default dashboard.`);
    } catch (defaultError) {
      setError(defaultError.message || 'Unable to set default dashboard.');
    } finally {
      setSettingDefault(false);
    }
  }

  async function handleRemoveDashboard() {
    const confirmed = window.confirm(`Remove dashboard "${dashboard.title}"?`);

    if (!confirmed) {
      return;
    }

    setRemovingDashboard(true);
    setMessage('');
    setError('');

    try {
      await removeDashboard(dashboard.dashboardKey);
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove dashboard.');
      setRemovingDashboard(false);
    }
  }

  return (
    <article
      className={`skyweb-page-card skyweb-dashboard-builder-card skyweb-dashboard-layout-${dashboard.layoutPreset}`}
    >
      <div className="skyweb-dashboard-builder-card-header">
        <div>
          <div className="skyweb-card-kicker">
            {getLayoutLabel(dashboard.layoutPreset)} dashboard
          </div>
          <h2>{dashboard.title}</h2>
          <p>{dashboard.description || 'No dashboard description yet.'}</p>
        </div>
        <div className="skyweb-dashboard-builder-badges">
          {dashboard.isDefault && <span className="skyweb-saved-pill">Default</span>}
          <span className="skyweb-saved-pill skyweb-saved-pill-muted">
            {dashboard.items?.length || 0} item(s)
          </span>
        </div>
      </div>

      <section className="skyweb-dashboard-builder-summary-grid">
        <StatCard label="Items" value={dashboard.items?.length || 0} detail="Dashboard blocks" />
        <StatCard label="Pinned" value={dashboard.pinnedItemCount || 0} detail="From saved shelf" />
        <StatCard label="Order" value={dashboard.sortOrder ?? 0} detail="Library position" />
        <StatCard
          label="Updated"
          value={dashboard.updatedAt ? formatDateTime(dashboard.updatedAt) : '—'}
          detail={dashboard.dashboardKey}
        />
      </section>

      {editingDashboard ? (
        <div className="skyweb-dashboard-builder-edit-card">
          <div className="skyweb-dashboard-builder-form">
            <label>
              <span>Dashboard title</span>
              <input
                className="form-control"
                maxLength={160}
                onChange={(event) => updateDashboardDraft('title', event.target.value)}
                value={dashboardDraft.title}
              />
            </label>
            <label>
              <span>Layout preset</span>
              <select
                className="form-select"
                onChange={(event) => updateDashboardDraft('layoutPreset', event.target.value)}
                value={dashboardDraft.layoutPreset}
              >
                {LAYOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Display order</span>
              <input
                className="form-control"
                onChange={(event) => updateDashboardDraft('sortOrder', event.target.value)}
                step="1"
                type="number"
                value={dashboardDraft.sortOrder}
              />
            </label>
            <label className="skyweb-dashboard-builder-wide-field">
              <span>Description</span>
              <textarea
                className="form-control"
                maxLength={800}
                onChange={(event) => updateDashboardDraft('description', event.target.value)}
                value={dashboardDraft.description}
              />
            </label>
          </div>
          <div className="skyweb-dashboard-builder-actions">
            <button
              className="btn skyweb-btn-ghost"
              disabled={savingDashboard}
              onClick={() => setEditingDashboard(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="btn skyweb-btn-primary"
              disabled={savingDashboard || !dashboardDraft.title.trim()}
              onClick={handleSaveDashboard}
              type="button"
            >
              {savingDashboard ? 'Saving...' : 'Save dashboard'}
            </button>
          </div>
        </div>
      ) : (
        <div className="skyweb-dashboard-builder-actions">
          <Link className="btn skyweb-btn-primary" to={`/dashboards/${dashboard.dashboardKey}`}>
            View dashboard
          </Link>
          {!dashboard.isDefault && (
            <button
              className="btn skyweb-btn-ghost"
              disabled={settingDefault}
              onClick={handleSetDefaultDashboard}
              type="button"
            >
              {settingDefault ? 'Setting...' : 'Set as default'}
            </button>
          )}
          <button className="btn skyweb-btn-ghost" onClick={handleEditDashboard} type="button">
            Edit dashboard
          </button>
          <button
            className="btn skyweb-btn-ghost"
            disabled={removingDashboard}
            onClick={handleRemoveDashboard}
            type="button"
          >
            {removingDashboard ? 'Removing...' : 'Remove dashboard'}
          </button>
        </div>
      )}

      <FormStatus error={error} message={message} />

      <section className="skyweb-dashboard-builder-add-card">
        <div>
          <div className="skyweb-card-kicker">Add saved view</div>
          <h3>Attach a saved macro surface</h3>
          <p>
            Dashboard items are built from saved macro views. This keeps the builder tied to your
            curated shelf instead of a loose pile of random widgets.
          </p>
        </div>
        {savedViews.length === 0 ? (
          <EmptyState>
            Save macro views first, then return here to compose them into dashboards.
          </EmptyState>
        ) : availableSavedViews.length === 0 ? (
          <EmptyState>Every saved view is already attached to this dashboard.</EmptyState>
        ) : (
          <form className="skyweb-dashboard-builder-form" onSubmit={handleAddItem}>
            <label className="skyweb-dashboard-builder-wide-field">
              <span>Saved view</span>
              <select
                className="form-select"
                onChange={(event) => updateItemDraft('viewKey', event.target.value)}
                value={itemDraft.viewKey || availableSavedViews[0]?.viewKey || ''}
              >
                {availableSavedViews.map((savedView) => (
                  <option key={savedView.viewKey} value={savedView.viewKey}>
                    {getSavedViewLabel(savedView)} · {formatRegion(savedView.view?.region)} ·{' '}
                    {formatCategory(savedView.view?.category)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Item title</span>
              <input
                className="form-control"
                maxLength={160}
                onChange={(event) => updateItemDraft('itemTitle', event.target.value)}
                placeholder={
                  selectedSavedView ? getSavedViewLabel(selectedSavedView) : 'Optional title'
                }
                value={itemDraft.itemTitle}
              />
            </label>
            <label>
              <span>Mode</span>
              <select
                className="form-select"
                onChange={(event) => updateItemDraft('itemMode', event.target.value)}
                value={itemDraft.itemMode}
              >
                {ITEM_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Order</span>
              <input
                className="form-control"
                onChange={(event) => updateItemDraft('sortOrder', event.target.value)}
                step="1"
                type="number"
                value={itemDraft.sortOrder}
              />
            </label>
            <label className="skyweb-dashboard-builder-wide-field">
              <span>Item note</span>
              <textarea
                className="form-control"
                maxLength={800}
                onChange={(event) => updateItemDraft('itemNote', event.target.value)}
                placeholder="Optional dashboard-specific note."
                value={itemDraft.itemNote}
              />
            </label>
            <div className="skyweb-dashboard-builder-actions">
              <button className="btn skyweb-btn-primary" disabled={addingItem} type="submit">
                {addingItem ? 'Adding...' : 'Add item'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="skyweb-dashboard-builder-items">
        <div className="skyweb-section-heading">
          <div>
            <div className="skyweb-card-kicker">Dashboard items</div>
            <h3>Current layout blocks</h3>
          </div>
        </div>
        {dashboard.items?.length > 0 ? (
          <div className="skyweb-dashboard-builder-item-stack">
            {dashboard.items.map((item) => (
              <DashboardItemRow dashboard={dashboard} item={item} key={item.itemId} />
            ))}
          </div>
        ) : (
          <EmptyState>Add a saved macro view to give this dashboard its first tile.</EmptyState>
        )}
      </section>
    </article>
  );
}

export default function DashboardBuilder() {
  const { dashboards, dashboardsError, loadingDashboards, refreshDashboards } = useDashboards();
  const { loadingSavedViews, savedViews, savedViewsError } = useSavedViews();

  const totalItems = getTotalDashboardItems(dashboards);
  const layoutCount = new Set(dashboards.map((dashboard) => dashboard.layoutPreset)).size;
  const loading = loadingDashboards || loadingSavedViews;
  const error = dashboardsError || savedViewsError;

  return (
    <>
      <header className="skyweb-page-header skyweb-dashboard-builder-header">
        <div>
          <div className="skyweb-kicker">Dashboard builder</div>
          <h1>Build dashboard surfaces</h1>
          <p>
            Phase 7.5 turns dashboard definitions into usable cockpit surfaces: set a default
            dashboard, open individual dashboard viewers, and keep the builder as the control room.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshDashboards} type="button">
            Refresh dashboards
          </button>
          <Link className="btn skyweb-btn-ghost" to="/saved">
            Manage saved views
          </Link>
          <Link className="btn skyweb-btn-primary" to="/dashboard">
            Open default dashboard
          </Link>
        </div>
      </header>

      {loading && <LoadingState>Loading dashboard builder...</LoadingState>}

      {!loading && error && (
        <ErrorState title="Dashboard builder unavailable.">
          {error.message || 'Unable to load dashboard builder data.'}
        </ErrorState>
      )}

      {!loading && !error && (
        <>
          <section className="skyweb-metric-grid skyweb-dashboard-builder-metrics">
            <StatCard label="Dashboards" value={dashboards.length} detail="Owned boards" />
            <StatCard label="Items" value={totalItems} detail="Saved-view blocks" />
            <StatCard label="Saved views" value={savedViews.length} detail="Available shelf" />
            <StatCard label="Layouts" value={layoutCount || 0} detail="Presets in use" />
          </section>

          <DashboardCreateCard />

          {dashboards.length === 0 ? (
            <section className="skyweb-page-card skyweb-dashboard-builder-empty-card">
              <div className="skyweb-card-kicker">No dashboards yet</div>
              <h2>Create the first dashboard object</h2>
              <p>
                Your pinned command board is live already. This builder creates reusable dashboard
                definitions on top of that saved-view shelf.
              </p>
              {savedViews.length === 0 && (
                <Link className="btn skyweb-btn-primary" to="/macro/views">
                  Save first macro view
                </Link>
              )}
            </section>
          ) : (
            <section className="skyweb-dashboard-builder-stack">
              {dashboards.map((dashboard) => (
                <DashboardCard
                  dashboard={dashboard}
                  key={dashboard.dashboardKey}
                  savedViews={savedViews}
                />
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}
