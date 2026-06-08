import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChartPanel from '../components/ChartPanel.jsx';
import StatCard from '../components/StatCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import authService from '../services/authService.js';
import macroService from '../services/macroService.js';
import {
  alertRuleMatchesIndicator,
  buildChartAlertOverlays,
} from '../components/charts/adapters/alertOverlayAdapter.js';
import { getDateRangeFromRows } from '../utils/charting.js';
import { formatCategory, formatDate, formatNumber, formatValue } from '../utils/formatters.js';

const TABLE_PAGE_SIZE = 50;
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

function getPageRows(rows = [], pageIndex = 0, pageSize = TABLE_PAGE_SIZE) {
  const safePageIndex = Math.max(0, pageIndex);
  const start = safePageIndex * pageSize;

  return rows.slice(start, start + pageSize);
}

function getPageCount(rows = [], pageSize = TABLE_PAGE_SIZE) {
  return Math.max(1, Math.ceil(rows.length / pageSize));
}

function getLatestPoint(rows = []) {
  return rows[0] || null;
}

export default function MacroIndicatorDetail() {
  const { indicatorCode } = useParams();
  const { isAuthenticated } = useAuth();
  const { preferences } = usePreferences();
  const [indicator, setIndicator] = useState(null);
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tablePage, setTablePage] = useState(0);
  const [alertOverlays, setAlertOverlays] = useState({ events: [], thresholds: [] });
  const [alertOverlayLoading, setAlertOverlayLoading] = useState(false);

  const tablePageCount = useMemo(() => getPageCount(rows), [rows]);
  const safeTablePage = Math.min(tablePage, tablePageCount - 1);
  const tableRows = useMemo(() => getPageRows(rows, safeTablePage), [rows, safeTablePage]);
  const tableStartRow = rows.length ? safeTablePage * TABLE_PAGE_SIZE + 1 : 0;
  const tableEndRow = rows.length ? tableStartRow + tableRows.length - 1 : 0;
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
          all: true,
          sort: 'desc',
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

  useEffect(() => {
    setTablePage(0);
  }, [indicatorCode, rows.length]);

  useEffect(() => {
    let active = true;

    async function loadAlertOverlays() {
      setAlertOverlays({ events: [], thresholds: [] });

      if (!isAuthenticated) {
        setAlertOverlayLoading(false);
        return;
      }

      setAlertOverlayLoading(true);

      try {
        const alertsPayload = await authService.listAlerts({
          active: 'true',
          targetType: 'indicator',
        });
        const matchingAlerts = (alertsPayload.items || []).filter((alertRule) =>
          alertRuleMatchesIndicator(alertRule, indicatorCode),
        );
        if (!matchingAlerts.length) {
          if (active) {
            setAlertOverlays({ events: [], thresholds: [] });
          }
          return;
        }

        const alertKeys = new Set(matchingAlerts.map((alertRule) => alertRule.alertKey));
        const eventEntries = await Promise.all(
          matchingAlerts.map(async (alertRule) => {
            const payload = await authService.listAlertEvents(alertRule.alertKey, { limit: 100 });
            return [alertRule.alertKey, payload.items || []];
          }),
        );
        const notificationsPayload = await authService.listAlertNotifications({
          limit: 100,
          status: 'all',
        });
        const notificationsByAlertKey = (notificationsPayload.items || []).reduce(
          (accumulator, notification) => {
            if (!alertKeys.has(notification.alertKey)) {
              return accumulator;
            }

            accumulator[notification.alertKey] = accumulator[notification.alertKey] || [];
            accumulator[notification.alertKey].push(notification);
            return accumulator;
          },
          {},
        );

        if (active) {
          setAlertOverlays(
            buildChartAlertOverlays({
              alertRules: matchingAlerts,
              eventsByAlertKey: Object.fromEntries(eventEntries),
              notificationsByAlertKey,
            }),
          );
        }
      } catch {
        if (active) {
          setAlertOverlays({ events: [], thresholds: [] });
        }
      } finally {
        if (active) {
          setAlertOverlayLoading(false);
        }
      }
    }

    loadAlertOverlays();

    return () => {
      active = false;
    };
  }, [indicatorCode, isAuthenticated]);

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
              label="History start"
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
            alertOverlayLoading={alertOverlayLoading}
            alertOverlays={alertOverlays}
            columns={SERIES_COLUMNS}
            defaultWindowSize={preferences.defaultChartWindow}
            rows={rows}
            title={`${indicator?.indicatorCode || indicatorCode} trend preview`}
          />

          <section className="skyweb-table-card">
            <div className="skyweb-table-header">
              <div>
                <div className="skyweb-card-kicker">Series rows</div>
                <h2>
                  Rows {formatNumber(tableStartRow)}-{formatNumber(tableEndRow)} of{' '}
                  {formatNumber(rows.length)}
                </h2>
                <p>
                  Showing 50 records at a time from the full loaded indicator history. Use Next and
                  Previous to inspect the complete source series.
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
                  {tableRows.map((row, rowIndex) => (
                    <tr
                      className={
                        safeTablePage === 0 && rowIndex === 0 ? 'skyweb-row-highlight' : undefined
                      }
                      key={`${indicatorCode}-${row.date || tableStartRow + rowIndex}`}
                    >
                      <td className="skyweb-table-date">{formatDate(row.date)}</td>
                      <td className="skyweb-number-cell">{formatValue(row.value, 'value')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tableRows.length === 0 && <EmptyState>No indicator rows returned.</EmptyState>}
            {rows.length > TABLE_PAGE_SIZE && (
              <div className="skyweb-table-pagination">
                <button
                  className="btn skyweb-btn-ghost"
                  disabled={safeTablePage === 0}
                  onClick={() => setTablePage((currentPage) => Math.max(0, currentPage - 1))}
                  type="button"
                >
                  Previous page
                </button>
                <span>
                  Page {formatNumber(safeTablePage + 1)} of {formatNumber(tablePageCount)}
                </span>
                <button
                  className="btn skyweb-btn-ghost"
                  disabled={safeTablePage >= tablePageCount - 1}
                  onClick={() =>
                    setTablePage((currentPage) => Math.min(tablePageCount - 1, currentPage + 1))
                  }
                  type="button"
                >
                  Next page
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
