import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Text style={styles.title}>This screen does not exist.</Text>
      <Link href="/home" style={styles.link}>
        Go to Dashboard
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0b0f16",
  },
  title: {
    color: "#e6f0ff",
    fontSize: 20,
    fontWeight: "600",
  },
  link: {
    marginTop: 12,
    color: "#5cc8ff",
    fontSize: 16,
  },
});
