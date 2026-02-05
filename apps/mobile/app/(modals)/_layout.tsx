import { Stack } from "expo-router";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="add-figure" options={{ title: "Add Figure" }} />
      <Stack.Screen name="edit-figure" options={{ title: "Edit Figure" }} />
    </Stack>
  );
}
