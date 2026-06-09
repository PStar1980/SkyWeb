import { useEffect, useMemo, useState } from 'react';
import { normalizeChartPeriodPreference } from '../context/PreferencesContext.jsx';
import {
  countAlertOverlayParts,
  filterAlertOverlaysByMetricKeys,
  filterAlertOverlaysByMode,
  hasAlertOverlays,
} from './charts/adapters/alertOverlayAdapter.js';
import { getPreferredSeriesKey, getSeriesCatalog, summarizeSeries } from '../utils/charting.js';
import { formatNumber } from '../utils/formatters.js';
import MetricQuickCard from './MetricQuickCard.jsx';
import MultiSeriesSparkline from './MultiSeriesSparkline.jsx';
import Sparkline from './Sparkline.jsx';

const PERIOD_OPTIONS = [
  { label: '1yr', value: '1Y', years: 1 },
  { label: '3yr', value: '3Y', years: 3 },
  { label: '5yr', value: '5Y', years: 5 },
  { label: '7yr', value: '7Y', years: 7 },
  { label: '10yr', value: '10Y', years: 10 },
  { label: 'Max', value: 'MAX', years: null },
];

const PERIOD_YEARS = new Map(PERIOD_OPTIONS.map((option) => [option.value, option.years]));
const DEFAULT_MULTI_SERIES_COUNT = 3;
const MAX_MULTI_SERIES_COUNT = 5;
const MULTI_SERIES_PICKER_LIMIT = 12;
const DEFAULT_ALERT_OVERLAY_MODE = 'thresholds';
const ALERT_OVERLAY_MODE_OPTIONS = [
  { label: 'Thresholds', value: 'thresholds' },
  { label: 'Thresholds + events', value: 'events' },
  { label: 'Off', value: 'off' },
];

function getDefaultSelectedKeys(catalog = []) {
  return catalog
    .slice(0, DEFAULT_MULTI_SERIES_COUNT)
    .map((item) => item.key)
    .filter(Boolean);
}

function getPointTime(point = {}) {
  if (!point.date) {
    return null;
  }

  const date = new Date(point.date);
  const time = date.getTime();

  return Number.isNaN(time) ? null : time;
}

function getLatestSeriesDate(seriesList = []) {
  const times = seriesList
    .flatMap((series) => series || [])
    .map(getPointTime)
    .filter((time) => Number.isFinite(time));

  if (!times.length) {
    return null;
  }

  return new Date(Math.max(...times));
}

function subtractYears(date, years) {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() - years);
  return nextDate;
}

function formatOverlayCount(value, noun) {
  return `${formatNumber(value)} ${noun}${value === 1 ? '' : 's'}`;
}

function getPeriodedSeries(series = [], periodKey = '3Y', latestDate = null) {
  const normalizedPeriod = normalizeChartPeriodPreference(periodKey);
  const years = PERIOD_YEARS.get(normalizedPeriod);

  if (!years) {
    return series;
  }

  const anchorDate = latestDate || getLatestSeriesDate([series]);

  if (!anchorDate) {
    return series;
  }

  const startDate = subtractYears(anchorDate, years);
  const startTime = startDate.getTime();
  const filteredSeries = series.filter((point) => {
    const pointTime = getPointTime(point);
    return pointTime === null || pointTime >= startTime;
  });

  return filteredSeries.length ? filteredSeries : series.slice(-1);
}

export default function ChartPanel({
  alertOverlayLoading = false,
  alertOverlays = {},
  rows = [],
  columns = [],
  title = 'Trend preview',
  defaultWindowSize = '3Y',
  multiSeries = false,
}) {
  const initialPeriod = useMemo(
    () => normalizeChartPeriodPreference(defaultWindowSize),
    [defaultWindowSize],
  );
  const catalog = useMemo(() => getSeriesCatalog(rows, columns), [rows, columns]);
  const seriesKeys = useMemo(() => catalog.map((item) => item.key), [catalog]);
  const preferredKey = useMemo(() => getPreferredSeriesKey(seriesKeys), [seriesKeys]);
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [period, setPeriod] = useState(initialPeriod);
  const [alertOverlayMode, setAlertOverlayMode] = useState(DEFAULT_ALERT_OVERLAY_MODE);
  const activeKey = seriesKeys.includes(selectedKey) ? selectedKey : preferredKey;
  const activeMetric = catalog.find((item) => item.key === activeKey) || catalog[0] || null;
  const safeSelectedKeys = useMemo(() => {
    const validKeys = selectedKeys.filter((key) => seriesKeys.includes(key));

    return validKeys.length ? validKeys : getDefaultSelectedKeys(catalog);
  }, [catalog, selectedKeys, seriesKeys]);
  const selectedMetrics = useMemo(
    () => safeSelectedKeys.map((key) => catalog.find((item) => item.key === key)).filter(Boolean),
    [catalog, safeSelectedKeys],
  );
  const latestSelectedDate = useMemo(
    () => getLatestSeriesDate(selectedMetrics.map((metric) => metric.series || [])),
    [selectedMetrics],
  );
  const displaySeries = useMemo(() => {
    if (!activeMetric?.series) {
      return [];
    }

    return getPeriodedSeries(activeMetric.series, period);
  }, [activeMetric, period]);
  const multiDisplaySeries = useMemo(
    () =>
      selectedMetrics.map((metric) => {
        const points = getPeriodedSeries(metric.series, period, latestSelectedDate);

        return {
          key: metric.key,
          label: metric.label,
          points,
          summary: summarizeSeries(points),
        };
      }),
    [latestSelectedDate, period, selectedMetrics],
  );
  const summary = useMemo(() => summarizeSeries(displaySeries), [displaySeries]);
  const selectedLabel = activeMetric?.label || 'Metric';
  const hasMultipleMetricChoices = catalog.length > 1;
  const quickMetrics = catalog.slice(0, multiSeries ? MULTI_SERIES_PICKER_LIMIT : 6);
  const firstMultiPoint = multiDisplaySeries
    .flatMap((series) => series.points)
    .sort(
      (left, right) => new Date(left.date || 0).getTime() - new Date(right.date || 0).getTime(),
    )[0];
  const lastMultiPoint = multiDisplaySeries
    .flatMap((series) => series.points)
    .sort((left, right) => new Date(left.date || 0).getTime() - new Date(right.date || 0).getTime())
    .at(-1);
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'Max';
  const selectedOverlayMetricKeys = useMemo(
    () => (multiSeries ? safeSelectedKeys : [activeKey]),
    [activeKey, multiSeries, safeSelectedKeys],
  );
  const metricAlertOverlays = useMemo(
    () => filterAlertOverlaysByMetricKeys(alertOverlays, selectedOverlayMetricKeys),
    [alertOverlays, selectedOverlayMetricKeys],
  );
  const alertOverlaysAvailable = hasAlertOverlays(metricAlertOverlays);
  const visibleAlertOverlays = useMemo(
    () => filterAlertOverlaysByMode(metricAlertOverlays, alertOverlayMode),
    [alertOverlayMode, metricAlertOverlays],
  );
  const availableAlertOverlayParts = countAlertOverlayParts(metricAlertOverlays);
  const visibleAlertOverlayParts = countAlertOverlayParts(visibleAlertOverlays);

  function toggleSeriesKey(key) {
    setSelectedKeys((currentKeys) => {
      if (currentKeys.includes(key)) {
        const nextKeys = currentKeys.filter((currentKey) => currentKey !== key);
        return nextKeys.length ? nextKeys : [key];
      }

      if (currentKeys.length >= MAX_MULTI_SERIES_COUNT) {
        return [...currentKeys.slice(1), key];
      }

      return [...currentKeys, key];
    });
  }

  useEffect(() => {
    setPeriod(initialPeriod);
  }, [initialPeriod]);

  useEffect(() => {
    if (!alertOverlaysAvailable) {
      setAlertOverlayMode(DEFAULT_ALERT_OVERLAY_MODE);
    }
  }, [alertOverlaysAvailable]);

  useEffect(() => {
    if (!multiSeries || !catalog.length) {
      return;
    }

    setSelectedKeys((currentKeys) => {
      const validKeys = currentKeys.filter((key) => seriesKeys.includes(key));

      return validKeys.length ? validKeys : getDefaultSelectedKeys(catalog);
    });
  }, [catalog, multiSeries, seriesKeys]);

  if (!catalog.length) {
    return null;
  }

  return (
    <section className={`skyweb-chart-panel${multiSeries ? ' skyweb-chart-panel-multi' : ''}`}>
      <div className="skyweb-chart-header">
        <div>
          <div className="skyweb-card-kicker">
            {multiSeries ? 'Analytical lens chart' : 'Trend surface'}
          </div>
          <h2>{title}</h2>
          <p>
            {multiSeries
              ? 'Select one or more numeric columns from this grouped view to compare related series before using the table for row-level exploration.'
              : 'Select a metric, compare recent movement, and pair the chart with the latest public row before diving into the preview table.'}
          </p>
        </div>
        <div className="skyweb-chart-controls">
          {!multiSeries && hasMultipleMetricChoices && (
            <label className="skyweb-chart-picker">
              <span>Metric</span>
              <select
                className="form-select"
                onChange={(event) => setSelectedKey(event.target.value)}
                value={activeKey}
              >
                {catalog.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="skyweb-chart-picker skyweb-chart-window-picker">
            <span>Period</span>
            <select
              className="form-select"
              onChange={(event) => setPeriod(normalizeChartPeriodPreference(event.target.value))}
              value={period}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {alertOverlaysAvailable && (
            <label className="skyweb-chart-picker skyweb-chart-overlay-picker">
              <span>Alerts</span>
              <select
                className="form-select"
                onChange={(event) => setAlertOverlayMode(event.target.value)}
                value={alertOverlayMode}
              >
                {ALERT_OVERLAY_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {multiSeries ? (
        <div className="skyweb-series-picker-panel">
          <div className="skyweb-series-picker-heading">
            <div>
              <span>Series picker</span>
              <strong>{safeSelectedKeys.length} selected</strong>
            </div>
            <small>Choose up to {MAX_MULTI_SERIES_COUNT} columns for this view chart.</small>
          </div>
          <div className="skyweb-series-picker-grid">
            {quickMetrics.map((metric) => {
              const checked = safeSelectedKeys.includes(metric.key);

              return (
                <button
                  className={`skyweb-series-toggle${checked ? ' active' : ''}`}
                  key={metric.key}
                  onClick={() => toggleSeriesKey(metric.key)}
                  type="button"
                >
                  <span aria-hidden="true" className="skyweb-series-toggle-box">
                    {checked ? '✓' : '+'}
                  </span>
                  <span>{metric.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : hasMultipleMetricChoices ? (
        <div className="skyweb-metric-option-grid">
          {quickMetrics.map((metric) => (
            <MetricQuickCard
              active={metric.key === activeKey}
              key={metric.key}
              metric={metric}
              onSelect={setSelectedKey}
            />
          ))}
        </div>
      ) : null}

      <div className="skyweb-chart-meta-strip">
        {multiSeries ? (
          <>
            <span>{formatNumber(safeSelectedKeys.length)} selected series</span>
            <span>{selectedPeriodLabel} period</span>
            <span>
              {formatNumber(
                Math.max(...multiDisplaySeries.map((series) => series.points.length), 0),
              )}{' '}
              max plotted point(s)
            </span>
            <span>
              {firstMultiPoint?.label || '—'} → {lastMultiPoint?.label || '—'}
            </span>
            {alertOverlayLoading && <span>Loading alert overlays</span>}
            {alertOverlaysAvailable && (
              <>
                {visibleAlertOverlayParts.thresholds > 0 && (
                  <span>
                    {formatOverlayCount(visibleAlertOverlayParts.thresholds, 'threshold')}
                  </span>
                )}
                {alertOverlayMode === 'events' && visibleAlertOverlayParts.events > 0 && (
                  <span>{formatOverlayCount(visibleAlertOverlayParts.events, 'event marker')}</span>
                )}
                {alertOverlayMode === 'thresholds' && availableAlertOverlayParts.events > 0 && (
                  <span>
                    {formatOverlayCount(availableAlertOverlayParts.events, 'event marker')} hidden
                  </span>
                )}
                {alertOverlayMode === 'off' && (
                  <span>
                    {formatOverlayCount(availableAlertOverlayParts.total, 'alert overlay')} hidden
                  </span>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {hasMultipleMetricChoices && <span>Selected: {selectedLabel}</span>}
            <span>{selectedPeriodLabel} period</span>
            <span>{formatNumber(displaySeries.length)} plotted point(s)</span>
            <span>
              {displaySeries[0]?.label || '—'} →{' '}
              {displaySeries[displaySeries.length - 1]?.label || '—'}
            </span>
            {alertOverlayLoading && <span>Loading alert overlays</span>}
            {alertOverlaysAvailable && (
              <>
                {visibleAlertOverlayParts.thresholds > 0 && (
                  <span>
                    {formatOverlayCount(visibleAlertOverlayParts.thresholds, 'threshold')}
                  </span>
                )}
                {alertOverlayMode === 'events' && visibleAlertOverlayParts.events > 0 && (
                  <span>{formatOverlayCount(visibleAlertOverlayParts.events, 'event marker')}</span>
                )}
                {alertOverlayMode === 'thresholds' && availableAlertOverlayParts.events > 0 && (
                  <span>
                    {formatOverlayCount(availableAlertOverlayParts.events, 'event marker')} hidden
                  </span>
                )}
                {alertOverlayMode === 'off' && (
                  <span>
                    {formatOverlayCount(availableAlertOverlayParts.total, 'alert overlay')} hidden
                  </span>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="skyweb-chart-grid skyweb-chart-grid-precision">
        <div className="skyweb-chart-stage skyweb-chart-stage-precision">
          {multiSeries ? (
            <>
              <MultiSeriesSparkline
                alertOverlays={visibleAlertOverlays}
                height={340}
                label={`${title} selected series comparison`}
                precision
                seriesList={multiDisplaySeries}
              />
              <div className="skyweb-series-legend">
                {multiDisplaySeries.map((series, index) => (
                  <span
                    className={`skyweb-series-legend-item skyweb-series-legend-item-${index % 6}`}
                    key={series.key}
                  >
                    {series.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <Sparkline
              alertOverlays={visibleAlertOverlays}
              height={340}
              label={`${selectedLabel} trend`}
              points={displaySeries}
              precision
              tone={summary.direction}
            />
          )}
          <div className="skyweb-chart-axis">
            <span>
              {multiSeries ? firstMultiPoint?.label || '—' : displaySeries[0]?.label || '—'}
            </span>
            <span>
              {multiSeries
                ? lastMultiPoint?.label || '—'
                : displaySeries[displaySeries.length - 1]?.label || '—'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
