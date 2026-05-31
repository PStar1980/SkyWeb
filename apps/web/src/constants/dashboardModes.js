export const DASHBOARD_ITEM_MODE_OPTIONS = [
  {
    value: 'view_card',
    label: 'View card',
    description: 'Classic saved macro view card with full metadata.',
  },
  {
    value: 'wide_card',
    label: 'Wide card',
    description: 'Classic view card promoted across the dashboard row.',
  },
  {
    value: 'compact_card',
    label: 'Compact card',
    description: 'Dense saved-view card for scan-heavy dashboards.',
  },
  {
    value: 'metric_card',
    label: 'Metric card',
    description: 'Latest preferred metric with point-change context.',
  },
  {
    value: 'mini_chart',
    label: 'Mini chart',
    description: 'Sparkline trend card for the preferred numeric metric.',
  },
  {
    value: 'latest_row',
    label: 'Latest row',
    description: 'Newest public row as a compact field panel.',
  },
  {
    value: 'table_preview',
    label: 'Table preview',
    description: 'Tiny preview table from the latest public records.',
  },
];

const DASHBOARD_ITEM_MODE_LABELS = new Map(
  DASHBOARD_ITEM_MODE_OPTIONS.map((option) => [option.value, option.label]),
);

const RICH_DASHBOARD_ITEM_MODES = new Set([
  'metric_card',
  'mini_chart',
  'latest_row',
  'table_preview',
]);

export function getDashboardItemModeLabel(itemMode = '') {
  return DASHBOARD_ITEM_MODE_LABELS.get(itemMode) || itemMode || 'View card';
}

export function isRichDashboardItemMode(itemMode = '') {
  return RICH_DASHBOARD_ITEM_MODES.has(itemMode);
}

export function normalizeDashboardItemMode(itemMode = '') {
  const normalizedMode = String(itemMode || 'view_card')
    .trim()
    .toLowerCase();
  return DASHBOARD_ITEM_MODE_LABELS.has(normalizedMode) ? normalizedMode : 'view_card';
}
