import { extent, ticks } from 'd3';
import { formatNumber } from '../../../utils/formatters.js';
import {
  DEFAULT_CHART_PADDING,
  MAX_INLINE_ZOOM_POINTS,
  PRECISION_CHART_PADDING,
} from './chartTypes.js';

export function getChartPadding(padding, precision = false) {
  if (typeof padding === 'object' && padding !== null) {
    return {
      top: padding.top ?? DEFAULT_CHART_PADDING,
      right: padding.right ?? DEFAULT_CHART_PADDING,
      bottom: padding.bottom ?? DEFAULT_CHART_PADDING,
      left: padding.left ?? DEFAULT_CHART_PADDING,
    };
  }

  if (precision) {
    return PRECISION_CHART_PADDING;
  }

  const resolvedPadding = Number.isFinite(Number(padding))
    ? Number(padding)
    : DEFAULT_CHART_PADDING;

  return {
    top: resolvedPadding,
    right: resolvedPadding,
    bottom: resolvedPadding,
    left: resolvedPadding,
  };
}

export function normalizeChartPoints(points = []) {
  return points
    .map((point, index) => {
      const numericValue = Number(point?.value);

      if (!Number.isFinite(numericValue)) {
        return null;
      }

      return {
        ...point,
        index,
        label: point?.label || point?.date || `Point ${index + 1}`,
        numericValue,
      };
    })
    .filter(Boolean);
}

export function normalizeChartSeries(seriesList = []) {
  return seriesList
    .map((series, seriesIndex) => ({
      ...series,
      seriesIndex,
      label: series.label || series.name || series.key || `Series ${seriesIndex + 1}`,
      points: normalizeChartPoints(series.points || series.data || []),
    }))
    .filter((series) => series.points.length > 0);
}

export function getValueRange(values = []) {
  const [rawMin, rawMax] = extent(values);

  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
    return { max: 1, min: 0, tickValues: [0, 0.25, 0.5, 0.75, 1] };
  }

  const rawSpan = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
  const margin = rawSpan * 0.08;
  const min = rawMin - margin;
  const max = rawMax + margin;

  return {
    max,
    min,
    tickValues: ticks(min, max, 4),
  };
}

export function getReferenceSeries(seriesList = []) {
  return seriesList.reduce(
    (longest, series) => (series.points.length > longest.points.length ? series : longest),
    seriesList[0],
  );
}

export function formatChartTooltip(params = [], fallbackLabel = 'Value') {
  const items = Array.isArray(params) ? params : [params];
  const firstItem = items[0];
  const title = firstItem?.axisValueLabel || firstItem?.name || 'Point';
  const body = items
    .filter((item) => item.value !== null && item.value !== undefined)
    .map((item) => {
      const value = Array.isArray(item.value) ? item.value.at(-1) : item.value;
      const marker = item.marker || '';
      return `${marker}<span>${item.seriesName || fallbackLabel}:</span> <strong>${formatNumber(value)}</strong>`;
    })
    .join('<br/>');

  return `<div class="skyweb-echarts-tooltip"><strong>${title}</strong><br/>${body || 'No value'}</div>`;
}

export function shouldShowDataZoom(pointCount = 0, precision = false) {
  return Boolean(precision && pointCount > MAX_INLINE_ZOOM_POINTS);
}
