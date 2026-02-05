import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";

export default function ScannerScreen() {
  return (
    <PlaceholderScreen
      title="Scanner"
      description="Placeholder for barcode scanner experience."
    >
      <Pressable
        style={styles.button}
        onPress={() => router.push("/search/results")}
      >
        <Text style={styles.buttonText}>Go to Scan Results</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/search/manual")}
      >
        <Text style={styles.buttonText}>Go to Manual Lookup</Text>
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
