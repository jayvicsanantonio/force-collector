import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { useMe } from "../../../src/api/me";
import { Badge } from "../../../src/components/Badge";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function AchievementsScreen() {
  const { data, isLoading } = useMe();
  const { accentBgClass } = useTheme();
  const achievements = data?.achievements.items ?? [];

  return (
    <PlaceholderScreen
      title="Achievements"
      description="All milestones and your unlock progress."
    >
      {isLoading ? (
        <Text className="text-xs text-secondary-text">Syncing achievements...</Text>
      ) : null}
      {achievements.map((achievement) => (
        <View
          key={achievement.key}
          className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2">
              <View className={accentBgClass + " h-8 w-8 items-center justify-center rounded-full"}>
                <MaterialIcons name={achievement.icon as never} size={16} color="#f8fafc" />
              </View>
              <Text className="flex-1 text-sm font-space-semibold text-frost-text">
                {achievement.title}
              </Text>
            </View>
            <Badge
              label={achievement.unlocked ? "Unlocked" : "Locked"}
              tone={achievement.unlocked ? "owned" : "neutral"}
            />
          </View>
          <Text className="mt-2 text-xs text-secondary-text">
            {achievement.description}
          </Text>
          <View className="mt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-space-semibold uppercase tracking-widest text-secondary-text">
                Progress
              </Text>
              <Text className="text-[11px] text-secondary-text">
                {achievement.progress_label}
              </Text>
            </View>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-profile-panel">
              <View
                className={accentBgClass + " h-2 rounded-full"}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (achievement.progress_current / achievement.progress_target) * 100
                    )
                  )}%`,
                }}
              />
            </View>
          </View>
        </View>
      ))}
      {!isLoading && !achievements.length ? (
        <Text className="text-xs text-secondary-text">
          No achievements configured yet.
        </Text>
      ) : null}
    </PlaceholderScreen>
  );
}
