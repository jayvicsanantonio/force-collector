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
  },
};

export default config;
