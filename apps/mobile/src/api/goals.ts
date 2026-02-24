import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoalProgressResponseSchema } from "@force-collector/shared";
import { env } from "../env";
import { subscribeToFigureChanges } from "../offline/events";
import { apiRequest } from "./client";
import { queryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";

export function useActiveGoalProgress() {
  const query = useQuery({
    queryKey: queryKeys.goalProgress(),
    queryFn: () =>
      apiRequest({
        path: "/v1/goals/active/progress",
        schema: GoalProgressResponseSchema,
        auth: "required",
      }),
    enabled: Boolean(env.API_BASE_URL),
  });

  useEffect(() => {
    const unsubscribe = subscribeToFigureChanges(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalProgress() });
    });
    return () => unsubscribe();
  }, []);

  return query;
}
