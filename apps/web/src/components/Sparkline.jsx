function normalizePoints(points = [], width, height, padding) {
  const safePoints = points.filter((point) => Number.isFinite(Number(point.value)));

  if (!safePoints.length) {
    return [];
  }

  const values = safePoints.map((point) => Number(point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xSpan = Math.max(safePoints.length - 1, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return safePoints.map((point, index) => {
    const x = padding + (index / xSpan) * innerWidth;
    const y = padding + (1 - (Number(point.value) - min) / span) * innerHeight;

    return {
      ...point,
      x,
      y,
    };
  });
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
  const floor = height - padding;

  return `${linePath} L ${last.x.toFixed(2)} ${floor} L ${first.x.toFixed(2)} ${floor} Z`;
}

export default function Sparkline({
  points = [],
  width = 720,
  height = 220,
  padding = 18,
  label = 'Trend line',
  tone = 'default',
}) {
  const normalizedPoints = normalizePoints(points, width, height, padding);
  const path = buildPath(normalizedPoints);
  const areaPath = buildAreaPath(normalizedPoints, height, padding);
  const firstPoint = normalizedPoints[0];
  const lastPoint = normalizedPoints[normalizedPoints.length - 1];

  if (!normalizedPoints.length) {
    return (
      <div className="skyweb-sparkline-empty">
        <span>No numeric trend data available.</span>
      </div>
    );
  }

  return (
    <svg
      aria-label={label}
      className={`skyweb-sparkline skyweb-sparkline-${tone}`}
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
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
    </svg>
  );
}
