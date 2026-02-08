import { useCallback, useEffect, useState } from "react";
import {
  getDashboardSummary,
  listFiguresByStatus,
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
