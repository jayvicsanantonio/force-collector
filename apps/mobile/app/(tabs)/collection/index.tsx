import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";

export default function CollectionScreen() {
  return (
    <PlaceholderScreen
      title="Collection Grid"
      description="Placeholder for collection grid and filters."
    >
      <Pressable
        style={styles.button}
        onPress={() => router.push("/collection/details")}
      >
        <Text style={styles.buttonText}>Go to Figure Details</Text>
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
