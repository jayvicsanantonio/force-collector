import "../global.css";

import { Stack } from "expo-router";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/api/queryClient";
import { OfflineProvider } from "../src/offline/OfflineProvider";
import { AuthProvider } from "../src/auth/AuthProvider";
import { useEffect } from "react";
import { initObservability, wrapWithObservability } from "../src/observability";
import { configureNotificationHandler } from "../src/notifications/push";
import { registerNotificationRouting } from "../src/notifications/routing";
import { PushRegistrationGate } from "../src/notifications/PushRegistrationGate";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    initObservability();
    configureNotificationHandler();
    const teardown = registerNotificationRouting();
    return teardown;
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PushRegistrationGate />
        <OfflineProvider>
          <ThemeProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(modals)"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
            </Stack>
          </ThemeProvider>
        </OfflineProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default wrapWithObservability(RootLayout);
