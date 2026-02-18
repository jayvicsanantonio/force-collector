import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FigureSchema } from "@force-collector/shared";
import { apiRequest } from "./client";
import { env } from "../env";
import { queryKeys } from "./queryKeys";
import { useOfflineStatus } from "../offline/OfflineProvider";
import {
  getLoreCache,
  isLoreStale,
  setLoreCache,
  type LoreCacheEntry,
} from "../offline/loreCache";

const FigureLoreResponseSchema = z.object({
  figure_id: z.string(),
  lore: z.string().nullable().optional(),
  lore_updated_at: z.string().datetime().nullable().optional(),
  lore_source: z.string().nullable().optional(),
  refreshed: z.boolean().optional(),
});

type FigureLoreResponse = z.infer<typeof FigureLoreResponseSchema>;

type LoreState = {
  entry: LoreCacheEntry | null;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
};

export function useFigure(figureId?: string | null) {
  return useQuery({
    queryKey: queryKeys.figure(figureId ?? "unknown"),
    enabled: Boolean(env.API_BASE_URL && figureId),
    queryFn: () =>
      apiRequest({
        path: `/v1/figures/${figureId}`,
        schema: FigureSchema,
        auth: "required",
      }),
  });
}

async function fetchFigureLore(figureId: string, refresh: boolean) {
  return apiRequest<FigureLoreResponse>({
    path: `/v1/figures/${figureId}/lore${refresh ? "?refresh=1" : ""}`,
    schema: FigureLoreResponseSchema,
    auth: "required",
  });
}

export function useFigureLore(figureId?: string | null) {
  const { isOnline } = useOfflineStatus();
  const canFetch = Boolean(env.API_BASE_URL);
  const [state, setState] = useState<LoreState>({
    entry: null,
    loading: true,
    refreshing: false,
    stale: false,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!figureId) {
        setState({
          entry: null,
          loading: false,
          refreshing: false,
          stale: false,
          error: null,
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));
      const cached = await getLoreCache(figureId);
      if (!active) {
        return;
      }

      const stale = cached ? isLoreStale(cached.cachedAt) : true;
      setState({
        entry: cached,
        loading: false,
        refreshing: false,
        stale,
        error: null,
      });

      if (!isOnline || !stale || !canFetch) {
        return;
      }

      setState((prev) => ({ ...prev, refreshing: true, error: null }));
      try {
        const response = await fetchFigureLore(figureId, stale);
        if (!active) {
          return;
        }
        const entry: LoreCacheEntry = {
          figureId,
          lore: response.lore ?? null,
          updatedAt: response.lore_updated_at ?? null,
          source: response.lore_source ?? null,
          cachedAt: new Date().toISOString(),
        };
        await setLoreCache(entry);
        if (!active) {
          return;
        }
        setState({
          entry,
          loading: false,
          refreshing: false,
          stale: false,
          error: null,
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setState((prev) => ({
          ...prev,
          refreshing: false,
          error: "Lore refresh failed.",
        }));
      }
    };

    load().catch(() => {
      if (active) {
        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: "Lore cache failed.",
        }));
      }
    });

    return () => {
      active = false;
    };
  }, [canFetch, figureId, isOnline]);

  return useMemo(() => state, [state]);
}
