import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import { useFiguresByStatus } from "../../../src/offline/hooks";
import type { CachedFigure } from "../../../src/offline/types";
import { track } from "../../../src/observability";
import { cx } from "../../../src/utils/cx";

function getStockStatus(item: CachedFigure) {
  if (item.inStock === true) return "IN_STOCK" as const;
  if (item.inStock === false) return "RESTOCKING" as const;
  return "UNKNOWN" as const;
}

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return `$${value.toFixed(2)}`;
}

function getBestListingUrl(item: CachedFigure) {
  const query = encodeURIComponent(
    [item.name, item.series].filter(Boolean).join(" ")
  );
  return `https://www.amazon.com/s?k=${query}`;
}

export default function PriceTrackerScreen() {
  const { isOnline, syncNow } = useOfflineStatus();
  const { data } = useFiguresByStatus("WISHLIST");

  const summary = useMemo(() => {
    const total = data.length;
    const restocking = data.filter((item) => item.inStock === false).length;
    const tracked = data.filter((item) => item.lastPrice !== null).length;
    return { total, restocking, tracked };
  }, [data]);

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Price Tracker"
        subtitle={`${isOnline ? "Online" : "Offline"} · ${summary.total} items`}
        rightSlot={
          <Pressable
            onPress={() => {
              track("wishlist_sync_tapped");
              void syncNow();
            }}
            className="rounded-full border border-hud-line/70 bg-raised-surface/60 px-3 py-1"
          >
            <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
              Sync
            </Text>
          </Pressable>
        }
      />

      <View className="px-4 pt-4">
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-xl border border-hud-line/60 bg-hud-surface px-4 py-3">
            <Text className="text-xs uppercase tracking-[2px] text-muted-text">
              Tracked
            </Text>
            <Text className="mt-1 text-lg font-space-bold text-frost-text">
              {summary.tracked}
            </Text>
          </View>
          <View className="flex-1 rounded-xl border border-hud-line/60 bg-hud-surface px-4 py-3">
            <Text className="text-xs uppercase tracking-[2px] text-muted-text">
              Restocking
            </Text>
            <Text className="mt-1 text-lg font-space-bold text-frost-text">
              {summary.restocking}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="rounded-xl border border-hud-line/60 bg-raised-surface/60 px-4 py-5">
            <Text className="text-center text-xs text-secondary-text">
              No tracked items yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = getStockStatus(item);
          const statusClass =
            status === "IN_STOCK"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : status === "RESTOCKING"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                : "bg-slate-500/15 border-slate-500/40 text-secondary-text";
          const statusTextClass =
            status === "IN_STOCK"
              ? "text-emerald-300"
              : status === "RESTOCKING"
                ? "text-amber-200"
                : "text-secondary-text";
          return (
            <View className="rounded-2xl border border-hud-line/60 bg-hud-surface px-4 py-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-space-semibold text-frost-text" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-xs text-secondary-text" numberOfLines={1}>
                    {item.series ?? "Unknown series"}
                  </Text>
                </View>
                <Ionicons name="pulse" size={18} color="#22d3ee" />
              </View>

              <View className="mt-3 flex-row items-center gap-2">
                <View className={cx("rounded-full border px-2.5 py-1", statusClass)}>
                  <Text
                    className={cx(
                      "text-[10px] font-space-semibold uppercase tracking-widest",
                      statusTextClass
                    )}
                  >
                    {status === "IN_STOCK"
                      ? "In stock"
                      : status === "RESTOCKING"
                        ? "Restocking"
                        : "Unknown"}
                  </Text>
                </View>
                <Text className="text-xs text-secondary-text">
                  Latest {formatPrice(item.lastPrice)}
                </Text>
              </View>

              <View className="mt-4">
                <Button
                  label={isOnline ? "Find Online" : "Offline"}
                  disabled={!isOnline}
                  onPress={async () => {
                    if (!isOnline) return;
                    track("wishlist_open_listing");
                    await WebBrowser.openBrowserAsync(getBestListingUrl(item), {
                      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                    });
                  }}
                />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
});
