import type { NotificationResponse } from "expo-notifications";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

export type NotificationPayload = {
  type?: string;
  figure_id?: string;
  user_figure_id?: string;
  deeplink?: string;
  path?: string;
};

function buildPath(base: string, params?: Record<string, string | undefined>) {
  if (!params) {
    return base;
  }
  const entries = Object.entries(params).filter(([, value]) => Boolean(value));
  if (!entries.length) {
    return base;
  }
  const query = new URLSearchParams(
    entries.map(([key, value]) => [key, value as string])
  ).toString();
  return `${base}?${query}`;
}

export function resolveNotificationPath(payload: NotificationPayload) {
  if (!payload) {
    return null;
  }

  if (payload.deeplink) {
    return payload.deeplink;
  }

  if (payload.path) {
    return payload.path;
  }

  const type = payload.type?.toLowerCase();
  switch (type) {
    case "price_drop":
      return buildPath("/wishlist/details", {
        userFigureId: payload.user_figure_id,
        figureId: payload.figure_id,
      });
    case "restock":
      return buildPath("/wishlist/details", {
        userFigureId: payload.user_figure_id,
        figureId: payload.figure_id,
      });
    case "new_drop":
    case "preorder":
      if (payload.figure_id || payload.user_figure_id) {
        return buildPath("/collection/details", {
          figureId: payload.figure_id,
          userFigureId: payload.user_figure_id,
        });
      }
      return "/home";
    default:
      return null;
  }
}

function handleResponse(response: NotificationResponse) {
  const payload = response.notification.request.content.data as
    | NotificationPayload
    | undefined;
  const path = resolveNotificationPath(payload ?? {});
  if (path) {
    router.push(path);
  }
}

export function registerNotificationRouting() {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleResponse
  );

  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      handleResponse(response);
    }
  });

  return () => {
    subscription.remove();
  };
}
