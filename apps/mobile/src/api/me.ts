import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiSuccessSchema, MeResponseSchema, UpdateMeRequestSchema } from "@force-collector/shared";
import { env } from "../env";
import { apiRequest } from "./client";
import { queryKeys } from "./queryKeys";
import { queryClient } from "./queryClient";

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: () =>
      apiRequest({
        path: "/v1/me",
        schema: MeResponseSchema,
        auth: "required",
      }),
    enabled: Boolean(env.API_BASE_URL),
  });
}

export function useUpdateMe() {
  return useMutation({
    mutationFn: (payload: unknown) => {
      const parsed = UpdateMeRequestSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid profile update payload.");
      }
      return apiRequest({
        path: "/v1/me",
        method: "PATCH",
        body: parsed.data,
        schema: ApiSuccessSchema,
        auth: "required",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}
