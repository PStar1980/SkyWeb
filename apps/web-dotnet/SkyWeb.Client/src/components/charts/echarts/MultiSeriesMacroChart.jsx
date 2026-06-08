import { useMemo } from 'react';
import { DEFAULT_CHART_PADDING, PRECISION_MULTI_CHART_HEIGHT } from '../shared/chartTypes.js';
import { buildMultiSeriesMacroOption } from '../shared/chartOptions.js';
import { getChartPadding, normalizeChartSeries } from '../shared/chartUtils.js';
import EChartBase from './EChartBase.jsx';

export default function MultiSeriesMacroChart({
  className = '',
  emptyMessage = 'No numeric comparison data available.',
  error = null,
  height = 240,
  label = 'Series comparison',
  loading = false,
  padding = DEFAULT_CHART_PADDING,
  precision = false,
  seriesList = [],
}) {
  const chartHeight = precision ? Math.max(height, PRECISION_MULTI_CHART_HEIGHT) : height;
  const resolvedPadding = useMemo(() => getChartPadding(padding, precision), [padding, precision]);
  const safeSeries = useMemo(() => normalizeChartSeries(seriesList), [seriesList]);
  const option = useMemo(
    () =>
      buildMultiSeriesMacroOption({
        label,
        padding: resolvedPadding,
        precision,
        seriesList: safeSeries,
      }),
    [label, precision, resolvedPadding, safeSeries],
  );

  return (
    <EChartBase
      ariaLabel={label}
      className={`skyweb-sparkline skyweb-echarts skyweb-echarts-multi${precision ? ' skyweb-sparkline-precision skyweb-echarts-precision' : ''} ${className}`}
      emptyMessage={emptyMessage}
      error={error}
      height={chartHeight}
      loading={loading}
      option={option}
    />
  );
}
