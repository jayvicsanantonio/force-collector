import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { authConfig } from "../src/auth/config";
import { useAuth } from "../src/auth/AuthProvider";
import { track } from "../src/observability";

export default function Index() {
  const { status } = useAuth();

  useEffect(() => {
    track("splash_viewed");
  }, []);

  useEffect(() => {
    if (status === "signedIn" && authConfig.bypassSplashWhenSignedIn) {
      router.replace("/home");
    }
  }, [status]);

  const isChecking = status === "checking";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Force Collector</Text>
      <Text style={styles.subtitle}>Welcome to the collection hub.</Text>
      {isChecking ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#06b6d4" />
          <Text style={styles.loadingText}>Checking session...</Text>
        </View>
      ) : null}
      <Pressable
        style={[styles.primaryButton, isChecking && styles.disabledButton]}
        disabled={isChecking}
        onPress={() => {
          track("splash_get_started_tapped");
          router.replace("/(auth)/create-account");
        }}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </Pressable>
      <Pressable
        style={[styles.secondaryButton, isChecking && styles.disabledButton]}
        disabled={isChecking}
        onPress={() => {
          track("splash_access_existing_tapped");
          router.replace("/(auth)/sign-in");
        }}
      >
        <Text style={styles.secondaryButtonText}>Access Existing Data</Text>
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
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    color: "#91a4c7",
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#91a4c7",
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  primaryButtonText: {
    color: "#e6f0ff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#0f1826",
    borderWidth: 1,
    borderColor: "#22324d",
  },
  secondaryButtonText: {
    color: "#a7c4ff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
