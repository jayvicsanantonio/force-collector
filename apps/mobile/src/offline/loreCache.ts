import { getDatabase } from "./db";

const LORE_CACHE_PREFIX = "lore:";
const LORE_TTL_HOURS = 24;

export type LoreCacheEntry = {
  figureId: string;
  lore: string | null;
  updatedAt: string | null;
  source: string | null;
  cachedAt: string;
};

type RawLoreCacheEntry = {
  figureId: string;
  lore: string | null;
  updatedAt: string | null;
  source: string | null;
  cachedAt: string;
};

function getCacheKey(figureId: string) {
  return `${LORE_CACHE_PREFIX}${figureId}`;
}

export function isLoreStale(cachedAt: string) {
  const cachedTime = Date.parse(cachedAt);
  if (!Number.isFinite(cachedTime)) {
    return true;
  }
  const ttlMs = LORE_TTL_HOURS * 60 * 60 * 1000;
  return Date.now() - cachedTime > ttlMs;
}

export async function getLoreCache(
  figureId: string
): Promise<LoreCacheEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM metadata WHERE key = ?",
    [getCacheKey(figureId)]
  );
  if (!row?.value) {
    return null;
  }
  try {
    const parsed = JSON.parse(row.value) as RawLoreCacheEntry;
    if (!parsed || parsed.figureId !== figureId || !parsed.cachedAt) {
      return null;
    }
    return {
      figureId,
      lore: parsed.lore ?? null,
      updatedAt: parsed.updatedAt ?? null,
      source: parsed.source ?? null,
      cachedAt: parsed.cachedAt,
    };
  } catch {
    return null;
  }
}

export async function setLoreCache(entry: LoreCacheEntry) {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)",
    [getCacheKey(entry.figureId), JSON.stringify(entry)]
  );
}
