export type PushNotificationType =
  | "price_drop"
  | "restock"
  | "new_drop"
  | "preorder";

export type PushPayload = {
  type: PushNotificationType;
  figure_id?: string;
  user_figure_id?: string;
  deeplink: string;
};

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: PushPayload;
  sound?: "default";
};

export function buildDeepLinkPath(payload: PushPayload) {
  return payload.deeplink;
}

export function shouldSendForPreferences(
  preferences: Record<string, boolean> | null | undefined,
  type: PushNotificationType
) {
  if (!preferences) {
    return true;
  }
  const key = type === "new_drop" ? "new_drop" : type;
  const value = preferences[key];
  return value !== false;
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  if (!messages.length) {
    return { success: true, data: [] };
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Expo push request failed: ${response.status} ${response.statusText}`
    );
  }

  return data;
}
