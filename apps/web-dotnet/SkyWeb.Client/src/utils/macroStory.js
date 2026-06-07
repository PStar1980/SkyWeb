import { getMaxDate, parseDateOnly } from './formatters.js';

const CATEGORY_PRIORITY = [
  'rates',
  'inflation',
  'credit',
  'macro_regime',
  'liquidity',
  'labor',
  'growth',
  'housing',
  'trade',
];

const REGION_PRIORITY = ['US_CA', 'US', 'CA'];

function getStats(view = {}) {
  return view?.stats || {};
}

export function getViewRowCount(view = {}) {
  return Number(getStats(view).totalRows ?? view.totalRows ?? 0) || 0;
}

export function getViewLatestDate(view = {}) {
  return getStats(view).maxDate || view.maxDate || null;
}

export function getCategoryRank(category = '') {
  const normalizedCategory = String(category || '').toLowerCase();
  const index = CATEGORY_PRIORITY.indexOf(normalizedCategory);

  return index === -1 ? CATEGORY_PRIORITY.length + 1 : index;
}

export function getRegionRank(region = '') {
  const normalizedRegion = String(region || '').toUpperCase();
  const index = REGION_PRIORITY.indexOf(normalizedRegion);

  return index === -1 ? REGION_PRIORITY.length + 1 : index;
}

function getDateTime(value) {
  const date = parseDateOnly(value) || (value ? new Date(value) : null);

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

export function getFreshnessDays(value, now = new Date()) {
  const date = parseDateOnly(value) || (value ? new Date(value) : null);

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return Math.max(0, Math.round((todayOnly.getTime() - dateOnly.getTime()) / oneDayMs));
}

export function getFreshnessLabel(value) {
  const days = getFreshnessDays(value);

  if (days === null) {
    return 'No latest date returned';
  }

  if (days === 0) {
    return 'Current as of today';
  }

  if (days === 1) {
    return 'Updated yesterday';
  }

  if (days <= 14) {
    return `Updated ${days} days ago`;
  }

  return `Latest row is ${days} days old`;
}

function groupBy(items = [], key) {
  return items.reduce((groups, item) => {
    const groupKey = item?.[key] || 'OTHER';
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

export function summarizeViewGroups(views = [], key, options = {}) {
  const groups = groupBy(views, key);
  const totalRows = views.reduce((sum, view) => sum + getViewRowCount(view), 0);

  return Object.entries(groups)
    .map(([groupKey, groupViews]) => {
      const rows = groupViews.reduce((sum, view) => sum + getViewRowCount(view), 0);
      const latestDate = getMaxDate(groupViews.map(getViewLatestDate).filter(Boolean));
      const leadingView = [...groupViews].sort(
        (left, right) => getViewRowCount(right) - getViewRowCount(left),
      )[0];

      return {
        key: groupKey,
        views: groupViews,
        viewCount: groupViews.length,
        rows,
        rowShare: totalRows > 0 ? rows / totalRows : 0,
        latestDate,
        leadingView,
      };
    })
    .sort((left, right) => {
      if (options.priority === 'region') {
        const rankDifference = getRegionRank(left.key) - getRegionRank(right.key);

        if (rankDifference !== 0) {
          return rankDifference;
        }
      }

      if (options.priority === 'category') {
        const rankDifference = getCategoryRank(left.key) - getCategoryRank(right.key);

        if (rankDifference !== 0) {
          return rankDifference;
        }
      }

      if (right.rows !== left.rows) {
        return right.rows - left.rows;
      }

      return right.viewCount - left.viewCount;
    });
}

export function getFeaturedStoryViews(views = [], limit = 6) {
  return [...views]
    .sort((left, right) => {
      const leftCrossBorderBonus = String(left.region).toUpperCase() === 'US_CA' ? 120000 : 0;
      const rightCrossBorderBonus = String(right.region).toUpperCase() === 'US_CA' ? 120000 : 0;
      const leftCategoryBonus = (CATEGORY_PRIORITY.length - getCategoryRank(left.category)) * 2500;
      const rightCategoryBonus =
        (CATEGORY_PRIORITY.length - getCategoryRank(right.category)) * 2500;
      const leftScore =
        getViewRowCount(left) +
        leftCrossBorderBonus +
        leftCategoryBonus +
        getDateTime(getViewLatestDate(left)) / 1000000000;
      const rightScore =
        getViewRowCount(right) +
        rightCrossBorderBonus +
        rightCategoryBonus +
        getDateTime(getViewLatestDate(right)) / 1000000000;

      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export function buildOverviewStories(views = [], indicators = []) {
  const sortedByLatest = [...views]
    .filter((view) => getViewLatestDate(view))
    .sort(
      (left, right) => getDateTime(getViewLatestDate(right)) - getDateTime(getViewLatestDate(left)),
    );
  const sortedByRows = [...views].sort(
    (left, right) => getViewRowCount(right) - getViewRowCount(left),
  );
  const regionGroups = summarizeViewGroups(views, 'region', { priority: 'region' });
  const categoryGroups = summarizeViewGroups(views, 'category', { priority: 'category' });
  const crossBorderViews = views.filter((view) => String(view.region).toUpperCase() === 'US_CA');
  const latestView = sortedByLatest[0];
  const deepestView = sortedByRows[0];
  const leadingCategory = categoryGroups[0];

  return [
    {
      key: 'latest',
      kicker: 'Freshest surface',
      title: latestView?.label || 'Latest public row',
      value: latestView ? getFreshnessLabel(getViewLatestDate(latestView)) : '—',
      detail: latestView?.description || 'Most recently updated macro view in the public catalog.',
      meta: latestView?.viewKey,
      to: latestView ? `/macro/views/${latestView.viewKey}` : '/macro/views',
    },
    {
      key: 'depth',
      kicker: 'Deepest history',
      title: deepestView?.label || 'Coverage depth',
      value: getViewRowCount(deepestView).toLocaleString(),
      detail: 'Largest available public row set for long-horizon review.',
      meta: deepestView?.viewKey,
      to: deepestView ? `/macro/views/${deepestView.viewKey}` : '/macro/views',
    },
    {
      key: 'cross-border',
      kicker: 'Cross-border lens',
      title: 'U.S. / Canada comparisons',
      value: crossBorderViews.length,
      detail: 'Policy, inflation, labor, and FX views designed for Canada/U.S. context switching.',
      meta: crossBorderViews.length ? 'Open comparison views' : 'No comparison views yet',
      to: '/macro/views?region=US_CA',
    },
    {
      key: 'breadth',
      kicker: 'Catalog breadth',
      title: 'Source catalog',
      value: indicators.length,
      detail: `${views.length} curated public view(s) span ${regionGroups.length} region group(s) and ${categoryGroups.length} analytical lane(s).`,
      meta: leadingCategory
        ? `${leadingCategory.viewCount} view(s) in top lane`
        : 'Active source indicators',
      to: '/macro/indicators',
    },
  ];
}

export function buildViewSearchPath(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== 'ALL') {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `/macro/views?${queryString}` : '/macro/views';
}
