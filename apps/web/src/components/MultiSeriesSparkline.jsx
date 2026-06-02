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
    };
  }

  const values = safeSeries.flatMap((series) => series.points.map((point) => Number(point.value)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const largestPointCount = Math.max(...safeSeries.map((series) => series.points.length), 1);
  const xSpan = Math.max(largestPointCount - 1, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const zeroY = min < 0 && max > 0 ? padding + (1 - (0 - min) / span) * innerHeight : null;

  return {
    max,
    min,
    zeroY,
    seriesList: safeSeries.map((series) => ({
      ...series,
      points: series.points.map((point, index) => {
        const x = padding + (index / xSpan) * innerWidth;
        const y = padding + (1 - (Number(point.value) - min) / span) * innerHeight;

        return {
          ...point,
          x,
          y,
        };
      }),
    })),
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
  const floor = height - padding;

  return `${linePath} L ${last.x.toFixed(2)} ${floor} L ${first.x.toFixed(2)} ${floor} Z`;
}

export default function MultiSeriesSparkline({
  seriesList = [],
  width = 720,
  height = 220,
  padding = 18,
  label = 'Multi-series trend lines',
}) {
  const normalized = normalizeSeries(seriesList, width, height, padding);
  const midY = height / 2;

  if (!normalized.seriesList.length) {
    return (
      <div className="skyweb-sparkline-empty">
        <span>No numeric trend data available.</span>
      </div>
    );
  }

  return (
    <svg
      aria-label={label}
      className="skyweb-sparkline skyweb-multi-sparkline"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <line
        className="skyweb-sparkline-gridline"
        x1={padding}
        x2={width - padding}
        y1={padding}
        y2={padding}
      />
      <line
        className="skyweb-sparkline-gridline"
        x1={padding}
        x2={width - padding}
        y1={midY}
        y2={midY}
      />
      <line
        className="skyweb-sparkline-gridline"
        x1={padding}
        x2={width - padding}
        y1={height - padding}
        y2={height - padding}
      />
      {normalized.zeroY !== null && (
        <line
          className="skyweb-sparkline-zero"
          x1={padding}
          x2={width - padding}
          y1={normalized.zeroY}
          y2={normalized.zeroY}
        />
      )}
      {normalized.seriesList.map((series, index) => {
        const path = buildPath(series.points);
        const areaPath = buildAreaPath(series.points, height, padding);
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
    </svg>
  );
}
