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

function normalizePoints(points = [], width, height, padding) {
  const safePoints = points.filter((point) => Number.isFinite(Number(point.value)));

  if (!safePoints.length) {
    return {
      max: null,
      min: null,
      points: [],
      zeroY: null,
      yTicks: [],
      xTicks: [],
    };
  }

  const values = safePoints.map((point) => Number(point.value));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
  const yMargin = rawSpan * 0.08;
  const min = rawMin - yMargin;
  const max = rawMax + yMargin;
  const span = max - min || 1;
  const xSpan = Math.max(safePoints.length - 1, 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const zeroY = min < 0 && max > 0 ? padding.top + (1 - (0 - min) / span) * innerHeight : null;
  const normalizedPoints = safePoints.map((point, index) => {
    const x = padding.left + (index / xSpan) * innerWidth;
    const y = padding.top + (1 - (Number(point.value) - min) / span) * innerHeight;

    return {
      ...point,
      x,
      y,
      numericValue: Number(point.value),
    };
  });
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, index) => {
    const ratio = yTickCount === 1 ? 0 : index / (yTickCount - 1);
    const value = max - ratio * span;
    const y = padding.top + ratio * innerHeight;

    return { value, y };
  });
  const xTickCount = Math.min(5, safePoints.length);
  const xTicks = Array.from({ length: xTickCount }, (_, index) => {
    const pointIndex =
      xTickCount === 1 ? 0 : Math.round((index / (xTickCount - 1)) * (safePoints.length - 1));
    const point = normalizedPoints[pointIndex];

    return {
      point,
      x: point?.x ?? padding.left,
    };
  });

  return {
    max,
    min,
    points: normalizedPoints,
    zeroY,
    yTicks,
    xTicks,
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

function getNearestPoint(points = [], xCoordinate) {
  if (!points.length) {
    return null;
  }

  return points.reduce((nearest, point) => {
    if (!nearest) {
      return point;
    }

    return Math.abs(point.x - xCoordinate) < Math.abs(nearest.x - xCoordinate) ? point : nearest;
  }, null);
}

function getSvgCoordinates(event, width, height) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * width;
  const y = ((event.clientY - rect.top) / rect.height) * height;

  return { x, y };
}

function AxisLabels({ normalized, width, height, padding, precision }) {
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

function Tooltip({ height, padding, point, width }) {
  if (!point) {
    return null;
  }

  const tooltipWidth = 154;
  const tooltipHeight = 58;
  const x =
    point.x > width - padding.right - tooltipWidth - 14
      ? point.x - tooltipWidth - 14
      : point.x + 14;
  const y = point.y < padding.top + tooltipHeight + 8 ? point.y + 14 : point.y - tooltipHeight - 12;

  return (
    <g className="skyweb-sparkline-tooltip" pointerEvents="none">
      <line
        className="skyweb-sparkline-hover-line"
        x1={point.x}
        x2={point.x}
        y1={padding.top}
        y2={height - padding.bottom}
      />
      <circle className="skyweb-sparkline-hover-point" cx={point.x} cy={point.y} r="6" />
      <rect height={tooltipHeight} rx="9" width={tooltipWidth} x={x} y={y} />
      <text x={x + 10} y={y + 20}>
        <tspan className="skyweb-sparkline-tooltip-label">{point.label || 'Point'}</tspan>
        <tspan className="skyweb-sparkline-tooltip-value" dy="18" x={x + 10}>
          {formatNumber(point.numericValue ?? point.value)}
        </tspan>
      </text>
    </g>
  );
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
  const resolvedPadding = useMemo(() => getPadding(padding, precision), [padding, precision]);
  const normalized = useMemo(
    () =>
      normalizePoints(points, width, precision ? Math.max(height, 300) : height, resolvedPadding),
    [height, points, precision, resolvedPadding, width],
  );
  const chartHeight = precision ? Math.max(height, 300) : height;
  const normalizedPoints = normalized.points;
  const path = buildPath(normalizedPoints);
  const areaPath = buildAreaPath(normalizedPoints, chartHeight, resolvedPadding);
  const firstPoint = normalizedPoints[0];
  const lastPoint = normalizedPoints[normalizedPoints.length - 1];
  const midY = chartHeight / 2;
  const [hoverPoint, setHoverPoint] = useState(null);

  if (!normalizedPoints.length) {
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
    setHoverPoint(getNearestPoint(normalizedPoints, coordinates.x));
  }

  return (
    <svg
      aria-label={label}
      className={`skyweb-sparkline skyweb-sparkline-${tone}${precision ? ' skyweb-sparkline-precision' : ''}`}
      onMouseLeave={() => setHoverPoint(null)}
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
      <path className="skyweb-sparkline-area" d={areaPath} />
      <path className="skyweb-sparkline-line" d={path} />
      {firstPoint && (
        <circle
          className="skyweb-sparkline-point-muted"
          cx={firstPoint.x}
          cy={firstPoint.y}
          r="4"
        />
      )}
      {lastPoint && (
        <circle className="skyweb-sparkline-point" cx={lastPoint.x} cy={lastPoint.y} r="5" />
      )}
      {precision && (
        <Tooltip height={chartHeight} padding={resolvedPadding} point={hoverPoint} width={width} />
      )}
    </svg>
  );
}
