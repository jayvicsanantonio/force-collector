import { useMutation } from "@tanstack/react-query";
import {
  ScanLookupRequestSchema,
  ScanLookupResponseSchema,
} from "@force-collector/shared";
import { apiRequest } from "./client";

export function useScanLookup() {
  return useMutation({
    mutationFn: (payload: unknown) => {
      const parsed = ScanLookupRequestSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid scan lookup payload.");
      }
      return apiRequest({
        path: "/v1/scan/lookup",
        method: "POST",
        body: parsed.data,
        schema: ScanLookupResponseSchema,
        auth: "optional",
      });
    },
  });
}
