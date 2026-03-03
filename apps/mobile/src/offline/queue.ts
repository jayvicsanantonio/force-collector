import { getDatabase } from "./db";
import type { PendingMutation } from "./types";

function generateId() {
  return `mut_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function queueMutation(
  mutation: Omit<PendingMutation, "id" | "createdAt">
) {
  const db = await getDatabase();
  const id = generateId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO pending_mutations (id, type, entity_id, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, mutation.type, mutation.entityId, JSON.stringify(mutation.payload), createdAt]
  );
  return id;
}

export async function listPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    type: PendingMutation["type"];
    entity_id: string;
    payload: string;
    created_at: string;
  }>(
    "SELECT id, type, entity_id, payload, created_at FROM pending_mutations ORDER BY created_at ASC"
  );

  return rows
    .map((row) => {
      const payload = JSON.parse(row.payload) as unknown;
      if (row.type === "status_update") {
        return {
          id: row.id,
          type: "status_update" as const,
          entityId: row.entity_id,
          payload:
            payload as Extract<PendingMutation, { type: "status_update" }>["payload"],
          createdAt: row.created_at,
        };
      }
      if (row.type === "create_user_figure") {
        return {
          id: row.id,
          type: "create_user_figure" as const,
          entityId: row.entity_id,
          payload: payload as Extract<
            PendingMutation,
            { type: "create_user_figure" }
          >["payload"],
          createdAt: row.created_at,
        };
      }
      if (row.type === "details_update") {
        return {
          id: row.id,
          type: "details_update" as const,
          entityId: row.entity_id,
          payload:
            payload as Extract<PendingMutation, { type: "details_update" }>["payload"],
          createdAt: row.created_at,
        };
      }
      return null;
    })
    .filter((row): row is PendingMutation => row !== null);
}

export async function removeMutation(id: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM pending_mutations WHERE id = ?", [id]);
}
