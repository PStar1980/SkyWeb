import { useEffect, useMemo, useState } from 'react';
import { normalizeChartWindowPreference } from '../context/PreferencesContext.jsx';
import { getPreferredSeriesKey, getSeriesCatalog, summarizeSeries } from '../utils/charting.js';
import { formatNumber } from '../utils/formatters.js';
import MetricQuickCard from './MetricQuickCard.jsx';
import MultiSeriesSparkline from './MultiSeriesSparkline.jsx';
import Sparkline from './Sparkline.jsx';

const WINDOW_OPTIONS = [
  { label: '30 points', value: 30 },
  { label: '60 points', value: 60 },
  { label: '120 points', value: 120 },
  { label: 'All loaded', value: 0 },
];

const DEFAULT_MULTI_SERIES_COUNT = 3;
const MAX_MULTI_SERIES_COUNT = 5;
const MULTI_SERIES_PICKER_LIMIT = 12;

function getDefaultSelectedKeys(catalog = []) {
  return catalog
    .slice(0, DEFAULT_MULTI_SERIES_COUNT)
    .map((item) => item.key)
    .filter(Boolean);
}

function getWindowedSeries(series = [], windowSize = 0) {
  return windowSize > 0 ? series.slice(-windowSize) : series;
}

export default function ChartPanel({
  rows = [],
  columns = [],
  title = 'Trend preview',
  defaultWindowSize = '120',
  multiSeries = false,
}) {
  const initialWindowSize = useMemo(
    () => normalizeChartWindowPreference(defaultWindowSize),
    [defaultWindowSize],
  );
  const catalog = useMemo(() => getSeriesCatalog(rows, columns), [rows, columns]);
  const seriesKeys = useMemo(() => catalog.map((item) => item.key), [catalog]);
  const preferredKey = useMemo(() => getPreferredSeriesKey(seriesKeys), [seriesKeys]);
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [windowSize, setWindowSize] = useState(initialWindowSize);
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
  const displaySeries = useMemo(() => {
    if (!activeMetric?.series) {
      return [];
    }

    return getWindowedSeries(activeMetric.series, windowSize);
  }, [activeMetric, windowSize]);
  const multiDisplaySeries = useMemo(
    () =>
      selectedMetrics.map((metric) => ({
        key: metric.key,
        label: metric.label,
        points: getWindowedSeries(metric.series, windowSize),
        summary: summarizeSeries(getWindowedSeries(metric.series, windowSize)),
      })),
    [selectedMetrics, windowSize],
  );
  const summary = useMemo(() => summarizeSeries(displaySeries), [displaySeries]);
  const selectedLabel = activeMetric?.label || 'Metric';
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
    setWindowSize(initialWindowSize);
  }, [initialWindowSize]);

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
          {!multiSeries && (
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
            <span>Window</span>
            <select
              className="form-select"
              onChange={(event) => setWindowSize(Number(event.target.value))}
              value={windowSize}
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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
      ) : (
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
      )}

      <div className="skyweb-chart-meta-strip">
        {multiSeries ? (
          <>
            <span>{formatNumber(safeSelectedKeys.length)} selected series</span>
            <span>
              {formatNumber(
                Math.max(...multiDisplaySeries.map((series) => series.points.length), 0),
              )}{' '}
              max plotted point(s)
            </span>
            <span>
              {firstMultiPoint?.label || '—'} → {lastMultiPoint?.label || '—'}
            </span>
          </>
        ) : (
          <>
            <span>Selected: {selectedLabel}</span>
            <span>{formatNumber(displaySeries.length)} plotted point(s)</span>
            <span>
              {displaySeries[0]?.label || '—'} →{' '}
              {displaySeries[displaySeries.length - 1]?.label || '—'}
            </span>
          </>
        )}
      </div>

      <div className="skyweb-chart-grid skyweb-chart-grid-precision">
        <div className="skyweb-chart-stage skyweb-chart-stage-precision">
          {multiSeries ? (
            <>
              <MultiSeriesSparkline
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
