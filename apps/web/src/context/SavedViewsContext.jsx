import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService.js';
import { useAuth } from './AuthContext.jsx';

const SavedViewsContext = createContext(null);

function normalizeSavedView(savedView = {}) {
  return {
    ...savedView,
    viewKey: savedView.viewKey || savedView.view_key || savedView.view?.viewKey || '',
    displayLabel: savedView.displayLabel || savedView.display_label || '',
    note: savedView.note || '',
    pinned: savedView.pinned !== false,
    sortOrder: Number.isFinite(Number(savedView.sortOrder ?? savedView.sort_order))
      ? Number(savedView.sortOrder ?? savedView.sort_order)
      : 0,
  };
}

function normalizeSavedViews(savedViews = []) {
  return savedViews.map(normalizeSavedView).filter((savedView) => savedView.viewKey);
}

export function SavedViewsProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [savedViews, setSavedViews] = useState([]);
  const [loadingSavedViews, setLoadingSavedViews] = useState(false);
  const [savedViewsError, setSavedViewsError] = useState(null);

  const savedViewKeys = useMemo(
    () => new Set(savedViews.map((savedView) => savedView.viewKey).filter(Boolean)),
    [savedViews],
  );

  const resetSavedViews = useCallback(() => {
    setSavedViews([]);
    setSavedViewsError(null);
    setLoadingSavedViews(false);
  }, []);

  const refreshSavedViews = useCallback(async () => {
    if (authLoading) {
      return null;
    }

    if (!isAuthenticated) {
      resetSavedViews();
      return [];
    }

    setLoadingSavedViews(true);
    setSavedViewsError(null);

    try {
      const result = await authService.listSavedViews();
      const nextSavedViews = normalizeSavedViews(result.items || []);
      setSavedViews(nextSavedViews);
      return nextSavedViews;
    } catch (error) {
      setSavedViewsError(error);
      return null;
    } finally {
      setLoadingSavedViews(false);
    }
  }, [authLoading, isAuthenticated, resetSavedViews]);

  const saveSavedView = useCallback(async (payload = {}) => {
    const result = await authService.saveSavedView(payload);
    const nextSavedView = normalizeSavedView(result.item || {});

    setSavedViews((currentSavedViews) => {
      const remainingSavedViews = currentSavedViews.filter(
        (savedView) => savedView.viewKey !== nextSavedView.viewKey,
      );

      return [nextSavedView, ...remainingSavedViews].sort((left, right) => {
        if (left.pinned !== right.pinned) {
          return left.pinned ? -1 : 1;
        }

        return left.sortOrder - right.sortOrder;
      });
    });
    setSavedViewsError(null);

    return nextSavedView;
  }, []);

  const updateSavedView = useCallback(async (viewKey, payload = {}) => {
    const result = await authService.updateSavedView(viewKey, payload);
    const nextSavedView = normalizeSavedView(result.item || {});

    setSavedViews((currentSavedViews) =>
      currentSavedViews.map((savedView) =>
        savedView.viewKey === nextSavedView.viewKey ? nextSavedView : savedView,
      ),
    );
    setSavedViewsError(null);

    return nextSavedView;
  }, []);

  const removeSavedView = useCallback(async (viewKey) => {
    const result = await authService.removeSavedView(viewKey);
    const removedViewKey = result.viewKey || viewKey;

    setSavedViews((currentSavedViews) =>
      currentSavedViews.filter((savedView) => savedView.viewKey !== removedViewKey),
    );
    setSavedViewsError(null);

    return result;
  }, []);

  const isViewSaved = useCallback((viewKey) => savedViewKeys.has(viewKey), [savedViewKeys]);

  const getSavedView = useCallback(
    (viewKey) => savedViews.find((savedView) => savedView.viewKey === viewKey) || null,
    [savedViews],
  );

  useEffect(() => {
    let active = true;

    async function loadSavedViews() {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        resetSavedViews();
        return;
      }

      setLoadingSavedViews(true);
      setSavedViewsError(null);

      try {
        const result = await authService.listSavedViews();

        if (active) {
          setSavedViews(normalizeSavedViews(result.items || []));
        }
      } catch (error) {
        if (active) {
          setSavedViewsError(error);
        }
      } finally {
        if (active) {
          setLoadingSavedViews(false);
        }
      }
    }

    loadSavedViews();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, resetSavedViews]);

  const value = useMemo(
    () => ({
      savedViews,
      savedViewKeys,
      loadingSavedViews,
      savedViewsError,
      getSavedView,
      isViewSaved,
      refreshSavedViews,
      removeSavedView,
      resetSavedViews,
      saveSavedView,
      updateSavedView,
    }),
    [
      savedViews,
      savedViewKeys,
      loadingSavedViews,
      savedViewsError,
      getSavedView,
      isViewSaved,
      refreshSavedViews,
      removeSavedView,
      resetSavedViews,
      saveSavedView,
      updateSavedView,
    ],
  );

  return <SavedViewsContext.Provider value={value}>{children}</SavedViewsContext.Provider>;
}

export function useSavedViews() {
  const value = useContext(SavedViewsContext);

  if (!value) {
    throw new Error('useSavedViews must be used inside SavedViewsProvider.');
  }

  return value;
}
