import MultiSeriesMacroChart from './charts/echarts/MultiSeriesMacroChart.jsx';
import { COMPACT_MULTI_CHART_HEIGHT, DEFAULT_CHART_PADDING } from './charts/shared/chartTypes.js';

export default function MultiSeriesSparkline({
  alertOverlays = {},
  className = '',
  emptyMessage = 'No numeric comparison data available.',
  error = null,
  seriesList = [],
  height = COMPACT_MULTI_CHART_HEIGHT,
  loading = false,
  padding = DEFAULT_CHART_PADDING,
  label = 'Series comparison',
  precision = false,
}) {
  return (
    <MultiSeriesMacroChart
      alertOverlays={alertOverlays}
      className={className}
      emptyMessage={emptyMessage}
      error={error}
      height={height}
      label={label}
      loading={loading}
      padding={padding}
      precision={precision}
      seriesList={seriesList}
    />
  );
}
