import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { fetchHydratedUserFigures } from "../api/user-figures";
import { replaceHydratedFigures } from "./cache";
import { getDatabase } from "./db";
import { syncPendingMutations } from "./sync";

type OfflineContextValue = {
  isOnline: boolean;
  syncNow: () => Promise<{ synced: number; skipped: boolean }>;
};

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  syncNow: async () => ({ synced: 0, skipped: true }),
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [ready, setReady] = useState(false);

  const hydrateFromServer = useCallback(async () => {
    if (status !== "signedIn" || !user?.id || !isOnline) {
      return;
    }

    const response = await fetchHydratedUserFigures();
    const records = response.items.map((item) => ({
      id: item.id,
      figureId: item.figure_id ?? null,
      name:
        item.figure?.name ??
        (typeof item.custom_figure_payload?.name === "string"
          ? item.custom_figure_payload.name
          : "Custom figure"),
      series:
        item.figure?.series ??
        (typeof item.custom_figure_payload?.series === "string"
          ? item.custom_figure_payload.series
          : null),
      status: item.status,
      lastPrice: item.listing_summary?.last_price ?? null,
      inStock: item.listing_summary?.in_stock ?? null,
      condition: item.condition,
      purchasePrice: item.purchase_price ?? null,
      purchaseCurrency: item.purchase_currency ?? null,
      purchaseDate: item.purchase_date ?? null,
      notes: item.notes ?? null,
      photoRefs: item.photo_refs ?? null,
      updatedAt: item.updated_at,
    }));

    await replaceHydratedFigures(records);
  }, [isOnline, status, user?.id]);

  useEffect(() => {
    if (status === "checking") {
      return;
    }

    let mounted = true;
    setReady(false);
    getDatabase()
      .then(() => {
        if (mounted) {
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [status, user?.id]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setIsOnline(online);
      if (online) {
        syncPendingMutations()
          .then(() => hydrateFromServer())
          .catch(() => undefined);
      }
    });

    return () => unsubscribe();
  }, [hydrateFromServer]);

  useEffect(() => {
    if (status !== "signedIn" || !user?.id || !isOnline) {
      return;
    }

    hydrateFromServer().catch(() => undefined);
  }, [hydrateFromServer, isOnline, status, user?.id]);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      return { synced: 0, skipped: true };
    }

    const result = await syncPendingMutations();
    await hydrateFromServer();
    return result;
  }, [hydrateFromServer, isOnline]);

  const value = useMemo(
    () => ({
      isOnline,
      syncNow,
    }),
    [isOnline, syncNow]
  );

  if (!ready && status !== "checking") {
    return null;
  }

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOfflineStatus() {
  return React.useContext(OfflineContext);
}
