export type Allegiance = "light" | "dark";

export const themeColors = {
  void: "#020617",
  hudSurface: "#0f172a",
  raisedSurface: "#1e293b",
  frostText: "#f8fafc",
  mutedText: "#64748b",
  secondaryText: "#94a3b8",
  navTint: "#bae6fd",
  hudLine: "#1e3a8a",
  saberBlue: "#2e86c1",
  saberRed: "#c0392b",
  actionBlue: "#3b82f6",
  royalBlue: "#2563eb",
  brightCyan: "#22d3ee",
  electricCyan: "#06b6d4",
};

export const allegianceToAccent = (allegiance: Allegiance) =>
  allegiance === "light" ? themeColors.saberBlue : themeColors.saberRed;

