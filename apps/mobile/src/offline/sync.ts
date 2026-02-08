import { z } from "zod";
import { env } from "../env";
import { apiRequest } from "../api/client";
import { applyServerUpdate, clearSyncPending, getFigureById } from "./cache";
import { listPendingMutations, removeMutation } from "./queue";
import type { PendingMutation } from "./types";

const UserFigureUpdateSchema = z.object({
  id: z.string(),
  status: z.string(),
  updated_at: z.string().datetime().optional(),
});

export async function syncPendingMutations() {
  if (!env.API_BASE_URL) {
    return { synced: 0, skipped: true };
  }

  const mutations = await listPendingMutations();
  let synced = 0;

  for (const mutation of mutations) {
    try {
      const result = await syncMutation(mutation);
      if (result) {
        synced += 1;
      }
    } catch {
      // Keep the mutation queued for the next sync attempt.
    }
  }

  return { synced, skipped: false };
}

async function syncMutation(mutation: PendingMutation) {
  if (mutation.type === "status_update") {
    const local = await getFigureById(mutation.entityId);
    const response = await apiRequest({
      path: `/v1/user-figures/${mutation.entityId}`,
      method: "PATCH",
      body: {
        status: mutation.payload.status,
        updated_at: mutation.payload.updatedAt,
      },
      schema: UserFigureUpdateSchema,
      auth: "required",
    });

    const serverUpdatedAt = response.updated_at ?? mutation.payload.updatedAt;
    const serverStatus = response.status ?? mutation.payload.status;
    if (local && serverUpdatedAt && new Date(serverUpdatedAt) > new Date(local.updatedAt)) {
      await applyServerUpdate(mutation.entityId, serverStatus, serverUpdatedAt);
    } else {
      await clearSyncPending(mutation.entityId);
    }

    await removeMutation(mutation.id);
    return true;
  }

  return false;
}
