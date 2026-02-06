import Constants from "expo-constants";

export const env = {
  API_BASE_URL: Constants.expoConfig?.extra?.API_BASE_URL ?? "",
  SUPABASE_URL: Constants.expoConfig?.extra?.SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ?? "",
};

export type Env = typeof env;
