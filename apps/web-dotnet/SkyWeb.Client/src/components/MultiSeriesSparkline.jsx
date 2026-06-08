import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { extent, ticks } from 'd3';
import { formatNumber } from '../utils/formatters.js';

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const DEFAULT_PADDING = 18;
const PRECISION_PADDING = {
  top: 22,
  right: 62,
  bottom: 38,
  left: 68,
};
const SERIES_COLORS = ['#70b7ff', '#67e8a5', '#ffb86b', '#c084fc', '#5eead4', '#f472b6'];

function getPadding(padding, precision = false) {
  if (typeof padding === 'object' && padding !== null) {
    return {
      top: padding.top ?? DEFAULT_PADDING,
      right: padding.right ?? DEFAULT_PADDING,
      bottom: padding.bottom ?? DEFAULT_PADDING,
      left: padding.left ?? DEFAULT_PADDING,
    };
  }

  if (precision) {
    return PRECISION_PADDING;
  }

  const resolvedPadding = Number.isFinite(Number(padding)) ? Number(padding) : DEFAULT_PADDING;

  return {
    top: resolvedPadding,
    right: resolvedPadding,
    bottom: resolvedPadding,
    left: resolvedPadding,
  };
}

function normalizeSeries(seriesList = []) {
  return seriesList
    .map((series, seriesIndex) => ({
      ...series,
      seriesIndex,
      points: (series.points || [])
        .map((point, pointIndex) => {
          const numericValue = Number(point?.value);

          if (!Number.isFinite(numericValue)) {
            return null;
          }

          return {
            ...point,
            pointIndex,
            label: point?.label || point?.date || `Point ${pointIndex + 1}`,
            numericValue,
          };
        })
        .filter(Boolean),
    }))
    .filter((series) => series.points.length > 0);
}

function getValueRange(values = []) {
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

function getReferenceSeries(seriesList = []) {
  return seriesList.reduce(
    (longest, series) => (series.points.length > longest.points.length ? series : longest),
    seriesList[0],
  );
}

function formatTooltip(params = []) {
  const items = Array.isArray(params) ? params : [params];
  const firstItem = items[0];
  const title = firstItem?.axisValueLabel || firstItem?.name || 'Point';
  const body = items
    .filter((item) => item.value !== null && item.value !== undefined)
    .map((item) => {
      const value = Array.isArray(item.value) ? item.value.at(-1) : item.value;
      const marker = item.marker || '';
      return `${marker}<span>${item.seriesName || 'Series'}:</span> <strong>${formatNumber(value)}</strong>`;
    })
    .join('<br/>');

  return `<div class="skyweb-echarts-tooltip"><strong>${title}</strong><br/>${body || 'No value'}</div>`;
}

export default function MultiSeriesSparkline({
  seriesList = [],
  width = 720,
  height = 240,
  padding = DEFAULT_PADDING,
  label = 'Series comparison',
  precision = false,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const chartHeight = precision ? Math.max(height, 320) : height;
  const resolvedPadding = useMemo(() => getPadding(padding, precision), [padding, precision]);
  const safeSeries = useMemo(() => normalizeSeries(seriesList), [seriesList]);
  const option = useMemo(() => {
    if (!safeSeries.length) {
      return null;
    }

    const referenceSeries = getReferenceSeries(safeSeries);
    const xLabels = referenceSeries.points.map((point) => point.label);
    const values = safeSeries.flatMap((series) => series.points.map((point) => point.numericValue));
    const range = getValueRange(values);

    return {
      animation: false,
      backgroundColor: 'transparent',
      color: SERIES_COLORS,
      grid: {
        top: resolvedPadding.top,
        right: resolvedPadding.right,
        bottom: resolvedPadding.bottom,
        left: resolvedPadding.left,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'rgba(8, 14, 28, 0.96)',
        borderColor: 'rgba(138, 163, 202, 0.24)',
        borderWidth: 1,
        className: 'skyweb-echarts-tooltip-shell',
        formatter: formatTooltip,
        textStyle: {
          color: '#dce8ff',
          fontFamily: 'inherit',
          fontSize: 12,
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xLabels,
        axisLine: {
          show: precision,
          lineStyle: { color: 'rgba(138, 163, 202, 0.28)' },
        },
        axisTick: { show: false },
        axisLabel: {
          show: precision,
          color: 'rgba(220, 232, 255, 0.58)',
          hideOverlap: true,
          margin: 14,
          fontSize: 11,
        },
        splitLine: {
          show: precision,
          lineStyle: { color: 'rgba(138, 163, 202, 0.08)' },
        },
      },
      yAxis: {
        type: 'value',
        min: range.min,
        max: range.max,
        axisLine: {
          show: precision,
          lineStyle: { color: 'rgba(138, 163, 202, 0.28)' },
        },
        axisTick: { show: false },
        axisLabel: {
          show: precision,
          color: 'rgba(220, 232, 255, 0.58)',
          formatter: (value) => formatNumber(value),
          fontSize: 11,
        },
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(138, 163, 202, 0.1)' },
        },
      },
      series: safeSeries.map((series, index) => ({
        name: series.label || series.key || `Series ${index + 1}`,
        type: 'line',
        data: xLabels.map((_, pointIndex) => series.points[pointIndex]?.numericValue ?? null),
        connectNulls: false,
        smooth: true,
        sampling: 'lttb',
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: precision ? 3 : 4,
        },
        emphasis: {
          focus: 'series',
        },
        markLine:
          index === 0 && range.min < 0 && range.max > 0
            ? {
                animation: false,
                symbol: 'none',
                silent: true,
                lineStyle: {
                  color: 'rgba(220, 232, 255, 0.28)',
                  type: 'dashed',
                  width: 1,
                },
                data: [{ yAxis: 0 }],
              }
            : undefined,
      })),
    };
  }, [precision, resolvedPadding, safeSeries]);

  useEffect(() => {
    if (!containerRef.current || !option) {
      return undefined;
    }

    chartRef.current = echarts.init(containerRef.current, null, {
      renderer: 'canvas',
      useDirtyRect: true,
      width: precision ? undefined : width,
      height: chartHeight,
    });

    chartRef.current.setOption(option, true);

    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.resize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [chartHeight, option, precision, width]);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  if (!safeSeries.length) {
    return (
      <div className="skyweb-sparkline-empty">
        <span>No numeric comparison data available.</span>
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className={`skyweb-sparkline skyweb-echarts skyweb-echarts-multi${precision ? ' skyweb-sparkline-precision skyweb-echarts-precision' : ''}`}
      ref={containerRef}
      role="img"
      style={{ height: `${chartHeight}px` }}
    />
  );
}
