import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChartPanel from '../components/ChartPanel.jsx';
import StatCard from '../components/StatCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { useSavedViews } from '../context/SavedViewsContext.jsx';
import macroService from '../services/macroService.js';
import { getDateRangeFromRows } from '../utils/charting.js';
import {
  formatColumnLabel,
  formatDate,
  formatNumber,
  formatValue,
  isDateKey,
} from '../utils/formatters.js';

const CHART_ROW_LIMIT = 240;
const PREVIEW_ROW_LIMIT = 25;

function getColumnsFromRows(rows = []) {
  const firstRow = rows[0] || {};

  return Object.keys(firstRow).map((key) => ({
    key,
    label: formatColumnLabel(key),
  }));
}

function normalizeColumn(column) {
  if (typeof column === 'string') {
    return {
      key: column,
      label: formatColumnLabel(column),
      dataType: null,
    };
  }

  const fieldName = column.fieldName || column.name || column.columnName;
  const columnName = column.columnName || fieldName;

  return {
    key: fieldName,
    fallbackKey: columnName,
    label: formatColumnLabel(columnName),
    dataType: column.dataType || null,
  };
}

function getCellValue(row, column) {
  if (Object.prototype.hasOwnProperty.call(row, column.key)) {
    return row[column.key];
  }

  if (column.fallbackKey && Object.prototype.hasOwnProperty.call(row, column.fallbackKey)) {
    return row[column.fallbackKey];
  }

  return null;
}

function getCellClassName(column) {
  if (isDateKey(column.key) || isDateKey(column.fallbackKey)) {
    return 'skyweb-table-date';
  }

  if (['integer', 'numeric', 'decimal', 'double precision', 'real'].includes(column.dataType)) {
    return 'skyweb-number-cell';
  }

  return undefined;
}

function getLatestFields(latest = {}) {
  const safeLatest = latest || {};

  return Object.entries(safeLatest)
    .filter(([key]) => !['createdAt', 'updatedAt'].includes(key))
    .slice(0, 12);
}

function getPreviewRows(rows = [], limit = PREVIEW_ROW_LIMIT) {
  return rows.slice(0, limit);
}

export default function MacroViewDetail() {
  const { viewKey } = useParams();
  const { isAuthenticated } = useAuth();
  const { preferences } = usePreferences();
  const { isViewSaved, loadingSavedViews, removeSavedView, saveSavedView } = useSavedViews();
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [latest, setLatest] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [savingView, setSavingView] = useState(false);

  const displayColumns = useMemo(() => {
    if (columns.length > 0) {
      return columns.map(normalizeColumn).slice(0, 10);
    }

    return getColumnsFromRows(rows).slice(0, 10);
  }, [columns, rows]);

  const latestFields = useMemo(() => getLatestFields(latest), [latest]);
  const previewRows = useMemo(() => getPreviewRows(rows), [rows]);
  const loadedRange = useMemo(() => getDateRangeFromRows(rows), [rows]);
  const stats = view?.stats || {};
  const totalRows = stats.totalRows !== undefined ? stats.totalRows : rows.length;
  const latestDate = stats.maxDate || latest?.date || loadedRange.maxDate;
  const oldestLoadedDate = loadedRange.minDate;
  const saved = isViewSaved(viewKey);

  async function handleSaveToggle() {
    setSavingView(true);
    setSaveNotice('');
    setSaveError(null);

    try {
      if (saved) {
        await removeSavedView(viewKey);
        setSaveNotice('Removed from your saved macro views.');
      } else {
        await saveSavedView({
          viewKey,
          displayLabel: view?.label || viewKey,
          pinned: true,
        });
        setSaveNotice('Saved to your macro view watchlist.');
      }
    } catch (actionError) {
      setSaveError(actionError);
    } finally {
      setSavingView(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadView() {
      setLoading(true);
      setError(null);

      try {
        const [rowsPayload, latestPayload, columnsPayload] = await Promise.all([
          macroService.getViewRows(viewKey, { limit: CHART_ROW_LIMIT }),
          macroService.getLatestViewRow(viewKey),
          macroService.getViewColumns(viewKey),
        ]);

        if (!active) {
          return;
        }

        setRows(rowsPayload.items || []);
        setView(rowsPayload.view || latestPayload.view || columnsPayload.view || null);
        setLatest(latestPayload.item || null);
        setColumns(columnsPayload.columns || []);
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

    loadView();

    return () => {
      active = false;
    };
  }, [viewKey]);

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Macro view detail</div>
          <h1>{view?.label || viewKey}</h1>
          <p>{view?.description || 'Curated macro data preview.'}</p>
        </div>
        <div className="skyweb-header-actions">
          <Link className="btn skyweb-btn-ghost" to="/macro/views">
            Back to views
          </Link>
          {isAuthenticated ? (
            <button
              className={saved ? 'btn skyweb-btn-ghost' : 'btn skyweb-btn-primary'}
              disabled={savingView || loadingSavedViews || loading || Boolean(error)}
              onClick={handleSaveToggle}
              type="button"
            >
              {savingView ? 'Saving...' : saved ? 'Remove saved' : 'Save view'}
            </button>
          ) : (
            <Link className="btn skyweb-btn-primary" to="/login">
              Sign in to save
            </Link>
          )}
        </div>
      </header>

      {saveNotice && <div className="skyweb-profile-notice skyweb-detail-notice">{saveNotice}</div>}
      {saveError && (
        <div className="skyweb-auth-alert skyweb-detail-notice">
          {saveError.message || 'Unable to update your saved macro views.'}
        </div>
      )}

      {loading && <LoadingState>Loading view data...</LoadingState>}
      {!loading && error && (
        <ErrorState title="View unavailable.">
          {error.status === 401 || error.status === 403
            ? 'SkyServer public macro API is unavailable. Confirm the API is running and /api/public/macro is mounted.'
            : error.message}
        </ErrorState>
      )}

      {!loading && !error && (
        <>
          <section className="skyweb-metric-grid skyweb-detail-metrics">
            <StatCard label="Rows" value={formatNumber(totalRows)} detail="Historical records" />
            <StatCard
              label="Latest date"
              value={latestDate ? formatDate(latestDate) : '—'}
              detail="Newest public row"
            />
            <StatCard
              label="Loaded window"
              value={oldestLoadedDate ? formatDate(oldestLoadedDate) : '—'}
              detail={`Oldest of ${formatNumber(rows.length)} loaded row(s)`}
            />
            <StatCard label="Fields" value={displayColumns.length} detail="Preview columns" />
          </section>

          <ChartPanel
            columns={columns}
            defaultWindowSize={preferences.defaultChartWindow}
            rows={rows}
            title={`${view?.label || viewKey} trend preview`}
          />

          <section className="skyweb-card mb-4">
            <div className="skyweb-card-kicker">Latest row</div>
            {latestFields.length > 0 ? (
              <div className="skyweb-latest-grid">
                {latestFields.map(([key, value]) => (
                  <div className="skyweb-latest-item" key={key}>
                    <span>{formatColumnLabel(key)}</span>
                    <strong>{formatValue(value, key)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No latest row returned.</EmptyState>
            )}
          </section>

          <section className="skyweb-table-card">
            <div className="skyweb-table-header">
              <div>
                <div className="skyweb-card-kicker">Preview rows</div>
                <h2>Latest {previewRows.length} row(s)</h2>
                <p>
                  Showing the newest public records from the loaded chart window. The first row is
                  the latest observation.
                </p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table skyweb-table">
                <thead>
                  <tr>
                    {displayColumns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr
                      className={rowIndex === 0 ? 'skyweb-row-highlight' : undefined}
                      key={`${viewKey}-${rowIndex}`}
                    >
                      {displayColumns.map((column) => {
                        const value = getCellValue(row, column);

                        return (
                          <td className={getCellClassName(column)} key={column.key}>
                            {formatValue(value, column.key)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length === 0 && <EmptyState>No rows returned.</EmptyState>}
          </section>
        </>
      )}
    </>
  );
}
