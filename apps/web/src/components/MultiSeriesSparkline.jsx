import { useMemo, useState } from 'react';
import { formatNumber } from '../utils/formatters.js';

const DEFAULT_PADDING = 18;
const PRECISION_PADDING = {
  top: 22,
  right: 62,
  bottom: 38,
  left: 68,
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

  return {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding,
  };
}

function normalizeSeries(seriesList = [], width, height, padding) {
  const safeSeries = seriesList
    .map((series, seriesIndex) => ({
      ...series,
      seriesIndex,
      points: (series.points || []).filter((point) => Number.isFinite(Number(point.value))),
    }))
    .filter((series) => series.points.length > 0);

  if (!safeSeries.length) {
    return {
      max: null,
      min: null,
      seriesList: [],
      zeroY: null,
      yTicks: [],
      xTicks: [],
    };
  }

  const values = safeSeries.flatMap((series) => series.points.map((point) => Number(point.value)));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
  const yMargin = rawSpan * 0.08;
  const min = rawMin - yMargin;
  const max = rawMax + yMargin;
  const span = max - min || 1;
  const largestPointCount = Math.max(...safeSeries.map((series) => series.points.length), 1);
  const xSpan = Math.max(largestPointCount - 1, 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const zeroY = min < 0 && max > 0 ? padding.top + (1 - (0 - min) / span) * innerHeight : null;
  const normalizedSeriesList = safeSeries.map((series) => ({
    ...series,
    points: series.points.map((point, index) => {
      const x = padding.left + (index / xSpan) * innerWidth;
      const y = padding.top + (1 - (Number(point.value) - min) / span) * innerHeight;

      return {
        ...point,
        x,
        y,
        numericValue: Number(point.value),
      };
    }),
  }));
  const referenceSeries = normalizedSeriesList.reduce(
    (longest, series) => (series.points.length > longest.points.length ? series : longest),
    normalizedSeriesList[0],
  );
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, index) => {
    const ratio = yTickCount === 1 ? 0 : index / (yTickCount - 1);
    const value = max - ratio * span;
    const y = padding.top + ratio * innerHeight;

    return { value, y };
  });
  const xTickCount = Math.min(5, referenceSeries.points.length);
  const xTicks = Array.from({ length: xTickCount }, (_, index) => {
    const pointIndex =
      xTickCount === 1
        ? 0
        : Math.round((index / (xTickCount - 1)) * (referenceSeries.points.length - 1));
    const point = referenceSeries.points[pointIndex];

    return {
      point,
      x: point?.x ?? padding.left,
    };
  });

  return {
    max,
    min,
    zeroY,
    yTicks,
    xTicks,
    seriesList: normalizedSeriesList,
  };
}

function buildPath(points = []) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function buildAreaPath(points = [], height, padding) {
  if (!points.length) {
    return '';
  }

  const linePath = buildPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const floor = height - padding.bottom;

  return `${linePath} L ${last.x.toFixed(2)} ${floor} L ${first.x.toFixed(2)} ${floor} Z`;
}

function getSvgCoordinates(event, width, height) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * width;
  const y = ((event.clientY - rect.top) / rect.height) * height;

  return { x, y };
}

function getNearestBundle(seriesList = [], xCoordinate) {
  const allPoints = seriesList.flatMap((series) =>
    series.points.map((point) => ({ ...point, series })),
  );

  if (!allPoints.length) {
    return null;
  }

  const anchor = allPoints.reduce((nearest, point) => {
    if (!nearest) {
      return point;
    }

    return Math.abs(point.x - xCoordinate) < Math.abs(nearest.x - xCoordinate) ? point : nearest;
  }, null);

  const points = seriesList
    .map((series) => {
      const nearestPoint = series.points.reduce((nearest, point) => {
        if (!nearest) {
          return point;
        }

        return Math.abs(point.x - anchor.x) < Math.abs(nearest.x - anchor.x) ? point : nearest;
      }, null);

      return nearestPoint ? { ...nearestPoint, series } : null;
    })
    .filter(Boolean);

  return {
    anchor,
    label: anchor?.label || 'Point',
    points,
    x: anchor.x,
  };
}

function AxisLabels({ height, normalized, padding, precision, width }) {
  if (!precision) {
    return null;
  }

  return (
    <>
      {normalized.yTicks.map((tick) => (
        <g key={`y-${tick.y.toFixed(2)}`}>
          <line
            className="skyweb-sparkline-gridline skyweb-sparkline-gridline-major"
            x1={padding.left}
            x2={width - padding.right}
            y1={tick.y}
            y2={tick.y}
          />
          <text
            className="skyweb-sparkline-axis-label skyweb-sparkline-y-label"
            dominantBaseline="middle"
            textAnchor="end"
            x={padding.left - 10}
            y={tick.y}
          >
            {formatNumber(tick.value)}
          </text>
        </g>
      ))}
      {normalized.xTicks.map((tick, index) => (
        <g key={`x-${index}-${tick.point?.label || 'point'}`}>
          <line
            className="skyweb-sparkline-gridline skyweb-sparkline-gridline-vertical"
            x1={tick.x}
            x2={tick.x}
            y1={padding.top}
            y2={height - padding.bottom}
          />
          <text
            className="skyweb-sparkline-axis-label skyweb-sparkline-x-label"
            textAnchor={
              index === 0 ? 'start' : index === normalized.xTicks.length - 1 ? 'end' : 'middle'
            }
            x={tick.x}
            y={height - 10}
          >
            {tick.point?.label || '—'}
          </text>
        </g>
      ))}
      <line
        className="skyweb-sparkline-axis-line"
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={height - padding.bottom}
      />
      <line
        className="skyweb-sparkline-axis-line"
        x1={padding.left}
        x2={width - padding.right}
        y1={height - padding.bottom}
        y2={height - padding.bottom}
      />
    </>
  );
}

function MultiTooltip({ bundle, height, padding, width }) {
  if (!bundle) {
    return null;
  }

  const rowHeight = 15;
  const tooltipWidth = 220;
  const tooltipHeight = 34 + bundle.points.length * rowHeight;
  const anchorY = bundle.points[0]?.y ?? padding.top;
  const x =
    bundle.x > width - padding.right - tooltipWidth - 14
      ? bundle.x - tooltipWidth - 14
      : bundle.x + 14;
  const y = anchorY < padding.top + tooltipHeight + 8 ? anchorY + 14 : anchorY - tooltipHeight - 12;

  return (
    <g className="skyweb-sparkline-tooltip" pointerEvents="none">
      <line
        className="skyweb-sparkline-hover-line"
        x1={bundle.x}
        x2={bundle.x}
        y1={padding.top}
        y2={height - padding.bottom}
      />
      {bundle.points.map((point) => (
        <circle
          className={`skyweb-sparkline-hover-point skyweb-multi-hover-point-${point.series.seriesIndex % 6}`}
          cx={point.x}
          cy={point.y}
          key={`${point.series.key}-${point.x}-${point.y}`}
          r="5"
        />
      ))}
      <rect height={tooltipHeight} rx="9" width={tooltipWidth} x={x} y={y} />
      <text x={x + 10} y={y + 18}>
        <tspan className="skyweb-sparkline-tooltip-label">{bundle.label}</tspan>
        {bundle.points.slice(0, 5).map((point, index) => (
          <tspan
            className={`skyweb-sparkline-tooltip-value skyweb-sparkline-tooltip-series-${point.series.seriesIndex % 6}`}
            dy={index === 0 ? 18 : rowHeight}
            key={`${point.series.key}-${point.label}`}
            x={x + 10}
          >
            {point.series.label}: {formatNumber(point.numericValue ?? point.value)}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function MultiSeriesSparkline({
  seriesList = [],
  width = 720,
  height = 220,
  padding = DEFAULT_PADDING,
  label = 'Multi-series trend lines',
  precision = false,
}) {
  const chartHeight = precision ? Math.max(height, 320) : height;
  const resolvedPadding = useMemo(() => getPadding(padding, precision), [padding, precision]);
  const normalized = useMemo(
    () => normalizeSeries(seriesList, width, chartHeight, resolvedPadding),
    [chartHeight, resolvedPadding, seriesList, width],
  );
  const midY = chartHeight / 2;
  const [hoverBundle, setHoverBundle] = useState(null);

  if (!normalized.seriesList.length) {
    return (
      <div className="skyweb-sparkline-empty">
        <span>No numeric trend data available.</span>
      </div>
    );
  }

  function handlePointerMove(event) {
    if (!precision) {
      return;
    }

    const coordinates = getSvgCoordinates(event, width, chartHeight);
    setHoverBundle(getNearestBundle(normalized.seriesList, coordinates.x));
  }

  return (
    <svg
      aria-label={label}
      className={`skyweb-sparkline skyweb-multi-sparkline${precision ? ' skyweb-sparkline-precision' : ''}`}
      onMouseLeave={() => setHoverBundle(null)}
      onPointerMove={handlePointerMove}
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${chartHeight}`}
    >
      <AxisLabels
        height={chartHeight}
        normalized={normalized}
        padding={resolvedPadding}
        precision={precision}
        width={width}
      />
      {!precision && (
        <>
          <line
            className="skyweb-sparkline-gridline"
            x1={resolvedPadding.left}
            x2={width - resolvedPadding.right}
            y1={resolvedPadding.top}
            y2={resolvedPadding.top}
          />
          <line
            className="skyweb-sparkline-gridline"
            x1={resolvedPadding.left}
            x2={width - resolvedPadding.right}
            y1={midY}
            y2={midY}
          />
          <line
            className="skyweb-sparkline-gridline"
            x1={resolvedPadding.left}
            x2={width - resolvedPadding.right}
            y1={chartHeight - resolvedPadding.bottom}
            y2={chartHeight - resolvedPadding.bottom}
          />
        </>
      )}
      {normalized.zeroY !== null && (
        <line
          className="skyweb-sparkline-zero"
          x1={resolvedPadding.left}
          x2={width - resolvedPadding.right}
          y1={normalized.zeroY}
          y2={normalized.zeroY}
        />
      )}
      {normalized.seriesList.map((series, index) => {
        const path = buildPath(series.points);
        const areaPath = buildAreaPath(series.points, chartHeight, resolvedPadding);
        const lastPoint = series.points[series.points.length - 1];

        return (
          <g
            className={`skyweb-multi-sparkline-series skyweb-multi-sparkline-series-${index % 6}`}
            key={series.key || series.label || index}
          >
            <path className="skyweb-multi-sparkline-area" d={areaPath} />
            <path className="skyweb-multi-sparkline-line" d={path} />
            {lastPoint && (
              <circle
                className="skyweb-multi-sparkline-point"
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="4.5"
              />
            )}
          </g>
        );
      })}
      {precision && (
        <MultiTooltip
          bundle={hoverBundle}
          height={chartHeight}
          padding={resolvedPadding}
          width={width}
        />
      )}
    </svg>
  );
}
