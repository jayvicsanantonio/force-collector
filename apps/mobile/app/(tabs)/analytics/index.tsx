import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { AnalyticsRange } from "@force-collector/shared";
import { Badge } from "../../../src/components/Badge";
import { Card } from "../../../src/components/Card";
import { Chip } from "../../../src/components/Chip";
import { DonutChart } from "../../../src/components/DonutChart";
import { AnalyticsValueChart } from "../../../src/components/AnalyticsValueChart";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { StatCard } from "../../../src/components/StatCard";
import { useAnalyticsDistribution, useAnalyticsSummary, useAnalyticsValueSeries } from "../../../src/api/analytics";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import { useFigureById } from "../../../src/offline/hooks";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { cx } from "../../../src/utils/cx";
import { track } from "../../../src/observability";

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "year", label: "Last Year" },
  { value: "30d", label: "Last 30 Days" },
];

const ERA_LABELS: Record<string, string> = {
  PREQUEL: "Prequel",
  ORIGINAL: "Original",
  SEQUEL: "Sequel",
  TV: "TV",
  GAMING: "Gaming",
  OTHER: "Other/Unknown",
  UNKNOWN: "Other/Unknown",
};

const ERA_COLORS: Record<string, string> = {
  Prequel: "#22d3ee",
  Original: "#2563eb",
  Sequel: "#38bdf8",
  TV: "#0ea5e9",
  Gaming: "#06b6d4",
  "Other/Unknown": "#64748b",
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

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function normalizeEraBuckets(buckets?: Record<string, number>) {
  if (!buckets) {
    return [];
  }
  const totals = new Map<string, number>();
  for (const [rawKey, rawValue] of Object.entries(buckets)) {
    const label = ERA_LABELS[rawKey] ?? "Other/Unknown";
    const value = Number.isFinite(rawValue) ? rawValue : 0;
    totals.set(label, (totals.get(label) ?? 0) + value);
  }

  const order = ["Prequel", "Original", "Sequel", "TV", "Gaming", "Other/Unknown"];
  return order
    .map((label) => ({
      label,
      value: totals.get(label) ?? 0,
      color: ERA_COLORS[label] ?? "#64748b",
    }))
    .filter((item) => item.value > 0);
}

export default function AnalyticsScreen() {
  const [range, setRange] = useState<AnalyticsRange>("all_time");
  const { isOnline } = useOfflineStatus();
  const { accentTextClass } = useTheme();

  const summaryQuery = useAnalyticsSummary(range);
  const distributionQuery = useAnalyticsDistribution("era", range);
  const valueSeriesQuery = useAnalyticsValueSeries(range);

  const summary = summaryQuery.data?.summary;
  const summaryLoading = summaryQuery.isLoading && !summaryQuery.data;
  const distributionLoading = distributionQuery.isLoading && !distributionQuery.data;
  const seriesLoading = valueSeriesQuery.isLoading && !valueSeriesQuery.data;
  const distribution = useMemo(
    () => normalizeEraBuckets(distributionQuery.data?.buckets),
    [distributionQuery.data?.buckets]
  );
  const valuePoints = valueSeriesQuery.data?.points ?? [];

  const rarestId = summary?.rarest_item_user_figure_id ?? null;
  const { data: rarestFigure, loading: rarestLoading } = useFigureById(rarestId);

  useEffect(() => {
    track("analytics_viewed");
  }, []);

  const handleRangeChange = (nextRange: AnalyticsRange) => {
    setRange(nextRange);
    track("analytics_range_changed", { range: nextRange });
  };

  const totalFiguresLabel = summary?.total_figures_owned?.toString() ?? "--";
  const completionLabel = summary
    ? `${Math.round(summary.completion_percent)}%`
    : "--";
  const estimatedValueLabel = summary
    ? formatCurrency(summary.estimated_value)
    : "--";
  const valueChange = summary?.value_change_percent ?? 0;
  const valueChangeLabel = formatPercent(valueChange);
  const valueChangeClass =
    valueChange > 0
      ? "text-bright-cyan"
      : valueChange < 0
        ? "text-danger-red"
        : "text-secondary-text";

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Collection Analytics"
        subtitle="Value and composition"
        rightSlot={!isOnline ? <Badge label="Offline" tone="neutral" iconName="cloud-off" /> : null}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6">
          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Time Range
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingTop: 12 }}
            >
              {RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={range === option.value}
                  onPress={() => handleRangeChange(option.value)}
                />
              ))}
            </ScrollView>
          </View>

          <Card className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Era Distribution
              </Text>
              {distributionQuery.isFetching ? (
                <Text className="text-[10px] uppercase tracking-widest text-muted-text">
                  Refreshing
                </Text>
              ) : null}
            </View>
            <View className="flex-row flex-wrap items-center gap-6">
              <View className="min-w-[160px] flex-1">
                {distributionLoading ? (
                  <View className="h-[160px] rounded-xl border border-hud-line/60 bg-raised-surface/60" />
                ) : (
                  <DonutChart
                    data={distribution}
                    accessibilityLabel="Era distribution chart"
                  />
                )}
              </View>
              <View className="flex-1 gap-3">
                {distributionLoading ? (
                  <View className="h-[120px] rounded-xl border border-hud-line/60 bg-raised-surface/60" />
                ) : distribution.length ? (
                  distribution.map((item) => (
                    <View key={item.label} className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View
                          style={{ backgroundColor: item.color }}
                          className="h-3 w-3 rounded-full"
                        />
                        <Text className="text-xs text-secondary-text">{item.label}</Text>
                      </View>
                      <Text className={cx("text-xs font-space-semibold", accentTextClass)}>
                        {item.value}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-xs text-secondary-text">
                    Add more figures to see your distribution.
                  </Text>
                )}
              </View>
            </View>
          </Card>

          <Card className="gap-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                  Estimated Value
                </Text>
                {summaryLoading ? (
                  <View className="mt-2 h-7 w-32 rounded-lg bg-raised-surface/60" />
                ) : (
                  <Text className={cx("text-2xl font-space-bold", accentTextClass)}>
                    {estimatedValueLabel}
                  </Text>
                )}
              </View>
              <View
                accessible
                accessibilityLabel={`Value change ${valueChangeLabel} versus prior period`}
              >
                {summaryLoading ? (
                  <View className="h-5 w-16 rounded-lg bg-raised-surface/60" />
                ) : (
                  <Text className={cx("text-sm font-space-semibold", valueChangeClass)}>
                    {valueChangeLabel}
                  </Text>
                )}
                <Text className="text-[10px] uppercase tracking-widest text-muted-text">
                  vs prior period
                </Text>
              </View>
            </View>
            {seriesLoading ? (
              <View className="h-[160px] rounded-xl border border-hud-line/60 bg-raised-surface/60" />
            ) : (
              <AnalyticsValueChart points={valuePoints} />
            )}
            <Text className="text-[11px] text-muted-text">
              Estimate based on best available listing price or purchase price.
            </Text>
          </Card>

          <View className="gap-3">
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Key Metrics
            </Text>
            <View className="flex-row gap-3">
              <View
                className="flex-1"
                accessible
                accessibilityLabel={`Total figures owned: ${totalFiguresLabel}`}
              >
                <StatCard label="Total Figures" value={totalFiguresLabel} helper="Owned" />
              </View>
              <View
                className="flex-1"
                accessible
                accessibilityLabel={`Completion: ${completionLabel}`}
              >
                <StatCard label="Completion" value={completionLabel} helper="Goal" />
              </View>
            </View>
          </View>

          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Rarest Item
              </Text>
              {summaryQuery.isFetching ? (
                <Text className="text-[10px] uppercase tracking-widest text-muted-text">
                  Refreshing
                </Text>
              ) : null}
            </View>
            {summaryLoading || rarestLoading ? (
              <View className="h-[68px] rounded-xl border border-hud-line/60 bg-raised-surface/60" />
            ) : rarestFigure ? (
              <View
                className="rounded-xl border border-hud-line/60 bg-raised-surface/40 px-4 py-3"
                accessible
                accessibilityLabel={`Rarest item ${rarestFigure.name} from ${rarestFigure.series ?? "Unknown series"}`}
              >
                <Text className="text-sm font-space-semibold text-frost-text" numberOfLines={2}>
                  {rarestFigure.name}
                </Text>
                <Text className="mt-1 text-xs text-secondary-text" numberOfLines={1}>
                  {rarestFigure.series ?? "Unknown series"}
                </Text>
                <Text className="mt-2 text-[11px] text-muted-text">
                  Based on rarity score model signals.
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-secondary-text">
                Rarest item will appear after your next sync.
              </Text>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
