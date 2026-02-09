import Constants from "expo-constants";

export const env = {
  API_BASE_URL: Constants.expoConfig?.extra?.API_BASE_URL ?? "",
  SUPABASE_URL: Constants.expoConfig?.extra?.SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ?? "",
  SENTRY_DSN: Constants.expoConfig?.extra?.SENTRY_DSN ?? "",
  POSTHOG_KEY: Constants.expoConfig?.extra?.POSTHOG_KEY ?? "",
  POSTHOG_HOST: Constants.expoConfig?.extra?.POSTHOG_HOST ?? "",
  OBSERVABILITY_OPT_IN: Constants.expoConfig?.extra?.OBSERVABILITY_OPT_IN ?? "",
};

export type Env = typeof env;
