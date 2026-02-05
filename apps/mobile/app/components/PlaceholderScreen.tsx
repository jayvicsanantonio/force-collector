import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  showModalActions?: boolean;
};

export function PlaceholderScreen({
  title,
  description,
  showModalActions = false,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {showModalActions ? (
        <View style={styles.buttonRow}>
          <Link href="/(modals)/add-figure" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Open Add Figure</Text>
            </Pressable>
          </Link>
          <Link href="/(modals)/edit-figure" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Open Edit Figure</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
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
    fontSize: 24,
    fontWeight: "700",
    color: "#e5f2ff",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#9fb3c8",
    textAlign: "center",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#1b3a57",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 6,
  },
  buttonText: {
    color: "#d7e9ff",
    fontSize: 13,
    fontWeight: "600",
  },
});
