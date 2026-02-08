import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
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
  const [isOnline, setIsOnline] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
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
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setIsOnline(online);
      if (online) {
        syncPendingMutations().catch(() => undefined);
      }
    });

    return () => unsubscribe();
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      return { synced: 0, skipped: true };
    }

    return syncPendingMutations();
  }, [isOnline]);

  const value = useMemo(
    () => ({
      isOnline,
      syncNow,
    }),
    [isOnline, syncNow]
  );

  if (!ready) {
    return null;
  }

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOfflineStatus() {
  return React.useContext(OfflineContext);
}
