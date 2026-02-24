import { useQuery } from "@tanstack/react-query";
import {
  AnalyticsDistributionResponseSchema,
  AnalyticsSummaryResponseSchema,
  AnalyticsValueSeriesResponseSchema,
  type AnalyticsDistributionBy,
  type AnalyticsRange,
} from "@force-collector/shared";
import { env } from "../env";
import { useOfflineStatus } from "../offline/OfflineProvider";
import { apiRequest } from "./client";
import { queryKeys } from "./queryKeys";

const ANALYTICS_STALE_TIME = 0;

export function useAnalyticsSummary(range: AnalyticsRange) {
  const { isOnline } = useOfflineStatus();
  return useQuery({
    queryKey: queryKeys.analyticsSummary(range),
    enabled: Boolean(env.API_BASE_URL && isOnline),
    staleTime: ANALYTICS_STALE_TIME,
    placeholderData: (previous) => previous,
    queryFn: () =>
      apiRequest({
        path: `/v1/analytics/summary?range=${range}`,
        schema: AnalyticsSummaryResponseSchema,
        auth: "required",
      }),
  });
}

export function useAnalyticsDistribution(by: AnalyticsDistributionBy, range: AnalyticsRange) {
  const { isOnline } = useOfflineStatus();
  return useQuery({
    queryKey: queryKeys.analyticsDistribution(by, range),
    enabled: Boolean(env.API_BASE_URL && isOnline),
    staleTime: ANALYTICS_STALE_TIME,
    placeholderData: (previous) => previous,
    queryFn: () =>
      apiRequest({
        path: `/v1/analytics/distribution?by=${by}&range=${range}`,
        schema: AnalyticsDistributionResponseSchema,
        auth: "required",
      }),
  });
}

export function useAnalyticsValueSeries(range: AnalyticsRange) {
  const { isOnline } = useOfflineStatus();
  return useQuery({
    queryKey: queryKeys.analyticsSeries(range),
    enabled: Boolean(env.API_BASE_URL && isOnline),
    staleTime: ANALYTICS_STALE_TIME,
    placeholderData: (previous) => previous,
    queryFn: () =>
      apiRequest({
        path: `/v1/analytics/value-series?range=${range}`,
        schema: AnalyticsValueSeriesResponseSchema,
        auth: "required",
      }),
  });
}
