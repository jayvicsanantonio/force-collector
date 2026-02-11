import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { track } from "../../../src/observability";

export default function WishlistDetailsScreen() {
  const params = useLocalSearchParams<{
    figureId?: string;
    userFigureId?: string;
  }>();

  const target = params.userFigureId ?? params.figureId ?? undefined;

  useEffect(() => {
    track("wishlist_details_viewed");
  }, []);

  return (
    <PlaceholderScreen
      title="Wishlist Item"
      description={
        target
          ? `Opened from notification for ${target}.`
          : "Placeholder for wishlist item details and price alerts."
      }
    >
      <Pressable
        style={styles.button}
        onPress={() => track("wishlist_price_alert_configured")}
      >
        <Text style={styles.buttonText}>Manage Price Alert</Text>
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
