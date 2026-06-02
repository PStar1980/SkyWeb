import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChartPanel from '../components/ChartPanel.jsx';
import StatCard from '../components/StatCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import macroService from '../services/macroService.js';
import { getDateRangeFromRows } from '../utils/charting.js';
import { formatCategory, formatDate, formatNumber, formatValue } from '../utils/formatters.js';

const SERIES_ROW_LIMIT = 1000;
const PREVIEW_ROW_LIMIT = 50;
const SERIES_COLUMNS = [
  {
    columnName: 'date',
    fieldName: 'date',
    dataType: 'date',
  },
  {
    columnName: 'value',
    fieldName: 'value',
    dataType: 'numeric',
  },
];

function getPreviewRows(rows = [], limit = PREVIEW_ROW_LIMIT) {
  return rows.slice(0, limit);
}

function getLatestPoint(rows = []) {
  return rows[0] || null;
}

export default function MacroIndicatorDetail() {
  const { indicatorCode } = useParams();
  const { preferences } = usePreferences();
  const [indicator, setIndicator] = useState(null);
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const previewRows = useMemo(() => getPreviewRows(rows), [rows]);
  const loadedRange = useMemo(() => getDateRangeFromRows(rows), [rows]);
  const latestPoint = useMemo(() => getLatestPoint(rows), [rows]);
  const loadedStartDate = loadedRange.minDate || stats?.minDate;
  const latestDate = stats?.maxDate || latestPoint?.date || loadedRange.maxDate;
  const totalRows = stats?.totalRows ?? total ?? rows.length;
  const title = indicator?.description || indicatorCode;

  useEffect(() => {
    let active = true;

    async function loadIndicator() {
      setLoading(true);
      setError(null);

      try {
        const payload = await macroService.getIndicatorSeries(indicatorCode, {
          limit: SERIES_ROW_LIMIT,
        });

        if (!active) {
          return;
        }

        setIndicator(payload.indicator || null);
        setStats(payload.stats || null);
        setRows(payload.items || []);
        setTotal(payload.total || 0);
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

    loadIndicator();

    return () => {
      active = false;
    };
  }, [indicatorCode]);

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Macro indicator detail</div>
          <h1>{indicator?.indicatorCode || indicatorCode}</h1>
          <p>{indicator?.description || 'Source indicator time series.'}</p>
        </div>
        <div className="skyweb-header-actions">
          <Link className="btn skyweb-btn-ghost" to="/macro/indicators">
            Back to indicators
          </Link>
        </div>
      </header>

      {loading && <LoadingState>Loading indicator data...</LoadingState>}
      {!loading && error && (
        <ErrorState title="Indicator unavailable.">
          {error.status === 401 || error.status === 403
            ? 'SkyServer public indicator access is unavailable. Confirm the API is running and /api/public/macro is mounted.'
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
              detail="Newest public point"
            />
            <StatCard
              label="Loaded window"
              value={loadedStartDate ? formatDate(loadedStartDate) : '—'}
              detail={`Oldest of ${formatNumber(rows.length)} loaded point(s)`}
            />
            <StatCard
              label="Frequency"
              value={indicator?.frequency ? formatCategory(indicator.frequency) : '—'}
              detail={indicator?.source ? `${indicator.source} source series` : 'Source series'}
            />
          </section>

          <section className="skyweb-card skyweb-indicator-context-panel mb-4">
            <div className="skyweb-card-kicker">Indicator context</div>
            <div className="skyweb-indicator-context-grid">
              <div>
                <h2>{title}</h2>
                <p>
                  This source series can be used directly for chart review or as an input behind one
                  or more curated macro views.
                </p>
              </div>
              <dl className="skyweb-detail-list skyweb-indicator-detail-list">
                <div>
                  <dt>Indicator</dt>
                  <dd className="skyweb-mono">{indicator?.indicatorCode || indicatorCode}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{indicator?.source || '—'}</dd>
                </div>
                <div>
                  <dt>Latest value</dt>
                  <dd>{latestPoint ? formatValue(latestPoint.value, 'value') : '—'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{indicator?.active === false ? 'Inactive' : 'Active'}</dd>
                </div>
              </dl>
            </div>
          </section>

          <ChartPanel
            columns={SERIES_COLUMNS}
            defaultWindowSize={preferences.defaultChartWindow}
            rows={rows}
            title={`${indicator?.indicatorCode || indicatorCode} trend preview`}
          />

          <section className="skyweb-table-card">
            <div className="skyweb-table-header">
              <div>
                <div className="skyweb-card-kicker">Series rows</div>
                <h2>Latest {previewRows.length} point(s)</h2>
                <p>
                  Showing the newest public observations from the loaded indicator series. The first
                  row is the latest point.
                </p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table skyweb-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr
                      className={rowIndex === 0 ? 'skyweb-row-highlight' : undefined}
                      key={`${indicatorCode}-${row.date || rowIndex}`}
                    >
                      <td className="skyweb-table-date">{formatDate(row.date)}</td>
                      <td className="skyweb-number-cell">{formatValue(row.value, 'value')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length === 0 && <EmptyState>No indicator rows returned.</EmptyState>}
          </section>
        </>
      )}
    </>
  );
}
