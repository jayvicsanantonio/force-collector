import { useMutation, useQuery } from "@tanstack/react-query";
import {
  PriceAlertCreateRequestSchema,
  PriceAlertSchema,
  PriceAlertUpdateRequestSchema,
  PriceResponseSchema,
  type PriceAlert,
  type PriceAlertCreateRequest,
  type PriceAlertUpdateRequest,
} from "@force-collector/shared";
import { apiRequest } from "./client";
import { env } from "../env";
import { queryKeys } from "./queryKeys";
import { queryClient } from "./queryClient";
import { useOfflineStatus } from "../offline/OfflineProvider";

type SavePriceAlertInput = {
  id?: string | null;
  payload: PriceAlertCreateRequest | PriceAlertUpdateRequest;
};

export function useUserFigurePrice(userFigureId?: string | null) {
  const { isOnline } = useOfflineStatus();
  return useQuery({
    queryKey: queryKeys.price(userFigureId ?? "unknown"),
    enabled: Boolean(env.API_BASE_URL && userFigureId && isOnline),
    queryFn: () =>
      apiRequest({
        path: `/v1/user-figures/${userFigureId}/price`,
        schema: PriceResponseSchema,
        auth: "required",
      }),
  });
}

async function createPriceAlert(payload: PriceAlertCreateRequest) {
  const parsed = PriceAlertCreateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid price alert payload.");
  }
  return apiRequest({
    path: "/v1/price-alerts",
    method: "POST",
    body: parsed.data,
    schema: PriceAlertSchema,
    auth: "required",
  });
}

async function updatePriceAlert(id: string, payload: PriceAlertUpdateRequest) {
  const parsed = PriceAlertUpdateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid price alert update payload.");
  }
  return apiRequest({
    path: `/v1/price-alerts/${id}`,
    method: "PATCH",
    body: parsed.data,
    schema: PriceAlertSchema,
    auth: "required",
  });
}

export function useSavePriceAlert() {
  return useMutation({
    mutationFn: async ({ id, payload }: SavePriceAlertInput): Promise<PriceAlert> => {
      if (id) {
        return updatePriceAlert(id, payload as PriceAlertUpdateRequest);
      }
      return createPriceAlert(payload as PriceAlertCreateRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.priceAlerts() });
    },
  });
}
