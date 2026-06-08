import { buildSeries, getSeriesCatalog } from '../../../utils/charting.js';

export function adaptViewRowsToMultiSeries({
  columns = [],
  rows = [],
  selectedKeys = [],
  title = '',
} = {}) {
  const catalog = getSeriesCatalog(rows, columns);
  const selectedSet = new Set(selectedKeys.filter(Boolean));
  const selectedCatalog = selectedSet.size
    ? catalog.filter((item) => selectedSet.has(item.key))
    : catalog;

  return {
    title,
    series: selectedCatalog.map((metric) => ({
      key: metric.key,
      label: metric.label,
      points: metric.series,
      summary: metric.summary,
    })),
  };
}

export function adaptViewRowsToSingleSeries({ key, rows = [], title = '' } = {}) {
  const points = key ? buildSeries(rows, key) : [];

  return {
    key,
    title,
    points,
  };
}
