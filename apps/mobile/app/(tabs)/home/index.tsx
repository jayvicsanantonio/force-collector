import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { StatCard } from "../../../src/components/StatCard";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import { useDashboardSummary, useRecentFigures } from "../../../src/offline/hooks";
import type { CachedFigure, FigureStatus } from "../../../src/offline/types";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { cx } from "../../../src/utils/cx";
import { track } from "../../../src/observability";
import { useActiveGoalProgress } from "../../../src/api/goals";

const RECENT_DROPS_LIMIT = 6;

const STATUS_BADGE: Record<
  FigureStatus,
  { label: string; tone: "owned" | "wishlist" | "limited" | "neutral" }
> = {
  OWNED: { label: "Owned", tone: "owned" },
  WISHLIST: { label: "Wishlist", tone: "wishlist" },
  PREORDER: { label: "Pre-order", tone: "limited" },
  SOLD: { label: "Sold", tone: "neutral" },
};

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
}

function getDropLabel(item: CachedFigure) {
  return STATUS_BADGE[item.status] ?? STATUS_BADGE.WISHLIST;
}

export default function HomeScreen() {
  const { summary, loading: summaryLoading, refreshing } =
    useDashboardSummary();
  const { data: recentDrops, loading: recentLoading } = useRecentFigures(
    RECENT_DROPS_LIMIT
  );
  const { isOnline } = useOfflineStatus();
  const { accentTextClass } = useTheme();
  const goalProgress = useActiveGoalProgress();
  const params = useLocalSearchParams<{
    highlight?: string;
    figureId?: string;
  }>();

  useEffect(() => {
    track("dashboard_viewed");
  }, []);

  const completionLabel = `${Math.round(summary.completionPercent)}%`;
  const estimatedValueLabel = formatCurrency(summary.estimatedValue);

  const huntGoal = useMemo(() => {
    const total = summary.totalOwned + summary.totalWishlist;
    if (total === 0) {
      return {
        name: "Starter Wave",
        target: 12,
        completed: 0,
      };
    }
    return {
      name: "Wishlist Sweep",
      target: Math.max(total, 12),
      completed: summary.totalOwned,
    };
  }, [summary.totalOwned, summary.totalWishlist]);

  const huntProgress =
    huntGoal.target > 0
      ? Math.min(huntGoal.completed / huntGoal.target, 1)
      : 0;
  const activeGoalName = goalProgress.data?.goal.name ?? huntGoal.name;
  const activeGoalOwned = goalProgress.data?.progress.owned_count ?? huntGoal.completed;
  const activeGoalTotal = goalProgress.data?.progress.total_count ?? huntGoal.target;
  const activeGoalPercent = Math.min(
    100,
    Math.max(
      0,
      goalProgress.data?.progress.percent_complete ?? Math.round(huntProgress * 100)
    )
  );

  return (
    <View className="flex-1 bg-void">
      <SafeAreaView edges={["top"]} className="bg-void">
        <BlurView intensity={40} tint="dark" style={styles.headerBlur}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Avatar size="md" label="FC" />
              <View>
                <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                  Welcome back
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-space-bold text-frost-text">
                    Force Collector
                  </Text>
                  {!isOnline ? (
                    <Badge label="Offline" tone="neutral" iconName="cloud-off" />
                  ) : null}
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => {
                track("dashboard_settings_tapped");
                router.push("/profile/settings");
              }}
              accessibilityLabel="Open settings"
              className="h-10 w-10 items-center justify-center rounded-full border border-hud-line/70 bg-raised-surface/70"
            >
              <MaterialIcons name="settings" size={18} color="#bae6fd" />
            </Pressable>
          </View>
        </BlurView>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6">
          {(params.highlight || params.figureId) && (
            <View className="rounded-2xl border border-hud-line/60 bg-raised-surface/70 px-4 py-3">
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Notification
              </Text>
              <Text className="mt-2 text-sm text-frost-text">
                Opened for {params.highlight ?? params.figureId}.
              </Text>
            </View>
          )}
          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Summary
            </Text>
            <View className="mt-3 flex-row gap-3">
              <View
                className="flex-1"
                accessible
                accessibilityLabel={`Total figures: ${summary.totalOwned}`}
              >
                {summaryLoading ? (
                  <View className="h-[88px] rounded-2xl border border-hud-line/60 bg-raised-surface/70" />
                ) : (
                  <StatCard
                    label="Total Figs"
                    value={summary.totalOwned.toString()}
                    helper={
                      summary.pendingSync > 0
                        ? `${summary.pendingSync} pending sync`
                        : isOnline
                          ? "Synced"
                          : "Cached"
                    }
                  />
                )}
              </View>
              <View
                className="flex-1"
                accessible
                accessibilityLabel={`Estimated value: ${estimatedValueLabel}`}
              >
                {summaryLoading ? (
                  <View className="h-[88px] rounded-2xl border border-hud-line/60 bg-raised-surface/70" />
                ) : (
                  <StatCard
                    label="Value"
                    value={estimatedValueLabel}
                    helper={refreshing ? "Refreshing" : "Estimate"}
                  />
                )}
              </View>
            </View>
            <View
              className="mt-3"
              accessible
              accessibilityLabel={`Completion: ${completionLabel}`}
            >
              {summaryLoading ? (
                <View className="h-[88px] rounded-2xl border border-hud-line/60 bg-raised-surface/70" />
              ) : (
                <StatCard
                  label="Completion"
                  value={completionLabel}
                  helper={activeGoalName}
                />
              )}
            </View>
          </View>

          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Recent Drops
              </Text>
              <Pressable
                onPress={() => {
                  track("dashboard_recent_view_all");
                  router.push("/search");
                }}
              >
                <Text
                  className={cx(
                    "text-xs font-space-semibold uppercase tracking-widest",
                    accentTextClass
                  )}
                >
                  View All
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalContent}
            >
              {recentLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <View
                      key={`recent-skeleton-${index}`}
                      className="h-[170px] w-[180px] rounded-2xl border border-hud-line/60 bg-raised-surface/70"
                    />
                  ))
                : recentDrops.length > 0
                  ? recentDrops.map((item) => {
                      const badge = getDropLabel(item);
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            track("dashboard_recent_drop_opened");
                            router.push({
                              pathname: "/collection/details",
                              params: {
                                userFigureId: item.id,
                                source: "dashboard",
                              },
                            });
                          }}
                        >
                          <Card className="h-[170px] w-[180px] justify-between">
                            <View className="gap-2">
                              <Text
                                className="text-sm font-space-semibold text-frost-text"
                                numberOfLines={2}
                              >
                                {item.name}
                              </Text>
                              <Text
                                className="text-xs font-space-medium text-secondary-text"
                                numberOfLines={1}
                              >
                                {item.series ?? "Unknown series"}
                              </Text>
                              <Badge label={badge.label} tone={badge.tone} />
                            </View>
                            <View>
                              <Text className="text-xs font-space-medium text-secondary-text">
                                {item.lastPrice !== null && item.lastPrice !== undefined
                                  ? formatCurrency(item.lastPrice)
                                  : "Value pending"}
                              </Text>
                              <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-muted-text">
                                Updated {new Date(item.updatedAt).toLocaleDateString()}
                              </Text>
                            </View>
                          </Card>
                        </Pressable>
                      );
                    })
                  : (
                      <Card className="h-[170px] w-[260px] justify-between">
                        <View className="gap-2">
                          <Text className="text-sm font-space-semibold text-frost-text">
                            No drops yet
                          </Text>
                          <Text className="text-xs text-secondary-text">
                            Scan a figure to start tracking releases.
                          </Text>
                        </View>
                        <Button
                          label="Start Scanning"
                          variant="secondary"
                          onPress={() => router.push("/search")}
                        />
                      </Card>
                    )}
            </ScrollView>
          </View>

          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Hunt Progress
            </Text>
            <Card className="mt-3 gap-4">
              <View className="gap-1">
                <Text className="text-sm font-space-semibold text-frost-text">
                  {activeGoalName}
                </Text>
                <Text className="text-xs text-secondary-text">
                  {activeGoalOwned} / {activeGoalTotal} collected
                </Text>
              </View>
              <View className="h-2 w-full rounded-full bg-raised-surface">
                <View
                  style={{ width: `${Math.round(activeGoalPercent)}%` }}
                  className="h-2 rounded-full bg-bright-cyan"
                />
              </View>
              <Button
                label="View Wishlist"
                variant="secondary"
                onPress={() => {
                  track("dashboard_view_wishlist_tapped");
                  router.push("/wishlist");
                }}
              />
            </Card>
          </View>

          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              New Drop
            </Text>
            <Pressable
              onPress={() => {
                track("dashboard_promo_opened");
                router.push("/search");
              }}
            >
              <Card className="mt-3 gap-2 border border-cyan-500/40 bg-raised-surface/70">
                <Text className="text-sm font-space-semibold text-frost-text">
                  Archive Wave Incoming
                </Text>
                <Text className="text-xs text-secondary-text">
                  Reserve the latest wave and set alerts for price drops.
                </Text>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="bolt" size={16} color="#22d3ee" />
                  <Text className="text-xs font-space-semibold uppercase tracking-widest text-bright-cyan">
                    Pre-order watchlist
                  </Text>
                </View>
              </Card>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={() => {
          track("dashboard_fab_tapped");
          router.push("/add-figure");
        }}
        accessibilityLabel="Add figure"
        className="absolute"
        style={styles.fab}
      >
        <View className="h-14 w-14 items-center justify-center rounded-full bg-bright-cyan">
          <MaterialIcons name="add" size={28} color="#020617" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  horizontalContent: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
    paddingRight: 20,
  },
  headerBlur: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(30,58,138,0.6)",
    backgroundColor: "rgba(2,6,23,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fab: {
    right: 20,
    bottom: 90,
  },
});
