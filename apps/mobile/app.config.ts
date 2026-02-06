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
  },
};

export default config;
