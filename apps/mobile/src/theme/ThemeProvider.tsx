import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "../api/me";
import { useAuth } from "../auth/AuthProvider";
import type { Allegiance } from "./theme";

type ThemeContextValue = {
  allegiance: Allegiance;
  setAllegiance: (next: Allegiance) => void;
  toggleAllegiance: () => void;
  accentTextClass: string;
  accentBorderClass: string;
  accentBgClass: string;
  accentSoftBgClass: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [allegiance, setAllegiance] = useState<Allegiance>("light");
  const { status } = useAuth();
  const { data } = useMe({ enabled: status === "signedIn" });
  const lastServerAllegiance = useRef<Allegiance | null>(null);

  useEffect(() => {
    const serverTheme = data?.profile.allegiance_theme;
    if (!serverTheme) {
      return;
    }
    const mapped = serverTheme === "LIGHT" ? "light" : "dark";
    if (lastServerAllegiance.current !== mapped) {
      lastServerAllegiance.current = mapped;
      setAllegiance(mapped);
    }
  }, [data?.profile.allegiance_theme]);

  const value = useMemo(() => {
    const isLight = allegiance === "light";
    return {
      allegiance,
      setAllegiance,
      toggleAllegiance: () =>
        setAllegiance((prev) => (prev === "light" ? "dark" : "light")),
      accentTextClass: isLight ? "text-saber-blue" : "text-saber-red",
      accentBorderClass: isLight ? "border-saber-blue" : "border-saber-red",
      accentBgClass: isLight ? "bg-saber-blue" : "bg-saber-red",
      accentSoftBgClass: isLight ? "bg-saber-blue/15" : "bg-saber-red/15",
    };
  }, [allegiance]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
