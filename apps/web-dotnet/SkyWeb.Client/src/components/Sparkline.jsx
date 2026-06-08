import MacroLineChart from './charts/echarts/MacroLineChart.jsx';
import { COMPACT_CHART_HEIGHT, DEFAULT_CHART_PADDING } from './charts/shared/chartTypes.js';

export default function Sparkline({
  className = '',
  emptyMessage = 'No numeric trend data available.',
  error = null,
  points = [],
  height = COMPACT_CHART_HEIGHT,
  loading = false,
  padding = DEFAULT_CHART_PADDING,
  label = 'Trend line',
  tone = 'default',
  precision = false,
}) {
  return (
    <MacroLineChart
      className={className}
      emptyMessage={emptyMessage}
      error={error}
      height={height}
      label={label}
      loading={loading}
      padding={padding}
      points={points}
      precision={precision}
      tone={tone}
    />
  );
}
