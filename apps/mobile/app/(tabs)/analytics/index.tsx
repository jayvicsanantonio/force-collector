import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { track } from "../../../src/observability";
import { useActiveGoalProgress } from "../../../src/api/goals";

const ranges = ["all_time", "last_year", "last_30_days"] as const;

type Range = (typeof ranges)[number];

export default function AnalyticsScreen() {
  const goalProgress = useActiveGoalProgress();
  useEffect(() => {
    track("analytics_viewed");
  }, []);

  const handleRangeChange = (range: Range) => {
    track("analytics_range_changed", { range });
  };

  return (
    <PlaceholderScreen
      title="Collection Analytics"
      description="Placeholder for analytics charts and KPIs."
    >
      <Text style={styles.summaryText}>
        Completion: {goalProgress.data?.progress.percent_complete ?? 0}%
      </Text>
      {ranges.map((range) => (
        <Pressable
          key={range}
          style={styles.button}
          onPress={() => handleRangeChange(range)}
        >
          <Text style={styles.buttonText}>{range}</Text>
        </Pressable>
      ))}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  buttonText: {
    color: "#e6f0ff",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryText: {
    color: "#94a3b8",
    marginBottom: 12,
    fontSize: 13,
  },
});
