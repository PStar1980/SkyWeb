import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import macroService from '../services/macroService.js';
import { getPreferredSeriesKey, getSeriesCatalog, summarizeSeries } from '../utils/charting.js';
import {
  formatColumnLabel,
  formatDate,
  formatNumber,
  formatRegion,
  formatValue,
  isDateKey,
} from '../utils/formatters.js';
import { normalizeDashboardItemMode } from '../constants/dashboardModes.js';
import Sparkline from './Sparkline.jsx';
import ViewCard from './ViewCard.jsx';

const MINI_CHART_LIMIT = 90;
const TABLE_PREVIEW_LIMIT = 5;
const TABLE_COLUMN_LIMIT = 5;
const LATEST_FIELD_LIMIT = 8;

function getDashboardItemLabel(item = {}) {
  return (
    item.itemTitle || item.savedDisplayLabel || item.view?.label || item.viewKey || 'Dashboard item'
  );
}

function getViewStats(item = {}) {
  return item.view?.stats || {};
}

function getCellValue(row = {}, key) {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const snakeKey = String(key).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  if (Object.prototype.hasOwnProperty.call(row, snakeKey)) {
    return row[snakeKey];
  }

  return null;
}

function getLatestFields(latest = {}, limit = LATEST_FIELD_LIMIT) {
  return Object.entries(latest || {})
    .filter(([key]) => !['createdAt', 'updatedAt'].includes(key))
    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
    .sort(([leftKey], [rightKey]) => {
      if (isDateKey(leftKey) && !isDateKey(rightKey)) {
        return -1;
      }

      if (!isDateKey(leftKey) && isDateKey(rightKey)) {
        return 1;
      }

      return leftKey.localeCompare(rightKey, undefined, { sensitivity: 'base' });
    })
    .slice(0, limit);
}

function getTableColumns(rows = []) {
  const firstRow = rows[0] || {};

  return Object.keys(firstRow)
    .filter((key) => !['createdAt', 'updatedAt'].includes(key))
    .sort((leftKey, rightKey) => {
      if (isDateKey(leftKey) && !isDateKey(rightKey)) {
        return -1;
      }

      if (!isDateKey(leftKey) && isDateKey(rightKey)) {
        return 1;
      }

      return leftKey.localeCompare(rightKey, undefined, { sensitivity: 'base' });
    })
    .slice(0, TABLE_COLUMN_LIMIT);
}

function useDashboardItemData(item, mode) {
  const viewKey = item?.viewKey;
  const [state, setState] = useState({
    loading: false,
    error: null,
    rows: [],
    latest: null,
  });

  useEffect(() => {
    let active = true;

    async function loadItemData() {
      if (
        !viewKey ||
        !['metric_card', 'mini_chart', 'latest_row', 'table_preview'].includes(mode)
      ) {
        setState({ loading: false, error: null, rows: [], latest: null });
        return;
      }

      setState((currentState) => ({ ...currentState, loading: true, error: null }));

      try {
        const needsRows = mode !== 'latest_row';
        const rowLimit = mode === 'table_preview' ? TABLE_PREVIEW_LIMIT : MINI_CHART_LIMIT;
        const [rowsPayload, latestPayload] = await Promise.all([
          needsRows
            ? macroService.getViewRows(viewKey, { limit: rowLimit })
            : Promise.resolve(null),
          macroService.getLatestViewRow(viewKey),
        ]);

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: null,
          rows: rowsPayload?.items || [],
          latest: latestPayload?.item || null,
        });
      } catch (error) {
        if (active) {
          setState({ loading: false, error, rows: [], latest: null });
        }
      }
    }

    loadItemData();

    return () => {
      active = false;
    };
  }, [mode, viewKey]);

  return state;
}

function DashboardItemShell({ item, children, eyebrow, title, meta = null }) {
  const label = title || getDashboardItemLabel(item);

  return (
    <article className="skyweb-dashboard-visual-card">
      <div className="skyweb-dashboard-visual-card-header">
        <div>
          <div className="skyweb-card-kicker">{eyebrow}</div>
          <h3>{label}</h3>
        </div>
        {item.viewKey && <span className="skyweb-saved-pill">Saved</span>}
      </div>
      {children}
      {meta && <div className="skyweb-dashboard-visual-meta-strip">{meta}</div>}
      {item.viewKey && (
        <Link className="skyweb-card-link" to={`/macro/views/${item.viewKey}`}>
          Open macro view →
        </Link>
      )}
    </article>
  );
}

function LoadingVisual({ item }) {
  return (
    <DashboardItemShell item={item} eyebrow="Loading data">
      <p className="skyweb-dashboard-visual-muted">Pulling the latest public macro surface...</p>
    </DashboardItemShell>
  );
}

function ErrorVisual({ item, error }) {
  return (
    <DashboardItemShell item={item} eyebrow="Visualization unavailable">
      <p className="skyweb-dashboard-visual-muted">
        {error?.message || 'Unable to load dashboard item data.'}
      </p>
    </DashboardItemShell>
  );
}

function MetricCardVisual({ item, rows }) {
  const catalog = useMemo(() => getSeriesCatalog(rows), [rows]);
  const preferredKey = useMemo(
    () => getPreferredSeriesKey(catalog.map((metric) => metric.key)),
    [catalog],
  );
  const metric =
    catalog.find((catalogItem) => catalogItem.key === preferredKey) || catalog[0] || null;
  const summary = useMemo(() => summarizeSeries(metric?.series || []), [metric]);

  if (!metric || !summary.latest) {
    const stats = getViewStats(item);
    const latestDate = stats.maxDate || item.view?.maxDate;

    return (
      <DashboardItemShell item={item} eyebrow="Metric card">
        <div className="skyweb-dashboard-metric-value">
          {stats.totalRows !== undefined ? formatNumber(stats.totalRows, { compact: true }) : '—'}
        </div>
        <p className="skyweb-dashboard-visual-muted">
          {latestDate
            ? `Latest public date: ${formatDate(latestDate)}`
            : 'No numeric metric found.'}
        </p>
      </DashboardItemShell>
    );
  }

  return (
    <DashboardItemShell
      item={item}
      eyebrow="Metric card"
      meta={
        <>
          <span>{metric.label}</span>
          <span>{summary.latest.label}</span>
        </>
      }
    >
      <div className="skyweb-dashboard-metric-value">{formatNumber(summary.latest.value)}</div>
      <div
        className={`skyweb-dashboard-metric-change skyweb-dashboard-metric-change-${summary.direction}`}
      >
        <span>
          {summary.direction === 'up'
            ? '↗ Rising'
            : summary.direction === 'down'
              ? '↘ Falling'
              : '→ Flat'}
        </span>
        <strong>{summary.change !== null ? formatNumber(summary.change) : '0'}</strong>
      </div>
    </DashboardItemShell>
  );
}

function MiniChartVisual({ item, rows }) {
  const catalog = useMemo(() => getSeriesCatalog(rows), [rows]);
  const preferredKey = useMemo(
    () => getPreferredSeriesKey(catalog.map((metric) => metric.key)),
    [catalog],
  );
  const metric =
    catalog.find((catalogItem) => catalogItem.key === preferredKey) || catalog[0] || null;
  const summary = useMemo(() => summarizeSeries(metric?.series || []), [metric]);

  if (!metric || !metric.series.length) {
    return (
      <DashboardItemShell item={item} eyebrow="Mini chart">
        <p className="skyweb-dashboard-visual-muted">
          No numeric series available for this view yet.
        </p>
      </DashboardItemShell>
    );
  }

  return (
    <DashboardItemShell
      item={item}
      eyebrow="Mini chart"
      meta={
        <>
          <span>{metric.label}</span>
          <span>{formatNumber(metric.series.length)} point(s)</span>
        </>
      }
    >
      <div className="skyweb-dashboard-mini-chart-stage">
        <Sparkline
          label={`${getDashboardItemLabel(item)} mini trend`}
          points={metric.series}
          tone={summary.direction}
        />
      </div>
      <div className="skyweb-dashboard-mini-chart-footer">
        <strong>{summary.latest ? formatNumber(summary.latest.value) : '—'}</strong>
        <span>{summary.latest?.label || 'Latest point'}</span>
      </div>
    </DashboardItemShell>
  );
}

function LatestRowVisual({ item, latest }) {
  const fields = getLatestFields(latest);

  return (
    <DashboardItemShell item={item} eyebrow="Latest row">
      {fields.length > 0 ? (
        <dl className="skyweb-dashboard-latest-row-grid">
          {fields.map(([key, value]) => (
            <div key={key}>
              <dt>{formatColumnLabel(key)}</dt>
              <dd>{formatValue(value, key)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="skyweb-dashboard-visual-muted">No latest row returned.</p>
      )}
    </DashboardItemShell>
  );
}

function TablePreviewVisual({ item, rows }) {
  const columns = getTableColumns(rows);

  return (
    <DashboardItemShell
      item={item}
      eyebrow="Table preview"
      meta={
        <>
          <span>{formatNumber(rows.length)} row(s)</span>
          <span>{formatNumber(columns.length)} field(s)</span>
        </>
      }
    >
      {rows.length > 0 && columns.length > 0 ? (
        <div className="table-responsive skyweb-dashboard-table-preview-wrap">
          <table className="table skyweb-table skyweb-dashboard-table-preview">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{formatColumnLabel(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${item.viewKey}-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column}>{formatValue(getCellValue(row, column), column)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="skyweb-dashboard-visual-muted">No preview rows returned.</p>
      )}
    </DashboardItemShell>
  );
}

export default function DashboardItemVisualization({ item }) {
  const mode = normalizeDashboardItemMode(item?.itemMode);
  const label = getDashboardItemLabel(item);
  const dataState = useDashboardItemData(item, mode);

  if (['view_card', 'wide_card', 'compact_card'].includes(mode)) {
    if (!item?.view) {
      return (
        <div className="skyweb-page-card skyweb-dashboard-viewer-missing-card">
          <div className="skyweb-card-kicker">Dashboard item</div>
          <h3>{label}</h3>
          <p>Macro view metadata is not currently available from SkyServer.</p>
        </div>
      );
    }

    return <ViewCard compact={mode === 'compact_card'} saved view={{ ...item.view, label }} />;
  }

  if (dataState.loading) {
    return <LoadingVisual item={item} />;
  }

  if (dataState.error) {
    return <ErrorVisual error={dataState.error} item={item} />;
  }

  if (mode === 'metric_card') {
    return <MetricCardVisual item={item} rows={dataState.rows} />;
  }

  if (mode === 'mini_chart') {
    return <MiniChartVisual item={item} rows={dataState.rows} />;
  }

  if (mode === 'latest_row') {
    return <LatestRowVisual item={item} latest={dataState.latest} />;
  }

  if (mode === 'table_preview') {
    return <TablePreviewVisual item={item} rows={dataState.rows} />;
  }

  return null;
}
