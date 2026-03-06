import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { createUserFigure, updateUserFigureStatus } from "../../../src/api/user-figures";
import { useFigureSearch } from "../../../src/api/figures";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import {
  applyServerUpdate,
  getFigureByFigureId,
} from "../../../src/offline/cache";
import {
  useUpdateFigureStatus,
  useUpsertFigureRecord,
} from "../../../src/offline/hooks";
import type { FigureStatus } from "../../../src/offline/types";
import { track } from "../../../src/observability";

type Mode = "search" | "custom";

const STATUS_OPTIONS: Array<{ value: FigureStatus; label: string }> = [
  { value: "OWNED", label: "Add to Collection" },
  { value: "WISHLIST", label: "Add to Wishlist" },
];

function normalizeMode(value: string | undefined): Mode {
  return value === "custom" ? "custom" : "search";
}

export default function ManualLookupScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode = normalizeMode(params.mode);
  const { isOnline } = useOfflineStatus();
  const updateStatusOffline = useUpdateFigureStatus();
  const upsertFigure = useUpsertFigureRecord();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSeries, setCustomSeries] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const searchQuery = useFigureSearch(trimmedQuery);
  const searchResults = searchQuery.data?.items ?? [];

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    track("manual_search_viewed", { mode });
  }, [mode]);

  const resetFeedback = useCallback(() => {
    setNotice(null);
    setError(null);
  }, []);

  const createOrUpdateFigure = useCallback(
    async (
      input: {
        figureId?: string | null;
        name: string;
        series?: string | null;
        customPayload?: Record<string, unknown>;
      },
      status: FigureStatus
    ) => {
      resetFeedback();
      const pendingKey = input.figureId ?? input.name;
      setPendingId(pendingKey);

      try {
        const existing = input.figureId
          ? await getFigureByFigureId(input.figureId)
          : null;

        if (existing) {
          if (existing.status === status) {
            setNotice(
              status === "OWNED"
                ? "Already in your collection."
                : "Already on your wishlist."
            );
            return;
          }

          if (isOnline) {
            const response = await updateUserFigureStatus(existing.id, status);
            await applyServerUpdate(
              existing.id,
              status,
              response.updated_at ?? new Date().toISOString()
            );
          } else {
            await updateStatusOffline(existing.id, status);
          }

          setNotice(
            status === "OWNED"
              ? "Moved to your collection."
              : "Moved to your wishlist."
          );
          return;
        }

        if (!isOnline) {
          setError("Manual search and custom entry require a connection right now.");
          return;
        }

        const response = await createUserFigure({
          figure_id: input.figureId ?? undefined,
          custom_figure_payload: input.customPayload,
          status,
          condition: "UNKNOWN",
        });

        await upsertFigure({
          id: response.id,
          figureId: response.figure_id ?? input.figureId ?? null,
          name: input.name,
          series: input.series ?? null,
          status,
          updatedAt: response.updated_at ?? new Date().toISOString(),
          syncPending: false,
        });

        setNotice(
          status === "OWNED"
            ? "Added to your collection."
            : "Added to your wishlist."
        );

        if (!input.figureId) {
          setCustomName("");
          setCustomSeries("");
        }
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Unable to save this figure."
        );
      } finally {
        setPendingId(null);
      }
    },
    [customName, customSeries, isOnline, resetFeedback, updateStatusOffline, upsertFigure]
  );

  const customPayload = useMemo(() => {
    const name = customName.trim();
    const series = customSeries.trim();
    if (!name) {
      return null;
    }
    return {
      name,
      ...(series ? { series } : {}),
    };
  }, [customName, customSeries]);

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Manual Search"
        subtitle={mode === "custom" ? "Create a custom figure" : "Search the catalog"}
        rightSlot={
          <Pressable
            onPress={() => router.back()}
            className="rounded-full border border-hud-line/70 bg-raised-surface/70 px-3 py-1"
          >
            <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
              Close
            </Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label="Search Catalog"
              variant={mode === "search" ? "primary" : "secondary"}
              onPress={() => {
                resetFeedback();
                setMode("search");
              }}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Custom Entry"
              variant={mode === "custom" ? "primary" : "secondary"}
              onPress={() => {
                resetFeedback();
                setMode("custom");
              }}
            />
          </View>
        </View>

        {!isOnline ? (
          <View className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <Text className="text-xs text-amber-200">
              Search and custom entry currently need a network connection.
            </Text>
          </View>
        ) : null}

        {notice ? (
          <View className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
            <Text className="text-xs text-emerald-200">{notice}</Text>
          </View>
        ) : null}

        {error ? (
          <View className="rounded-xl border border-danger-red/50 bg-danger-red/10 px-4 py-3">
            <Text className="text-xs text-danger-red">{error}</Text>
          </View>
        ) : null}

        {mode === "search" ? (
          <View className="gap-4">
            <Card className="gap-3">
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Search Query
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Search by figure name, character, or line"
                placeholderTextColor="#64748b"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="words"
              />
              <Text className="text-xs text-secondary-text">
                Results update as you type.
              </Text>
            </Card>

            {trimmedQuery.length === 0 ? (
              <Card>
                <Text className="text-sm text-secondary-text">
                  Enter a search term to find a catalog figure.
                </Text>
              </Card>
            ) : searchQuery.isLoading ? (
              <Card>
                <Text className="text-sm text-secondary-text">Searching catalog...</Text>
              </Card>
            ) : searchResults.length === 0 ? (
              <Card className="gap-3">
                <Text className="text-sm text-secondary-text">
                  No catalog matches found for "{trimmedQuery}".
                </Text>
                <Button
                  label="Create Custom Entry"
                  variant="secondary"
                  onPress={() => setMode("custom")}
                />
              </Card>
            ) : (
              searchResults.map((item) => {
                const key = item.id;
                const busy = pendingId === key;
                return (
                  <Card key={item.id} className="gap-3">
                    <View>
                      <Text className="text-base font-space-semibold text-frost-text">
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-xs text-secondary-text">
                        {item.series ?? "Unknown series"}
                      </Text>
                    </View>
                    <View className="gap-2">
                      {STATUS_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          label={option.label}
                          variant={option.value === "OWNED" ? "primary" : "secondary"}
                          loading={busy}
                          disabled={busy}
                          onPress={() => {
                            track("manual_search_add_selected", {
                              status: option.value,
                            });
                            void createOrUpdateFigure(
                              {
                                figureId: item.id,
                                name: item.name,
                                series: item.series ?? null,
                              },
                              option.value
                            );
                          }}
                        />
                      ))}
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        ) : (
          <View className="gap-4">
            <Card className="gap-3">
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Figure Name
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Commander Cody"
                placeholderTextColor="#64748b"
                value={customName}
                onChangeText={setCustomName}
                autoCapitalize="words"
              />
              <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
                Series
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Custom line or collection"
                placeholderTextColor="#64748b"
                value={customSeries}
                onChangeText={setCustomSeries}
                autoCapitalize="words"
              />
            </Card>

            <Card className="gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  label={option.label}
                  variant={option.value === "OWNED" ? "primary" : "secondary"}
                  loading={pendingId === customName.trim()}
                  disabled={!customPayload || pendingId === customName.trim()}
                  onPress={() => {
                    if (!customPayload) {
                      setError("Enter a figure name first.");
                      return;
                    }
                    track("custom_entry_add_selected", { status: option.value });
                    void createOrUpdateFigure(
                      {
                        name: customPayload.name as string,
                        series:
                          typeof customPayload.series === "string"
                            ? customPayload.series
                            : null,
                        customPayload,
                      },
                      option.value
                    );
                  }}
                />
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#22324d",
    backgroundColor: "#101a2a",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
});
