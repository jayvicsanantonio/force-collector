import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export type DonutChartDatum = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutChartDatum[];
  size?: number;
  thickness?: number;
  accessibilityLabel?: string;
};

export function DonutChart({
  data,
  size = 160,
  thickness = 16,
  accessibilityLabel = "Distribution chart",
}: DonutChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const chart = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return null;
    }
    return data
      .map((item) => ({
        ...item,
        fraction: item.value / total,
      }))
      .filter((item) => item.value > 0);
  }, [data]);

  const resolvedSize = Math.max(
    0,
    Math.min(size, containerWidth > 0 ? containerWidth : size)
  );
  const radius = Math.max((resolvedSize - thickness) / 2, 1);
  const circumference = 2 * Math.PI * radius;

  if (!chart || resolvedSize <= 0) {
    return (
      <View
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        className="items-center justify-center rounded-xl border border-dashed border-hud-line/70 bg-raised-surface/40 px-4 py-8"
        accessibilityLabel="No distribution data"
      >
        <Text className="text-xs text-secondary-text">No distribution yet.</Text>
      </View>
    );
  }

  let offset = 0;

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      className="items-center justify-center"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={resolvedSize} height={resolvedSize}>
        <Circle
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={thickness}
          fill="transparent"
        />
        {chart.map((slice) => {
          const length = slice.fraction * circumference;
          const dashArray = `${length} ${circumference - length}`;
          const circle = (
            <Circle
              key={slice.label}
              cx={resolvedSize / 2}
              cy={resolvedSize / 2}
              r={radius}
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              rotation={-90}
              originX={resolvedSize / 2}
              originY={resolvedSize / 2}
              fill="transparent"
            />
          );
          offset += length;
          return circle;
        })}
      </Svg>
    </View>
  );
}
