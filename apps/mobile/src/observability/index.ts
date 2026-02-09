import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Sentry from "@sentry/react-native";
import type { ComponentType } from "react";
import { Platform } from "react-native";
import { env } from "../env";

const OBSERVABILITY_CONSENT_KEY = "observability_consent_v1";
const OBSERVABILITY_ANON_ID_KEY = "observability_anon_id_v1";

const DEFAULT_POSTHOG_HOST = "https://app.posthog.com";
const PII_BLOCKLIST = new Set([
  "email",
  "notes",
  "photo_url",
  "photo-url",
  "photourl",
  "image_url",
  "image-url",
  "imageurl",
  "avatar_url",
  "avatar-url",
  "avatarurl",
]);

let sentryInitialized = false;
let consentCache: boolean | null = null;
let anonIdCache: string | null = null;

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function isBlockedKey(key: string) {
  const normalized = normalizeKey(key);
  if (PII_BLOCKLIST.has(normalized)) {
    return true;
  }
  if (normalized.includes("email")) {
    return true;
  }
  if (normalized === "note" || normalized === "notes") {
    return true;
  }
  const hasUrl = normalized.includes("url");
  const hasPhoto = normalized.includes("photo");
  const hasImage = normalized.includes("image");
  const hasAvatar = normalized.includes("avatar");
  return hasUrl && (hasPhoto || hasImage || hasAvatar);
}

function sanitizeProps(props?: Record<string, unknown>) {
  if (!props) {
    return undefined;
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isBlockedKey(key)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function parseOptInFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return null;
}

async function getObservabilityConsent() {
  if (consentCache !== null) {
    return consentCache;
  }
  try {
    const stored = await SecureStore.getItemAsync(OBSERVABILITY_CONSENT_KEY);
    if (stored === "true") {
      consentCache = true;
      return true;
    }
    if (stored === "false") {
      consentCache = false;
      return false;
    }
  } catch {
    // If secure storage is unavailable, fall back to env/default.
  }

  const envOptIn = parseOptInFlag(env.OBSERVABILITY_OPT_IN);
  consentCache = envOptIn ?? true;
  return consentCache;
}

export async function setObservabilityConsent(enabled: boolean) {
  consentCache = enabled;
  try {
    await SecureStore.setItemAsync(
      OBSERVABILITY_CONSENT_KEY,
      enabled ? "true" : "false"
    );
  } catch {
    // Best-effort persistence.
  }
}

async function getAnonymousId() {
  if (anonIdCache) {
    return anonIdCache;
  }
  try {
    const stored = await SecureStore.getItemAsync(OBSERVABILITY_ANON_ID_KEY);
    if (stored) {
      anonIdCache = stored;
      return stored;
    }
  } catch {
    // Ignore storage errors and generate a new id.
  }

  const generated = `anon_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  anonIdCache = generated;
  try {
    await SecureStore.setItemAsync(OBSERVABILITY_ANON_ID_KEY, generated);
  } catch {
    // Best-effort persistence.
  }
  return generated;
}

export async function initObservability() {
  if (sentryInitialized) {
    return;
  }
  const consentGranted = await getObservabilityConsent();
  if (!consentGranted) {
    return;
  }

  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    enableNative: !__DEV__,
    environment: __DEV__ ? "development" : "production",
  });

  const appVersion = Constants.expoConfig?.version ?? "unknown";
  Sentry.setTag("app_version", appVersion);
  Sentry.setTag("platform", Platform.OS);

  sentryInitialized = true;
}

export function wrapWithObservability<T>(Component: T) {
  if (!env.SENTRY_DSN) {
    return Component;
  }
  return Sentry.wrap(Component as unknown as ComponentType);
}

export async function track(
  event: string,
  props?: Record<string, unknown>
) {
  const consentGranted = await getObservabilityConsent();
  if (!consentGranted) {
    return;
  }
  if (!env.POSTHOG_KEY) {
    return;
  }

  const host = env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
  const anonId = await getAnonymousId();
  const sanitizedProps = sanitizeProps(props);
  const appVersion = Constants.expoConfig?.version ?? "unknown";

  const payload = {
    api_key: env.POSTHOG_KEY,
    event,
    properties: {
      distinct_id: anonId,
      app_version: appVersion,
      platform: Platform.OS,
      ...sanitizedProps,
    },
  };

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    captureError(error, { source: "analytics", event });
  }
}

export function captureError(
  error: unknown,
  context?: Record<string, unknown>
) {
  const sanitizedContext = sanitizeProps(context);
  if (env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: sanitizedContext,
    });
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error("Observability captured error", error, sanitizedContext);
  }
}
