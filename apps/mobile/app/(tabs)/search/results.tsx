import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { track } from "../../../src/observability";

export default function ScanResultsScreen() {
  useEffect(() => {
    track("scan_results_viewed");
  }, []);

  return (
    <PlaceholderScreen
      title="Scan Results"
      description="Placeholder for scanned figure match and actions."
    >
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
