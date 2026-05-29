import { useMemo, useState } from 'react';
import {
  buildSeries,
  getNumericSeriesKeys,
  getSeriesLabel,
  summarizeSeries,
} from '../utils/charting.js';
import { formatNumber } from '../utils/formatters.js';
import Sparkline from './Sparkline.jsx';
import TrendMetricCard from './TrendMetricCard.jsx';

function getPreferredKey(keys = []) {
  return (
    keys.find((key) => /yoy|change|spread|rate|value|index|gdp|cpi/i.test(key)) || keys[0] || ''
  );
}

export default function ChartPanel({ rows = [], columns = [], title = 'Trend preview' }) {
  const seriesKeys = useMemo(() => getNumericSeriesKeys(rows, columns), [rows, columns]);
  const preferredKey = useMemo(() => getPreferredKey(seriesKeys), [seriesKeys]);
  const [selectedKey, setSelectedKey] = useState('');
  const activeKey = seriesKeys.includes(selectedKey) ? selectedKey : preferredKey;
  const series = useMemo(() => buildSeries(rows, activeKey), [rows, activeKey]);
  const summary = useMemo(() => summarizeSeries(series), [series]);
  const selectedLabel = activeKey ? getSeriesLabel(activeKey) : 'Metric';

  if (!seriesKeys.length) {
    return null;
  }

  return (
    <section className="skyweb-chart-panel">
      <div className="skyweb-chart-header">
        <div>
          <div className="skyweb-card-kicker">Chart foundation</div>
          <h2>{title}</h2>
          <p>
            Lightweight SVG trend preview generated directly from the public macro rows. No chart
            library required yet.
          </p>
        </div>
        <label className="skyweb-chart-picker">
          <span>Metric</span>
          <select
            className="form-select"
            onChange={(event) => setSelectedKey(event.target.value)}
            value={activeKey}
          >
            {seriesKeys.map((key) => (
              <option key={key} value={key}>
                {getSeriesLabel(key)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="skyweb-chart-grid">
        <div className="skyweb-chart-stage">
          <Sparkline label={`${selectedLabel} trend`} points={series} tone={summary.direction} />
          <div className="skyweb-chart-axis">
            <span>{series[0]?.label || '—'}</span>
            <span>{series[series.length - 1]?.label || '—'}</span>
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
