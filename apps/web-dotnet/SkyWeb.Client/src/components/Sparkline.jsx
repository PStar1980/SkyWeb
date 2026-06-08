import MacroLineChart from './charts/echarts/MacroLineChart.jsx';
import { COMPACT_CHART_HEIGHT, DEFAULT_CHART_PADDING } from './charts/shared/chartTypes.js';

export default function Sparkline({
  points = [],
  width = 720,
  height = COMPACT_CHART_HEIGHT,
  padding = DEFAULT_CHART_PADDING,
  label = 'Trend line',
  tone = 'default',
  precision = false,
}) {
  return (
    <MacroLineChart
      height={height}
      label={label}
      padding={padding}
      points={points}
      precision={precision}
      styleWidth={width}
      tone={tone}
    />
  );
}
