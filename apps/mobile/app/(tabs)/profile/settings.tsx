import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { signOutAndClearUserData } from "../../../src/offline/session";
import { captureError, track } from "../../../src/observability";
import { useMe, useUpdateMe } from "../../../src/api/me";
import { useAuth } from "../../../src/auth/AuthProvider";
import * as Notifications from "expo-notifications";
import { hasPushPermission, registerPushTokenIfNeeded } from "../../../src/notifications/push";
import { useEffect, useState } from "react";

const defaultNotificationPrefs = {
  price_drop: true,
  restock: true,
  new_drop: true,
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const { data } = useMe();
  const updateMe = useUpdateMe();

  const [notificationPrefs, setNotificationPrefs] = useState(
    defaultNotificationPrefs
  );

  useEffect(() => {
    if (!data?.profile.preferences) {
      return;
    }
    setNotificationPrefs({
      ...defaultNotificationPrefs,
      ...(data.profile.preferences.notifications ?? {}),
    });
  }, [data?.profile.preferences]);

  async function requestPermissionWithExplanation() {
    const alreadyGranted = await hasPushPermission();
    if (alreadyGranted) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Enable notifications",
        "Force Collector uses notifications for price drops, restocks, and new releases you care about.",
        [
          {
            text: "Not now",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Allow",
            onPress: async () => {
              await Notifications.requestPermissionsAsync();
              resolve(await hasPushPermission());
            },
          },
        ]
      );
    });
  }

  async function updateNotificationPreference(key: string, value: boolean) {
    const granted = value ? await requestPermissionWithExplanation() : true;
    if (!granted) {
      return;
    }

    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);

    updateMe.mutate({
      preferences: {
        ...(data?.profile.preferences ?? {}),
        notifications: next,
      },
    });

    if (value && user?.id) {
      await registerPushTokenIfNeeded(user.id);
    }

    track("notifications_toggle_changed", { key, value });
  }

  return (
    <PlaceholderScreen
      title="Settings"
      description="Manage notifications, account, and privacy settings."
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <Text style={styles.cardText}>
          Choose which alerts you want to receive.
        </Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Price drops</Text>
          <Switch
            value={notificationPrefs.price_drop}
            onValueChange={(value) =>
              void updateNotificationPreference("price_drop", value)
            }
            trackColor={{ false: "#1c2a3d", true: "#2d5aa7" }}
            thumbColor="#e6f0ff"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Restocks</Text>
          <Switch
            value={notificationPrefs.restock}
            onValueChange={(value) =>
              void updateNotificationPreference("restock", value)
            }
            trackColor={{ false: "#1c2a3d", true: "#2d5aa7" }}
            thumbColor="#e6f0ff"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>New drops & pre-orders</Text>
          <Switch
            value={notificationPrefs.new_drop}
            onValueChange={(value) =>
              void updateNotificationPreference("new_drop", value)
            }
            trackColor={{ false: "#1c2a3d", true: "#2d5aa7" }}
            thumbColor="#e6f0ff"
          />
        </View>
      </View>
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
  toggleRow: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#0f1826",
    borderWidth: 1,
    borderColor: "#22324d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    color: "#e6f0ff",
    fontSize: 13,
    fontWeight: "600",
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
