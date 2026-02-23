import { z } from "zod";
import {
  CollectionSummarySchema,
  DistributionBreakdownSchema,
  FigureSchema,
  PriceAlertSchema,
  PriceHistoryPointSchema,
  RetailerListingSchema,
  GoalSchema,
  UserFigureSchema,
  UserProfileSchema,
  UserSchema,
} from "./entities";

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
});
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;

export const AnalyticsRangeSchema = z.enum(["all_time", "year", "30d"]);
export type AnalyticsRange = z.infer<typeof AnalyticsRangeSchema>;

export const AnalyticsDistributionBySchema = z.enum([
  "era",
  "series",
  "faction",
]);
export type AnalyticsDistributionBy = z.infer<typeof AnalyticsDistributionBySchema>;

export const MeResponseSchema = z.object({
  user: UserSchema,
  profile: UserProfileSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const UpdateMeRequestSchema = UserProfileSchema.partial().extend({
  user_id: z.string().uuid().optional(),
});
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;

export const PushRegisterRequestSchema = z.object({
  expo_push_token: z.string(),
  device_id: z.string().optional(),
});
export type PushRegisterRequest = z.infer<typeof PushRegisterRequestSchema>;

export const FigureListResponseSchema = z.object({
  items: z.array(FigureSchema),
  next_cursor: z.string().nullable().optional(),
});
export type FigureListResponse = z.infer<typeof FigureListResponseSchema>;

export const ScanLookupRequestSchema = z.object({
  barcode: z.string(),
  symbology: z.string().optional(),
  locale: z.string().optional(),
});
export type ScanLookupRequest = z.infer<typeof ScanLookupRequestSchema>;

export const ScanLookupResponseSchema = z.object({
  match: FigureSchema.nullable(),
  confidence: z.number().min(0).max(1),
  related: z.array(FigureSchema),
  listings: z.array(RetailerListingSchema),
});
export type ScanLookupResponse = z.infer<typeof ScanLookupResponseSchema>;

export const UserFigureListResponseSchema = z.object({
  items: z.array(UserFigureSchema),
  next_cursor: z.string().nullable().optional(),
});
export type UserFigureListResponse = z.infer<typeof UserFigureListResponseSchema>;

export const UserFigureCreateRequestSchema = UserFigureSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type UserFigureCreateRequest = z.infer<
  typeof UserFigureCreateRequestSchema
>;

export const UserFigureUpdateRequestSchema = UserFigureSchema.partial().extend({
  id: z.string().uuid().optional(),
});
export type UserFigureUpdateRequest = z.infer<
  typeof UserFigureUpdateRequestSchema
>;

export const PriceResponseSchema = z.object({
  listings: z.array(RetailerListingSchema),
  history: z.array(PriceHistoryPointSchema),
});
export type PriceResponse = z.infer<typeof PriceResponseSchema>;

export const PriceAlertCreateRequestSchema = PriceAlertSchema.omit({
  id: true,
});
export type PriceAlertCreateRequest = z.infer<
  typeof PriceAlertCreateRequestSchema
>;

export const PriceAlertUpdateRequestSchema = PriceAlertSchema.partial().extend({
  id: z.string().uuid().optional(),
});
export type PriceAlertUpdateRequest = z.infer<
  typeof PriceAlertUpdateRequestSchema
>;

export const AnalyticsSummaryResponseSchema = z.object({
  range: AnalyticsRangeSchema,
  summary: CollectionSummarySchema,
});
export type AnalyticsSummaryResponse = z.infer<
  typeof AnalyticsSummaryResponseSchema
>;

export const AnalyticsValuePointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number(),
});

export const AnalyticsValueSeriesResponseSchema = z.object({
  range: AnalyticsRangeSchema,
  points: z.array(AnalyticsValuePointSchema),
});
export type AnalyticsValueSeriesResponse = z.infer<
  typeof AnalyticsValueSeriesResponseSchema
>;

export const AnalyticsDistributionResponseSchema = z.object({
  range: AnalyticsRangeSchema,
  by: AnalyticsDistributionBySchema,
  buckets: DistributionBreakdownSchema,
});
export type AnalyticsDistributionResponse = z.infer<
  typeof AnalyticsDistributionResponseSchema
>;

export const GoalProgressResponseSchema = z.object({
  goal: GoalSchema,
  progress: z.object({
    owned_count: z.number().int(),
    total_count: z.number().int(),
    percent_complete: z.number(),
  }),
});
export type GoalProgressResponse = z.infer<typeof GoalProgressResponseSchema>;
