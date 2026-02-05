import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PlaceholderScreen } from "../../components/PlaceholderScreen";

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen
        title="Scanner"
        description="Scan barcodes or enter codes manually."
      />
      <View style={styles.buttonRow}>
        <Link href="/search/results" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>View Scan Results</Text>
          </Pressable>
        </Link>
        <Link href="/search/manual" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Manual Lookup</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1017",
    justifyContent: "center",
  },
  buttonRow: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    flexDirection: "row",
  },
  linkButton: {
    backgroundColor: "#10263b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  linkText: {
    color: "#d7e9ff",
    fontSize: 13,
    fontWeight: "600",
  },
});
