import { z } from "zod";
import {
  HydratedUserFigureListResponseSchema,
  UserFigureConditionSchema,
  UserFigureStatusSchema,
  type UserFigureStatus,
} from "@force-collector/shared";
import { apiRequest } from "./client";

const UserFigureCreatePayloadSchema = z.object({
  figure_id: z.string().uuid().optional(),
  status: UserFigureStatusSchema,
  condition: UserFigureConditionSchema.optional(),
  user_id: z.string().uuid().optional(),
  custom_figure_payload: z.record(z.unknown()).optional(),
}).refine(
  (value) => Boolean(value.figure_id || value.custom_figure_payload),
  "figure_id or custom_figure_payload is required."
);

const UserFigureUpdatePayloadSchema = z.object({
  status: UserFigureStatusSchema,
});

const UserFigureDetailsPayloadSchema = z.object({
  condition: UserFigureConditionSchema.optional().nullable(),
  purchase_price: z.number().optional().nullable(),
  purchase_currency: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  photo_refs: z.array(z.string()).optional().nullable(),
});

const UserFigureCreateResponseSchema = z.object({
  id: z.string(),
  figure_id: z.string().optional().nullable(),
  status: UserFigureStatusSchema.optional(),
  condition: UserFigureConditionSchema.optional().nullable(),
  purchase_price: z.number().optional().nullable(),
  purchase_currency: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  photo_refs: z.array(z.string()).optional().nullable(),
  updated_at: z.string().datetime().optional(),
});

const UserFigureUpdateResponseSchema = z.object({
  id: z.string(),
  status: UserFigureStatusSchema.optional(),
  condition: UserFigureConditionSchema.optional().nullable(),
  purchase_price: z.number().optional().nullable(),
  purchase_currency: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  photo_refs: z.array(z.string()).optional().nullable(),
  updated_at: z.string().datetime().optional(),
});

export async function createUserFigure(payload: {
  figure_id?: string;
  status: UserFigureStatus;
  condition?: z.infer<typeof UserFigureConditionSchema>;
  user_id?: string;
  custom_figure_payload?: Record<string, unknown>;
}) {
  const parsed = UserFigureCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid user figure payload.");
  }
  return apiRequest({
    path: "/v1/user-figures",
    method: "POST",
    body: parsed.data,
    schema: UserFigureCreateResponseSchema,
    auth: "required",
  });
}

export async function fetchHydratedUserFigures(status?: UserFigureStatus) {
  const params = new URLSearchParams();
  params.set("limit", "500");
  if (status) {
    params.set("status", status);
  }

  return apiRequest({
    path: `/v1/user-figures?${params.toString()}`,
    schema: HydratedUserFigureListResponseSchema,
    auth: "required",
  });
}

export async function updateUserFigureStatus(id: string, status: UserFigureStatus) {
  const parsed = UserFigureUpdatePayloadSchema.safeParse({ status });
  if (!parsed.success) {
    throw new Error("Invalid user figure update payload.");
  }
  return apiRequest({
    path: `/v1/user-figures/${id}`,
    method: "PATCH",
    body: parsed.data,
    schema: UserFigureUpdateResponseSchema,
    auth: "required",
  });
}

export async function updateUserFigureDetails(
  id: string,
  payload: z.infer<typeof UserFigureDetailsPayloadSchema>
) {
  const parsed = UserFigureDetailsPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid user figure details payload.");
  }
  return apiRequest({
    path: `/v1/user-figures/${id}`,
    method: "PATCH",
    body: parsed.data,
    schema: UserFigureUpdateResponseSchema,
    auth: "required",
  });
}
