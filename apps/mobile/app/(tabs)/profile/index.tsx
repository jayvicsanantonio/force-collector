import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Badge } from "../../../src/components/Badge";
import { AppImage } from "../../../src/components/AppImage";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { useMe, useUpdateMe } from "../../../src/api/me";
import type { ApiError } from "../../../src/api/client";
import { env } from "../../../src/env";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { cx } from "../../../src/utils/cx";
import { signOutAndClearUserData } from "../../../src/offline/session";
import { captureError, track } from "../../../src/observability";

const PRIVACY_POLICY_URL =
  Constants.expoConfig?.extra?.PRIVACY_POLICY_URL ??
  "https://force-collector.app/privacy";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "FC";
  }
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "FC";
}

function getRankLabel(level: number) {
  if (level >= 30) {
    return "Master";
  }
  if (level >= 15) {
    return "Knight";
  }
  return "Initiate";
}

export default function ProfileScreen() {
  const { data, isLoading, error } = useMe();
  const updateMe = useUpdateMe();
  const apiError = error as ApiError | null;
  const hasApiBaseUrl = Boolean(env.API_BASE_URL);
  const { allegiance, setAllegiance, accentTextClass, accentBgClass, accentBorderClass } =
    useTheme();

  useEffect(() => {
    track("profile_viewed");
  }, []);

  const profile = data?.profile;
  const displayName = profile?.display_name ?? "Collector";
  const avatarUrl = profile?.avatar_url;
  const progression = data?.progression;
  const level = progression?.level ?? profile?.level ?? 1;
  const totalXp = progression?.total_xp ?? profile?.xp ?? 0;
  const xpInLevel = progression?.xp_in_level ?? totalXp;
  const xpForNextLevel = progression?.xp_for_next_level ?? Math.max(1, totalXp || 1);
  const progress = Math.min(1, xpForNextLevel ? xpInLevel / xpForNextLevel : 0);
  const rankLabel = getRankLabel(level);
  const appVersion = Constants.expoConfig?.version ?? "0.0.0";

  const unlockedAchievements = useMemo(() => {
    return (data?.achievements.items ?? []).filter((achievement) => achievement.unlocked);
  }, [data?.achievements.items]);

  const handleAllegianceToggle = () => {
    const next = allegiance === "light" ? "dark" : "light";
    setAllegiance(next);
    track("profile_theme_changed", { allegiance: next });
    if (!hasApiBaseUrl) {
      return;
    }
    updateMe.mutate({
      allegiance_theme: next === "light" ? "LIGHT" : "DARK",
    });
  };

  const handlePrivacyPolicy = async () => {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  };

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader title="Profile & Settings" subtitle="Force Collector" />
      <ScrollView contentContainerStyle={styles.content}>
        <View className="gap-5">
          <View className="rounded-2xl border border-hud-line/60 bg-profile-panel p-4">
            <View className="flex-row items-center gap-4">
              <View className={cx("h-16 w-16 items-center justify-center rounded-2xl border", accentBorderClass)}>
                {avatarUrl ? (
                  <AppImage
                    uri={avatarUrl}
                    style={{ height: 64, width: 64, borderRadius: 16 }}
                    variant="thumbnail"
                    accessibilityLabel={`${displayName} profile image`}
                    placeholderLabel="Avatar unavailable"
                  />
                ) : (
                  <Text className="text-lg font-space-bold text-frost-text">
                    {getInitials(displayName)}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-lg font-space-bold text-frost-text">
                  {displayName}
                </Text>
                <Text className="text-xs font-space-medium text-secondary-text">
                  Level {level} • {totalXp} XP
                </Text>
                {isLoading ? (
                  <Text className="mt-1 text-[11px] text-secondary-text">
                    Syncing profile data...
                  </Text>
                ) : !hasApiBaseUrl ? (
                  <Text className="mt-1 text-[11px] text-secondary-text">
                    API_BASE_URL not configured.
                  </Text>
                ) : apiError ? (
                  <Text className="mt-1 text-[11px] text-secondary-text">
                    {apiError.message}
                  </Text>
                ) : null}
              </View>
              <Badge label={rankLabel} tone="exclusive" />
            </View>
            <View className="mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-space-semibold text-secondary-text">
                  XP Progress
                </Text>
                <Text className="text-xs font-space-semibold text-secondary-text">
                  {xpInLevel} / {xpForNextLevel}
                </Text>
              </View>
              <View className="mt-2 h-2 overflow-hidden rounded-full bg-hud-surface">
                <View style={{ width: `${Math.round(progress * 100)}%` }} className={cx("h-2 rounded-full", accentBgClass)} />
              </View>
            </View>
          </View>

          <View className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-space-semibold text-frost-text">
                Achievements
              </Text>
              <Pressable onPress={() => router.push("/profile/achievements")}>
                <Text className={cx("text-xs font-space-semibold uppercase tracking-widest", accentTextClass)}>
                  View All
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementRow}
            >
              {unlockedAchievements.map((achievement) => (
                <View
                  key={achievement.key}
                  className="w-44 rounded-2xl border border-hud-line/60 bg-profile-panel p-3"
                >
                  <View className="mb-2 flex-row items-center gap-2">
                    <View className={cx("h-8 w-8 items-center justify-center rounded-full", accentBgClass)}>
                      <MaterialIcons name={achievement.icon as never} size={16} color="#f8fafc" />
                    </View>
                    <Text className="flex-1 text-xs font-space-semibold text-frost-text">
                      {achievement.title}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-secondary-text">
                    {achievement.description}
                  </Text>
                </View>
              ))}
              {!unlockedAchievements.length ? (
                <View className="w-44 rounded-2xl border border-hud-line/60 bg-profile-panel p-3">
                  <Text className="text-xs font-space-semibold text-frost-text">
                    No unlocks yet
                  </Text>
                  <Text className="mt-2 text-[11px] text-secondary-text">
                    Add your first owned figure to unlock First Scan.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>

          <View className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-space-semibold text-frost-text">
                  Allegiance Theme
                </Text>
                <Text className="mt-1 text-xs text-secondary-text">
                  {allegiance === "light" ? "Light Side (Saber Blue)" : "Dark Side (Saber Red)"}
                </Text>
              </View>
              <Switch
                value={allegiance === "dark"}
                onValueChange={handleAllegianceToggle}
                trackColor={{ false: "#1c2a3d", true: "#c0392b" }}
                thumbColor="#f8fafc"
              />
            </View>
          </View>

          <View className="rounded-2xl border border-hud-line/60 bg-profile-panel p-4">
            <Text className="text-sm font-space-semibold text-frost-text">
              Settings
            </Text>
            <View className="mt-3 gap-2">
              <Pressable
                onPress={() => {
                  track("profile_notifications_opened");
                  router.push("/profile/notifications");
                }}
                className="flex-row items-center justify-between rounded-xl border border-hud-line/60 bg-hud-surface px-3 py-3"
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="notifications" size={18} color="#bae6fd" />
                  <View>
                    <Text className="text-xs font-space-semibold text-frost-text">
                      Notifications
                    </Text>
                    <Text className="text-[11px] text-secondary-text">
                      Price drops, restocks, new drops
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#64748b" />
              </Pressable>
              <Pressable
                onPress={() => router.push("/profile/account")}
                className="flex-row items-center justify-between rounded-xl border border-hud-line/60 bg-hud-surface px-3 py-3"
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="manage-accounts" size={18} color="#bae6fd" />
                  <View>
                    <Text className="text-xs font-space-semibold text-frost-text">
                      Account Details
                    </Text>
                    <Text className="text-[11px] text-secondary-text">
                      Email, providers, data export
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#64748b" />
              </Pressable>
              <Pressable
                onPress={() => router.push("/profile/data")}
                className="flex-row items-center justify-between rounded-xl border border-hud-line/60 bg-hud-surface px-3 py-3"
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="cloud-download" size={18} color="#bae6fd" />
                  <View>
                    <Text className="text-xs font-space-semibold text-frost-text">
                      Data Export & Import
                    </Text>
                    <Text className="text-[11px] text-secondary-text">
                      Backup or restore your collection
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#64748b" />
              </Pressable>
              <Pressable
                onPress={() => void handlePrivacyPolicy()}
                className="flex-row items-center justify-between rounded-xl border border-hud-line/60 bg-hud-surface px-3 py-3"
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="policy" size={18} color="#bae6fd" />
                  <View>
                    <Text className="text-xs font-space-semibold text-frost-text">
                      Privacy Policy
                    </Text>
                    <Text className="text-[11px] text-secondary-text">
                      Review how we protect data
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="open-in-new" size={18} color="#64748b" />
              </Pressable>
            </View>
          </View>

          <View className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4">
            <Text className="text-sm font-space-semibold text-frost-text">
              Account
            </Text>
            <Text className="mt-2 text-xs text-secondary-text">
              Signing out clears cached data and secure tokens on this device.
            </Text>
            <Pressable
              onPress={async () => {
                track("profile_sign_out");
                try {
                  await signOutAndClearUserData();
                  router.replace("/");
                } catch (signOutError) {
                  captureError(signOutError, { source: "profile", action: "sign_out" });
                }
              }}
              className="mt-4 rounded-xl border border-danger-red/60 bg-danger-red/10 px-4 py-3"
            >
              <Text className="text-center text-xs font-space-semibold uppercase tracking-widest text-danger-red">
                Sign Out
              </Text>
            </Pressable>
          </View>

          <Text className="text-center text-[11px] text-muted-text">
            App Version {appVersion}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  achievementRow: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
});
