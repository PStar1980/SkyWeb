import { useEffect, useRef, useState } from 'react';
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

function ChartRuntimeState({ detail = '', height, icon = '•', title }) {
  return (
    <div className="skyweb-sparkline-empty skyweb-echarts-state" style={{ minHeight: height }}>
      <span aria-hidden="true" className="skyweb-echarts-state-icon">
        {icon}
      </span>
      <span className="skyweb-echarts-state-title">{title}</span>
      {detail && <span className="skyweb-echarts-state-detail">{detail}</span>}
    </div>
  );
}

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
  const [renderError, setRenderError] = useState(null);

  const activeError = error || renderError;
  const shouldRenderChart = Boolean(option && !loading && !activeError);

  useEffect(() => {
    setRenderError(null);
  }, [option]);

  useEffect(() => {
    if (!shouldRenderChart || !containerRef.current) {
      return undefined;
    }

    chartRef.current = echarts.init(containerRef.current, null, {
      renderer: 'canvas',
      useDirtyRect: true,
    });

    const resizeChart = () => {
      chartRef.current?.resize();
    };

    let resizeObserver = null;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resizeChart);
      resizeObserver.observe(containerRef.current);
    } else {
      window.addEventListener('resize', resizeChart);
    }

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeChart);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [shouldRenderChart]);

  useEffect(() => {
    if (!shouldRenderChart || !chartRef.current) {
      return;
    }

    if (!option) {
      chartRef.current.clear();
      return;
    }

    try {
      chartRef.current.setOption(option, true);
      chartRef.current.resize();
      setRenderError(null);
    } catch (chartError) {
      setRenderError(chartError);
    }
  }, [option, shouldRenderChart]);

  if (loading) {
    return (
      <ChartRuntimeState
        detail="Preparing the latest chart surface."
        height={height}
        icon="⏳"
        title="Loading chart..."
      />
    );
  }

  if (activeError) {
    return (
      <ChartRuntimeState
        detail={activeError.message || 'The chart engine could not render this series.'}
        height={height}
        icon="⚠"
        title="Chart unavailable"
      />
    );
  }

  if (!option) {
    return <ChartRuntimeState height={height} icon="∅" title={emptyMessage} />;
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
