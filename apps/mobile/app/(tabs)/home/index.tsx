import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { Chip } from "../../../src/components/Chip";
import { Badge } from "../../../src/components/Badge";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { StatCard } from "../../../src/components/StatCard";
import { Avatar } from "../../../src/components/Avatar";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function HomeScreen() {
  const { allegiance, toggleAllegiance, accentTextClass } = useTheme();

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Design System"
        subtitle={`Allegiance: ${allegiance.toUpperCase()}`}
        rightSlot={
          <Button
            label="Toggle"
            variant="ghost"
            onPress={toggleAllegiance}
          />
        }
      />
      <ScrollView className="flex-1" contentContainerStyle={styles.content}>
        <View className="gap-6">
          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Buttons
            </Text>
            <View className="mt-3 gap-3">
              <Button label="Primary Action" />
              <Button label="Secondary Action" variant="secondary" />
              <Button label="Ghost Action" variant="ghost" />
              <Button label="Loading" loading />
            </View>
          </View>

          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Cards & Stats
            </Text>
            <View className="mt-3 gap-3">
              <Card>
                <Text className="text-sm font-space-semibold text-frost-text">
                  HUD Card Surface
                </Text>
                <Text className="mt-2 text-xs text-secondary-text">
                  Dark slate surfaces with border lines and cyan accents.
                </Text>
              </Card>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <StatCard label="Total Figures" value="248" helper="+12" />
                </View>
                <View className="flex-1">
                  <StatCard label="Wishlist" value="37" helper="Tracked" />
                </View>
              </View>
            </View>
          </View>

          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Chips
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Chip label="All" selected />
              <Chip label="Favorites" />
              <Chip label="Rare" />
              <Chip label="Clone Wars" />
            </View>
          </View>

          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Badges
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Badge label="Owned" tone="owned" />
              <Badge label="Wishlist" tone="wishlist" />
              <Badge label="Exclusive" tone="exclusive" />
              <Badge label="In Stock" tone="in-stock" />
              <Badge label="Limited" tone="limited" />
            </View>
            <Text className="mt-2 text-[11px] text-muted-text">
              Status uses icon + text in addition to color.
            </Text>
          </View>

          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Avatar
            </Text>
            <View className="mt-3 flex-row items-center gap-3">
              <Avatar size="sm" label="FC" />
              <Avatar size="md" label="JS" />
              <Avatar size="lg" label="LS" />
            </View>
          </View>

          <View>
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
              Accent Preview
            </Text>
            <View className="mt-3 flex-row items-center gap-2 rounded-2xl border border-hud-line/60 bg-raised-surface/70 px-4 py-3">
              <MaterialIcons
                name="flash-on"
                size={18}
                color={allegiance === "light" ? "#2e86c1" : "#c0392b"}
              />
              <Text className={`text-sm font-space-medium ${accentTextClass}`}>
                Allegiance accent updates instantly.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
});
