import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button } from "../../../src/components/Button";
import { Chip } from "../../../src/components/Chip";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import { useFiguresByStatus } from "../../../src/offline/hooks";
import type { CachedFigure } from "../../../src/offline/types";
import { track } from "../../../src/observability";
import { cx } from "../../../src/utils/cx";

const SORT_OPTIONS = [
  { id: "price_low", label: "Price Low -> High" },
  { id: "price_high", label: "Price High -> Low" },
  { id: "recent", label: "Recently Added" },
  { id: "drop", label: "Biggest Drop" },
] as const;

type SortOptionId = (typeof SORT_OPTIONS)[number]["id"];

type Retailer = "AMAZON" | "EBAY" | "TARGET" | "WALMART";

type AlertConfig = {
  targetPrice: number | null;
  retailers: Retailer[];
  notifyOnRestock: boolean;
};

const RETAILERS: { id: Retailer; label: string }[] = [
  { id: "AMAZON", label: "Amazon" },
  { id: "EBAY", label: "eBay" },
  { id: "TARGET", label: "Target" },
  { id: "WALMART", label: "Walmart" },
];

const ERA_FILTERS = [
  "All",
  "Prequel",
  "Original",
  "Sequel",
  "TV",
  "Gaming",
  "Other",
] as const;

const SERIES_FILTERS = [
  "All",
  "Black Series",
  "Vintage",
  "Archive",
  "Deluxe",
] as const;

const RETAILER_FILTERS = [
  "Any",
  "Amazon",
  "eBay",
  "Target",
  "Walmart",
] as const;

type RetailerFilter = (typeof RETAILER_FILTERS)[number];

type EraFilter = (typeof ERA_FILTERS)[number];

type SeriesFilter = (typeof SERIES_FILTERS)[number];

function normalizeText(text: string) {
  return text.toLowerCase();
}

function getSearchText(item: CachedFigure) {
  return [item.name, item.series].filter(Boolean).join(" ").toLowerCase();
}

function getEraLabel(item: CachedFigure): EraFilter {
  const text = getSearchText(item);
  if (text.includes("prequel")) return "Prequel";
  if (text.includes("original")) return "Original";
  if (text.includes("sequel")) return "Sequel";
  if (text.includes("tv")) return "TV";
  if (text.includes("gaming")) return "Gaming";
  return "Other";
}

function getSeriesLabel(item: CachedFigure): SeriesFilter {
  const text = getSearchText(item);
  for (const series of SERIES_FILTERS) {
    if (series === "All") continue;
    if (text.includes(normalizeText(series))) {
      return series;
    }
  }
  return "All";
}

function getRetailers(item: CachedFigure): Retailer[] {
  const text = getSearchText(item);
  const result: Retailer[] = [];
  if (text.includes("amazon")) result.push("AMAZON");
  if (text.includes("ebay")) result.push("EBAY");
  if (text.includes("target")) result.push("TARGET");
  if (text.includes("walmart")) result.push("WALMART");
  if (result.length) return result;
  return ["AMAZON", "EBAY", "TARGET", "WALMART"];
}

function getBestListingUrl(item: CachedFigure, preferred?: Retailer) {
  const query = encodeURIComponent(
    [item.name, item.series].filter(Boolean).join(" ")
  );
  const order: Retailer[] = preferred
    ? [preferred, "AMAZON", "TARGET", "WALMART", "EBAY"].filter(
        (value, index, array) => array.indexOf(value) === index
      )
    : ["AMAZON", "TARGET", "WALMART", "EBAY"];

  const retailer = order[0];
  switch (retailer) {
    case "TARGET":
      return `https://www.target.com/s?searchTerm=${query}`;
    case "WALMART":
      return `https://www.walmart.com/search?q=${query}`;
    case "EBAY":
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
    case "AMAZON":
    default:
      return `https://www.amazon.com/s?k=${query}`;
  }
}

function getStockStatus(item: CachedFigure) {
  if (item.inStock === true) return "IN_STOCK" as const;
  if (item.inStock === false) return "RESTOCKING" as const;
  return "UNKNOWN" as const;
}

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return `$${value.toFixed(2)}`;
}

function getDropValue(item: CachedFigure) {
  if (item.purchasePrice && item.lastPrice) {
    return item.purchasePrice - item.lastPrice;
  }
  return null;
}

export default function WishlistScreen() {
  const { isOnline, syncNow } = useOfflineStatus();
  const { data, refresh } = useFiguresByStatus("WISHLIST");
  const params = useLocalSearchParams<{ figureId?: string }>();
  const [activeSort, setActiveSort] = useState<SortOptionId>("recent");
  const [exclusiveOnly, setExclusiveOnly] = useState(false);
  const [activeRetailer, setActiveRetailer] = useState<RetailerFilter>("Any");
  const [activeEra, setActiveEra] = useState<EraFilter>("All");
  const [activeSeries, setActiveSeries] = useState<SeriesFilter>("All");
  const [alertItem, setAlertItem] = useState<CachedFigure | null>(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertRetailers, setAlertRetailers] = useState<Retailer[]>([
    "AMAZON",
    "TARGET",
  ]);
  const [alertNotifyRestock, setAlertNotifyRestock] = useState(true);
  const [configuredAlerts, setConfiguredAlerts] = useState<
    Record<string, AlertConfig>
  >({});

  useEffect(() => {
    track("wishlist_viewed");
  }, []);

  useEffect(() => {
    if (!isOnline) {
      return;
    }
    void syncNow().then(() => refresh());
  }, [isOnline, refresh, syncNow]);

  const filteredData = useMemo(() => {
    const normalizedRetailer = activeRetailer.toLowerCase();
    return data.filter((item) => {
      const searchText = getSearchText(item);
      if (exclusiveOnly && !searchText.includes("exclusive")) {
        return false;
      }
      if (activeRetailer !== "Any") {
        const retailers = getRetailers(item).map((retailer) => retailer.toLowerCase());
        if (!retailers.includes(normalizedRetailer)) {
          return false;
        }
      }
      if (activeEra !== "All" && getEraLabel(item) !== activeEra) {
        return false;
      }
      if (activeSeries !== "All" && getSeriesLabel(item) !== activeSeries) {
        return false;
      }
      return true;
    });
  }, [
    data,
    exclusiveOnly,
    activeRetailer,
    activeEra,
    activeSeries,
  ]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      switch (activeSort) {
        case "price_low": {
          return (a.lastPrice ?? Infinity) - (b.lastPrice ?? Infinity);
        }
        case "price_high": {
          return (b.lastPrice ?? -Infinity) - (a.lastPrice ?? -Infinity);
        }
        case "drop": {
          const aDrop = getDropValue(a) ?? -Infinity;
          const bDrop = getDropValue(b) ?? -Infinity;
          return bDrop - aDrop;
        }
        case "recent":
        default: {
          const aTime = Date.parse(a.updatedAt);
          const bTime = Date.parse(b.updatedAt);
          return (bTime || 0) - (aTime || 0);
        }
      }
    });
    return sorted;
  }, [filteredData, activeSort]);

  const openAlertSheet = (item: CachedFigure) => {
    const existing = configuredAlerts[item.id];
    setAlertTargetPrice(
      existing?.targetPrice?.toFixed(2) ??
        (item.lastPrice ? item.lastPrice.toFixed(2) : "")
    );
    setAlertRetailers(existing?.retailers ?? getRetailers(item));
    setAlertNotifyRestock(existing?.notifyOnRestock ?? true);
    setAlertItem(item);
    track("wishlist_price_alert_configured");
  };

  const closeAlertSheet = () => setAlertItem(null);

  const saveAlert = () => {
    if (!alertItem) return;
    const parsedTarget = Number.parseFloat(alertTargetPrice);
    const resolvedRetailers =
      alertRetailers.length > 0 ? alertRetailers : getRetailers(alertItem);
    setConfiguredAlerts((prev) => ({
      ...prev,
      [alertItem.id]: {
        targetPrice: Number.isFinite(parsedTarget) ? parsedTarget : null,
        retailers: resolvedRetailers,
        notifyOnRestock: alertNotifyRestock,
      },
    }));
    closeAlertSheet();
  };

  const renderItem = ({ item }: { item: CachedFigure }) => {
    const status = getStockStatus(item);
    const statusLabel =
      status === "IN_STOCK"
        ? "In stock"
        : status === "RESTOCKING"
          ? "Restocking"
          : "Unknown";
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
    const dropValue = getDropValue(item);
    const alertConfig = configuredAlerts[item.id];
    const alertConfigured = Boolean(alertConfig);
    const preferredRetailer = alertConfig?.retailers[0] ?? getRetailers(item)[0];
    const bestUrl = getBestListingUrl(item, preferredRetailer);

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
          <Pressable
            onPress={() => openAlertSheet(item)}
            className={cx(
              "h-9 w-9 items-center justify-center rounded-full border",
              alertConfigured
                ? "border-bright-cyan/60 bg-bright-cyan/20"
                : "border-hud-line/60 bg-raised-surface/70"
            )}
            accessibilityLabel="Configure price alert"
          >
            <Ionicons
              name={alertConfigured ? "notifications" : "notifications-outline"}
              size={18}
              color={alertConfigured ? "#22d3ee" : "#94a3b8"}
            />
          </Pressable>
        </View>

        <View className="mt-3 flex-row items-center gap-2">
          <View className={cx("rounded-full border px-2.5 py-1", statusClass)}>
            <Text
              className={cx(
                "text-[10px] font-space-semibold uppercase tracking-widest",
                statusTextClass
              )}
            >
              {statusLabel}
            </Text>
          </View>
          <Text className="text-xs text-secondary-text">
            Updated {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-[2px] text-muted-text">
              Latest Price
            </Text>
            <Text className="mt-1 text-lg font-space-bold text-frost-text">
              {formatPrice(item.lastPrice)}
            </Text>
          </View>
          <View>
            <Text className="text-xs uppercase tracking-[2px] text-muted-text">
              Drop
            </Text>
            <Text className="mt-1 text-sm font-space-semibold text-bright-cyan">
              {dropValue !== null ? `-$${dropValue.toFixed(2)}` : "--"}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center gap-3">
          {status === "RESTOCKING" ? (
            <Button label="Restocking" variant="secondary" disabled />
          ) : (
            <Button
              label={isOnline ? "Find Online" : "Offline"}
              disabled={!isOnline}
              onPress={async () => {
                if (!isOnline) return;
                track("wishlist_open_listing");
                await WebBrowser.openBrowserAsync(bestUrl, {
                  presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                });
              }}
            />
          )}
          <Pressable
            onPress={() => openAlertSheet(item)}
            className="flex-1 items-center justify-center rounded-xl border border-hud-line/60 bg-raised-surface/60 px-4 py-3"
          >
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              {alertConfigured ? "Alert Active" : "Set Alert"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Wishlist"
        subtitle={`${isOnline ? "Online" : "Offline"} · Cached ${data.length} items`}
        rightSlot={
          <Pressable
            onPress={() => {
              track("wishlist_sync_tapped");
              void syncNow().then(() => refresh());
            }}
            className="rounded-full border border-hud-line/70 bg-raised-surface/60 px-3 py-1"
          >
            <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
              Sync
            </Text>
          </Pressable>
        }
      />

      <FlatList
        data={sortedData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View>
            {params.figureId ? (
              <View className="mb-3 rounded-xl border border-hud-line/60 bg-raised-surface/60 px-4 py-3">
                <Text className="text-xs text-secondary-text">
                  Highlighted from notification: {params.figureId}
                </Text>
              </View>
            ) : null}

            {!isOnline ? (
              <View className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <Text className="text-xs text-amber-200">
                  Offline mode: links are disabled, cached data shown.
                </Text>
              </View>
            ) : null}

            <View className="mb-3">
              <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
                Filters
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <Chip
                  label="Exclusives"
                  selected={exclusiveOnly}
                  onPress={() => {
                    track("wishlist_filter_applied");
                    setExclusiveOnly((prev) => !prev);
                  }}
                />
                <Chip
                  label={`Retailer: ${activeRetailer}`}
                  selected={activeRetailer !== "Any"}
                  onPress={() => {
                    track("wishlist_filter_applied");
                    setActiveRetailer((prev) => {
                      const index = RETAILER_FILTERS.indexOf(prev);
                      return RETAILER_FILTERS[(index + 1) % RETAILER_FILTERS.length];
                    });
                  }}
                />
                <Chip
                  label={`Era: ${activeEra}`}
                  selected={activeEra !== "All"}
                  onPress={() => {
                    track("wishlist_filter_applied");
                    setActiveEra((prev) => {
                      const index = ERA_FILTERS.indexOf(prev);
                      return ERA_FILTERS[(index + 1) % ERA_FILTERS.length];
                    });
                  }}
                />
                <Chip
                  label={`Series: ${activeSeries}`}
                  selected={activeSeries !== "All"}
                  onPress={() => {
                    track("wishlist_filter_applied");
                    setActiveSeries((prev) => {
                      const index = SERIES_FILTERS.indexOf(prev);
                      return SERIES_FILTERS[(index + 1) % SERIES_FILTERS.length];
                    });
                  }}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
                Sort
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.label}
                    selected={activeSort === option.id}
                    onPress={() => {
                      track("wishlist_sort_changed");
                      setActiveSort(option.id);
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="rounded-xl border border-hud-line/60 bg-raised-surface/60 px-4 py-5">
            <Text className="text-center text-xs text-secondary-text">
              No cached wishlist items yet.
            </Text>
          </View>
        }
        renderItem={renderItem}
      />

      <Modal
        visible={Boolean(alertItem)}
        transparent
        animationType="slide"
        onRequestClose={closeAlertSheet}
      >
        <View className="flex-1 justify-end bg-black/70">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View className="rounded-t-3xl border border-hud-line/70 bg-hud-surface px-5 pb-8 pt-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-space-semibold text-frost-text">
                  Price Alert
                </Text>
                <Pressable onPress={closeAlertSheet}>
                  <Ionicons name="close" size={20} color="#94a3b8" />
                </Pressable>
              </View>
              <Text className="mt-2 text-xs text-secondary-text">
                Set a target price and retailers to watch. Alerts are rate-limited with a
                24-hour cooldown.
              </Text>

              <View className="mt-4">
                <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
                  Target Price
                </Text>
                <View className="mt-2 flex-row items-center rounded-xl border border-hud-line/70 bg-void px-3 py-2">
                  <Text className="mr-2 text-base text-secondary-text">$</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                    value={alertTargetPrice}
                    onChangeText={setAlertTargetPrice}
                  />
                </View>
              </View>

              <View className="mt-5">
                <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
                  Retailers
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {RETAILERS.map((retailer) => {
                    const selected = alertRetailers.includes(retailer.id);
                    return (
                      <Pressable
                        key={retailer.id}
                        onPress={() => {
                          setAlertRetailers((prev) => {
                            if (prev.includes(retailer.id)) {
                              return prev.filter((value) => value !== retailer.id);
                            }
                            return [...prev, retailer.id];
                          });
                        }}
                        className={cx(
                          "rounded-full border px-3 py-1.5",
                          selected
                            ? "border-bright-cyan/70 bg-bright-cyan/20"
                            : "border-hud-line/60 bg-raised-surface/60"
                        )}
                      >
                        <Text
                          className={cx(
                            "text-[10px] font-space-semibold uppercase tracking-widest",
                            selected ? "text-bright-cyan" : "text-secondary-text"
                          )}
                        >
                          {retailer.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="mt-5 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
                    Notify on Restock
                  </Text>
                  <Text className="mt-1 text-xs text-secondary-text">
                    If out of stock, alert when listings reappear.
                  </Text>
                </View>
                <Switch
                  value={alertNotifyRestock}
                  onValueChange={setAlertNotifyRestock}
                  trackColor={{ false: "#1e293b", true: "#22d3ee" }}
                  thumbColor="#f8fafc"
                />
              </View>

              <View className="mt-6 gap-3">
                <Button label="Save Alert" onPress={saveAlert} />
                <Button label="Cancel" variant="ghost" onPress={closeAlertSheet} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  input: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 16,
    fontFamily: "SpaceGrotesk_500Medium",
  },
});
