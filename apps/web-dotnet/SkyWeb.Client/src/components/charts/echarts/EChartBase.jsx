import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Central ECharts registration for the .NET-lane chart stack.
echarts.use([
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export default function EChartBase({
  ariaLabel = 'SkyWeb chart',
  className = '',
  emptyMessage = 'No numeric trend data available.',
  error = null,
  height = 220,
  loading = false,
  option = null,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !option) {
      return undefined;
    }

    chartRef.current = echarts.init(containerRef.current, null, {
      renderer: 'canvas',
      useDirtyRect: true,
    });

    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.resize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [option]);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  if (loading) {
    return (
      <div className="skyweb-sparkline-empty skyweb-echarts-state" style={{ minHeight: height }}>
        <span>Loading chart...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="skyweb-sparkline-empty skyweb-echarts-state" style={{ minHeight: height }}>
        <span>{error.message || 'Chart unavailable.'}</span>
      </div>
    );
  }

  if (!option) {
    return (
      <div className="skyweb-sparkline-empty skyweb-echarts-state" style={{ minHeight: height }}>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={`skyweb-echarts-base ${className}`.trim()}
      ref={containerRef}
      role="img"
      style={{ height: `${height}px` }}
    />
  );
}
