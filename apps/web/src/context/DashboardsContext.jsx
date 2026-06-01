import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService.js';
import { useAuth } from './AuthContext.jsx';

const DashboardsContext = createContext(null);

function getComparableDate(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function clampDashboardUnit(value, fallback = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(1, Math.min(4, Math.round(numericValue)));
}

function normalizeDashboardItem(item = {}) {
  return {
    ...item,
    itemId: item.itemId || item.item_id || '',
    dashboardKey: item.dashboardKey || item.dashboard_key || '',
    viewKey: item.viewKey || item.view_key || item.view?.viewKey || '',
    itemTitle: item.itemTitle || item.item_title || '',
    itemNote: item.itemNote || item.item_note || '',
    itemMode: item.itemMode || item.item_mode || 'view_card',
    sortOrder: Number.isFinite(Number(item.sortOrder ?? item.sort_order))
      ? Number(item.sortOrder ?? item.sort_order)
      : 0,
    positionRow: Number.isFinite(Number(item.positionRow ?? item.position_row))
      ? Number(item.positionRow ?? item.position_row)
      : 0,
    positionCol: Number.isFinite(Number(item.positionCol ?? item.position_col))
      ? Number(item.positionCol ?? item.position_col)
      : 0,
    widthUnits: clampDashboardUnit(item.widthUnits ?? item.width_units),
    heightUnits: clampDashboardUnit(item.heightUnits ?? item.height_units),
  };
}

function compareDashboardItems(left, right) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  const updatedDifference = getComparableDate(right.updatedAt) - getComparableDate(left.updatedAt);

  if (updatedDifference !== 0) {
    return updatedDifference;
  }

  return (left.view?.label || left.viewKey || '').localeCompare(
    right.view?.label || right.viewKey || '',
    undefined,
    { sensitivity: 'base' },
  );
}

function normalizeDashboard(dashboard = {}) {
  const items = Array.isArray(dashboard.items)
    ? dashboard.items
        .map(normalizeDashboardItem)
        .filter((item) => item.itemId)
        .sort(compareDashboardItems)
    : [];

  return {
    ...dashboard,
    dashboardId: dashboard.dashboardId || dashboard.dashboard_id || '',
    dashboardKey: dashboard.dashboardKey || dashboard.dashboard_key || '',
    title: dashboard.title || 'Untitled dashboard',
    description: dashboard.description || '',
    layoutPreset: dashboard.layoutPreset || dashboard.layout_preset || 'executive',
    isDefault: Boolean(dashboard.isDefault ?? dashboard.is_default),
    sortOrder: Number.isFinite(Number(dashboard.sortOrder ?? dashboard.sort_order))
      ? Number(dashboard.sortOrder ?? dashboard.sort_order)
      : 0,
    itemCount: Number.isFinite(Number(dashboard.itemCount ?? dashboard.item_count))
      ? Number(dashboard.itemCount ?? dashboard.item_count)
      : items.length,
    pinnedItemCount: Number.isFinite(
      Number(dashboard.pinnedItemCount ?? dashboard.pinned_item_count),
    )
      ? Number(dashboard.pinnedItemCount ?? dashboard.pinned_item_count)
      : items.filter((item) => item.savedPinned).length,
    items,
  };
}

function compareDashboards(left, right) {
  if (left.isDefault !== right.isDefault) {
    return left.isDefault ? -1 : 1;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  const updatedDifference = getComparableDate(right.updatedAt) - getComparableDate(left.updatedAt);

  if (updatedDifference !== 0) {
    return updatedDifference;
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
}

function normalizeDashboards(dashboards = []) {
  return dashboards
    .map(normalizeDashboard)
    .filter((dashboard) => dashboard.dashboardKey)
    .sort(compareDashboards);
}

export function DashboardsProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [dashboards, setDashboards] = useState([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [dashboardsError, setDashboardsError] = useState(null);

  const resetDashboards = useCallback(() => {
    setDashboards([]);
    setDashboardsError(null);
    setLoadingDashboards(false);
  }, []);

  const refreshDashboards = useCallback(async () => {
    if (authLoading) {
      return null;
    }

    if (!isAuthenticated) {
      resetDashboards();
      return [];
    }

    setLoadingDashboards(true);
    setDashboardsError(null);

    try {
      const result = await authService.listDashboards();
      const nextDashboards = normalizeDashboards(result.items || []);
      setDashboards(nextDashboards);
      return nextDashboards;
    } catch (error) {
      setDashboardsError(error);
      return null;
    } finally {
      setLoadingDashboards(false);
    }
  }, [authLoading, isAuthenticated, resetDashboards]);

  const upsertDashboard = useCallback((dashboard) => {
    const nextDashboard = normalizeDashboard(dashboard);

    if (!nextDashboard.dashboardKey) {
      return null;
    }

    setDashboards((currentDashboards) => {
      let remainingDashboards = currentDashboards.filter(
        (item) => item.dashboardKey !== nextDashboard.dashboardKey,
      );

      if (nextDashboard.isDefault) {
        remainingDashboards = remainingDashboards.map((item) => ({ ...item, isDefault: false }));
      }

      return [nextDashboard, ...remainingDashboards].sort(compareDashboards);
    });

    return nextDashboard;
  }, []);

  const createDashboard = useCallback(
    async (payload = {}) => {
      const result = await authService.createDashboard(payload);
      const nextDashboard = upsertDashboard(result.item || {});
      setDashboardsError(null);
      return nextDashboard;
    },
    [upsertDashboard],
  );

  const updateDashboard = useCallback(
    async (dashboardKey, payload = {}) => {
      const result = await authService.updateDashboard(dashboardKey, payload);
      const nextDashboard = upsertDashboard(result.item || {});
      setDashboardsError(null);
      return nextDashboard;
    },
    [upsertDashboard],
  );

  const removeDashboard = useCallback(async (dashboardKey) => {
    const result = await authService.removeDashboard(dashboardKey);
    const removedDashboardKey = result.dashboardKey || dashboardKey;

    setDashboards((currentDashboards) =>
      currentDashboards.filter((dashboard) => dashboard.dashboardKey !== removedDashboardKey),
    );
    setDashboardsError(null);

    return result;
  }, []);

  const addDashboardItem = useCallback(
    async (dashboardKey, payload = {}) => {
      const result = await authService.addDashboardItem(dashboardKey, payload);
      const nextDashboard = upsertDashboard(result.dashboard || {});
      setDashboardsError(null);
      return { ...result, dashboard: nextDashboard };
    },
    [upsertDashboard],
  );

  const updateDashboardItem = useCallback(
    async (dashboardKey, itemId, payload = {}) => {
      const result = await authService.updateDashboardItem(dashboardKey, itemId, payload);
      const nextDashboard = upsertDashboard(result.dashboard || {});
      setDashboardsError(null);
      return { ...result, dashboard: nextDashboard };
    },
    [upsertDashboard],
  );

  const removeDashboardItem = useCallback(
    async (dashboardKey, itemId) => {
      const result = await authService.removeDashboardItem(dashboardKey, itemId);
      const nextDashboard = upsertDashboard(result.dashboard || {});
      setDashboardsError(null);
      return { ...result, dashboard: nextDashboard };
    },
    [upsertDashboard],
  );

  const getDashboard = useCallback(
    (dashboardKey) =>
      dashboards.find((dashboard) => dashboard.dashboardKey === dashboardKey) || null,
    [dashboards],
  );

  const defaultDashboard = useMemo(
    () => dashboards.find((dashboard) => dashboard.isDefault) || null,
    [dashboards],
  );

  const setDefaultDashboard = useCallback(
    async (dashboardKey) => updateDashboard(dashboardKey, { isDefault: true }),
    [updateDashboard],
  );

  useEffect(() => {
    let active = true;

    async function loadDashboards() {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        resetDashboards();
        return;
      }

      setLoadingDashboards(true);
      setDashboardsError(null);

      try {
        const result = await authService.listDashboards();

        if (active) {
          setDashboards(normalizeDashboards(result.items || []));
        }
      } catch (error) {
        if (active) {
          setDashboardsError(error);
        }
      } finally {
        if (active) {
          setLoadingDashboards(false);
        }
      }
    }

    loadDashboards();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, resetDashboards]);

  const value = useMemo(
    () => ({
      addDashboardItem,
      createDashboard,
      dashboards,
      dashboardsError,
      defaultDashboard,
      getDashboard,
      loadingDashboards,
      refreshDashboards,
      removeDashboard,
      removeDashboardItem,
      resetDashboards,
      setDefaultDashboard,
      updateDashboard,
      updateDashboardItem,
    }),
    [
      addDashboardItem,
      createDashboard,
      dashboards,
      dashboardsError,
      defaultDashboard,
      getDashboard,
      loadingDashboards,
      refreshDashboards,
      removeDashboard,
      removeDashboardItem,
      resetDashboards,
      setDefaultDashboard,
      updateDashboard,
      updateDashboardItem,
    ],
  );

  return <DashboardsContext.Provider value={value}>{children}</DashboardsContext.Provider>;
}

export function useDashboards() {
  const value = useContext(DashboardsContext);

  if (!value) {
    throw new Error('useDashboards must be used inside DashboardsProvider.');
  }

  return value;
}
