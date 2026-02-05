import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PlaceholderScreen } from "../../components/PlaceholderScreen";

export default function WishlistScreen() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen
        title="Wishlist"
        description="Wishlist items, price alerts, and stock status."
        showModalActions
      />
      <Link href="/wishlist/price-tracker" asChild>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkText}>Go to Price Tracker</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1017",
  },
  linkButton: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    backgroundColor: "#10263b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  linkText: {
    color: "#d7e9ff",
    fontSize: 13,
    fontWeight: "600",
  },
});
