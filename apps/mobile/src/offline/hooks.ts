import { useCallback, useEffect, useState } from "react";
import {
  getCachedDashboardSummary,
  getDashboardSummary,
  getFigureById,
  getFigureByFigureId,
  listFiguresByStatus,
  listRecentFigures,
  upsertFigureRecord,
  updateFigureDetails,
  updateFigureStatus,
} from "./cache";
import { queueMutation } from "./queue";
import { subscribeToFigureChanges } from "./events";
import type { CachedFigure, DashboardSummary, FigureStatus } from "./types";

export function useFiguresByStatus(status: FigureStatus) {
  const [data, setData] = useState<CachedFigure[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const figures = await listFiguresByStatus(status);
    setData(figures);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    let mounted = true;
    load().catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    const unsubscribe = subscribeToFigureChanges(() => {
      load().catch(() => undefined);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [load]);

  return { data, loading, refresh: load };
}

export function useDashboardSummary() {
  const cached = getCachedDashboardSummary();
  const [summary, setSummary] = useState<DashboardSummary>(
    cached ?? {
      totalOwned: 0,
      totalWishlist: 0,
      pendingSync: 0,
      estimatedValue: 0,
      completionPercent: 0,
    }
  );
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const result = await getDashboardSummary();
      setSummary(result);
      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    load(Boolean(cached)).catch(() => {
      setLoading(false);
      setRefreshing(false);
    });
    const unsubscribe = subscribeToFigureChanges(() => {
      load(true).catch(() => undefined);
    });
    return () => unsubscribe();
  }, [cached, load]);

  return { summary, loading, refreshing };
}

export function useRecentFigures(limit: number) {
  const [data, setData] = useState<CachedFigure[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const figures = await listRecentFigures(limit);
    setData(figures);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    let mounted = true;
    load().catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    const unsubscribe = subscribeToFigureChanges(() => {
      load().catch(() => undefined);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [load]);

  return { data, loading, refresh: load };
}

export function useFigureByFigureId(figureId?: string | null) {
  const [data, setData] = useState<CachedFigure | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!figureId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const figure = await getFigureByFigureId(figureId);
    setData(figure);
    setLoading(false);
  }, [figureId]);

  useEffect(() => {
    let mounted = true;
    load().catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    const unsubscribe = subscribeToFigureChanges(() => {
      load().catch(() => undefined);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [load]);

  return { data, loading, refresh: load };
}

export function useFigureById(id?: string | null) {
  const [data, setData] = useState<CachedFigure | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const figure = await getFigureById(id);
    setData(figure);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    load().catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    const unsubscribe = subscribeToFigureChanges(() => {
      load().catch(() => undefined);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [load]);

  return { data, loading, refresh: load };
}

export function useUpdateFigureStatus() {
  return useCallback(async (id: string, status: FigureStatus) => {
    const updated = await updateFigureStatus(id, status);
    if (updated) {
      await queueMutation({
        type: "status_update",
        entityId: id,
        payload: {
          status,
          updatedAt: updated.updatedAt,
        },
      });
    }
    return updated;
  }, []);
}

export function useUpsertFigureRecord() {
  return useCallback(
    async (
      input: Parameters<typeof upsertFigureRecord>[0],
      queueCreate?: {
        figureId: string;
        status: FigureStatus;
        name: string;
        series: string | null;
        updatedAt: string;
      }
    ) => {
      const updated = await upsertFigureRecord(input);
      if (queueCreate) {
        await queueMutation({
          type: "create_user_figure",
          entityId: input.id,
          payload: queueCreate,
        });
      }
      return updated;
    },
    []
  );
}

export function useUpdateFigureDetails() {
  return useCallback(
    async (id: string, payload: Parameters<typeof updateFigureDetails>[1]) => {
      const updated = await updateFigureDetails(id, payload);
      if (updated) {
        await queueMutation({
          type: "details_update",
          entityId: id,
          payload: {
            condition: updated.condition ?? null,
            purchasePrice: updated.purchasePrice ?? null,
            purchaseCurrency: updated.purchaseCurrency ?? null,
            purchaseDate: updated.purchaseDate ?? null,
            notes: updated.notes ?? null,
            photoRefs: updated.photoRefs ?? null,
            updatedAt: updated.updatedAt,
          },
        });
      }
      return updated;
    },
    []
  );
}
