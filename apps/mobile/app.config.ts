import "dotenv/config";
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Force Collector",
  slug: "force-collector",
  scheme: "force-collector",
  version: "1.0.0",
  orientation: "portrait",
  newArchEnabled: true,
  userInterfaceStyle: "dark",
  plugins: ["expo-router"],
  extra: {
    API_BASE_URL: process.env.API_BASE_URL ?? "",
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
    SENTRY_DSN: process.env.SENTRY_DSN ?? "",
    POSTHOG_KEY: process.env.POSTHOG_KEY ?? "",
    POSTHOG_HOST: process.env.POSTHOG_HOST ?? "",
    OBSERVABILITY_OPT_IN: process.env.OBSERVABILITY_OPT_IN ?? "",
  },
};

export default config;
