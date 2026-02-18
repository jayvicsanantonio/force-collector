import { getDatabase } from "./db";
import { notifyFigureChanges } from "./events";
import type { CachedFigure, DashboardSummary, FigureStatus } from "./types";

function mapRow(row: {
  id: string;
  figure_id: string | null;
  name: string;
  series: string | null;
  status: FigureStatus;
  last_price: number | null;
  in_stock: number | null;
  condition: string | null;
  purchase_price: number | null;
  purchase_currency: string | null;
  purchase_date: string | null;
  notes: string | null;
  photo_refs: string | null;
  updated_at: string;
  sync_pending: number;
}): CachedFigure {
  let photoRefs: string[] | null = null;
  if (row.photo_refs) {
    try {
      const parsed = JSON.parse(row.photo_refs);
      if (Array.isArray(parsed)) {
        photoRefs = parsed.filter((value) => typeof value === "string");
      }
    } catch {
      photoRefs = null;
    }
  }
  return {
    id: row.id,
    figureId: row.figure_id,
    name: row.name,
    series: row.series,
    status: row.status,
    lastPrice: row.last_price,
    inStock: row.in_stock === null ? null : row.in_stock === 1,
    condition:
      row.condition === "MINT" ||
      row.condition === "OPENED" ||
      row.condition === "LOOSE" ||
      row.condition === "UNKNOWN"
        ? row.condition
        : undefined,
    purchasePrice: row.purchase_price,
    purchaseCurrency: row.purchase_currency,
    purchaseDate: row.purchase_date,
    notes: row.notes,
    photoRefs,
    updatedAt: row.updated_at,
    syncPending: row.sync_pending === 1,
  };
}

export async function listFiguresByStatus(status: FigureStatus) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    figure_id: string | null;
    name: string;
    series: string | null;
    status: FigureStatus;
    last_price: number | null;
    in_stock: number | null;
    condition: string | null;
    purchase_price: number | null;
    purchase_currency: string | null;
    purchase_date: string | null;
    notes: string | null;
    photo_refs: string | null;
    updated_at: string;
    sync_pending: number;
  }>(
    "SELECT id, figure_id, name, series, status, last_price, in_stock, condition, purchase_price, purchase_currency, purchase_date, notes, photo_refs, updated_at, sync_pending FROM figures WHERE status = ? ORDER BY updated_at DESC",
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
    figure_id: string | null;
    name: string;
    series: string | null;
    status: FigureStatus;
    last_price: number | null;
    in_stock: number | null;
    condition: string | null;
    purchase_price: number | null;
    purchase_currency: string | null;
    purchase_date: string | null;
    notes: string | null;
    photo_refs: string | null;
    updated_at: string;
    sync_pending: number;
  }>(
    "SELECT id, figure_id, name, series, status, last_price, in_stock, condition, purchase_price, purchase_currency, purchase_date, notes, photo_refs, updated_at, sync_pending FROM figures WHERE id = ?",
    [id]
  );
  return row ? mapRow(row) : null;
}

export async function getFigureByFigureId(
  figureId: string
): Promise<CachedFigure | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    figure_id: string | null;
    name: string;
    series: string | null;
    status: FigureStatus;
    last_price: number | null;
    in_stock: number | null;
    condition: string | null;
    purchase_price: number | null;
    purchase_currency: string | null;
    purchase_date: string | null;
    notes: string | null;
    photo_refs: string | null;
    updated_at: string;
    sync_pending: number;
  }>(
    "SELECT id, figure_id, name, series, status, last_price, in_stock, condition, purchase_price, purchase_currency, purchase_date, notes, photo_refs, updated_at, sync_pending FROM figures WHERE figure_id = ?",
    [figureId]
  );
  return row ? mapRow(row) : null;
}

type UpsertFigureInput = {
  id: string;
  figureId?: string | null;
  name: string;
  series: string | null;
  status: FigureStatus;
  lastPrice?: number | null;
  inStock?: boolean | null;
  condition?: CachedFigure["condition"];
  purchasePrice?: number | null;
  purchaseCurrency?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  photoRefs?: string[] | null;
  updatedAt?: string;
  syncPending?: boolean;
};

export async function upsertFigureRecord({
  id,
  figureId = null,
  name,
  series,
  status,
  lastPrice = null,
  inStock = null,
  condition,
  purchasePrice = null,
  purchaseCurrency = null,
  purchaseDate = null,
  notes = null,
  photoRefs = null,
  updatedAt,
  syncPending = false,
}: UpsertFigureInput): Promise<CachedFigure | null> {
  const db = await getDatabase();
  const resolvedUpdatedAt = updatedAt ?? new Date().toISOString();
  const resolvedPhotoRefs =
    photoRefs && Array.isArray(photoRefs) ? JSON.stringify(photoRefs) : null;
  await db.runAsync(
    "INSERT OR REPLACE INTO figures (id, figure_id, name, series, status, last_price, in_stock, condition, purchase_price, purchase_currency, purchase_date, notes, photo_refs, updated_at, sync_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      figureId,
      name,
      series,
      status,
      lastPrice,
      inStock === null ? null : inStock ? 1 : 0,
      condition ?? null,
      purchasePrice,
      purchaseCurrency,
      purchaseDate,
      notes,
      resolvedPhotoRefs,
      resolvedUpdatedAt,
      syncPending ? 1 : 0,
    ]
  );
  const updated = await getFigureById(id);
  notifyFigureChanges();
  return updated;
}

export async function replaceFigureIdentity(
  tempId: string,
  newId: string,
  updatedAt: string,
  figureId?: string | null
) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE figures SET id = ?, figure_id = COALESCE(?, figure_id), updated_at = ?, sync_pending = 0 WHERE id = ?",
    [newId, figureId ?? null, updatedAt, tempId]
  );
  notifyFigureChanges();
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

type FigureDetailsUpdate = {
  condition?: CachedFigure["condition"] | null;
  purchasePrice?: number | null;
  purchaseCurrency?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  photoRefs?: string[] | null;
  updatedAt?: string;
  syncPending?: boolean;
};

export async function updateFigureDetails(
  id: string,
  updates: FigureDetailsUpdate
): Promise<CachedFigure | null> {
  const db = await getDatabase();
  const current = await getFigureById(id);
  if (!current) {
    return null;
  }
  const resolvedUpdatedAt = updates.updatedAt ?? new Date().toISOString();
  const resolvedCondition =
    updates.condition === undefined
      ? current.condition ?? "UNKNOWN"
      : updates.condition ?? "UNKNOWN";
  const resolvedPurchasePrice =
    updates.purchasePrice === undefined ? current.purchasePrice ?? null : updates.purchasePrice;
  const resolvedPurchaseCurrency =
    updates.purchaseCurrency === undefined
      ? current.purchaseCurrency ?? null
      : updates.purchaseCurrency;
  const resolvedPurchaseDate =
    updates.purchaseDate === undefined ? current.purchaseDate ?? null : updates.purchaseDate;
  const resolvedNotes =
    updates.notes === undefined ? current.notes ?? null : updates.notes;
  const resolvedPhotoRefs =
    updates.photoRefs === undefined ? current.photoRefs ?? null : updates.photoRefs;
  const resolvedPhotoJson =
    resolvedPhotoRefs && Array.isArray(resolvedPhotoRefs)
      ? JSON.stringify(resolvedPhotoRefs)
      : null;
  const pending = updates.syncPending ?? true;

  await db.runAsync(
    "UPDATE figures SET condition = ?, purchase_price = ?, purchase_currency = ?, purchase_date = ?, notes = ?, photo_refs = ?, updated_at = ?, sync_pending = ? WHERE id = ?",
    [
      resolvedCondition ?? null,
      resolvedPurchasePrice,
      resolvedPurchaseCurrency,
      resolvedPurchaseDate,
      resolvedNotes,
      resolvedPhotoJson,
      resolvedUpdatedAt,
      pending ? 1 : 0,
      id,
    ]
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

export async function applyServerDetailsUpdate(
  id: string,
  updates: FigureDetailsUpdate
) {
  await updateFigureDetails(id, { ...updates, syncPending: false });
}

export async function clearSyncPending(id: string) {
  const db = await getDatabase();
  await db.runAsync("UPDATE figures SET sync_pending = 0 WHERE id = ?", [id]);
  notifyFigureChanges();
}
