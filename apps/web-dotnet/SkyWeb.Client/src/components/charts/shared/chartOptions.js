import { chartPalette, chartSurface, getAlertSeverityColor, getToneColor } from './chartTheme.js';
import {
  formatAxisDateLabel,
  formatAxisValue,
  formatChartTooltip,
  formatOverlayLabel,
  getAxisLabelInterval,
  getNearestPoint,
  getValueRange,
  shouldShowDataZoom,
  shouldShowSymbols,
} from './chartUtils.js';

function getCommonTooltip(fallbackLabel) {
  return {
    trigger: 'axis',
    confine: true,
    appendToBody: true,
    backgroundColor: chartSurface.tooltipBackground,
    borderColor: chartSurface.tooltipBorder,
    borderWidth: 1,
    className: 'skyweb-echarts-tooltip-shell',
    formatter: (params) => formatChartTooltip(params, fallbackLabel),
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: chartSurface.hoverLine,
        type: 'dashed',
        width: 1,
      },
    },
    textStyle: {
      color: chartSurface.text,
      fontFamily: 'inherit',
      fontSize: 12,
    },
  };
}

function getCategoryAxis(xLabels = [], precision = false) {
  const pointCount = xLabels.length;

  return {
    type: 'category',
    boundaryGap: false,
    data: xLabels,
    axisLine: {
      show: precision,
      lineStyle: { color: chartSurface.gridLineStrong },
    },
    axisTick: { show: false },
    axisLabel: {
      show: precision,
      color: chartSurface.mutedText,
      formatter: (value) => formatAxisDateLabel(value, pointCount),
      hideOverlap: true,
      interval: getAxisLabelInterval(pointCount, precision),
      margin: 14,
      fontSize: 11,
    },
    splitLine: {
      show: precision,
      lineStyle: { color: chartSurface.splitLine },
    },
  };
}

function getValueAxis(range, precision = false) {
  return {
    type: 'value',
    min: range.min,
    max: range.max,
    axisLine: {
      show: precision,
      lineStyle: { color: chartSurface.gridLineStrong },
    },
    axisTick: { show: false },
    axisLabel: {
      show: precision,
      color: chartSurface.mutedText,
      formatter: (value) => formatAxisValue(value, range),
      fontSize: 11,
    },
    splitLine: {
      show: true,
      lineStyle: { color: chartSurface.gridLine },
    },
  };
}

function getReferenceMarkLine(range, alertOverlays = {}, precision = false) {
  const data = [];

  if (range.min < 0 && range.max > 0) {
    data.push({
      yAxis: 0,
      lineStyle: {
        color: chartSurface.zeroLine,
        type: 'dashed',
        width: 1,
      },
      label: { show: false },
    });
  }

  (alertOverlays.thresholds || []).forEach((threshold) => {
    if (!Number.isFinite(Number(threshold.value))) {
      return;
    }

    const color = getAlertSeverityColor(threshold.severity);
    data.push({
      name: threshold.label,
      yAxis: Number(threshold.value),
      lineStyle: {
        color,
        opacity: 0.92,
        type: 'dashed',
        width: precision ? 2 : 1.5,
      },
      label: {
        show: precision,
        color,
        backgroundColor: chartSurface.alertLabelBackground,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        padding: [3, 6],
        position: 'insideEndTop',
        formatter: () => formatOverlayLabel(threshold),
        fontSize: 10,
        fontWeight: 800,
      },
      emphasis: {
        label: { show: true },
        lineStyle: { width: precision ? 3 : 2 },
      },
    });
  });

  if (!data.length) {
    return undefined;
  }

  return {
    animation: false,
    symbol: 'none',
    silent: false,
    label: { show: false },
    data,
  };
}

function getDataZoom(pointCount, precision = false) {
  if (!shouldShowDataZoom(pointCount, precision)) {
    return undefined;
  }

  return [
    {
      type: 'inside',
      throttle: 80,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
    },
  ];
}

function getLatestPointSeries(points = []) {
  const latestPoint = points.at(-1);

  if (!latestPoint) {
    return null;
  }

  return {
    name: 'Latest',
    type: 'line',
    data: points.map((point) => (point.index === latestPoint.index ? point.numericValue : null)),
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: { opacity: 0 },
    itemStyle: {
      color: '#ffffff',
      borderColor: chartSurface.pointBorder,
      borderWidth: 2,
    },
    tooltip: { show: false },
    z: 6,
  };
}

function buildAlertEventScatterSeries({
  alertOverlays = {},
  getPointsForEvent,
  label = 'Alert events',
}) {
  const events = alertOverlays.events || [];

  if (!events.length) {
    return [];
  }

  const markersBySeverity = events.reduce((accumulator, event) => {
    const points = getPointsForEvent(event) || [];
    const nearestPoint = getNearestPoint(points, event);

    if (!nearestPoint) {
      return accumulator;
    }

    const value = Number.isFinite(Number(event.value))
      ? Number(event.value)
      : nearestPoint.numericValue;
    if (!Number.isFinite(value)) {
      return accumulator;
    }

    const severity = event.severity || 'medium';
    const color = getAlertSeverityColor(severity);
    const marker = {
      name: event.alertTitle || label,
      value: [nearestPoint.label, value],
      alertEvent: {
        ...event,
        label: nearestPoint.label,
        value,
      },
      itemStyle: {
        color,
        borderColor: chartSurface.pointBorder,
        borderWidth: 2,
      },
    };

    accumulator[severity] = accumulator[severity] || [];
    accumulator[severity].push(marker);
    return accumulator;
  }, {});

  return Object.entries(markersBySeverity).map(([severity, data]) => ({
    name: `${label} · ${severity}`,
    type: 'scatter',
    data,
    symbol: 'diamond',
    symbolSize: 10,
    z: 10,
    emphasis: {
      scale: 1.35,
      itemStyle: {
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    },
  }));
}

export function buildMacroLineOption({
  alertOverlays = {},
  label = 'Trend line',
  padding,
  points = [],
  precision = false,
  tone = 'default',
}) {
  if (!points.length) {
    return null;
  }

  const values = points.map((point) => point.numericValue);
  const range = getValueRange([
    ...values,
    ...(alertOverlays.thresholds || []).map((threshold) => Number(threshold.value)),
  ]);
  const color = getToneColor(tone);
  const xLabels = points.map((point) => point.label);
  const pointCount = points.length;
  const showSymbols = shouldShowSymbols(pointCount, precision);
  const latestPointSeries = getLatestPointSeries(points);
  const alertEventSeries = buildAlertEventScatterSeries({
    alertOverlays,
    getPointsForEvent: () => points,
    label: 'Alert events',
  });

  return {
    animation: false,
    backgroundColor: chartSurface.background,
    color: [color],
    grid: {
      top: padding.top,
      right: padding.right,
      bottom: padding.bottom,
      left: padding.left,
      containLabel: precision,
    },
    tooltip: getCommonTooltip(label),
    dataZoom: getDataZoom(pointCount, precision),
    xAxis: getCategoryAxis(xLabels, precision),
    yAxis: getValueAxis(range, precision),
    series: [
      {
        name: label,
        type: 'line',
        data: points.map((point) => point.numericValue),
        smooth: true,
        sampling: 'lttb',
        showSymbol: showSymbols,
        symbol: 'circle',
        symbolSize: showSymbols ? 4 : 0,
        lineStyle: {
          width: precision ? 3 : 4,
          color,
        },
        itemStyle: {
          color,
          borderColor: chartSurface.pointBorder,
          borderWidth: 2,
        },
        areaStyle: precision
          ? undefined
          : {
              color,
              opacity: 0.12,
            },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: precision ? 4 : 5,
          },
        },
        markLine: getReferenceMarkLine(range, alertOverlays, precision),
      },
      ...(latestPointSeries ? [latestPointSeries] : []),
      ...alertEventSeries,
    ],
  };
}

export function buildMultiSeriesMacroOption({
  alertOverlays = {},
  label = 'Series comparison',
  padding,
  precision = false,
  seriesList = [],
}) {
  if (!seriesList.length) {
    return null;
  }

  const referenceSeries = seriesList.reduce(
    (longest, series) => (series.points.length > longest.points.length ? series : longest),
    seriesList[0],
  );
  const xLabels = referenceSeries.points.map((point) => point.label);
  const values = seriesList.flatMap((series) => series.points.map((point) => point.numericValue));
  const range = getValueRange([
    ...values,
    ...(alertOverlays.thresholds || []).map((threshold) => Number(threshold.value)),
  ]);
  const maxPointCount = Math.max(...seriesList.map((series) => series.points.length), 0);
  const showSymbols = shouldShowSymbols(maxPointCount, precision);
  const seriesByKey = new Map(
    seriesList.map((series) => [
      String(series.key || '')
        .trim()
        .toLowerCase(),
      series.points,
    ]),
  );
  const alertEventSeries = buildAlertEventScatterSeries({
    alertOverlays,
    getPointsForEvent: (event) =>
      seriesByKey.get(
        String(event.targetMetricKey || '')
          .trim()
          .toLowerCase(),
      ) || referenceSeries.points,
    label: 'Alert events',
  });

  return {
    animation: false,
    backgroundColor: chartSurface.background,
    color: chartPalette,
    grid: {
      top: padding.top,
      right: padding.right,
      bottom: padding.bottom,
      left: padding.left,
      containLabel: precision,
    },
    tooltip: getCommonTooltip(label),
    dataZoom: getDataZoom(maxPointCount, precision),
    legend: {
      show: false,
    },
    xAxis: getCategoryAxis(xLabels, precision),
    yAxis: getValueAxis(range, precision),
    series: [
      ...seriesList.map((series, index) => {
        const pointMap = new Map(series.points.map((point) => [point.label, point.numericValue]));
        const color = chartPalette[index % chartPalette.length];

        return {
          name: series.label || series.name || series.key || `Series ${index + 1}`,
          type: 'line',
          data: xLabels.map((labelValue) => pointMap.get(labelValue) ?? null),
          smooth: true,
          sampling: 'lttb',
          showSymbol: showSymbols,
          symbol: 'circle',
          symbolSize: showSymbols ? 4 : 0,
          connectNulls: false,
          lineStyle: {
            width: precision ? 3 : 4,
            color,
          },
          itemStyle: {
            color,
            borderColor: chartSurface.pointBorder,
            borderWidth: 2,
          },
          areaStyle: precision
            ? undefined
            : {
                color,
                opacity: 0.08,
              },
          emphasis: {
            focus: 'series',
            lineStyle: {
              width: precision ? 4 : 5,
            },
          },
          markLine: index === 0 ? getReferenceMarkLine(range, alertOverlays, precision) : undefined,
        };
      }),
      ...alertEventSeries,
    ],
  };
}
