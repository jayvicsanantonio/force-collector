import { Text, View } from "react-native";
import { Card } from "./Card";
import { useTheme } from "../theme/ThemeProvider";
import { cx } from "../utils/cx";

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  const { accentTextClass } = useTheme();

  return (
    <Card className="gap-2">
      <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
        {label}
      </Text>
      <View className="flex-row items-end justify-between">
        <Text
          className={cx(
            "text-2xl font-space-bold tracking-tight",
            accentTextClass
          )}
        >
          {value}
        </Text>
        {helper ? (
          <Text className="text-xs font-space-medium text-muted-text">
            {helper}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

