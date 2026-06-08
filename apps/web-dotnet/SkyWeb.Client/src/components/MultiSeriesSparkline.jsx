import MultiSeriesMacroChart from './charts/echarts/MultiSeriesMacroChart.jsx';
import { COMPACT_MULTI_CHART_HEIGHT, DEFAULT_CHART_PADDING } from './charts/shared/chartTypes.js';

export default function MultiSeriesSparkline({
  seriesList = [],
  width = 720,
  height = COMPACT_MULTI_CHART_HEIGHT,
  padding = DEFAULT_CHART_PADDING,
  label = 'Series comparison',
  precision = false,
}) {
  return (
    <MultiSeriesMacroChart
      height={height}
      label={label}
      padding={padding}
      precision={precision}
      seriesList={seriesList}
      styleWidth={width}
    />
  );
}
