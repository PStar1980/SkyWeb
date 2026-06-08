import { getPreferredSeriesKey, getSeriesCatalog } from '../../../utils/charting.js';

export function getDashboardPreferredMetric(rows = []) {
  const catalog = getSeriesCatalog(rows);
  const preferredKey = getPreferredSeriesKey(catalog.map((metric) => metric.key));
  return catalog.find((metric) => metric.key === preferredKey) || catalog[0] || null;
}

export function adaptDashboardIndicatorSeries(rows = [], item = {}) {
  return {
    title: item.itemTitle || item.indicator?.description || item.indicatorCode || 'Indicator',
    points: rows,
  };
}
