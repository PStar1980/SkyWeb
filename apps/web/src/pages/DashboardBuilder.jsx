import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import DashboardItemVisualization from '../components/DashboardItemVisualization.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import {
  DASHBOARD_ITEM_MODE_OPTIONS,
  getDashboardItemModeLabel,
} from '../constants/dashboardModes.js';
import { useDashboards } from '../context/DashboardsContext.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
import macroService from '../services/macroService.js';
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

const INDICATOR_DASHBOARD_ITEM_MODES = new Set([
  'view_card',
  'wide_card',
  'compact_card',
  'metric_card',
  'mini_chart',
  'latest_row',
  'table_preview',
]);

const VIEW_DASHBOARD_ITEM_MODES = new Set([
  'view_card',
  'wide_card',
  'compact_card',
  'latest_row',
  'table_preview',
]);

function getModeOptionsForSource(itemSource = 'indicator', currentMode = '') {
  const allowedModes =
    itemSource === 'view' ? VIEW_DASHBOARD_ITEM_MODES : INDICATOR_DASHBOARD_ITEM_MODES;
  const options = DASHBOARD_ITEM_MODE_OPTIONS.filter((option) => allowedModes.has(option.value));

  if (currentMode && !allowedModes.has(currentMode)) {
    const legacyOption = DASHBOARD_ITEM_MODE_OPTIONS.find((option) => option.value === currentMode);

    if (legacyOption) {
      return [
        ...options,
        { ...legacyOption, label: `${legacyOption.label} (legacy lens summary)` },
      ];
    }
  }

  return options;
}

const DEFAULT_DASHBOARD_DRAFT = {
  title: '',
  description: '',
  layoutPreset: 'executive',
  sortOrder: '0',
  isDefault: false,
};

const DEFAULT_ITEM_DRAFT = {
  itemSource: 'indicator',
  viewKey: '',
  indicatorCode: '',
  itemTitle: '',
  itemNote: '',
  itemMode: 'mini_chart',
  sortOrder: '0',
  widthUnits: '2',
  heightUnits: '2',
};

const SIZE_PRESETS = [
  {
    label: '1 × 1',
    widthUnits: '1',
    heightUnits: '1',
    description: 'Single tile',
  },
  {
    label: '2 × 1',
    widthUnits: '2',
    heightUnits: '1',
    description: 'Wide strip',
  },
  {
    label: '2 × 2',
    widthUnits: '2',
    heightUnits: '2',
    description: 'Chart block',
  },
  {
    label: '3 × 1',
    widthUnits: '3',
    heightUnits: '1',
    description: 'Executive lane',
  },
  {
    label: '4 × 2',
    widthUnits: '4',
    heightUnits: '2',
    description: 'Full board panel',
  },
];

const MODE_RECOMMENDED_SIZE = {
  view_card: { widthUnits: '1', heightUnits: '1' },
  wide_card: { widthUnits: '2', heightUnits: '1' },
  compact_card: { widthUnits: '1', heightUnits: '1' },
  metric_card: { widthUnits: '1', heightUnits: '1' },
  mini_chart: { widthUnits: '2', heightUnits: '2' },
  latest_row: { widthUnits: '2', heightUnits: '1' },
  table_preview: { widthUnits: '2', heightUnits: '2' },
};

function getSavedViewLabel(savedView = {}) {
  return savedView.displayLabel || savedView.view?.label || savedView.viewKey || 'Saved view';
}

function getIndicatorLabel(indicator = {}) {
  return indicator.description || indicator.indicatorCode || 'Indicator';
}

function getDashboardItemLabel(item = {}) {
  return (
    item.itemTitle ||
    item.savedDisplayLabel ||
    item.view?.label ||
    item.indicator?.description ||
    item.indicatorCode ||
    item.viewKey ||
    'Dashboard item'
  );
}

function getTotalDashboardItems(dashboards = []) {
  return dashboards.reduce((sum, dashboard) => sum + (dashboard.items?.length || 0), 0);
}

function getLayoutLabel(layoutPreset = '') {
  return LAYOUT_OPTIONS.find((option) => option.value === layoutPreset)?.label || layoutPreset;
}

function normalizeNumberDraft(value, fallback = '0') {
  const normalized = String(value ?? '').trim();
  return normalized === '' ? fallback : normalized;
}

function clampUnitDraft(value, fallback = '1') {
  const numericValue = Number(normalizeNumberDraft(value, fallback));

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return String(Math.max(1, Math.min(4, Math.round(numericValue))));
}

function getRecommendedSizeForMode(itemMode = 'view_card') {
  return MODE_RECOMMENDED_SIZE[itemMode] || MODE_RECOMMENDED_SIZE.view_card;
}

function getSizeDescription(widthUnits, heightUnits) {
  const width = clampUnitDraft(widthUnits);
  const height = clampUnitDraft(heightUnits);

  if (width === '1' && height === '1') {
    return 'Small monitoring tile for compact metrics or simple saved-view cards.';
  }

  if (width === '2' && height === '1') {
    return 'Wide strip for row panels, wide cards, or compact cross-view context.';
  }

  if (width === '2' && height === '2') {
    return 'Roomy chart/table block for richer visual modes.';
  }

  if (width === '3' && height === '1') {
    return 'Executive lane that stretches across most of the board.';
  }

  if (width === '4' && height === '2') {
    return 'Full-width presentation panel for headline dashboard blocks.';
  }

  return `${width} column(s) × ${height} row(s) in the dashboard grid.`;
}

function SizePresetControls({ heightUnits, onSelect, widthUnits }) {
  const activeKey = `${clampUnitDraft(widthUnits)}x${clampUnitDraft(heightUnits)}`;

  return (
    <div className="skyweb-dashboard-size-helper">
      <div>
        <strong>
          Size: {clampUnitDraft(widthUnits)} × {clampUnitDraft(heightUnits)}
        </strong>
        <span>{getSizeDescription(widthUnits, heightUnits)}</span>
      </div>
      <div className="skyweb-dashboard-size-preset-list" aria-label="Dashboard item size presets">
        {SIZE_PRESETS.map((preset) => {
          const presetKey = `${preset.widthUnits}x${preset.heightUnits}`;
          return (
            <button
              className={
                presetKey === activeKey
                  ? 'skyweb-dashboard-size-preset skyweb-dashboard-size-preset-active'
                  : 'skyweb-dashboard-size-preset'
              }
              key={presetKey}
              onClick={() => onSelect(preset)}
              type="button"
            >
              <span>{preset.label}</span>
              <small>{preset.description}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
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
    setDraft((currentDraft) => {
      if (fieldName === 'itemMode') {
        const recommendedSize = getRecommendedSizeForMode(value);
        const shouldApplyRecommendedSize =
          currentDraft.widthUnits === '1' && currentDraft.heightUnits === '1';

        return {
          ...currentDraft,
          itemMode: value,
          ...(shouldApplyRecommendedSize ? recommendedSize : {}),
        };
      }

      if (fieldName === 'widthUnits' || fieldName === 'heightUnits') {
        return { ...currentDraft, [fieldName]: clampUnitDraft(value) };
      }

      return { ...currentDraft, [fieldName]: value };
    });
    setError('');
  }

  function applySizePreset(preset) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      widthUnits: preset.widthUnits,
      heightUnits: preset.heightUnits,
    }));
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
        widthUnits: Number(clampUnitDraft(draft.widthUnits)),
        heightUnits: Number(clampUnitDraft(draft.heightUnits)),
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
          placeholder={
            item.view?.label || item.indicator?.description || item.indicatorCode || item.viewKey
          }
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
            {getModeOptionsForSource(item.itemSource, draft.itemMode).map((option) => (
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
          <span>Width units</span>
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
          <span>Height units</span>
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
      <SizePresetControls
        heightUnits={draft.heightUnits}
        onSelect={applySizePreset}
        widthUnits={draft.widthUnits}
      />
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

function getDashboardItemSourceLabel(item = {}) {
  return item.itemSource === 'indicator' || Boolean(item.indicatorCode && !item.viewKey)
    ? 'Indicator'
    : 'Saved view';
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
        <DashboardItemVisualization item={item} />
      </div>
      <aside className="skyweb-dashboard-builder-item-sidecar">
        <div className="skyweb-card-kicker">Item metadata</div>
        <h3>{getDashboardItemLabel(item)}</h3>
        <dl className="skyweb-detail-list skyweb-dashboard-builder-detail-list">
          <div>
            <dt>Source</dt>
            <dd>{getDashboardItemSourceLabel(item)}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{getDashboardItemModeLabel(item.itemMode)}</dd>
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
        <p className="skyweb-dashboard-size-hint-card">
          Viewer span: {item.widthUnits ?? 1} column(s) × {item.heightUnits ?? 1} row(s). Layout
          presets use this to shape the final dashboard grid.
        </p>

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

function DashboardCard({ dashboard, indicators, savedViews }) {
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
    () =>
      new Set(
        (dashboard.items || [])
          .filter((item) => item.itemSource !== 'indicator')
          .map((item) => item.viewKey),
      ),
    [dashboard.items],
  );

  const existingIndicatorCodes = useMemo(
    () =>
      new Set(
        (dashboard.items || [])
          .filter((item) => item.itemSource === 'indicator' || item.indicatorCode)
          .map((item) => item.indicatorCode),
      ),
    [dashboard.items],
  );

  const availableSavedViews = useMemo(
    () => savedViews.filter((savedView) => !existingViewKeys.has(savedView.viewKey)),
    [existingViewKeys, savedViews],
  );

  const availableIndicators = useMemo(
    () => indicators.filter((indicator) => !existingIndicatorCodes.has(indicator.indicatorCode)),
    [existingIndicatorCodes, indicators],
  );

  const selectedSavedView = availableSavedViews.find(
    (savedView) => savedView.viewKey === itemDraft.viewKey,
  );
  const selectedIndicator = availableIndicators.find(
    (indicator) => indicator.indicatorCode === itemDraft.indicatorCode,
  );

  function updateDashboardDraft(fieldName, value) {
    setDashboardDraft((currentDraft) => ({ ...currentDraft, [fieldName]: value }));
    setMessage('');
    setError('');
  }

  function updateItemDraft(fieldName, value) {
    setItemDraft((currentDraft) => {
      if (fieldName === 'itemSource') {
        const nextSource = value === 'view' ? 'view' : 'indicator';
        const nextMode = nextSource === 'indicator' ? 'mini_chart' : 'view_card';
        const recommendedSize = getRecommendedSizeForMode(nextMode);

        return {
          ...currentDraft,
          itemSource: nextSource,
          viewKey: '',
          indicatorCode: '',
          itemMode: nextMode,
          ...recommendedSize,
        };
      }

      if (fieldName === 'itemMode') {
        const recommendedSize = getRecommendedSizeForMode(value);
        const shouldApplyRecommendedSize =
          currentDraft.widthUnits === '1' && currentDraft.heightUnits === '1';

        return {
          ...currentDraft,
          itemMode: value,
          ...(shouldApplyRecommendedSize ? recommendedSize : {}),
        };
      }

      if (fieldName === 'widthUnits' || fieldName === 'heightUnits') {
        return { ...currentDraft, [fieldName]: clampUnitDraft(value) };
      }

      return { ...currentDraft, [fieldName]: value };
    });
    setMessage('');
    setError('');
  }

  function applyItemSizePreset(preset) {
    setItemDraft((currentDraft) => ({
      ...currentDraft,
      widthUnits: preset.widthUnits,
      heightUnits: preset.heightUnits,
    }));
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
    const itemSource = itemDraft.itemSource === 'view' ? 'view' : 'indicator';
    const viewKey =
      itemSource === 'view' ? itemDraft.viewKey || availableSavedViews[0]?.viewKey || '' : '';
    const indicatorCode =
      itemSource === 'indicator'
        ? itemDraft.indicatorCode || availableIndicators[0]?.indicatorCode || ''
        : '';

    if (itemSource === 'view' && !viewKey) {
      setError('Save a macro view before adding a saved-view dashboard item.');
      return;
    }

    if (itemSource === 'indicator' && !indicatorCode) {
      setError('Select an indicator before adding an indicator dashboard item.');
      return;
    }

    setAddingItem(true);
    setMessage('');
    setError('');

    try {
      await addDashboardItem(dashboard.dashboardKey, {
        itemSource,
        viewKey: itemSource === 'view' ? viewKey : undefined,
        indicatorCode: itemSource === 'indicator' ? indicatorCode : undefined,
        itemTitle: itemDraft.itemTitle,
        itemNote: itemDraft.itemNote,
        itemMode: itemDraft.itemMode,
        sortOrder: Number(normalizeNumberDraft(itemDraft.sortOrder)),
        widthUnits: Number(clampUnitDraft(itemDraft.widthUnits)),
        heightUnits: Number(clampUnitDraft(itemDraft.heightUnits)),
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
          <Link
            className="btn skyweb-btn-ghost"
            to={`/dashboards/${dashboard.dashboardKey}/presentation`}
          >
            Presentation view
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
          <div className="skyweb-card-kicker">Add dashboard item</div>
          <h3>Attach an indicator or saved macro surface</h3>
          <p>
            Standard chart cards now bind directly to one indicator time series. Saved macro views
            still work for broader context cards, but they are no longer required for simple chart
            dashboard items.
          </p>
        </div>
        {indicators.length === 0 && savedViews.length === 0 ? (
          <EmptyState>Macro indicators are not available yet.</EmptyState>
        ) : (
          <form className="skyweb-dashboard-builder-form" onSubmit={handleAddItem}>
            <label>
              <span>Source type</span>
              <select
                className="form-select"
                onChange={(event) => updateItemDraft('itemSource', event.target.value)}
                value={itemDraft.itemSource}
              >
                <option value="indicator">Indicator time series</option>
                <option value="view">Saved macro view</option>
              </select>
            </label>
            {itemDraft.itemSource === 'indicator' ? (
              availableIndicators.length === 0 ? (
                <div className="skyweb-dashboard-builder-wide-field">
                  <EmptyState>Every indicator is already attached to this dashboard.</EmptyState>
                </div>
              ) : (
                <label className="skyweb-dashboard-builder-wide-field">
                  <span>Indicator</span>
                  <select
                    className="form-select"
                    onChange={(event) => updateItemDraft('indicatorCode', event.target.value)}
                    value={itemDraft.indicatorCode || availableIndicators[0]?.indicatorCode || ''}
                  >
                    {availableIndicators.map((indicator) => (
                      <option key={indicator.indicatorCode} value={indicator.indicatorCode}>
                        {indicator.indicatorCode} · {getIndicatorLabel(indicator)} ·{' '}
                        {indicator.source} · {indicator.frequency}
                      </option>
                    ))}
                  </select>
                </label>
              )
            ) : savedViews.length === 0 ? (
              <div className="skyweb-dashboard-builder-wide-field">
                <EmptyState>
                  Save macro views first, then return here to compose them into dashboards.
                </EmptyState>
              </div>
            ) : availableSavedViews.length === 0 ? (
              <div className="skyweb-dashboard-builder-wide-field">
                <EmptyState>Every saved view is already attached to this dashboard.</EmptyState>
              </div>
            ) : (
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
            )}
            <label>
              <span>Item title</span>
              <input
                className="form-control"
                maxLength={160}
                onChange={(event) => updateItemDraft('itemTitle', event.target.value)}
                placeholder={
                  itemDraft.itemSource === 'indicator'
                    ? selectedIndicator
                      ? getIndicatorLabel(selectedIndicator)
                      : 'Optional indicator title'
                    : selectedSavedView
                      ? getSavedViewLabel(selectedSavedView)
                      : 'Optional title'
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
                {getModeOptionsForSource(itemDraft.itemSource, itemDraft.itemMode).map((option) => (
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
            <label>
              <span>Width units</span>
              <input
                className="form-control"
                max="4"
                min="1"
                onChange={(event) => updateItemDraft('widthUnits', event.target.value)}
                type="number"
                value={itemDraft.widthUnits}
              />
            </label>
            <label>
              <span>Height units</span>
              <input
                className="form-control"
                max="4"
                min="1"
                onChange={(event) => updateItemDraft('heightUnits', event.target.value)}
                type="number"
                value={itemDraft.heightUnits}
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
            <SizePresetControls
              heightUnits={itemDraft.heightUnits}
              onSelect={applyItemSizePreset}
              widthUnits={itemDraft.widthUnits}
            />
            <div className="skyweb-dashboard-builder-actions">
              <button
                className="btn skyweb-btn-primary"
                disabled={
                  addingItem ||
                  (itemDraft.itemSource === 'indicator' && availableIndicators.length === 0) ||
                  (itemDraft.itemSource === 'view' && availableSavedViews.length === 0)
                }
                type="submit"
              >
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
          <EmptyState>
            Add an indicator or saved macro view to give this dashboard its first tile.
          </EmptyState>
        )}
      </section>
    </article>
  );
}

export default function DashboardBuilder() {
  const { dashboards, dashboardsError, loadingDashboards, refreshDashboards } = useDashboards();
  const { loadingSavedViews, savedViews, savedViewsError } = useSavedViews();
  const [indicators, setIndicators] = useState([]);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [indicatorsError, setIndicatorsError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadIndicators() {
      setLoadingIndicators(true);
      setIndicatorsError(null);

      try {
        const payload = await macroService.listIndicators({ limit: 500 });

        if (active) {
          setIndicators(payload.items || []);
        }
      } catch (error) {
        if (active) {
          setIndicatorsError(error);
        }
      } finally {
        if (active) {
          setLoadingIndicators(false);
        }
      }
    }

    loadIndicators();

    return () => {
      active = false;
    };
  }, []);

  const totalItems = getTotalDashboardItems(dashboards);
  const layoutCount = new Set(dashboards.map((dashboard) => dashboard.layoutPreset)).size;
  const loading = loadingDashboards || loadingSavedViews || loadingIndicators;
  const error = dashboardsError || savedViewsError || indicatorsError;

  return (
    <>
      <header className="skyweb-page-header skyweb-dashboard-builder-header">
        <div>
          <div className="skyweb-kicker">Dashboard builder</div>
          <h1>Build dashboard surfaces</h1>
          <p>
            Build reusable dashboard definitions from direct indicator time series first, then add
            saved macro views when you want broader context cards.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshDashboards} type="button">
            Refresh dashboards
          </button>
          <Link className="btn skyweb-btn-ghost" to="/macro/views?status=SAVED">
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
            <StatCard label="Items" value={totalItems} detail="Dashboard blocks" />
            <StatCard label="Indicators" value={indicators.length} detail="Available series" />
            <StatCard label="Layouts" value={layoutCount || 0} detail="Presets in use" />
          </section>

          <DashboardCreateCard />

          {dashboards.length === 0 ? (
            <section className="skyweb-page-card skyweb-dashboard-builder-empty-card">
              <div className="skyweb-card-kicker">No dashboards yet</div>
              <h2>Create the first dashboard object</h2>
              <p>
                Your pinned command board is live already. This builder creates reusable dashboard
                definitions from direct indicators and optional saved-view context cards.
              </p>
              <Link className="btn skyweb-btn-primary" to="/macro/indicators">
                Browse indicators
              </Link>
            </section>
          ) : (
            <section className="skyweb-dashboard-builder-stack">
              {dashboards.map((dashboard) => (
                <DashboardCard
                  dashboard={dashboard}
                  key={dashboard.dashboardKey}
                  indicators={indicators}
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
