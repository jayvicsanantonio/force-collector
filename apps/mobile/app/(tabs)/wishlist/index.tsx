import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";

export default function WishlistScreen() {
  return (
    <PlaceholderScreen
      title="Wishlist"
      description="Placeholder for wishlist and price tracker list."
    >
      <Pressable
        style={styles.button}
        onPress={() => router.push("/wishlist/price-tracker")}
      >
        <Text style={styles.buttonText}>Go to Price Tracker</Text>
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
