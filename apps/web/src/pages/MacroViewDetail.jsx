import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import macroService from '../services/macroService.js';

function formatValue(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  return String(value);
}

function getColumnsFromRows(rows = []) {
  const firstRow = rows[0] || {};
  return Object.keys(firstRow);
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
      return columns.map((column) => column.columnName || column.name || column).slice(0, 10);
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
                      <span>{key}</span>
                      <strong>{formatValue(value)}</strong>
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
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={`${viewKey}-${rowIndex}`}>
                      {displayColumns.map((column) => (
                        <td key={column}>{formatValue(row[column])}</td>
                      ))}
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
