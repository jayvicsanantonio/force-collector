let cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedToken = token;
}

export async function getAuthToken() {
  return cachedToken;
}
