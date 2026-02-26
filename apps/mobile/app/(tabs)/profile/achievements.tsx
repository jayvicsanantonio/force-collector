import { Text, View } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { Badge } from "../../../src/components/Badge";

const ACHIEVEMENTS = [
  {
    key: "first_scan",
    title: "First Scan",
    description: "Logged your first figure.",
    unlocked: true,
  },
  {
    key: "holocron_keeper",
    title: "Holocron Keeper",
    description: "Cataloged 25 collectibles.",
    unlocked: true,
  },
  {
    key: "fleet_commander",
    title: "Fleet Commander",
    description: "Tracked 5 rare variants.",
    unlocked: true,
  },
  {
    key: "master_collector",
    title: "Master Collector",
    description: "Completed a wave.",
    unlocked: false,
  },
];

export default function AchievementsScreen() {
  return (
    <PlaceholderScreen
      title="Achievements"
      description="Unlocked milestones from your collecting journey."
    >
      {ACHIEVEMENTS.map((achievement) => (
        <View
          key={achievement.key}
          className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-space-semibold text-frost-text">
              {achievement.title}
            </Text>
            <Badge
              label={achievement.unlocked ? "Unlocked" : "Locked"}
              tone={achievement.unlocked ? "owned" : "neutral"}
            />
          </View>
          <Text className="mt-2 text-xs text-secondary-text">
            {achievement.description}
          </Text>
        </View>
      ))}
    </PlaceholderScreen>
  );
}
