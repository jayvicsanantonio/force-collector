import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AddFigureModal() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Figure</Text>
      <Text style={styles.description}>
        Placeholder for add figure flow (scan, manual, or custom).
      </Text>
      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0b0f16",
    justifyContent: "center",
  },
  title: {
    color: "#e6f0ff",
    fontSize: 24,
    fontWeight: "700",
  },
  description: {
    color: "#91a4c7",
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
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
