import { chartPalette, chartSurface, getToneColor } from './chartTheme.js';
import {
  formatAxisDateLabel,
  formatAxisValue,
  formatChartTooltip,
  getAxisLabelInterval,
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

function getZeroMarkLine(range) {
  if (!(range.min < 0 && range.max > 0)) {
    return undefined;
  }

  return {
    animation: false,
    symbol: 'none',
    silent: true,
    lineStyle: {
      color: chartSurface.zeroLine,
      type: 'dashed',
      width: 1,
    },
    label: { show: false },
    data: [{ yAxis: 0 }],
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

export function buildMacroLineOption({
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
  const range = getValueRange(values);
  const color = getToneColor(tone);
  const xLabels = points.map((point) => point.label);
  const pointCount = points.length;
  const showSymbols = shouldShowSymbols(pointCount, precision);
  const latestPointSeries = getLatestPointSeries(points);

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
        markLine: getZeroMarkLine(range),
      },
      ...(latestPointSeries ? [latestPointSeries] : []),
    ],
  };
}

export function buildMultiSeriesMacroOption({
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
  const range = getValueRange(values);
  const maxPointCount = Math.max(...seriesList.map((series) => series.points.length), 0);
  const showSymbols = shouldShowSymbols(maxPointCount, precision);

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
    series: seriesList.map((series, index) => {
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
        markLine: index === 0 ? getZeroMarkLine(range) : undefined,
      };
    }),
  };
}
