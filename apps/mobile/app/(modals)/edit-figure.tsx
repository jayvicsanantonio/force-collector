import { router } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";

export default function EditFigureModal() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Figure</Text>
      <Text style={styles.description}>
        Placeholder modal for purchase details, condition, and notes.
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
    backgroundColor: "#0b1017",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e5f2ff",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#9fb3c8",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1b3a57",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "#d7e9ff",
    fontWeight: "600",
  },
});
