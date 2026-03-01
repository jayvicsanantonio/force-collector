import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  ScanLookupResponseSchema,
  type Figure,
  type ScanLookupResponse,
} from "@force-collector/shared";
import { Button } from "../../../src/components/Button";
import { Badge } from "../../../src/components/Badge";
import { Card } from "../../../src/components/Card";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { StatCard } from "../../../src/components/StatCard";
import { AppImage } from "../../../src/components/AppImage";
import { useAuth } from "../../../src/auth/AuthProvider";
import { createUserFigure, updateUserFigureStatus } from "../../../src/api/user-figures";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import {
  applyServerUpdate,
  getFigureByFigureId,
} from "../../../src/offline/cache";
import {
  useFigureByFigureId,
  useUpdateFigureStatus,
  useUpsertFigureRecord,
} from "../../../src/offline/hooks";
import type { FigureStatus } from "../../../src/offline/types";
import { track } from "../../../src/observability";

const CONFIDENCE_CONFIRM_THRESHOLD = 0.65;

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatPrice(price: number | null, currency: string | null) {
  if (price === null || !currency) {
    return "—";
  }
  return `${currency} ${price.toFixed(2)}`;
}

function confirmAction(title: string, message: string, confirmLabel: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "default", onPress: () => resolve(true) },
    ]);
  });
}

export default function ScanResultsScreen() {
  const params = useLocalSearchParams<{ payload?: string }>();
  const { user } = useAuth();
  const { isOnline } = useOfflineStatus();
  const updateStatus = useUpdateFigureStatus();
  const upsertFigure = useUpsertFigureRecord();
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    figureId: string;
    status: FigureStatus;
  } | null>(null);

  const payload = useMemo<ScanLookupResponse | null>(() => {
    if (!params.payload) {
      return null;
    }
    try {
      const decoded = JSON.parse(params.payload);
      const parsed = ScanLookupResponseSchema.safeParse(decoded);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [params.payload]);

  const match = payload?.match ?? null;
  const related = payload?.related ?? [];
  const listings = payload?.listings ?? [];
  const confidence = payload?.confidence ?? 0;
  const lowConfidence =
    match !== null && confidence > 0 && confidence < CONFIDENCE_CONFIRM_THRESHOLD;
  const primaryRecord = useFigureByFigureId(match?.id ?? null);

  useEffect(() => {
    track("scan_results_viewed");
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
    };
  }, []);

  const setFeedback = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
    }
    noticeTimer.current = setTimeout(() => {
      setNotice(null);
    }, 3000);
  }, []);

  const listingSummary = useMemo(() => {
    const total = listings.length;
    const inStock = listings.filter((listing) => listing.in_stock === true).length;
    const prices = listings
      .map((listing) => listing.current_price)
      .filter((price): price is number => typeof price === "number");
    const lowest = prices.length ? Math.min(...prices) : null;
    const currency = listings.find((listing) => listing.current_price !== null)?.currency ?? null;
    return { total, inStock, lowest, currency };
  }, [listings]);

  const handleScanAgain = useCallback(() => {
    router.replace({
      pathname: "/search",
      params: { restart: "1" },
    });
  }, []);

  const updateExistingStatus = useCallback(
    async (id: string, status: FigureStatus) => {
      if (isOnline) {
        try {
          const response = await updateUserFigureStatus(id, status);
          const updatedAt = response.updated_at ?? new Date().toISOString();
          await applyServerUpdate(id, status, updatedAt);
          return { synced: true };
        } catch {
          // Fall back to offline queue.
        }
      }

      const updated = await updateStatus(id, status);
      return { synced: false, updated };
    },
    [isOnline, updateStatus]
  );

  const createNewStatus = useCallback(
    async (figure: Figure, status: FigureStatus) => {
      const updatedAt = new Date().toISOString();
      if (isOnline) {
        try {
          const response = await createUserFigure({
            figure_id: figure.id,
            status,
            condition: "UNKNOWN",
            user_id: user?.id,
          });
          await upsertFigure({
            id: response.id,
            figureId: figure.id,
            name: figure.name,
            series: figure.series ?? null,
            status,
            updatedAt: response.updated_at ?? updatedAt,
            syncPending: false,
          });
          return { synced: true };
        } catch {
          // Fall back to offline queue.
        }
      }

      const tempId = `pending-${figure.id}-${Date.now()}`;
      await upsertFigure(
        {
          id: tempId,
          figureId: figure.id,
          name: figure.name,
          series: figure.series ?? null,
          status,
          updatedAt,
          syncPending: true,
        },
        {
          figureId: figure.id,
          status,
          name: figure.name,
          series: figure.series ?? null,
          updatedAt,
        }
      );
      return { synced: false };
    },
    [isOnline, upsertFigure, user?.id]
  );

  const handleAdd = useCallback(
    async (figure: Figure, status: FigureStatus, source: "primary" | "related") => {
      if (pendingAction) {
        return;
      }

      if (lowConfidence && source === "primary") {
        const confirm = await confirmAction(
          "Low confidence match",
          `We matched this scan with ${formatPercent(confidence)} confidence. Add anyway?`,
          "Add"
        );
        if (!confirm) {
          return;
        }
      }

      setPendingAction({ figureId: figure.id, status });
      try {
        const existing =
          source === "primary"
            ? primaryRecord.data
            : await getFigureByFigureId(figure.id);

        if (existing?.status === status) {
          Alert.alert(
            status === "OWNED" ? "Already in collection" : "Already on wishlist",
            `This figure is already marked as ${status === "OWNED" ? "owned" : "wishlist"}.`
          );
          return;
        }

        if (source === "primary") {
          if (status === "OWNED") {
            track("scan_results_add_collection");
          } else {
            track("scan_results_add_wishlist");
          }
        } else {
          track("scan_results_related_add", { status });
        }

        const result = existing
          ? await updateExistingStatus(existing.id, status)
          : await createNewStatus(figure, status);

        setFeedback(
          result.synced
            ? status === "OWNED"
              ? "Added to collection."
              : "Added to wishlist."
            : "Saved offline. Syncing when online."
        );
      } catch {
        setFeedback("Unable to add right now. Try again.");
      } finally {
        setPendingAction(null);
      }
    },
    [
      confidence,
      createNewStatus,
      lowConfidence,
      pendingAction,
      primaryRecord.data,
      setFeedback,
      updateExistingStatus,
    ]
  );

  if (!payload || !match) {
    return (
      <View className="flex-1 bg-void">
        <ScreenHeader title="Scan Results" subtitle="No match detected" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-secondary-text">
            We couldn't find a valid scan payload. Try scanning again.
          </Text>
          <View className="mt-6 w-full max-w-sm">
            <Button label="Scan Again" onPress={handleScanAgain} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Scan Results"
        subtitle="Confirm the detected match"
        rightSlot={
          <Pressable
            onPress={handleScanAgain}
            className="flex-row items-center gap-2 rounded-full border border-hud-line/70 bg-overlay-ink/70 px-3 py-1"
            accessibilityRole="button"
            accessibilityLabel="Scan again"
          >
            <MaterialIcons name="qr-code-scanner" size={14} color="#94a3b8" />
            <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
              Scan
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <View className="gap-6 pt-6">
          {notice ? (
            <View className="rounded-2xl border border-hud-line/60 bg-raised-surface/70 px-4 py-3">
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Status
              </Text>
              <Text className="mt-2 text-sm text-frost-text">{notice}</Text>
            </View>
          ) : null}

          {!isOnline ? (
            <Card>
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Offline Mode
              </Text>
              <Text className="mt-2 text-sm text-frost-text">
                Actions will be saved and synced once you're back online.
              </Text>
            </Card>
          ) : null}

          <Card className="gap-4">
            <View className="flex-row items-start gap-4">
              {match.primary_image_url ? (
                <AppImage
                  uri={match.primary_image_url}
                  style={{ height: 96, width: 80, borderRadius: 12 }}
                  variant="thumbnail"
                  accessibilityLabel={`${match.name} image`}
                />
              ) : (
                <View className="h-24 w-20 items-center justify-center rounded-xl border border-hud-line/70 bg-raised-surface/60">
                  <MaterialIcons name="image" size={20} color="#94a3b8" />
                </View>
              )}

              <View className="flex-1">
                <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                  Primary Match
                </Text>
                <Text className="mt-2 text-lg font-space-semibold text-frost-text">
                  {match.name}
                </Text>
                <Text className="mt-1 text-xs text-secondary-text">
                  {match.series} · Wave {match.wave} · {match.release_year}
                </Text>
                <Text className="mt-2 text-xs text-muted-text">
                  Confidence: {formatPercent(confidence)}
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {primaryRecord.data?.status === "OWNED" ? (
                <Badge label="Owned" tone="owned" />
              ) : null}
              {primaryRecord.data?.status === "WISHLIST" ? (
                <Badge label="Wishlist" tone="wishlist" />
              ) : null}
              {match.exclusivity ? (
                <Badge label={match.exclusivity} tone="exclusive" />
              ) : null}
              {lowConfidence ? (
                <Badge label="Verify Match" tone="neutral" iconName="report" />
              ) : null}
            </View>

            <View className="gap-3">
              <Button
                label="Add to Collection"
                loading={
                  pendingAction?.figureId === match.id &&
                  pendingAction.status === "OWNED"
                }
                onPress={() => handleAdd(match, "OWNED", "primary")}
              />
              <Button
                label="Add to Wishlist"
                variant="secondary"
                loading={
                  pendingAction?.figureId === match.id &&
                  pendingAction.status === "WISHLIST"
                }
                onPress={() => handleAdd(match, "WISHLIST", "primary")}
              />
            </View>
          </Card>

          {listings.length ? (
            <View>
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Listing Summary
              </Text>
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1">
                  <StatCard
                    label="Listings"
                    value={listingSummary.total.toString()}
                    helper={`${listingSummary.inStock} in stock`}
                  />
                </View>
                <View className="flex-1">
                  <StatCard
                    label="Lowest"
                    value={formatPrice(
                      listingSummary.lowest,
                      listingSummary.currency
                    )}
                    helper="Current price"
                  />
                </View>
              </View>
            </View>
          ) : null}

          {related.length ? (
            <View>
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Other Versions
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
              >
                {related.map((item) => (
                  <Card key={item.id} className="w-56 gap-3">
                    <View className="flex-row items-start gap-3">
                      {item.primary_image_url ? (
                        <AppImage
                          uri={item.primary_image_url}
                          style={{ height: 64, width: 56, borderRadius: 8 }}
                          variant="thumbnail"
                          accessibilityLabel={`${item.name} thumbnail`}
                        />
                      ) : (
                        <View className="h-16 w-14 items-center justify-center rounded-lg border border-hud-line/70 bg-raised-surface/60">
                          <MaterialIcons name="image" size={16} color="#94a3b8" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-sm font-space-semibold text-frost-text">
                          {item.name}
                        </Text>
                        <Text className="mt-1 text-[11px] text-secondary-text">
                          {item.series} · Wave {item.wave}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] text-muted-text">
                        {item.release_year} · {item.exclusivity}
                      </Text>
                      <Pressable
                        onPress={() => handleAdd(item, "OWNED", "related")}
                        onLongPress={() => handleAdd(item, "WISHLIST", "related")}
                        className="h-9 w-9 items-center justify-center rounded-full border border-hud-line/70 bg-hud-surface"
                        accessibilityRole="button"
                        accessibilityLabel="Add related figure"
                        accessibilityHint="Double tap to add to collection. Long press to add to wishlist."
                      >
                        <MaterialIcons name="add" size={18} color="#38bdf8" />
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </ScrollView>
              <Text className="text-[11px] text-muted-text">
                Tap + to add to collection. Long-press to wishlist.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
