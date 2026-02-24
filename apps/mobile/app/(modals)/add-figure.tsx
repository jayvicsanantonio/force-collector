import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Card } from "../../src/components/Card";
import { track } from "../../src/observability";

const OPTIONS = [
  {
    id: "scan",
    title: "Scan Barcode",
    description: "Use the camera for instant matches.",
    icon: "qr-code-scanner" as const,
    route: "/search",
  },
  {
    id: "manual",
    title: "Manual Search",
    description: "Search by name or enter a barcode.",
    icon: "search" as const,
    route: "/search/manual",
  },
  {
    id: "custom",
    title: "Custom Entry",
    description: "Create a custom figure entry.",
    icon: "edit" as const,
    route: "/search/manual",
  },
];

export default function AddFigureModal() {
  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Add Figure"
        subtitle="Choose your entry method"
        rightSlot={
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Close add figure"
            className="h-10 w-10 items-center justify-center rounded-full border border-hud-line/70 bg-raised-surface/70"
          >
            <MaterialIcons name="close" size={18} color="#bae6fd" />
          </Pressable>
        }
      />

      <View className="flex-1 px-5 pb-8">
        <View className="mt-6 gap-3">
          {OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                track("add_figure_option_selected", { option: option.id });
                router.replace(option.route);
              }}
            >
              <Card className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-raised-surface/80">
                    <MaterialIcons
                      name={option.icon}
                      size={18}
                      color="#22d3ee"
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-space-semibold text-frost-text">
                      {option.title}
                    </Text>
                    <Text className="text-xs text-secondary-text">
                      {option.description}
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color="#94a3b8"
                />
              </Card>
            </Pressable>
          ))}
        </View>

        <View className="mt-6 rounded-2xl border border-hud-line/60 bg-raised-surface/60 px-4 py-3">
          <Text className="text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Tip
          </Text>
          <Text className="mt-2 text-xs text-secondary-text">
            Scanning is the fastest way to add a figure, even when you are
            offline.
          </Text>
        </View>
      </View>
    </View>
  );
}
