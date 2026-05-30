import { useEffect, useMemo, useState } from 'react';
import { normalizeChartWindowPreference } from '../context/PreferencesContext.jsx';
import { getPreferredSeriesKey, getSeriesCatalog, summarizeSeries } from '../utils/charting.js';
import { formatNumber } from '../utils/formatters.js';
import MetricQuickCard from './MetricQuickCard.jsx';
import Sparkline from './Sparkline.jsx';
import TrendMetricCard from './TrendMetricCard.jsx';

const WINDOW_OPTIONS = [
  { label: '30 points', value: 30 },
  { label: '60 points', value: 60 },
  { label: '120 points', value: 120 },
  { label: 'All loaded', value: 0 },
];

export default function ChartPanel({
  rows = [],
  columns = [],
  title = 'Trend preview',
  defaultWindowSize = '120',
}) {
  const initialWindowSize = useMemo(
    () => normalizeChartWindowPreference(defaultWindowSize),
    [defaultWindowSize],
  );
  const catalog = useMemo(() => getSeriesCatalog(rows, columns), [rows, columns]);
  const seriesKeys = useMemo(() => catalog.map((item) => item.key), [catalog]);
  const preferredKey = useMemo(() => getPreferredSeriesKey(seriesKeys), [seriesKeys]);
  const [selectedKey, setSelectedKey] = useState('');
  const [windowSize, setWindowSize] = useState(initialWindowSize);
  const activeKey = seriesKeys.includes(selectedKey) ? selectedKey : preferredKey;
  const activeMetric = catalog.find((item) => item.key === activeKey) || catalog[0] || null;
  const displaySeries = useMemo(() => {
    if (!activeMetric?.series) {
      return [];
    }

    return windowSize > 0 ? activeMetric.series.slice(-windowSize) : activeMetric.series;
  }, [activeMetric, windowSize]);
  const summary = useMemo(() => summarizeSeries(displaySeries), [displaySeries]);
  const selectedLabel = activeMetric?.label || 'Metric';
  const quickMetrics = catalog.slice(0, 6);

  useEffect(() => {
    setWindowSize(initialWindowSize);
  }, [initialWindowSize]);

  if (!catalog.length) {
    return null;
  }

  return (
    <section className="skyweb-chart-panel">
      <div className="skyweb-chart-header">
        <div>
          <div className="skyweb-card-kicker">Trend surface</div>
          <h2>{title}</h2>
          <p>
            Select a metric, compare recent movement, and pair the chart with the latest public row
            before diving into the preview table.
          </p>
        </div>
        <div className="skyweb-chart-controls">
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

      <div className="skyweb-chart-meta-strip">
        <span>Selected: {selectedLabel}</span>
        <span>{formatNumber(displaySeries.length)} plotted point(s)</span>
        <span>
          {displaySeries[0]?.label || '—'} → {displaySeries[displaySeries.length - 1]?.label || '—'}
        </span>
      </div>

      <div className="skyweb-chart-grid">
        <div className="skyweb-chart-stage">
          <Sparkline
            label={`${selectedLabel} trend`}
            points={displaySeries}
            tone={summary.direction}
          />
          <div className="skyweb-chart-axis">
            <span>{displaySeries[0]?.label || '—'}</span>
            <span>{displaySeries[displaySeries.length - 1]?.label || '—'}</span>
          </div>
        </div>
        <div className="skyweb-trend-grid">
          <TrendMetricCard
            change={summary.change}
            detail={summary.latest?.label || 'Latest point'}
            direction={summary.direction}
            label="Latest"
            value={summary.latest ? formatNumber(summary.latest.value) : '—'}
          />
          <TrendMetricCard
            detail={`${summary.count || 0} plotted point(s)`}
            direction="flat"
            label="Range"
            value={
              summary.min !== null && summary.max !== null
                ? `${formatNumber(summary.min)} → ${formatNumber(summary.max)}`
                : '—'
            }
          />
          <TrendMetricCard
            detail={summary.previous?.label || 'Previous point'}
            direction={summary.direction}
            label="Point change"
            value={summary.change !== null ? formatNumber(summary.change) : '—'}
          />
        </div>
      </div>
    </section>
  );
}
