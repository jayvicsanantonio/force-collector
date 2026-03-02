import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import * as Linking from "expo-linking";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { StatCard } from "../../../src/components/StatCard";
import { AppImage } from "../../../src/components/AppImage";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import { applyServerUpdate } from "../../../src/offline/cache";
import { supabase } from "../../../src/auth/supabase";
import {
  useFigureByFigureId,
  useFigureById,
  useUpdateFigureStatus,
} from "../../../src/offline/hooks";
import type { FigureStatus } from "../../../src/offline/types";
import { updateUserFigureStatus } from "../../../src/api/user-figures";
import { useFigure, useFigureLore } from "../../../src/api/figures";
import { track } from "../../../src/observability";

type SpecEntry = {
  label: string;
  value: string;
};

const STATUS_OPTIONS: Array<{
  value: FigureStatus;
  label: string;
  helper: string;
}> = [
  { value: "OWNED", label: "Owned", helper: "In collection" },
  { value: "WISHLIST", label: "Wishlist", helper: "Hunting" },
  { value: "PREORDER", label: "Preorder", helper: "Incoming" },
  { value: "SOLD", label: "Sold", helper: "Archived" },
];

function formatSpecLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSpecValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value}` : "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatSpecValue(item)).join(", ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractAccessories(specs?: Record<string, unknown> | null) {
  if (!specs) {
    return [];
  }
  const raw =
    (specs.accessories as unknown) ??
    (specs.accessory as unknown) ??
    (specs["accessory_list"] as unknown);
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") {
          return { name: item, detail: null };
        }
        if (item && typeof item === "object") {
          const entry = item as Record<string, unknown>;
          const name =
            (entry.name as string | undefined) ??
            (entry.title as string | undefined) ??
            "Accessory";
          const detail =
            (entry.detail as string | undefined) ??
            (entry.description as string | undefined) ??
            null;
          return { name, detail };
        }
        return null;
      })
      .filter((item): item is { name: string; detail: string | null } => !!item);
  }
  if (typeof raw === "string") {
    return [{ name: raw, detail: null }];
  }
  return [];
}

export default function FigureDetailsScreen() {
  const params = useLocalSearchParams<{
    figureId?: string;
    userFigureId?: string;
    source?: string;
  }>();
  const { accentTextClass, accentBorderClass } = useTheme();
  const { isOnline } = useOfflineStatus();
  const { width } = useWindowDimensions();
  const updateStatusOffline = useUpdateFigureStatus();
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<FigureStatus | null>(
    null
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const userFigureById = useFigureById(params.userFigureId ?? null);
  const userFigureByFigureId = useFigureByFigureId(params.figureId ?? null);
  const userFigure = userFigureById.data ?? userFigureByFigureId.data ?? null;
  const figureId = userFigure?.figureId ?? params.figureId ?? null;
  const figureQuery = useFigure(figureId);
  const loreState = useFigureLore(figureId);

  const figure = figureQuery.data ?? null;
  const figureName = figure?.name ?? userFigure?.name ?? "Unknown figure";
  const figureSeries = figure?.series ?? userFigure?.series ?? "Unknown series";
  const statusValue = optimisticStatus ?? userFigure?.status ?? null;
  const statusUpdating = optimisticStatus !== null;

  useEffect(() => {
    track("figure_details_viewed", {
      source: params.source ?? "unknown",
    });
  }, [params.source]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPhotos = async () => {
      if (!userFigure?.photoRefs?.length) {
        if (mounted) {
          setPhotoUrls([]);
        }
        return;
      }
      if (!isOnline) {
        if (mounted) {
          setPhotoUrls([]);
        }
        return;
      }
      try {
        const signed = await Promise.all(
          userFigure.photoRefs.map(async (ref) => {
            const { data } = await supabase
              .storage
              .from("user-photos")
              .createSignedUrl(ref, 60 * 60);
            return data?.signedUrl ?? null;
          })
        );
        if (mounted) {
          setPhotoUrls(signed.filter((url): url is string => Boolean(url)));
        }
      } catch {
        if (mounted) {
          setPhotoUrls([]);
        }
      }
    };
    loadPhotos().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [isOnline, userFigure?.photoRefs?.join("|")]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
    }
    noticeTimer.current = setTimeout(() => {
      setNotice(null);
    }, 3000);
  }, []);

  const handleStatusChange = useCallback(
    async (nextStatus: FigureStatus) => {
      if (!userFigure || userFigure.status === nextStatus) {
        return;
      }

      const previous = userFigure.status;
      setOptimisticStatus(nextStatus);
      track("figure_status_changed", { status: nextStatus });

      if (!isOnline) {
        await updateStatusOffline(userFigure.id, nextStatus);
        setOptimisticStatus(null);
        return;
      }

      try {
        const response = await updateUserFigureStatus(userFigure.id, nextStatus);
        const updatedAt = response.updated_at ?? new Date().toISOString();
        await applyServerUpdate(userFigure.id, nextStatus, updatedAt);
        setOptimisticStatus(null);
      } catch {
        setOptimisticStatus(null);
        showNotice("Status update failed. Restored previous state.");
        await applyServerUpdate(
          userFigure.id,
          previous,
          userFigure.updatedAt ?? new Date().toISOString()
        );
      }
    },
    [isOnline, showNotice, updateStatusOffline, userFigure]
  );

  const handleShare = useCallback(async () => {
    track("figure_shared");
    const link = Linking.createURL("/collection/details", {
      queryParams: {
        figureId: figureId ?? undefined,
        source: "share",
      },
    });
    const message = `Check out ${figureName} on Force Collector.`;
    try {
      await Share.share({ message, url: link });
    } catch {
      showNotice("Share failed. Try again.");
    }
  }, [figureId, figureName, showNotice]);

  const handleEdit = useCallback(() => {
    track("figure_edit_opened");
    router.push({
      pathname: "/edit-figure",
      params: {
        userFigureId: userFigure?.id ?? undefined,
        figureId: figureId ?? undefined,
      },
    });
  }, [figureId, userFigure?.id]);

  const handleDiscover = useCallback(() => {
    track("figure_related_discovery_opened");
    router.push("/search");
  }, []);

  const statusBadge = useMemo(() => {
    switch (statusValue) {
      case "OWNED":
        return { label: "Owned", tone: "owned" as const };
      case "WISHLIST":
        return { label: "Wishlist", tone: "wishlist" as const };
      case "PREORDER":
        return { label: "Preorder", tone: "limited" as const };
      case "SOLD":
        return { label: "Sold", tone: "neutral" as const };
      default:
        return { label: "Not tracked", tone: "neutral" as const };
    }
  }, [statusValue]);

  const specs = useMemo<SpecEntry[]>(() => {
    const base: SpecEntry[] = [];
    if (figure?.edition) {
      base.push({ label: "Edition", value: figure.edition });
    }
    if (figure?.wave !== undefined) {
      base.push({ label: "Wave", value: `${figure.wave}` });
    }
    if (figure?.release_year) {
      base.push({ label: "Release Year", value: `${figure.release_year}` });
    }
    if (figure?.era) {
      base.push({ label: "Era", value: figure.era });
    }
    if (figure?.faction) {
      base.push({ label: "Faction", value: figure.faction });
    }
    if (figure?.exclusivity) {
      base.push({ label: "Exclusivity", value: figure.exclusivity });
    }
    if (figure?.upc) {
      base.push({ label: "UPC", value: figure.upc });
    }

    const extraSpecs = Object.entries(figure?.specs ?? {})
      .filter(([key]) => key !== "accessories" && key !== "accessory_list")
      .map(([key, value]) => ({
        label: formatSpecLabel(key),
        value: formatSpecValue(value),
      }))
      .filter((entry) => entry.value !== "—");

    return [...base, ...extraSpecs];
  }, [figure]);

  const accessories = useMemo(
    () => extractAccessories(figure?.specs ?? null),
    [figure?.specs]
  );

  const lore = loreState.entry?.lore ?? figure?.lore ?? null;
  const loreMeta = loreState.entry?.updatedAt ?? null;
  const loreSource = loreState.entry?.source ?? null;
  const loreUpdatedLabel = loreMeta
    ? Number.isFinite(Date.parse(loreMeta))
      ? new Date(loreMeta).toLocaleDateString()
      : null
    : null;

  const isCompact = width < 360;
  const conditionLabel = useMemo(() => {
    switch (userFigure?.condition) {
      case "MINT":
        return "Mint";
      case "OPENED":
        return "Opened";
      case "LOOSE":
        return "Loose";
      default:
        return "Unknown";
    }
  }, [userFigure?.condition]);

  const purchaseLabel = useMemo(() => {
    if (userFigure?.purchasePrice === null || userFigure?.purchasePrice === undefined) {
      return "—";
    }
    const currency = userFigure.purchaseCurrency ?? "USD";
    return `${currency} ${userFigure.purchasePrice.toFixed(2)}`;
  }, [userFigure?.purchaseCurrency, userFigure?.purchasePrice]);

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Figure Details"
        subtitle={figureSeries}
      />
      {notice ? (
        <View
          className="mx-4 mt-3 rounded-xl border border-danger-red/60 bg-danger-red/15 px-3 py-2"
          accessibilityRole="alert"
        >
          <Text className="text-xs font-space-medium text-danger-red">
            {notice}
          </Text>
        </View>
      ) : null}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <View className={isCompact ? "gap-4" : "flex-row gap-4"}>
          <View
            className={`overflow-hidden rounded-2xl border border-hud-line/70 bg-hud-surface ${
              isCompact ? "w-full" : "w-[42%]"
            }`}
          >
            {figure?.primary_image_url ? (
              <AppImage
                uri={figure.primary_image_url}
                style={{
                  height: isCompact ? 208 : 176,
                  width: "100%",
                }}
                variant="full"
                accessibilityLabel={`${figureName} image`}
              />
            ) : (
              <View className={isCompact ? "h-52 items-center justify-center" : "h-44 items-center justify-center"}>
                <MaterialIcons name="image" size={32} color="#64748b" />
                <Text className="mt-2 text-xs font-space-medium text-muted-text">
                  No image
                </Text>
              </View>
            )}
          </View>
          <View className="flex-1 justify-between">
            <View className="gap-2">
              <Text className="text-xl font-space-bold text-frost-text">
                {figureName}
              </Text>
              {figure?.subtitle ? (
                <Text className="text-sm font-space-medium text-secondary-text">
                  {figure.subtitle}
                </Text>
              ) : null}
              <View className="flex-row flex-wrap gap-2">
                <Badge label={statusBadge.label} tone={statusBadge.tone} />
                {figure?.exclusivity ? (
                  <Badge label={figure.exclusivity} tone="exclusive" />
                ) : null}
                {figure?.era ? <Badge label={figure.era} tone="neutral" /> : null}
              </View>
            </View>
            <View className="mt-3">
              <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                Status
              </Text>
              <View className="mt-2 flex-row rounded-2xl border border-hud-line/60 bg-hud-surface p-1">
                {STATUS_OPTIONS.map((option) => {
                  const selected = statusValue === option.value;
                  const disabled = !userFigure || statusUpdating;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => handleStatusChange(option.value)}
                      disabled={disabled}
                      className={`flex-1 rounded-xl px-2 py-2 ${
                        selected ? "bg-royal-blue/25" : ""
                      } ${disabled ? "opacity-40" : ""}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      accessibilityLabel={`${option.label} status`}
                    >
                      <Text
                        className={`text-center text-[11px] font-space-semibold ${
                          selected ? "text-frost-text" : "text-secondary-text"
                        }`}
                      >
                        {option.label}
                      </Text>
                      <Text className="mt-1 text-center text-[9px] text-muted-text">
                        {option.helper}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {userFigure?.syncPending ? (
                <Text className="mt-2 text-[10px] text-action-blue">
                  Sync pending when you are online.
                </Text>
              ) : null}
              {statusUpdating ? (
                <Text className="mt-1 text-[10px] text-muted-text">
                  Updating status...
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View className="mt-6 gap-3">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Collection Summary
          </Text>
          <View className={isCompact ? "gap-3" : "flex-row gap-3"}>
            <StatCard label="Status" value={statusBadge.label} />
            <StatCard
              label="Series"
              value={figure?.series ?? figureSeries}
            />
          </View>
        </View>

        <View className="mt-6 gap-3">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Acquisition Details
          </Text>
          <Card className="gap-4">
            <View className="flex-row flex-wrap gap-4">
              <View className="min-w-[120px] flex-1">
                <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                  Condition
                </Text>
                <Text className="mt-1 text-sm font-space-medium text-frost-text">
                  {conditionLabel}
                </Text>
              </View>
              <View className="min-w-[120px] flex-1">
                <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                  Purchase Price
                </Text>
                <Text className="mt-1 text-sm font-space-medium text-frost-text">
                  {purchaseLabel}
                </Text>
              </View>
              <View className="min-w-[120px] flex-1">
                <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                  Purchase Date
                </Text>
                <Text className="mt-1 text-sm font-space-medium text-frost-text">
                  {userFigure?.purchaseDate ?? "—"}
                </Text>
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                Notes
              </Text>
              {userFigure?.notes ? (
                <Text className="text-sm leading-5 text-frost-text">
                  {userFigure.notes}
                </Text>
              ) : (
                <Text className="text-sm text-muted-text">
                  No notes added yet.
                </Text>
              )}
            </View>
            <View className="gap-2">
              <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                Photos
              </Text>
              {photoUrls.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {photoUrls.map((url) => (
                    <AppImage
                      key={url}
                      uri={url}
                      style={{ height: 64, width: 64, borderRadius: 12 }}
                      variant="thumbnail"
                      accessibilityLabel="User photo"
                    />
                  ))}
                </View>
              ) : userFigure?.photoRefs?.length ? (
                <Text className="text-sm text-muted-text">
                  {isOnline
                    ? "Loading photos..."
                    : "Photos are available when you're online."}
                </Text>
              ) : (
                <Text className="text-sm text-muted-text">
                  No photos added yet.
                </Text>
              )}
            </View>
          </Card>
        </View>

        <View className="mt-6 gap-3">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Lore
          </Text>
          <Card className="gap-3">
            {loreState.loading ? (
              <Text className="text-sm text-muted-text">
                Loading lore...
              </Text>
            ) : lore ? (
              <Text className="text-sm leading-5 text-frost-text">
                {lore}
              </Text>
            ) : (
              <Text className="text-sm text-muted-text">
                Lore unavailable for this figure.
              </Text>
            )}
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] text-muted-text">
                {loreUpdatedLabel ? `Updated ${loreUpdatedLabel}` : "No update info"}
              </Text>
              <Text className={`text-[10px] ${accentTextClass}`}>
                {loreSource ?? (loreState.stale ? "Stale cache" : "Cached")}
              </Text>
            </View>
            {loreState.refreshing ? (
              <Text className="text-[10px] text-muted-text">
                Refreshing lore...
              </Text>
            ) : null}
            {loreState.error ? (
              <Text className="text-[10px] text-danger-red">
                {loreState.error}
              </Text>
            ) : null}
          </Card>
        </View>

        <View className="mt-6 gap-3">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Specs
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {specs.length === 0 ? (
              <Card className="w-full">
                <Text className="text-sm text-muted-text">
                  Specs unavailable for this figure.
                </Text>
              </Card>
            ) : (
              specs.map((entry) => (
                <View
                  key={`${entry.label}-${entry.value}`}
                  className={isCompact ? "w-full" : "w-[48%]"}
                >
                  <Card className="gap-2">
                    <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                      {entry.label}
                    </Text>
                    <Text className="text-sm font-space-medium text-frost-text">
                      {entry.value}
                    </Text>
                  </Card>
                </View>
              ))
            )}
          </View>
        </View>

        <View className="mt-6 gap-3">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Accessories
          </Text>
          {accessories.length === 0 ? (
            <Card>
              <Text className="text-sm text-muted-text">
                No accessories listed.
              </Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {accessories.map((item, index) => (
                <View key={`${item.name}-${index}`} className="w-48">
                  <Card className="gap-2">
                    <Text className="text-sm font-space-semibold text-frost-text">
                      {item.name}
                    </Text>
                    {item.detail ? (
                      <Text className="text-xs text-muted-text">
                        {item.detail}
                      </Text>
                    ) : (
                      <Text className="text-[10px] text-muted-text">
                        Included accessory
                      </Text>
                    )}
                  </Card>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mt-6 gap-3">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Actions
          </Text>
          <View className="gap-3">
            <Button
              label="Edit Figure"
              variant="secondary"
              icon={<MaterialIcons name="edit" size={16} color="#f8fafc" />}
              onPress={handleEdit}
            />
            <Button
              label="Share Figure"
              variant="ghost"
              icon={<MaterialIcons name="share" size={16} color="#60a5fa" />}
              onPress={handleShare}
            />
            <Pressable
              onPress={handleDiscover}
              className={`rounded-2xl border px-4 py-4 ${accentBorderClass} bg-hud-surface`}
              accessibilityRole="button"
              accessibilityLabel="Discover related figures"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-space-semibold text-frost-text">
                    Discover related figures
                  </Text>
                  <Text className="mt-1 text-xs text-muted-text">
                    Jump back into the catalog to explore more from this era.
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={18} color="#94a3b8" />
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
