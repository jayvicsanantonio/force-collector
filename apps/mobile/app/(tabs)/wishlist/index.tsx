import { router } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useOfflineStatus } from "../../../src/offline/OfflineProvider";
import {
  useFiguresByStatus,
  useUpdateFigureStatus,
} from "../../../src/offline/hooks";

export default function WishlistScreen() {
  const { isOnline, syncNow } = useOfflineStatus();
  const { data } = useFiguresByStatus("WISHLIST");
  const updateStatus = useUpdateFigureStatus();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Wishlist</Text>
        <Text style={styles.subtitle}>
          {isOnline ? "Online" : "Offline"} · Cached list
        </Text>
      </View>

      {!isOnline ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Offline mode: edits will sync when you reconnect.
          </Text>
        </View>
      ) : (
        <Pressable style={styles.syncButton} onPress={() => syncNow()}>
          <Text style={styles.syncButtonText}>Sync now</Text>
        </Pressable>
      )}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No cached wishlist items yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>{item.series ?? "Unknown series"}</Text>
            <Text style={styles.cardPrice}>
              Last price: {item.lastPrice ? `$${item.lastPrice}` : "Unknown"} ·{" "}
              {item.inStock === null
                ? "Stock unknown"
                : item.inStock
                ? "In stock"
                : "Out of stock"}
            </Text>
            <View style={styles.cardRow}>
              <Pressable
                style={styles.actionButton}
                onPress={() => updateStatus(item.id, "OWNED")}
              >
                <Text style={styles.actionButtonText}>Mark Owned</Text>
              </Pressable>
              {item.syncPending && (
                <Text style={styles.pendingText}>Sync pending</Text>
              )}
            </View>
          </View>
        )}
      />

      <Pressable
        style={styles.linkButton}
        onPress={() => router.push("/wishlist/price-tracker")}
      >
        <Text style={styles.linkButtonText}>Go to Price Tracker</Text>
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
    paddingHorizontal: 20,
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
  banner: {
    marginHorizontal: 20,
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
  syncButton: {
    alignSelf: "flex-start",
    marginHorizontal: 20,
    marginTop: 12,
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
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#101a2a",
    borderWidth: 1,
    borderColor: "#22324d",
  },
  cardTitle: {
    color: "#e6f0ff",
    fontSize: 16,
    fontWeight: "600",
  },
  cardMeta: {
    marginTop: 4,
    color: "#9fb3d9",
    fontSize: 12,
  },
  cardPrice: {
    marginTop: 6,
    color: "#cfe0ff",
    fontSize: 12,
  },
  cardRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  actionButtonText: {
    color: "#e6f0ff",
    fontSize: 12,
    fontWeight: "600",
  },
  pendingText: {
    color: "#ffcc66",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyText: {
    color: "#91a7cf",
    fontSize: 12,
    paddingTop: 24,
    textAlign: "center",
  },
  linkButton: {
    margin: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  linkButtonText: {
    color: "#e6f0ff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
