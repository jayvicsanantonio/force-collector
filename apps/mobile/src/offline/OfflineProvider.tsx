import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
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
