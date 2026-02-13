import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  ScanLookupResponseSchema,
  type ScanLookupResponse,
} from "@force-collector/shared";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { track } from "../../../src/observability";

export default function ScanResultsScreen() {
  const params = useLocalSearchParams<{ payload?: string }>();
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

  useEffect(() => {
    track("scan_results_viewed");
  }, []);

  return (
    <PlaceholderScreen
      title="Scan Results"
      description={
        payload?.match
          ? "Review the detected figure and take action."
          : "No scan payload found. Try scanning again."
      }
    >
      {payload?.match ? (
        <View className="rounded-2xl border border-hud-line/60 bg-raised-surface/70 px-4 py-4">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Primary Match
          </Text>
          <Text className="mt-2 text-lg font-space-semibold text-frost-text">
            {payload.match.name}
          </Text>
          <Text className="mt-1 text-xs text-secondary-text">
            {payload.match.series} · Wave {payload.match.wave} ·{" "}
            {payload.match.release_year}
          </Text>
          <Text className="mt-2 text-xs text-secondary-text">
            Confidence: {(payload.confidence * 100).toFixed(0)}%
          </Text>
        </View>
      ) : null}
      <Pressable
        style={styles.button}
        onPress={() => track("scan_results_add_collection")}
      >
        <Text style={styles.buttonText}>Add to Collection</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("scan_results_add_wishlist")}
      >
        <Text style={styles.buttonText}>Add to Wishlist</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("scan_results_related_add")}
      >
        <Text style={styles.buttonText}>Add Related Figure</Text>
      </Pressable>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  buttonText: {
    color: "#e6f0ff",
    fontSize: 14,
    fontWeight: "600",
  },
});
