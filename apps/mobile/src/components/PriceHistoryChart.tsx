import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Polyline, Stop } from "react-native-svg";

export type PriceHistoryDatum = {
  price: number;
  capturedAt: string;
};

type PriceHistoryChartProps = {
  points: PriceHistoryDatum[];
  height?: number;
};

export function PriceHistoryChart({ points, height = 140 }: PriceHistoryChartProps) {
  const [width, setWidth] = useState(0);

  const chart = useMemo(() => {
    if (!points.length || width <= 0) {
      return null;
    }

    const sorted = [...points].sort(
      (a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt)
    );
    const prices = sorted.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = Math.max(max - min, 1);

    const paddingX = 12;
    const paddingY = 16;
    const usableWidth = Math.max(width - paddingX * 2, 1);
    const usableHeight = Math.max(height - paddingY * 2, 1);

    const xStep = sorted.length > 1 ? usableWidth / (sorted.length - 1) : 0;

    const toPoint = (price: number, index: number) => {
      const x = paddingX + xStep * index;
      const normalized = (price - min) / range;
      const y = paddingY + (1 - normalized) * usableHeight;
      return { x, y };
    };

    const coords = sorted.map((point, index) => toPoint(point.price, index));
    const polylinePoints = coords.map((point) => `${point.x},${point.y}`).join(" ");

    const areaPath =
      coords.length > 1
        ? `M${coords[0].x},${height - paddingY} L${polylinePoints.replace(
            /\s+/g,
            " L"
          )} L${coords[coords.length - 1].x},${height - paddingY} Z`
        : `M${coords[0].x},${coords[0].y} L${coords[0].x},${height - paddingY} Z`;

    return { polylinePoints, areaPath, min, max };
  }, [height, points, width]);

  if (!points.length) {
    return (
      <View className="items-center justify-center rounded-xl border border-dashed border-hud-line/70 bg-raised-surface/40 px-4 py-6">
        <Text className="text-xs text-secondary-text">No pricing yet.</Text>
      </View>
    );
  }

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className="rounded-xl border border-hud-line/70 bg-void"
      accessibilityLabel="Price history chart"
    >
      {width > 0 && chart ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={chart.areaPath} fill="url(#priceGradient)" />
          <Polyline
            points={chart.polylinePoints}
            stroke="#22d3ee"
            strokeWidth={2}
            fill="none"
          />
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      {chart ? (
        <View className="flex-row items-center justify-between px-3 pb-3">
          <Text className="text-[10px] uppercase tracking-widest text-muted-text">
            Low ${chart.min.toFixed(2)}
          </Text>
          <Text className="text-[10px] uppercase tracking-widest text-muted-text">
            High ${chart.max.toFixed(2)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
