import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChartPanel from '../components/ChartPanel.jsx';
import StatCard from '../components/StatCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import macroService from '../services/macroService.js';
import {
  formatColumnLabel,
  formatDate,
  formatNumber,
  formatValue,
  isDateKey,
} from '../utils/formatters.js';

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

function getPreviewRows(rows = [], limit = 25) {
  return rows.slice(0, limit);
}

export default function MacroViewDetail() {
  const { viewKey } = useParams();
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [latest, setLatest] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const displayColumns = useMemo(() => {
    if (columns.length > 0) {
      return columns.map(normalizeColumn).slice(0, 10);
    }

    return getColumnsFromRows(rows).slice(0, 10);
  }, [columns, rows]);

  const latestFields = useMemo(() => getLatestFields(latest), [latest]);
  const previewRows = useMemo(() => getPreviewRows(rows), [rows]);
  const stats = view?.stats || {};

  useEffect(() => {
    let active = true;

    async function loadView() {
      setLoading(true);
      setError(null);

      try {
        const [rowsPayload, latestPayload, columnsPayload] = await Promise.all([
          macroService.getViewRows(viewKey, { limit: 120 }),
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
        <Link className="btn skyweb-btn-ghost" to="/macro/views">
          Back to views
        </Link>
      </header>

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
            <StatCard
              label="Rows"
              value={stats.totalRows !== undefined ? formatNumber(stats.totalRows) : rows.length}
              detail="Historical records"
            />
            <StatCard
              label="Latest date"
              value={
                stats.maxDate
                  ? formatDate(stats.maxDate)
                  : latest?.date
                    ? formatDate(latest.date)
                    : '—'
              }
              detail="Newest public row"
            />
            <StatCard
              label="Earliest date"
              value={stats.minDate ? formatDate(stats.minDate) : '—'}
              detail="First available row"
            />
            <StatCard label="Fields" value={displayColumns.length} detail="Preview columns" />
          </section>

          <ChartPanel
            columns={columns}
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
                <h2>First {previewRows.length} row(s)</h2>
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
                    <tr key={`${viewKey}-${rowIndex}`}>
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
