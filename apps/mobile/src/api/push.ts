import { ApiSuccessSchema, PushRegisterRequestSchema } from "@force-collector/shared";
import { apiRequest } from "./client";

export async function registerPushToken(payload: {
  expo_push_token: string;
  device_id?: string;
}) {
  const parsed = PushRegisterRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid push registration payload.");
  }

  return apiRequest({
    path: "/v1/push/register",
    method: "POST",
    body: parsed.data,
    schema: ApiSuccessSchema,
    auth: "required",
  });
}
