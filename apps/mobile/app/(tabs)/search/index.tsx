import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { track } from "../../../src/observability";

export default function ScannerScreen() {
  useEffect(() => {
    track("scanner_viewed");
  }, []);

  return (
    <PlaceholderScreen
      title="Scanner"
      description="Placeholder for barcode scanner experience."
    >
      <Pressable
        style={styles.button}
        onPress={() => {
          track("scan_detected");
          track("scan_lookup_success");
          router.push("/search/results");
        }}
      >
        <Text style={styles.buttonText}>Go to Scan Results</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => {
          track("scanner_permission_denied");
          router.push("/search/manual");
        }}
      >
        <Text style={styles.buttonText}>Go to Manual Lookup</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("scanner_permission_granted")}
      >
        <Text style={styles.buttonText}>Grant Camera Permission</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("scanner_flash_toggled")}
      >
        <Text style={styles.buttonText}>Toggle Flash</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("scan_lookup_failure")}
      >
        <Text style={styles.buttonText}>Simulate Lookup Failure</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("scan_lookup_no_match")}
      >
        <Text style={styles.buttonText}>Simulate No Match</Text>
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
    marginBottom: 12,
  },
  buttonText: {
    color: "#e6f0ff",
    fontSize: 14,
    fontWeight: "600",
  },
});
