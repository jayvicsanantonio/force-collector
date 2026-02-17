import { z } from "zod";

export const AllegianceThemeSchema = z.enum(["LIGHT", "DARK"]);
export type AllegianceTheme = z.infer<typeof AllegianceThemeSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  created_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const UserPreferencesSchema = z
  .object({
    currency: z.string(),
    units: z.enum(["IMPERIAL", "METRIC"]).optional(),
    notifications: z.record(z.boolean()).optional(),
  })
  .partial();
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UserProfileSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string(),
  avatar_url: z.string().url().optional(),
  level: z.number().int(),
  xp: z.number().int(),
  allegiance_theme: AllegianceThemeSchema,
  preferences: UserPreferencesSchema,
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const EraSchema = z.enum([
  "Prequel",
  "Original",
  "Sequel",
  "TV",
  "Gaming",
  "Other",
]);
export type Era = z.infer<typeof EraSchema>;

export const FigureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subtitle: z.string().optional(),
  edition: z.string().optional(),
  series: z.string(),
  wave: z.union([z.string(), z.number()]),
  release_year: z.number().int(),
  era: EraSchema,
  faction: z.string(),
  exclusivity: z.string(),
  upc: z.string().optional(),
  primary_image_url: z.string().url().optional(),
  lore: z.string().optional(),
  specs: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Figure = z.infer<typeof FigureSchema>;

export const UserFigureStatusSchema = z.enum([
  "OWNED",
  "WISHLIST",
  "PREORDER",
  "SOLD",
]);
export type UserFigureStatus = z.infer<typeof UserFigureStatusSchema>;

export const UserFigureConditionSchema = z.enum([
  "MINT",
  "OPENED",
  "LOOSE",
  "UNKNOWN",
]);
export type UserFigureCondition = z.infer<typeof UserFigureConditionSchema>;

export const UserFigureSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  figure_id: z.string().uuid().nullable(),
  custom_figure_payload: z.record(z.unknown()).optional(),
  status: UserFigureStatusSchema,
  condition: UserFigureConditionSchema,
  purchase_price: z.number().optional(),
  purchase_currency: z.string().optional(),
  purchase_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional(),
  photo_refs: z.array(z.string()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type UserFigure = z.infer<typeof UserFigureSchema>;

export const RetailerSchema = z.enum([
  "EBAY",
  "AMAZON",
  "TARGET",
  "WALMART",
  "OTHER",
]);
export type Retailer = z.infer<typeof RetailerSchema>;

export const RetailerListingSchema = z.object({
  id: z.string().uuid(),
  figure_id: z.string().uuid(),
  retailer: RetailerSchema,
  product_url: z.string().url(),
  external_id: z.string().optional(),
  last_checked_at: z.string().datetime(),
  in_stock: z.boolean().nullable(),
  current_price: z.number().nullable(),
  currency: z.string(),
});
export type RetailerListing = z.infer<typeof RetailerListingSchema>;

export const PriceHistoryPointSchema = z.object({
  id: z.string().uuid(),
  retailer_listing_id: z.string().uuid(),
  price: z.number(),
  currency: z.string(),
  in_stock: z.boolean().nullable(),
  captured_at: z.string().datetime(),
});
export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>;

export const PriceAlertSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  user_figure_id: z.string().uuid(),
  target_price: z.number(),
  currency: z.string(),
  enabled: z.boolean(),
  retailers: z.array(RetailerSchema),
  notify_on_restock: z.boolean(),
  cooldown_hours: z.number().int(),
});
export type PriceAlert = z.infer<typeof PriceAlertSchema>;

export const AchievementSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

export const UserAchievementSchema = z.object({
  user_id: z.string().uuid(),
  achievement_id: z.string().uuid(),
  unlocked_at: z.string().datetime(),
});
export type UserAchievement = z.infer<typeof UserAchievementSchema>;

export const CollectionSummarySchema = z.object({
  total_figures_owned: z.number().int(),
  completion_percent: z.number(),
  estimated_value: z.number(),
  value_change_percent: z.number(),
  rarest_item_user_figure_id: z.string().uuid(),
});
export type CollectionSummary = z.infer<typeof CollectionSummarySchema>;

export const DistributionBreakdownSchema = z.record(
  z.number().int().nonnegative()
);
export type DistributionBreakdown = z.infer<typeof DistributionBreakdownSchema>;
