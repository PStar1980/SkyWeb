import { Link } from 'react-router-dom';
import StatCard from './StatCard.jsx';
import DashboardItemVisualization from './DashboardItemVisualization.jsx';
import { EmptyState } from './PageState.jsx';
import { getDashboardItemModeLabel, isRichDashboardItemMode } from '../constants/dashboardModes.js';
import { formatCategory, formatDateTime, formatRegion } from '../utils/formatters.js';

function countUniqueValues(items = [], getter) {
  return new Set(items.map(getter).filter(Boolean)).size;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function getViewRegion(item = {}) {
  return item.view?.region || '';
}

function getViewCategory(item = {}) {
  return item.view?.category || '';
}

function getTotalRows(items = []) {
  return items.reduce((sum, item) => {
    const rows = Number(item.view?.stats?.totalRows ?? item.view?.totalRows ?? 0);
    return Number.isFinite(rows) ? sum + rows : sum;
  }, 0);
}

function getLayoutLabel(layoutPreset = '') {
  const labels = {
    executive: 'Executive',
    research: 'Research',
    compact: 'Compact',
  };

  return labels[layoutPreset] || layoutPreset || 'Dashboard';
}

export function getDashboardItemLabel(item = {}) {
  return (
    item.itemTitle || item.savedDisplayLabel || item.view?.label || item.viewKey || 'Dashboard item'
  );
}

function getDashboardItemClassName(item = {}) {
  const mode = item.itemMode || 'view_card';
  const width = Number.isFinite(Number(item.widthUnits)) ? Number(item.widthUnits) : 1;

  return [
    'skyweb-dashboard-viewer-item',
    `skyweb-dashboard-viewer-item-${mode}`,
    isRichDashboardItemMode(mode) ? 'skyweb-dashboard-viewer-item-rich' : '',
    mode === 'wide_card' || width >= 2 ? 'skyweb-dashboard-viewer-item-wide' : '',
    width >= 3 ? 'skyweb-dashboard-viewer-item-full' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function DashboardSurfaceItem({ item }) {
  const label = getDashboardItemLabel(item);
  const region = item.view?.region ? formatRegion(item.view.region) : 'Unknown region';
  const category = item.view?.category ? formatCategory(item.view.category) : 'Unknown category';
  const note = item.itemNote || item.savedNote || '';

  return (
    <article className={getDashboardItemClassName(item)}>
      <div className="skyweb-dashboard-viewer-item-main">
        <DashboardItemVisualization item={item} />
      </div>

      <aside className="skyweb-dashboard-viewer-item-meta">
        <div className="skyweb-card-kicker">Item context</div>
        <h3>{label}</h3>
        <dl className="skyweb-detail-list skyweb-dashboard-builder-detail-list">
          <div>
            <dt>Region</dt>
            <dd>{region}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{category}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{getDashboardItemModeLabel(item.itemMode)}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{item.sortOrder ?? 0}</dd>
          </div>
        </dl>
        {note ? (
          <p className="skyweb-saved-note">{note}</p>
        ) : (
          <p className="skyweb-saved-note skyweb-saved-note-muted">
            No dashboard-specific note yet.
          </p>
        )}
        {item.viewKey && (
          <Link className="skyweb-card-link" to={`/macro/views/${item.viewKey}`}>
            Open macro view →
          </Link>
        )}
      </aside>
    </article>
  );
}

export default function DashboardSurface({ dashboard, emptyAction = null }) {
  const items = Array.isArray(dashboard?.items) ? dashboard.items : [];
  const rows = getTotalRows(items);
  const regionCount = countUniqueValues(items, getViewRegion);
  const categoryCount = countUniqueValues(items, getViewCategory);
  const noteCount = items.filter((item) => item.itemNote || item.savedNote).length;
  const layoutLabel = getLayoutLabel(dashboard?.layoutPreset);

  if (!dashboard) {
    return null;
  }

  return (
    <section
      className={`skyweb-dashboard-viewer-surface skyweb-dashboard-layout-${dashboard.layoutPreset}`}
    >
      <div className="skyweb-dashboard-viewer-hero">
        <div>
          <div className="skyweb-card-kicker">{layoutLabel} dashboard</div>
          <h2>{dashboard.title}</h2>
          <p>{dashboard.description || 'No dashboard description yet.'}</p>
        </div>
        <div className="skyweb-dashboard-viewer-badges">
          {dashboard.isDefault && <span className="skyweb-saved-pill">Default</span>}
          <span className="skyweb-saved-pill skyweb-saved-pill-muted">{items.length} item(s)</span>
        </div>
      </div>

      <section className="skyweb-metric-grid skyweb-dashboard-viewer-metrics">
        <StatCard label="Items" value={items.length} detail="Dashboard blocks" />
        <StatCard label="Pinned" value={dashboard.pinnedItemCount || 0} detail="From saved shelf" />
        <StatCard label="Rows" value={formatCompactNumber(rows)} detail="Covered history" />
        <StatCard
          label="Lanes"
          value={`${regionCount}/${categoryCount}`}
          detail="Regions / categories"
        />
      </section>

      <section className="skyweb-dashboard-viewer-summary">
        <dl className="skyweb-detail-list skyweb-dashboard-detail-list">
          <div>
            <dt>Dashboard key</dt>
            <dd>{dashboard.dashboardKey}</dd>
          </div>
          <div>
            <dt>Layout</dt>
            <dd>{layoutLabel}</dd>
          </div>
          <div>
            <dt>Notes</dt>
            <dd>{noteCount}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{dashboard.updatedAt ? formatDateTime(dashboard.updatedAt) : '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="skyweb-dashboard-viewer-items">
        <div className="skyweb-section-heading">
          <div>
            <div className="skyweb-card-kicker">Dashboard view</div>
            <h2>Configured layout blocks</h2>
            <p className="skyweb-section-copy">
              Items are rendered from this dashboard definition and ordered by dashboard metadata.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState>
            This dashboard has no items yet. Add saved macro views from the builder to make it live.
            {emptyAction}
          </EmptyState>
        ) : (
          <div className="skyweb-dashboard-viewer-grid">
            {items.map((item) => (
              <DashboardSurfaceItem item={item} key={item.itemId} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
