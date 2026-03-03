import Constants from "expo-constants";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import { captureError, track } from "../observability";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let unsupportedTracked = false;

function isExpoGoUnsupportedError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("expo-notifications") && message.includes("Expo Go")
  );
}

function isExpoGoAndroidClient() {
  const executionEnvironment = Constants.executionEnvironment;
  const appOwnership = Constants.appOwnership;
  return (
    Platform.OS === "android" &&
    (
      isRunningInExpoGo() ||
      executionEnvironment === "storeClient" ||
      appOwnership === "expo"
    )
  );
}

export async function getNotificationsModuleAsync() {
  if (isExpoGoAndroidClient()) {
    if (!unsupportedTracked) {
      unsupportedTracked = true;
      track("push_notifications_unavailable_in_expo_go");
    }
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications").catch(
      (error: unknown) => {
        if (isExpoGoUnsupportedError(error)) {
          if (!unsupportedTracked) {
            unsupportedTracked = true;
            track("push_notifications_unavailable_in_expo_go");
          }
          return null;
        }
        captureError(error, {
          source: "push",
          action: "load_notifications_module",
        });
        return null;
      }
    );
  }
  return notificationsModulePromise;
}
