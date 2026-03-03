import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { registerPushToken } from "../api/push";
import { captureError, track } from "../observability";
import { getNotificationsModuleAsync } from "./runtime";

const DEVICE_ID_KEY = "push_device_id";
const LAST_TOKEN_KEY = "push_last_token";
const LAST_USER_KEY = "push_last_user";

type NotificationsModule = typeof import("expo-notifications");

function isPermissionGranted(
  permission: import("expo-notifications").NotificationPermissionsStatus,
  Notifications: NotificationsModule
) {
  return (
    permission.granted ||
    permission.ios?.status ===
      Notifications.IosAuthorizationStatus.AUTHORIZED ||
    permission.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
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

async function getExpoPushToken(Notifications: NotificationsModule) {
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
    const Notifications = await getNotificationsModuleAsync();
    if (!Notifications) {
      return { status: "unsupported" as const };
    }

    const permission = await Notifications.getPermissionsAsync();
    if (!isPermissionGranted(permission, Notifications)) {
      return { status: "permission_denied" as const };
    }

    await ensureAndroidChannel(Notifications);

    const expoPushToken = await getExpoPushToken(Notifications);
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
  void (async () => {
    const Notifications = await getNotificationsModuleAsync();
    if (!Notifications) {
      return;
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  })();
}

export async function hasPushPermission() {
  const Notifications = await getNotificationsModuleAsync();
  if (!Notifications) {
    return false;
  }
  const permission = await Notifications.getPermissionsAsync();
  return isPermissionGranted(permission, Notifications);
}

export async function requestPushPermission() {
  const Notifications = await getNotificationsModuleAsync();
  if (!Notifications) {
    return false;
  }
  await Notifications.requestPermissionsAsync();
  const permission = await Notifications.getPermissionsAsync();
  return isPermissionGranted(permission, Notifications);
}
