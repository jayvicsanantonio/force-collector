import { Pressable, StyleSheet, Text, View } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { signOutAndClearUserData } from "../../../src/offline/session";

export default function SettingsScreen() {
  return (
    <PlaceholderScreen
      title="Settings"
      description="Placeholder for notification, account, and privacy settings."
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardText}>
          Signing out clears cached data and secure tokens on this device.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => signOutAndClearUserData()}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#101a2a",
    borderWidth: 1,
    borderColor: "#22324d",
  },
  cardTitle: {
    color: "#a7c4ff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardText: {
    marginTop: 8,
    color: "#e6f0ff",
    fontSize: 13,
  },
  button: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  buttonText: {
    color: "#e6f0ff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
