import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Dashboard"
      description="Placeholder for the Force Collector dashboard."
    >
      <Pressable style={styles.button} onPress={() => router.push("/add-figure")}>
        <Text style={styles.buttonText}>Open Add Figure Modal</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push("/edit-figure")}>
        <Text style={styles.buttonText}>Open Edit Figure Modal</Text>
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
