import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { PriceHistoryPoint, Retailer, RetailerListing } from "@force-collector/shared";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { Card } from "../../../src/components/Card";
import { Button } from "../../../src/components/Button";
import { PriceHistoryChart } from "../../../src/components/PriceHistoryChart";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import { useFigureByFigureId, useFigureById } from "../../../src/offline/hooks";
import { track } from "../../../src/observability";
import { cx } from "../../../src/utils/cx";
import { useSavePriceAlert, useUserFigurePrice } from "../../../src/api/price";

const RETAILER_LABELS: Record<Retailer, string> = {
  AMAZON: "Amazon",
  EBAY: "eBay",
  TARGET: "Target",
  WALMART: "Walmart",
  OTHER: "Other",
};

const RETAILER_OPTIONS: Array<{ id: Retailer; label: string }> = Object.entries(
  RETAILER_LABELS
).map(([id, label]) => ({ id: id as Retailer, label }));

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `$${value.toFixed(2)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "--";
  return date.toLocaleString();
}

function getLatestChecked(listings: RetailerListing[]) {
  if (!listings.length) return null;
  return listings.reduce<string | null>((latest, listing) => {
    if (!latest) return listing.last_checked_at;
    return Date.parse(listing.last_checked_at) > Date.parse(latest)
      ? listing.last_checked_at
      : latest;
  }, null);
}

function normalizeHistory(history: PriceHistoryPoint[]) {
  return history
    .filter((point) => Number.isFinite(point.price))
    .map((point) => ({
      price: point.price,
      capturedAt: point.captured_at,
    }))
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
}

export default function WishlistDetailsScreen() {
  const params = useLocalSearchParams<{
    figureId?: string;
    userFigureId?: string;
  }>();
  const { isOnline } = useOfflineStatus();
  const userFigureById = useFigureById(params.userFigureId ?? null);
  const userFigureByFigureId = useFigureByFigureId(params.figureId ?? null);
  const userFigure = userFigureById.data ?? userFigureByFigureId.data ?? null;
  const userFigureId = userFigure?.id ?? params.userFigureId ?? null;
  const figureId = userFigure?.figureId ?? params.figureId ?? null;

  const priceQuery = useUserFigurePrice(userFigureId);
  const saveAlert = useSavePriceAlert();

  const [alertId, setAlertId] = useState<string | null>(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertRetailers, setAlertRetailers] = useState<Retailer[]>([
    "AMAZON",
    "TARGET",
  ]);
  const [alertNotifyRestock, setAlertNotifyRestock] = useState(true);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  useEffect(() => {
    track("wishlist_details_viewed");
  }, []);

  useEffect(() => {
    if (!userFigure) {
      return;
    }
    setAlertId(null);
    setAlertNotice(null);
    setAlertError(null);
    setAlertRetailers(["AMAZON", "TARGET"]);
    setAlertNotifyRestock(true);
    setAlertTargetPrice(
      userFigure.lastPrice !== null && userFigure.lastPrice !== undefined
        ? userFigure.lastPrice.toFixed(2)
        : ""
    );
  }, [userFigure?.id]);

  const listings = priceQuery.data?.listings ?? [];
  const history = priceQuery.data?.history ?? [];

  const lastCheckedAt = useMemo(() => getLatestChecked(listings), [listings]);
  const chartPoints = useMemo(() => normalizeHistory(history), [history]);

  const subtitle = useMemo(() => {
    const status = isOnline ? "Online" : "Offline";
    if (!lastCheckedAt) {
      return `${status} · No listings yet`;
    }
    return `${status} · Checked ${new Date(lastCheckedAt).toLocaleString()}`;
  }, [isOnline, lastCheckedAt]);

  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => {
      const aPrice = a.current_price ?? Infinity;
      const bPrice = b.current_price ?? Infinity;
      return aPrice - bPrice;
    });
  }, [listings]);

  const targetValue = Number.parseFloat(alertTargetPrice);
  const targetValid = Number.isFinite(targetValue) && targetValue > 0;

  const handleSaveAlert = async () => {
    if (!userFigureId) {
      setAlertError("Missing wishlist item context.");
      return;
    }
    if (!targetValid) {
      setAlertError("Enter a target price to save the alert.");
      return;
    }

    const retailers = alertRetailers.length
      ? alertRetailers
      : RETAILER_OPTIONS.map((option) => option.id);

    setAlertError(null);
    setAlertNotice(null);

    try {
      const payload = {
        user_figure_id: userFigureId,
        target_price: targetValue,
        currency: "USD",
        enabled: true,
        retailers,
        notify_on_restock: alertNotifyRestock,
        cooldown_hours: 24,
      };

      const response = await saveAlert.mutateAsync({
        id: alertId,
        payload,
      });

      setAlertId(response.id);
      setAlertNotice("Alert saved. We'll notify you on drops.");
      track("wishlist_price_alert_configured");
    } catch (error) {
      setAlertError("Unable to save alert. Try again.");
    }
  };

  const openListing = async (listing: RetailerListing) => {
    if (!isOnline) {
      return;
    }
    track("wishlist_open_listing");
    await WebBrowser.openBrowserAsync(listing.product_url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  };

  if (!userFigureId && !figureId) {
    return (
      <View className="flex-1 bg-void">
        <ScreenHeader title="Wishlist Item" subtitle="Missing item" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-secondary-text">
            We couldn't find a wishlist item for this link.
          </Text>
          <View className="mt-4 w-full">
            <Button label="Back to Wishlist" onPress={() => router.push("/wishlist")} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader title="Wishlist Item" subtitle={subtitle} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {userFigure ? (
            <Card>
              <Text className="text-base font-space-semibold text-frost-text" numberOfLines={2}>
                {userFigure.name}
              </Text>
              <Text className="mt-1 text-xs text-secondary-text" numberOfLines={1}>
                {userFigure.series ?? "Unknown series"}
              </Text>
              <View className="mt-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs uppercase tracking-[2px] text-muted-text">
                    Latest Price
                  </Text>
                  <Text className="mt-1 text-lg font-space-bold text-frost-text">
                    {formatPrice(userFigure.lastPrice)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs uppercase tracking-[2px] text-muted-text">
                    Last Checked
                  </Text>
                  <Text className="mt-1 text-xs text-secondary-text">
                    {formatDateTime(lastCheckedAt)}
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card>
              <Text className="text-sm text-secondary-text">
                Loading wishlist item details...
              </Text>
            </Card>
          )}

          <View className="mt-5">
            <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
              Price History
            </Text>
            <View className="mt-3">
              <PriceHistoryChart points={chartPoints} />
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
              Listings ({sortedListings.length})
            </Text>
            <View className="mt-3 gap-3">
              {sortedListings.length === 0 ? (
                <Card className="items-center">
                  <Text className="text-xs text-secondary-text">No listings yet.</Text>
                </Card>
              ) : (
                sortedListings.map((listing) => {
                  const statusLabel =
                    listing.in_stock === true
                      ? "In stock"
                      : listing.in_stock === false
                        ? "Restocking"
                        : "Unknown";
                  const statusClass =
                    listing.in_stock === true
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : listing.in_stock === false
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                        : "bg-slate-500/15 border-slate-500/40 text-secondary-text";
                  const statusTextClass =
                    listing.in_stock === true
                      ? "text-emerald-300"
                      : listing.in_stock === false
                        ? "text-amber-200"
                        : "text-secondary-text";

                  return (
                    <Card key={listing.id}>
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-sm font-space-semibold text-frost-text">
                            {RETAILER_LABELS[listing.retailer] ?? listing.retailer}
                          </Text>
                          <Text className="mt-1 text-xs text-secondary-text">
                            Checked {formatDateTime(listing.last_checked_at)}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-xs uppercase tracking-[2px] text-muted-text">
                            Price
                          </Text>
                          <Text className="mt-1 text-sm font-space-semibold text-frost-text">
                            {formatPrice(listing.current_price)}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 flex-row items-center justify-between">
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
                        <Pressable
                          onPress={() => void openListing(listing)}
                          disabled={!isOnline}
                          className={cx(
                            "flex-row items-center gap-1 rounded-full border px-3 py-1",
                            isOnline
                              ? "border-bright-cyan/60 bg-bright-cyan/10"
                              : "border-hud-line/60 bg-raised-surface/60"
                          )}
                        >
                          <Ionicons
                            name="open-outline"
                            size={14}
                            color={isOnline ? "#22d3ee" : "#94a3b8"}
                          />
                          <Text
                            className={cx(
                              "text-[10px] font-space-semibold uppercase tracking-widest",
                              isOnline ? "text-bright-cyan" : "text-secondary-text"
                            )}
                          >
                            {isOnline ? "Open" : "Offline"}
                          </Text>
                        </Pressable>
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-xs font-space-semibold uppercase tracking-[2px] text-muted-text">
              Price Alert
            </Text>
            <Card className="mt-3">
              <Text className="text-xs text-secondary-text">
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
                    className="flex-1 text-base text-frost-text"
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
                  {RETAILER_OPTIONS.map((retailer) => {
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

              {alertNotice ? (
                <Text className="mt-4 text-xs text-emerald-300">{alertNotice}</Text>
              ) : null}
              {alertError ? (
                <Text className="mt-4 text-xs text-amber-200">{alertError}</Text>
              ) : null}

              <View className="mt-5">
                <Button
                  label={saveAlert.isPending ? "Saving..." : "Save Alert"}
                  disabled={saveAlert.isPending || !targetValid}
                  onPress={handleSaveAlert}
                />
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
