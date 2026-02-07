import { useQuery } from "@tanstack/react-query";
import { MeResponseSchema } from "@force-collector/shared";
import { env } from "../env";
import { apiRequest } from "./client";
import { queryKeys } from "./queryKeys";

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
