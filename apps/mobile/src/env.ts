import Constants from "expo-constants";

export const env = {
  API_BASE_URL: Constants.expoConfig?.extra?.API_BASE_URL ?? "",
};

export type Env = typeof env;
