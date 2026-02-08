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

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    entityId: row.entity_id,
    payload: JSON.parse(row.payload) as PendingMutation["payload"],
    createdAt: row.created_at,
  }));
}

export async function removeMutation(id: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM pending_mutations WHERE id = ?", [id]);
}
