export const DASHBOARD_ITEM_MODE_OPTIONS = [
  {
    value: 'view_card',
    label: 'View card',
    description: 'Analytical lens summary card with saved-view metadata.',
  },
  {
    value: 'wide_card',
    label: 'Wide card',
    description: 'Wide analytical lens card promoted across the dashboard row.',
  },
  {
    value: 'compact_card',
    label: 'Compact card',
    description: 'Dense saved lens card for scan-heavy dashboards.',
  },
  {
    value: 'metric_card',
    label: 'Metric card',
    description: 'Latest value from one direct indicator time series.',
  },
  {
    value: 'mini_chart',
    label: 'Mini chart',
    description: 'Sparkline trend card for one direct indicator time series.',
  },
  {
    value: 'latest_row',
    label: 'Latest row',
    description: 'Newest indicator point or grouped view row as a compact field panel.',
  },
  {
    value: 'table_preview',
    label: 'Table preview',
    description: 'Tiny preview table from direct indicator rows or grouped view rows.',
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
