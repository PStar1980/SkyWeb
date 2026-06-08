import { formatDate } from '../../../utils/formatters.js';

export function adaptIndicatorSeriesPayload(payload = {}) {
  const indicator = payload.indicator || {};
  const items = payload.items || payload.series || [];
  const latest = items[0] || null;

  return {
    indicatorCode: indicator.indicatorCode || payload.indicatorCode || '',
    title: indicator.description || indicator.indicatorCode || payload.title || 'Indicator series',
    subtitle: indicator.source
      ? `${indicator.source}${indicator.frequency ? ` · ${indicator.frequency}` : ''}`
      : indicator.frequency || '',
    source: indicator.source || '',
    frequency: indicator.frequency || '',
    latestDate: latest?.date || payload.latestDate || null,
    latestValue: latest?.value ?? payload.latestValue ?? null,
    series: items
      .map((point, index) => {
        const numericValue = Number(point?.value);

        if (!Number.isFinite(numericValue)) {
          return null;
        }

        return {
          date: point.date || point.observationDate || null,
          label: point.label || (point.date ? formatDate(point.date) : `Point ${index + 1}`),
          value: numericValue,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftTime = left.date ? new Date(left.date).getTime() : 0;
        const rightTime = right.date ? new Date(right.date).getTime() : 0;
        return leftTime - rightTime;
      }),
  };
}
