import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { signOutAndClearUserData } from "../../../src/offline/session";
import { captureError, track } from "../../../src/observability";

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
          onPress={async () => {
            track("profile_sign_out");
            try {
              await signOutAndClearUserData();
              router.replace("/");
            } catch (error) {
              captureError(error, { source: "settings", action: "sign_out" });
            }
          }}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Observability</Text>
        <Text style={styles.cardText}>
          Send a test event or error to verify analytics/crash reporting.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => track("test_event", { source: "settings" })}
        >
          <Text style={styles.buttonText}>Send Test Event</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() =>
            captureError(new Error("Test error from Settings"), {
              source: "settings",
            })
          }
        >
          <Text style={styles.buttonText}>Send Test Error</Text>
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
