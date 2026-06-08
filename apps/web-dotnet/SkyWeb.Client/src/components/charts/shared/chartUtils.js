import { extent, ticks } from 'd3';
import { formatDate, formatNumber } from '../../../utils/formatters.js';
import {
  DEFAULT_CHART_PADDING,
  MAX_INLINE_ZOOM_POINTS,
  PRECISION_CHART_PADDING,
} from './chartTypes.js';

const YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, { year: 'numeric' });
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  year: 'numeric',
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

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

export function getPointTime(point = {}) {
  const rawDate = point.date || point.observationDate || point.label;

  if (!rawDate) {
    return null;
  }

  const parsedDate = new Date(rawDate);
  const parsedTime = parsedDate.getTime();

  return Number.isNaN(parsedTime) ? null : parsedTime;
}

export function normalizeChartPoints(points = []) {
  return points
    .map((point, index) => {
      const numericValue = Number(point?.value);

      if (!Number.isFinite(numericValue)) {
        return null;
      }

      const rawDate = point?.date || point?.observationDate || null;
      const pointTime = getPointTime({ ...point, date: rawDate });
      const label = point?.label || (rawDate ? formatDate(rawDate) : `Point ${index + 1}`);

      return {
        ...point,
        index,
        label,
        numericValue,
        rawDate,
        sortTime: pointTime,
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
  const finiteValues = values.filter((value) => Number.isFinite(value));
  const [rawMin, rawMax] = extent(finiteValues);

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

function getVisibleTooltipItems(params = []) {
  const items = Array.isArray(params) ? params : [params];

  return items.filter((item) => {
    if (item.seriesName === 'Latest') {
      return false;
    }

    const value = Array.isArray(item.value) ? item.value.at(-1) : item.value;
    return value !== null && value !== undefined && Number.isFinite(Number(value));
  });
}

export function formatChartTooltip(params = [], fallbackLabel = 'Value') {
  const visibleItems = getVisibleTooltipItems(params);
  const firstItem = visibleItems[0] || (Array.isArray(params) ? params[0] : params);
  const title = firstItem?.axisValueLabel || firstItem?.name || 'Point';
  const body = visibleItems
    .map((item) => {
      const value = Array.isArray(item.value) ? item.value.at(-1) : item.value;
      const marker = item.marker || '';
      return `${marker}<span>${item.seriesName || fallbackLabel}:</span> <strong>${formatNumber(value)}</strong>`;
    })
    .join('<br/>');

  return `<div class="skyweb-echarts-tooltip"><strong>${title}</strong><br/>${body || 'No value'}</div>`;
}

export function formatAxisDateLabel(value, pointCount = 0) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (pointCount > 1000) {
    return YEAR_FORMATTER.format(date);
  }

  if (pointCount > 180) {
    return MONTH_YEAR_FORMATTER.format(date);
  }

  return SHORT_DATE_FORMATTER.format(date);
}

export function formatAxisValue(value, range = {}) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return value;
  }

  const span = Number(range.max) - Number(range.min);

  if (Math.abs(numberValue) >= 1000 || Math.abs(span) >= 1000) {
    return formatNumber(numberValue, { compact: true });
  }

  return formatNumber(numberValue);
}

export function getAxisLabelInterval(pointCount = 0, precision = false) {
  if (!precision) {
    return 'auto';
  }

  if (pointCount > 1200) {
    return Math.ceil(pointCount / 8);
  }

  if (pointCount > 365) {
    return Math.ceil(pointCount / 7);
  }

  if (pointCount > 120) {
    return Math.ceil(pointCount / 6);
  }

  if (pointCount > 50) {
    return Math.ceil(pointCount / 5);
  }

  return 'auto';
}

export function shouldShowSymbols(pointCount = 0, precision = false) {
  return Boolean(precision && pointCount <= 220);
}

export function shouldShowDataZoom(pointCount = 0, precision = false) {
  return Boolean(precision && pointCount > MAX_INLINE_ZOOM_POINTS);
}
