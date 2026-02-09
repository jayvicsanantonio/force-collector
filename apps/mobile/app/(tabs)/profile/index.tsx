import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { useMe } from "../../../src/api/me";
import type { ApiError } from "../../../src/api/client";
import { env } from "../../../src/env";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { track } from "../../../src/observability";

export default function ProfileScreen() {
  const { data, isLoading, error } = useMe();
  const apiError = error as ApiError | null;
  const hasApiBaseUrl = Boolean(env.API_BASE_URL);
  const { allegiance, toggleAllegiance } = useTheme();

  useEffect(() => {
    track("profile_viewed");
  }, []);

  return (
    <PlaceholderScreen
      title="Profile & Settings"
      description="Placeholder for profile, achievements, and settings."
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>API Contract Check</Text>
        {!hasApiBaseUrl ? (
          <Text style={styles.cardText}>
            Set API_BASE_URL to enable profile fetching.
          </Text>
        ) : isLoading ? (
          <Text style={styles.cardText}>Fetching /v1/me...</Text>
        ) : data ? (
          <Text style={styles.cardText}>
            Welcome back, {data.profile.display_name}.
          </Text>
        ) : (
          <Text style={styles.cardText}>
            {apiError?.message ?? "No profile loaded yet."}
          </Text>
        )}
      </View>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/profile/settings")}
      >
        <Text style={styles.buttonText}>Go to Settings</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => {
          toggleAllegiance();
          track("profile_theme_changed", {
            allegiance: allegiance === "light" ? "dark" : "light",
          });
        }}
      >
        <Text style={styles.buttonText}>Toggle Theme</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("profile_notifications_opened")}
      >
        <Text style={styles.buttonText}>Open Notifications</Text>
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
});
