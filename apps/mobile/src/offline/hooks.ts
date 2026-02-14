import { useCallback, useEffect, useState } from "react";
import {
  getDashboardSummary,
  getFigureByFigureId,
  listFiguresByStatus,
  upsertFigureRecord,
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
  const [summary, setSummary] = useState<DashboardSummary>({
    totalOwned: 0,
    totalWishlist: 0,
    pendingSync: 0,
  });

  const load = useCallback(async () => {
    const result = await getDashboardSummary();
    setSummary(result);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
    const unsubscribe = subscribeToFigureChanges(() => {
      load().catch(() => undefined);
    });
    return () => unsubscribe();
  }, [load]);

  return summary;
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
