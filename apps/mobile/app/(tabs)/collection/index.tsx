import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import { useFiguresByStatus } from "../../../src/offline/hooks";
import type { CachedFigure } from "../../../src/offline/types";
import { track } from "../../../src/observability";

const FILTER_PRESETS = [
  "All",
  "Prequel",
  "Original",
  "Sequel",
  "TV",
  "Gaming",
  "Other",
  "Black Series",
  "Vintage",
  "Archive",
  "Deluxe",
];

const SORT_OPTIONS = [
  { id: "az", label: "A–Z" },
  { id: "newest", label: "Newest Added" },
  { id: "release", label: "Release Year" },
  { id: "value", label: "Estimated Value" },
] as const;

type SortOptionId = (typeof SORT_OPTIONS)[number]["id"];

const COLUMN_GAP = 12;
const ROW_GAP = 12;
const CARD_HEIGHT = 186;
const CONTENT_PADDING = 20;

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

function extractYear(input: string) {
  const match = input.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function getSearchableText(item: CachedFigure) {
  return [item.name, item.series].filter(Boolean).join(" ").toLowerCase();
}

export default function CollectionScreen() {
  const { isOnline, syncNow } = useOfflineStatus();
  const { data } = useFiguresByStatus("OWNED");
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 120);
  const [activeFilter, setActiveFilter] = useState(FILTER_PRESETS[0]);
  const [activeSort, setActiveSort] = useState<SortOptionId>("newest");

  const cardWidth = useMemo(() => {
    const available = width - CONTENT_PADDING * 2 - COLUMN_GAP;
    return Math.floor(available / 2);
  }, [width]);

  const filteredData = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    const tokens = normalizedQuery.length
      ? normalizedQuery.split(/\s+/).filter(Boolean)
      : [];
    const filterToken = activeFilter.toLowerCase();

    return data.filter((item) => {
      const searchable = getSearchableText(item);
      const matchesQuery =
        tokens.length === 0 ||
        tokens.every((token) => searchable.includes(token));
      const matchesFilter =
        activeFilter === "All" || searchable.includes(filterToken);
      return matchesQuery && matchesFilter;
    });
  }, [data, debouncedQuery, activeFilter]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      switch (activeSort) {
        case "az": {
          return a.name.localeCompare(b.name);
        }
        case "newest": {
          const aTime = Date.parse(a.updatedAt);
          const bTime = Date.parse(b.updatedAt);
          return (bTime || 0) - (aTime || 0);
        }
        case "release": {
          const aYear = extractYear(a.name) ?? extractYear(a.series ?? "") ?? 0;
          const bYear = extractYear(b.name) ?? extractYear(b.series ?? "") ?? 0;
          return bYear - aYear;
        }
        case "value": {
          const aValue = a.lastPrice ?? -Infinity;
          const bValue = b.lastPrice ?? -Infinity;
          return bValue - aValue;
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredData, activeSort]);

  useEffect(() => {
    track("collection_grid_viewed");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CachedFigure }) => (
      <Pressable
        style={[styles.card, { width: cardWidth, height: CARD_HEIGHT }]}
        onPress={() => {
          track("collection_item_opened");
          router.push({
            pathname: "/collection/details",
            params: { userFigureId: item.id, source: "collection" },
          });
        }}
      >
        <View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.series ?? "Unknown series"}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardPrice}>
              {item.lastPrice ? `$${item.lastPrice}` : "Value unknown"}
            </Text>
            {!isOnline && item.lastPrice !== null ? (
              <Text style={styles.staleText}>Stale price</Text>
            ) : null}
          </View>
          {item.syncPending ? (
            <Text style={styles.pendingText}>Sync pending</Text>
          ) : null}
        </View>
      </Pressable>
    ),
    [cardWidth, isOnline]
  );

  const getItemLayout = useCallback(
    (_: CachedFigure[] | null | undefined, index: number) => {
      const row = Math.floor(index / 2);
      const length = CARD_HEIGHT + ROW_GAP;
      return { length, offset: row * length, index };
    },
    []
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <Text style={styles.subtitle}>
          {isOnline ? "Online" : "Offline"} · Cached {data.length} items
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => track("collection_search_used")}
          placeholder="Search name, character, series, era"
          placeholderTextColor="#6c82a8"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {isOnline ? (
          <Pressable
            style={styles.syncButton}
            onPress={() => {
              track("collection_sync_tapped");
              syncNow();
            }}
          >
            <Text style={styles.syncButtonText}>Sync</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <FlatList
          data={FILTER_PRESETS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setActiveFilter(item);
                track("collection_filter_applied");
              }}
              style={
                item === activeFilter
                  ? styles.filterChipActive
                  : styles.filterChip
              }
            >
              <Text
                style={
                  item === activeFilter
                    ? styles.filterChipTextActive
                    : styles.filterChipText
                }
              >
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort</Text>
        <View style={styles.sortOptions}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                setActiveSort(option.id);
                track("collection_sort_changed");
              }}
              style={
                option.id === activeSort
                  ? styles.sortChipActive
                  : styles.sortChip
              }
            >
              <Text
                style={
                  option.id === activeSort
                    ? styles.sortChipTextActive
                    : styles.sortChipText
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!isOnline ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Offline mode: cached list shown. Price data may be stale.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={sortedData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={getItemLayout}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No cached collection items yet.</Text>
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => {
          track("collection_add_figure_tapped");
          router.push("/add-figure");
        }}
      >
        <Text style={styles.fabText}>Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b111b",
  },
  header: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 20,
  },
  title: {
    color: "#e6f0ff",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    color: "#a7b7d6",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#22324d",
    backgroundColor: "#0f1826",
    color: "#e6f0ff",
    fontSize: 13,
  },
  syncButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  syncButtonText: {
    color: "#a7c4ff",
    fontSize: 12,
    fontWeight: "600",
  },
  filterRow: {
    paddingTop: 12,
  },
  filterList: {
    paddingHorizontal: CONTENT_PADDING,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2f4566",
    backgroundColor: "#0f1826",
  },
  filterChipActive: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#6fb7ff",
    backgroundColor: "#132b47",
  },
  filterChipText: {
    color: "#a7c4ff",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  filterChipTextActive: {
    color: "#e6f0ff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sortRow: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 12,
  },
  sortLabel: {
    color: "#6f87ad",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 8,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2f4566",
    backgroundColor: "#101a2a",
  },
  sortChipActive: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6fb7ff",
    backgroundColor: "#132b47",
  },
  sortChipText: {
    color: "#c3d4f2",
    fontSize: 11,
    fontWeight: "600",
  },
  sortChipTextActive: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  banner: {
    marginHorizontal: CONTENT_PADDING,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#1d2b3f",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  bannerText: {
    color: "#d7e3ff",
    fontSize: 12,
  },
  list: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 16,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: ROW_GAP,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#101a2a",
    borderWidth: 1,
    borderColor: "#22324d",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#e6f0ff",
    fontSize: 15,
    fontWeight: "600",
  },
  cardMeta: {
    marginTop: 6,
    color: "#9fb3d9",
    fontSize: 12,
  },
  cardFooter: {
    marginTop: 12,
    gap: 4,
  },
  cardPrice: {
    color: "#cfe0ff",
    fontSize: 12,
  },
  staleText: {
    color: "#f7b955",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pendingText: {
    color: "#ffcc66",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
  emptyText: {
    color: "#91a7cf",
    fontSize: 12,
    paddingTop: 24,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#6fb7ff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: "#e6f0ff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
