import { useMemo } from 'react';
import { DEFAULT_CHART_PADDING, PRECISION_CHART_HEIGHT } from '../shared/chartTypes.js';
import { buildMacroLineOption } from '../shared/chartOptions.js';
import { getChartPadding, normalizeChartPoints } from '../shared/chartUtils.js';
import EChartBase from './EChartBase.jsx';

export default function MacroLineChart({
  className = '',
  emptyMessage = 'No numeric trend data available.',
  error = null,
  height = 220,
  label = 'Trend line',
  loading = false,
  padding = DEFAULT_CHART_PADDING,
  points = [],
  precision = false,
  tone = 'default',
}) {
  const chartHeight = precision ? Math.max(height, PRECISION_CHART_HEIGHT) : height;
  const resolvedPadding = useMemo(() => getChartPadding(padding, precision), [padding, precision]);
  const safePoints = useMemo(() => normalizeChartPoints(points), [points]);
  const option = useMemo(
    () =>
      buildMacroLineOption({
        label,
        padding: resolvedPadding,
        points: safePoints,
        precision,
        tone,
      }),
    [label, precision, resolvedPadding, safePoints, tone],
  );

  return (
    <EChartBase
      ariaLabel={label}
      className={`skyweb-sparkline skyweb-echarts skyweb-echarts-single skyweb-sparkline-${tone}${precision ? ' skyweb-sparkline-precision skyweb-echarts-precision' : ''} ${className}`}
      emptyMessage={emptyMessage}
      error={error}
      height={chartHeight}
      loading={loading}
      option={option}
    />
  );
}
