import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import macroService from '../services/macroService.js';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

function isDateKey(key = '') {
  return String(key).toLowerCase().includes('date');
}

function parseDateOnly(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = parseDateOnly(value) || new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return dateFormatter.format(date);
}

function isNumericLike(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return false;
  }

  return /^-?\d+(\.\d+)?$/.test(trimmedValue);
}

function formatNumber(value) {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  return Number.isInteger(numberValue)
    ? numberValue.toLocaleString()
    : numberFormatter.format(numberValue);
}

function formatValue(value, key = '') {
  if (value === null || value === undefined) {
    return '—';
  }

  if (isDateKey(key)) {
    return formatDate(value);
  }

  if (isNumericLike(value)) {
    return formatNumber(value);
  }

  return String(value);
}

function formatColumnLabel(value = '') {
  const text = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  return text
    .split(' ')
    .map((word) => {
      const upperWord = word.toUpperCase();

      if (['GDP', 'CPI', 'PCE', 'YOY', 'CAD', 'USD', 'FX'].includes(upperWord)) {
        return upperWord;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

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

  useEffect(() => {
    let active = true;

    async function loadView() {
      setLoading(true);
      setError(null);

      try {
        const [rowsPayload, latestPayload, columnsPayload] = await Promise.all([
          macroService.getViewRows(viewKey, { limit: 25 }),
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

      {loading && <div className="skyweb-loading">Loading view data...</div>}
      {!loading && error && (
        <section className="skyweb-alert">
          <strong>View unavailable.</strong>
          <p>
            {error.status === 401 || error.status === 403
              ? 'SkyServer public macro API is unavailable. Confirm the API is running and /api/public/macro is mounted.'
              : error.message}
          </p>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="skyweb-card mb-4">
            <div className="skyweb-card-kicker">Latest row</div>
            {latest ? (
              <div className="skyweb-latest-grid">
                {Object.entries(latest)
                  .slice(0, 12)
                  .map(([key, value]) => (
                    <div className="skyweb-latest-item" key={key}>
                      <span>{formatColumnLabel(key)}</span>
                      <strong>{formatValue(value, key)}</strong>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="skyweb-empty">No latest row returned.</div>
            )}
          </section>

          <section className="skyweb-table-card">
            <div className="skyweb-table-header">
              <div>
                <div className="skyweb-card-kicker">Preview rows</div>
                <h2>First {rows.length} row(s)</h2>
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
                  {rows.map((row, rowIndex) => (
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
            {rows.length === 0 && <div className="skyweb-empty">No rows returned.</div>}
          </section>
        </>
      )}
    </>
  );
}
