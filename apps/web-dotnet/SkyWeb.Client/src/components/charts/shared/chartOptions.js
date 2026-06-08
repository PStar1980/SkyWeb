import { formatNumber } from '../../../utils/formatters.js';
import { chartPalette, chartSurface, getToneColor } from './chartTheme.js';
import { formatChartTooltip, getValueRange, shouldShowDataZoom } from './chartUtils.js';

function getCommonTooltip(fallbackLabel) {
  return {
    trigger: 'axis',
    confine: true,
    backgroundColor: chartSurface.tooltipBackground,
    borderColor: chartSurface.tooltipBorder,
    borderWidth: 1,
    className: 'skyweb-echarts-tooltip-shell',
    formatter: (params) => formatChartTooltip(params, fallbackLabel),
    textStyle: {
      color: chartSurface.text,
      fontFamily: 'inherit',
      fontSize: 12,
    },
  };
}

function getCategoryAxis(xLabels = [], precision = false) {
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
      hideOverlap: true,
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
      formatter: (value) => formatNumber(value),
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
    },
  ];
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
  const latestPoint = points.at(-1);

  return {
    animation: false,
    backgroundColor: chartSurface.background,
    color: [color],
    grid: {
      top: padding.top,
      right: padding.right,
      bottom: padding.bottom,
      left: padding.left,
      containLabel: false,
    },
    tooltip: getCommonTooltip(label),
    dataZoom: getDataZoom(points.length, precision),
    xAxis: getCategoryAxis(xLabels, precision),
    yAxis: getValueAxis(range, precision),
    series: [
      {
        name: label,
        type: 'line',
        data: points.map((point) => point.numericValue),
        smooth: true,
        sampling: 'lttb',
        showSymbol: precision,
        symbol: 'circle',
        symbolSize: precision ? 4 : 0,
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
        },
        markLine: getZeroMarkLine(range),
      },
      ...(latestPoint && !precision
        ? [
            {
              name: 'Latest',
              type: 'line',
              data: points.map((point) =>
                point.index === latestPoint.index ? point.numericValue : null,
              ),
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
            },
          ]
        : []),
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

  return {
    animation: false,
    backgroundColor: chartSurface.background,
    color: chartPalette,
    grid: {
      top: padding.top,
      right: padding.right,
      bottom: padding.bottom,
      left: padding.left,
      containLabel: false,
    },
    tooltip: getCommonTooltip(label),
    dataZoom: getDataZoom(maxPointCount, precision),
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
        showSymbol: precision,
        symbol: 'circle',
        symbolSize: precision ? 4 : 0,
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
        },
        markLine: index === 0 ? getZeroMarkLine(range) : undefined,
      };
    }),
  };
}
