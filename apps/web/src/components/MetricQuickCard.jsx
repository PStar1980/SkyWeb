import { formatNumber } from '../utils/formatters.js';

function getDirectionLabel(direction) {
  if (direction === 'up') {
    return 'Rising';
  }

  if (direction === 'down') {
    return 'Falling';
  }

  return 'Flat';
}

function getDirectionSymbol(direction) {
  if (direction === 'up') {
    return '↗';
  }

  if (direction === 'down') {
    return '↘';
  }

  return '→';
}

export default function MetricQuickCard({ active = false, metric, onSelect }) {
  const summary = metric.summary || {};
  const direction = summary.direction || 'flat';
  const latestValue = summary.latest ? formatNumber(summary.latest.value) : '—';
  const changeValue = Number.isFinite(Number(summary.change)) ? formatNumber(summary.change) : '—';

  return (
    <button
      className={`skyweb-metric-option skyweb-metric-option-${direction}${active ? ' active' : ''}`}
      onClick={() => onSelect?.(metric.key)}
      type="button"
    >
      <span>{metric.label}</span>
      <strong>{latestValue}</strong>
      <small>
        {getDirectionSymbol(direction)} {getDirectionLabel(direction)} · {changeValue}
      </small>
    </button>
  );
}
