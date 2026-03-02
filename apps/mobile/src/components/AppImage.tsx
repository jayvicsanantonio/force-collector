import { MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import type { ImageStyle, StyleProp, ViewStyle } from "react-native";
import { Text, View } from "react-native";

type AppImageVariant = "thumbnail" | "full";

type AppImageProps = {
  uri?: string | null;
  accessibilityLabel: string;
  style: StyleProp<ImageStyle>;
  variant?: AppImageVariant;
  placeholderLabel?: string;
};

const IMAGE_PLACEHOLDER_BLURHASH = "L5H2EC=PM+yV0g-mq.wG9c010J}I";

const variantTransition: Record<AppImageVariant, number> = {
  thumbnail: 80,
  full: 140,
};

const variantPriority: Record<AppImageVariant, "low" | "normal" | "high"> = {
  thumbnail: "low",
  full: "high",
};

export function AppImage({
  uri,
  accessibilityLabel,
  style,
  variant = "thumbnail",
  placeholderLabel = "No image",
}: AppImageProps) {
  if (!uri) {
    return (
      <View
        style={style as StyleProp<ViewStyle>}
        className="items-center justify-center rounded-xl border border-hud-line/70 bg-raised-surface/60"
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${accessibilityLabel}. ${placeholderLabel}.`}
      >
        <MaterialIcons name="image" size={20} color="#94a3b8" />
        <Text className="mt-1 text-[10px] text-muted-text">{placeholderLabel}</Text>
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      priority={variantPriority[variant]}
      transition={variantTransition[variant]}
      placeholder={{ blurhash: IMAGE_PLACEHOLDER_BLURHASH }}
      recyclingKey={uri}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
