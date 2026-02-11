import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { registerPushToken } from "../api/push";
import { captureError, track } from "../observability";

const DEVICE_ID_KEY = "push_device_id";
const LAST_TOKEN_KEY = "push_last_token";
const LAST_USER_KEY = "push_last_user";

function isPermissionGranted(permission: Notifications.NotificationPermissionsStatus) {
  return (
    permission.granted ||
    permission.ios?.status ===
      Notifications.IosAuthorizationStatus.AUTHORIZED ||
    permission.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

async function getExpoPushToken() {
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId;

  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResponse.data;
}

export async function registerPushTokenIfNeeded(userId: string) {
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!isPermissionGranted(permission)) {
      return { status: "permission_denied" as const };
    }

    await ensureAndroidChannel();

    const expoPushToken = await getExpoPushToken();
    const deviceId = await getOrCreateDeviceId();

    const [lastToken, lastUser] = await Promise.all([
      SecureStore.getItemAsync(LAST_TOKEN_KEY),
      SecureStore.getItemAsync(LAST_USER_KEY),
    ]);

    if (lastToken === expoPushToken && lastUser === userId) {
      return { status: "noop" as const, expoPushToken };
    }

    await registerPushToken({
      expo_push_token: expoPushToken,
      device_id: deviceId,
    });

    await Promise.all([
      SecureStore.setItemAsync(LAST_TOKEN_KEY, expoPushToken),
      SecureStore.setItemAsync(LAST_USER_KEY, userId),
    ]);

    track("push_token_registered");

    return { status: "registered" as const, expoPushToken };
  } catch (error) {
    captureError(error, { source: "push", action: "register" });
    return { status: "error" as const };
  }
}

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function hasPushPermission() {
  const permission = await Notifications.getPermissionsAsync();
  return isPermissionGranted(permission);
}
