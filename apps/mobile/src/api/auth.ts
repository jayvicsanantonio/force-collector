import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "force_collector_auth_token";
let cachedToken: string | null = null;

export async function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function getAuthToken() {
  if (cachedToken) {
    return cachedToken;
  }

  const stored = await SecureStore.getItemAsync(TOKEN_KEY);
  cachedToken = stored ?? null;
  return cachedToken;
}

export async function clearAuthToken() {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
