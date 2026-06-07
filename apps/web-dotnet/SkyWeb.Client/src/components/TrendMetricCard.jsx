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

export default function TrendMetricCard({ label, value, detail, change, direction = 'flat' }) {
  const hasChange = Number.isFinite(Number(change));

  return (
    <article className={`skyweb-trend-metric skyweb-trend-metric-${direction}`}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      <small>{detail}</small>
      <em>
        {getDirectionSymbol(direction)} {getDirectionLabel(direction)}
        {hasChange ? ` · ${formatNumber(change)}` : ''}
      </em>
    </article>
  );
}
