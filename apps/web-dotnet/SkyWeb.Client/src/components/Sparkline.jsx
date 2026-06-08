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

const TONE_COLORS = {
  default: '#70b7ff',
  flat: '#70b7ff',
  up: '#67e8a5',
  down: '#ffb86b',
};

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

function normalizePoints(points = []) {
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

function formatTooltip(params = []) {
  const items = Array.isArray(params) ? params : [params];
  const firstItem = items[0];
  const title = firstItem?.axisValueLabel || firstItem?.name || 'Point';
  const body = items
    .map((item) => {
      const value = Array.isArray(item.value) ? item.value.at(-1) : item.value;
      const marker = item.marker || '';
      return `${marker}<span>${item.seriesName || 'Value'}:</span> <strong>${formatNumber(value)}</strong>`;
    })
    .join('<br/>');

  return `<div class="skyweb-echarts-tooltip"><strong>${title}</strong><br/>${body}</div>`;
}

export default function Sparkline({
  points = [],
  width = 720,
  height = 220,
  padding = DEFAULT_PADDING,
  label = 'Trend line',
  tone = 'default',
  precision = false,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const chartHeight = precision ? Math.max(height, 300) : height;
  const resolvedPadding = useMemo(() => getPadding(padding, precision), [padding, precision]);
  const safePoints = useMemo(() => normalizePoints(points), [points]);
  const option = useMemo(() => {
    if (!safePoints.length) {
      return null;
    }

    const values = safePoints.map((point) => point.numericValue);
    const range = getValueRange(values);
    const color = TONE_COLORS[tone] || TONE_COLORS.default;
    const xLabels = safePoints.map((point) => point.label);
    const latestPoint = safePoints.at(-1);

    return {
      animation: false,
      backgroundColor: 'transparent',
      color: [color],
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
      series: [
        {
          name: label,
          type: 'line',
          data: safePoints.map((point) => point.numericValue),
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
            borderColor: 'rgba(5, 10, 20, 0.95)',
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
          markLine:
            range.min < 0 && range.max > 0
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
        },
        ...(latestPoint && !precision
          ? [
              {
                name: 'Latest',
                type: 'line',
                data: safePoints.map((point) =>
                  point.index === latestPoint.index ? point.numericValue : null,
                ),
                showSymbol: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: { opacity: 0 },
                itemStyle: {
                  color: '#ffffff',
                  borderColor: 'rgba(5, 10, 20, 0.95)',
                  borderWidth: 2,
                },
                tooltip: { show: false },
              },
            ]
          : []),
      ],
    };
  }, [label, precision, resolvedPadding, safePoints, tone]);

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

  if (!safePoints.length) {
    return (
      <div className="skyweb-sparkline-empty">
        <span>No numeric trend data available.</span>
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className={`skyweb-sparkline skyweb-echarts skyweb-echarts-single skyweb-sparkline-${tone}${precision ? ' skyweb-sparkline-precision skyweb-echarts-precision' : ''}`}
      ref={containerRef}
      role="img"
      style={{ height: `${chartHeight}px` }}
    />
  );
}
