import { Link } from 'react-router-dom';
import StatCard from './StatCard.jsx';
import DashboardItemVisualization from './DashboardItemVisualization.jsx';
import { EmptyState } from './PageState.jsx';
import { getDashboardItemModeLabel, isRichDashboardItemMode } from '../constants/dashboardModes.js';
import { formatCategory, formatDateTime, formatRegion } from '../utils/formatters.js';

const DASHBOARD_LAYOUT_COLUMNS = {
  executive: 4,
  research: 6,
  compact: 6,
};

const MODE_MINIMUM_SIZE = {
  view_card: { width: 1, height: 1 },
  wide_card: { width: 2, height: 1 },
  compact_card: { width: 1, height: 1 },
  metric_card: { width: 1, height: 1 },
  mini_chart: { width: 2, height: 2 },
  latest_row: { width: 2, height: 1 },
  table_preview: { width: 2, height: 2 },
};

const RESEARCH_MODE_MINIMUM_WIDTH = {
  wide_card: 3,
  mini_chart: 3,
  table_preview: 3,
};

function countUniqueValues(items = [], getter) {
  return new Set(items.map(getter).filter(Boolean)).size;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function getItemRegion(item = {}) {
  if (item.view?.region) {
    return item.view.region;
  }

  return item.indicator?.source || '';
}

function getItemCategory(item = {}) {
  if (item.view?.category) {
    return item.view.category;
  }

  return item.indicator?.frequency || '';
}

function getTotalRows(items = []) {
  return items.reduce((sum, item) => {
    const rows = Number(
      item.view?.stats?.totalRows ??
        item.view?.totalRows ??
        item.indicator?.stats?.totalRows ??
        item.indicator?.totalRows ??
        0,
    );
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

function clampUnit(value, fallback = 1, max = 4) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(1, Math.min(max, Math.round(numericValue)));
}

function getLayoutColumnCount(layoutPreset = 'executive') {
  return DASHBOARD_LAYOUT_COLUMNS[layoutPreset] || DASHBOARD_LAYOUT_COLUMNS.executive;
}

function getDashboardItemSize(item = {}, layoutPreset = 'executive') {
  const mode = item.itemMode || 'view_card';
  const columnCount = getLayoutColumnCount(layoutPreset);
  const modeMinimum = MODE_MINIMUM_SIZE[mode] || MODE_MINIMUM_SIZE.view_card;
  const researchMinimumWidth =
    layoutPreset === 'research' ? RESEARCH_MODE_MINIMUM_WIDTH[mode] || 1 : 1;
  const widthMinimum = Math.max(modeMinimum.width, researchMinimumWidth);
  const width = Math.min(
    columnCount,
    Math.max(widthMinimum, clampUnit(item.widthUnits, modeMinimum.width, columnCount)),
  );
  const height = Math.max(modeMinimum.height, clampUnit(item.heightUnits, modeMinimum.height, 4));

  return {
    width,
    height,
    columnCount,
  };
}

function getDashboardItemStyle(item = {}, layoutPreset = 'executive') {
  const { width, height } = getDashboardItemSize(item, layoutPreset);
  const minHeight = Math.max(12, height * 9.5);

  return {
    gridColumn: `span ${width}`,
    gridRow: `span ${height}`,
    '--skyweb-dashboard-item-width': width,
    '--skyweb-dashboard-item-height': height,
    '--skyweb-dashboard-item-min-height': `${minHeight}rem`,
  };
}

export function getDashboardItemLabel(item = {}) {
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

function getDashboardItemClassName(item = {}, layoutPreset = 'executive') {
  const mode = item.itemMode || 'view_card';
  const { width, height } = getDashboardItemSize(item, layoutPreset);
  const isRichMode = isRichDashboardItemMode(mode);
  const showMeta = mode !== 'compact_card' && !(isRichMode && width <= 1 && height <= 1);

  return [
    'skyweb-dashboard-viewer-item',
    `skyweb-dashboard-viewer-item-${mode}`,
    `skyweb-dashboard-viewer-item-width-${width}`,
    `skyweb-dashboard-viewer-item-height-${height}`,
    isRichMode ? 'skyweb-dashboard-viewer-item-rich' : '',
    width <= 1 ? 'skyweb-dashboard-viewer-item-narrow' : '',
    width >= 2 ? 'skyweb-dashboard-viewer-item-wide' : '',
    width >= getLayoutColumnCount(layoutPreset) ? 'skyweb-dashboard-viewer-item-full' : '',
    height >= 2 ? 'skyweb-dashboard-viewer-item-tall' : '',
    showMeta ? '' : 'skyweb-dashboard-viewer-item-no-meta',
  ]
    .filter(Boolean)
    .join(' ');
}

function DashboardSurfaceItem({ item, layoutPreset }) {
  const label = getDashboardItemLabel(item);
  const isIndicator =
    item.itemSource === 'indicator' || Boolean(item.indicatorCode && !item.viewKey);
  const region = item.view?.region
    ? formatRegion(item.view.region)
    : item.indicator?.source || 'Unknown source';
  const category = item.view?.category
    ? formatCategory(item.view.category)
    : item.indicator?.frequency || 'Unknown frequency';
  const note = item.itemNote || item.savedNote || '';
  const mode = item.itemMode || 'view_card';
  const size = getDashboardItemSize(item, layoutPreset);
  const showMeta =
    mode !== 'compact_card' &&
    !(isRichDashboardItemMode(mode) && size.width <= 1 && size.height <= 1);

  return (
    <article
      className={getDashboardItemClassName(item, layoutPreset)}
      style={getDashboardItemStyle(item, layoutPreset)}
    >
      <div className="skyweb-dashboard-viewer-item-main">
        <DashboardItemVisualization item={item} />
      </div>

      {showMeta && (
        <aside className="skyweb-dashboard-viewer-item-meta">
          <div className="skyweb-card-kicker">Item context</div>
          <h3>{label}</h3>
          <dl className="skyweb-detail-list skyweb-dashboard-builder-detail-list">
            <div>
              <dt>{isIndicator ? 'Source' : 'Region'}</dt>
              <dd>{region}</dd>
            </div>
            <div>
              <dt>{isIndicator ? 'Frequency' : 'Category'}</dt>
              <dd>{category}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{getDashboardItemModeLabel(item.itemMode)}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>
                {size.width} × {size.height}
              </dd>
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
          {isIndicator && item.indicatorCode ? (
            <Link className="skyweb-card-link" to={`/macro/indicators/${item.indicatorCode}`}>
              Open indicator →
            </Link>
          ) : (
            item.viewKey && (
              <Link className="skyweb-card-link" to={`/macro/views/${item.viewKey}`}>
                Open macro view →
              </Link>
            )
          )}
        </aside>
      )}
    </article>
  );
}

export default function DashboardSurface({
  dashboard,
  emptyAction = null,
  hideHero = false,
  hideMetrics = false,
  hideSummary = false,
  presentationMode = false,
}) {
  const items = Array.isArray(dashboard?.items) ? dashboard.items : [];
  const rows = getTotalRows(items);
  const regionCount = countUniqueValues(items, getItemRegion);
  const categoryCount = countUniqueValues(items, getItemCategory);
  const noteCount = items.filter((item) => item.itemNote || item.savedNote).length;
  const layoutLabel = getLayoutLabel(dashboard?.layoutPreset);
  const layoutPreset = dashboard?.layoutPreset || 'executive';

  if (!dashboard) {
    return null;
  }

  const surfaceClassName = [
    'skyweb-dashboard-viewer-surface',
    `skyweb-dashboard-layout-${layoutPreset}`,
    presentationMode ? 'skyweb-dashboard-presentation-surface' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={surfaceClassName}>
      {!hideHero && (
        <div className="skyweb-dashboard-viewer-hero">
          <div>
            <div className="skyweb-card-kicker">{layoutLabel} dashboard</div>
            <h2>{dashboard.title}</h2>
            <p>{dashboard.description || 'No dashboard description yet.'}</p>
          </div>
          <div className="skyweb-dashboard-viewer-badges">
            {dashboard.isDefault && <span className="skyweb-saved-pill">Default</span>}
            <span className="skyweb-saved-pill skyweb-saved-pill-muted">
              {items.length} item(s)
            </span>
          </div>
        </div>
      )}

      {!hideMetrics && (
        <section className="skyweb-metric-grid skyweb-dashboard-viewer-metrics">
          <StatCard label="Items" value={items.length} detail="Dashboard blocks" />
          <StatCard
            label="Pinned"
            value={dashboard.pinnedItemCount || 0}
            detail="From saved shelf"
          />
          <StatCard label="Rows" value={formatCompactNumber(rows)} detail="Covered history" />
          <StatCard
            label="Lanes"
            value={`${regionCount}/${categoryCount}`}
            detail="Regions / categories"
          />
        </section>
      )}

      {presentationMode && (
        <section className="skyweb-dashboard-presentation-cover">
          <div>
            <div className="skyweb-card-kicker">Presentation canvas</div>
            <h3>{dashboard.title}</h3>
            <p>
              Screenshot-ready dashboard surface generated from direct indicators, optional saved
              macro views, dashboard item modes, and layout metadata.
            </p>
          </div>
          <dl className="skyweb-presentation-facts">
            <div>
              <dt>Layout</dt>
              <dd>{layoutLabel}</dd>
            </div>
            <div>
              <dt>Blocks</dt>
              <dd>{items.length}</dd>
            </div>
            <div>
              <dt>Rows</dt>
              <dd>{formatCompactNumber(rows)}</dd>
            </div>
          </dl>
        </section>
      )}

      {!hideSummary && (
        <section
          className={
            presentationMode
              ? 'skyweb-dashboard-viewer-summary skyweb-dashboard-presentation-summary'
              : 'skyweb-dashboard-viewer-summary'
          }
        >
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
      )}

      <section className="skyweb-dashboard-viewer-items">
        <div className="skyweb-section-heading">
          <div>
            <div className="skyweb-card-kicker">Dashboard view</div>
            <h2>Configured layout blocks</h2>
            <p className="skyweb-section-copy">
              Items are rendered by dashboard order, visualization mode, and width × height grid
              span.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState>
            This dashboard has no items yet. Add direct indicators or saved macro views from the
            builder to make it live.
            {emptyAction}
          </EmptyState>
        ) : (
          <div className="skyweb-dashboard-viewer-grid">
            {items.map((item) => (
              <DashboardSurfaceItem item={item} key={item.itemId} layoutPreset={layoutPreset} />
            ))}
          </div>
        )}
      </section>

      {presentationMode && (
        <footer className="skyweb-dashboard-presentation-footer">
          <span>SkyWeb Analytics</span>
          <span>{dashboard.dashboardKey}</span>
          <span>
            {dashboard.updatedAt
              ? `Updated ${formatDateTime(dashboard.updatedAt)}`
              : 'Live dashboard surface'}
          </span>
        </footer>
      )}
    </section>
  );
}
