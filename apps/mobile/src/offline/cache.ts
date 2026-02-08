import { getDatabase } from "./db";
import { notifyFigureChanges } from "./events";
import type { CachedFigure, DashboardSummary, FigureStatus } from "./types";

function mapRow(row: {
  id: string;
  name: string;
  series: string | null;
  status: FigureStatus;
  last_price: number | null;
  in_stock: number | null;
  updated_at: string;
  sync_pending: number;
}): CachedFigure {
  return {
    id: row.id,
    name: row.name,
    series: row.series,
    status: row.status,
    lastPrice: row.last_price,
    inStock: row.in_stock === null ? null : row.in_stock === 1,
    updatedAt: row.updated_at,
    syncPending: row.sync_pending === 1,
  };
}

export async function listFiguresByStatus(status: FigureStatus) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    series: string | null;
    status: FigureStatus;
    last_price: number | null;
    in_stock: number | null;
    updated_at: string;
    sync_pending: number;
  }>(
    "SELECT id, name, series, status, last_price, in_stock, updated_at, sync_pending FROM figures WHERE status = ? ORDER BY updated_at DESC",
    [status]
  );
  return rows.map(mapRow);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await getDatabase();
  const owned = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM figures WHERE status = 'OWNED'"
  );
  const wishlist = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM figures WHERE status = 'WISHLIST'"
  );
  const pending = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM figures WHERE sync_pending = 1"
  );

  return {
    totalOwned: owned?.count ?? 0,
    totalWishlist: wishlist?.count ?? 0,
    pendingSync: pending?.count ?? 0,
  };
}

export async function getFigureById(id: string): Promise<CachedFigure | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    name: string;
    series: string | null;
    status: FigureStatus;
    last_price: number | null;
    in_stock: number | null;
    updated_at: string;
    sync_pending: number;
  }>(
    "SELECT id, name, series, status, last_price, in_stock, updated_at, sync_pending FROM figures WHERE id = ?",
    [id]
  );
  return row ? mapRow(row) : null;
}

export async function updateFigureStatus(
  id: string,
  status: FigureStatus
): Promise<CachedFigure | null> {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  await db.runAsync(
    "UPDATE figures SET status = ?, updated_at = ?, sync_pending = 1 WHERE id = ?",
    [status, updatedAt, id]
  );
  const updated = await getFigureById(id);
  notifyFigureChanges();
  return updated;
}

export async function applyServerUpdate(
  id: string,
  status: FigureStatus,
  updatedAt: string
) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE figures SET status = ?, updated_at = ?, sync_pending = 0 WHERE id = ?",
    [status, updatedAt, id]
  );
  notifyFigureChanges();
}

export async function clearSyncPending(id: string) {
  const db = await getDatabase();
  await db.runAsync("UPDATE figures SET sync_pending = 0 WHERE id = ?", [id]);
  notifyFigureChanges();
}
