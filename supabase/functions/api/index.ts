import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function normalizePath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const v1Index = segments.indexOf("v1");
  if (v1Index >= 0) {
    return `/${segments.slice(v1Index).join("/")}`;
  }
  if (segments.length >= 2) {
    return `/${segments.slice(-2).join("/")}`;
  }
  return pathname;
}

const DEFAULT_LOOKUP_TTL_HOURS = 24;
const DEFAULT_PROVIDER_TTL_HOURS = 12;
const DEFAULT_LORE_TTL_HOURS = 168;

const FIGURE_SELECT_FIELDS =
  "id,name,subtitle,edition,series,wave,release_year,era,faction,exclusivity,upc,primary_image_url,lore,specs,created_at,updated_at";
const FIGURE_LORE_FIELDS =
  "id,name,subtitle,edition,lore,lore_updated_at,lore_source";
const USER_FIGURE_SELECT_FIELDS =
  "id,user_id,figure_id,custom_figure_payload,status,condition,purchase_price,purchase_currency,purchase_date,notes,photo_refs,created_at,updated_at";
const USER_FIGURE_STATUSES = ["OWNED", "WISHLIST", "PREORDER", "SOLD"] as const;
const USER_FIGURE_CONDITIONS = ["MINT", "OPENED", "LOOSE", "UNKNOWN"] as const;
const GOAL_PROGRESS_RULES = ["OWNED_COUNT"] as const;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type ScanLookupResult = {
  match: Record<string, unknown> | null;
  confidence: number;
  related: Record<string, unknown>[];
  listings: Record<string, unknown>[];
};

type AuthedSupabase = ReturnType<typeof createClient>;

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isFresh(expiresAt?: string | null) {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() > Date.now();
}

async function fetchFigure(
  supabase: ReturnType<typeof createClient>,
  id: string
) {
  const { data } = await supabase
    .from("figures")
    .select(FIGURE_SELECT_FIELDS)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

async function fetchFigures(
  supabase: ReturnType<typeof createClient>,
  ids: string[]
) {
  if (!ids.length) {
    return [];
  }
  const { data } = await supabase
    .from("figures")
    .select(FIGURE_SELECT_FIELDS)
    .in("id", ids);
  return data ?? [];
}

async function fetchListings(
  supabase: ReturnType<typeof createClient>,
  figureId: string
) {
  const { data } = await supabase
    .from("retailer_listings")
    .select("*")
    .eq("figure_id", figureId);
  return data ?? [];
}

async function loadLookupCache(
  supabase: ReturnType<typeof createClient>,
  upc: string
) {
  const { data } = await supabase
    .from("scan_lookup_cache")
    .select("figure_id, confidence, related_figure_ids, expires_at")
    .eq("upc", upc)
    .maybeSingle();

  if (!data || !isFresh(data.expires_at)) {
    return null;
  }

  const match = data.figure_id ? await fetchFigure(supabase, data.figure_id) : null;
  const relatedIds = Array.isArray(data.related_figure_ids)
    ? (data.related_figure_ids as string[])
    : [];
  const related = relatedIds.length ? await fetchFigures(supabase, relatedIds) : [];
  const listings = match ? await fetchListings(supabase, match.id as string) : [];

  return {
    match,
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
    related,
    listings,
  };
}

async function storeLookupCache(
  supabase: ReturnType<typeof createClient>,
  upc: string,
  payload: {
    figure_id: string | null;
    confidence: number;
    related_figure_ids: string[];
    ttlHours: number;
  }
) {
  const expiresAt = hoursFromNow(payload.ttlHours);
  await supabase.from("scan_lookup_cache").upsert(
    {
      upc,
      figure_id: payload.figure_id,
      confidence: payload.confidence,
      related_figure_ids: payload.related_figure_ids,
      updated_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "upc" }
  );
}

async function loadProviderCache(
  supabase: ReturnType<typeof createClient>,
  upc: string
) {
  const { data } = await supabase
    .from("scan_provider_cache")
    .select("provider, payload, expires_at")
    .eq("upc", upc)
    .maybeSingle();

  if (!data || !isFresh(data.expires_at)) {
    return null;
  }

  return data;
}

async function storeProviderCache(
  supabase: ReturnType<typeof createClient>,
  upc: string,
  provider: string,
  payload: Record<string, unknown>,
  ttlHours: number
) {
  const expiresAt = hoursFromNow(ttlHours);
  await supabase.from("scan_provider_cache").upsert(
    {
      upc,
      provider,
      payload,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "upc" }
  );
}

async function fetchBarcodeLookupProducts(upc: string) {
  const apiKey = Deno.env.get("BARCODE_LOOKUP_API_KEY");
  if (!apiKey) {
    return null;
  }
  const endpoint =
    Deno.env.get("BARCODE_LOOKUP_ENDPOINT") ||
    "https://api.barcodelookup.com/v3/products";
  const url = new URL(endpoint);
  url.searchParams.set("barcode", upc);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("formatted", "y");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function createAuthedClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string
) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

function normalizeBarcode(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function parseFilters(searchParams: URLSearchParams) {
  let filters: Record<string, unknown> = {};
  const rawFilters = searchParams.get("filters");

  if (rawFilters) {
    try {
      const parsed = JSON.parse(rawFilters);
      if (parsed && typeof parsed === "object") {
        filters = parsed as Record<string, unknown>;
      }
    } catch {
      return { error: "filters must be valid JSON." };
    }
  }

  const era = searchParams.get("era");
  const series = searchParams.get("series");
  const faction = searchParams.get("faction");

  return {
    error: null,
    filters: {
      era: era ?? filters.era,
      series: series ?? filters.series,
      faction: faction ?? filters.faction,
    },
  };
}

function normalizeFilterValues(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return [value.trim()];
  }
  return [] as string[];
}

function isLoreFresh(updatedAt: string | null, ttlHours: number) {
  if (!updatedAt) {
    return false;
  }
  const timestamp = new Date(updatedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp > Date.now() - ttlHours * 60 * 60 * 1000;
}

function buildLoreSearchTerm(name: string, subtitle?: string | null) {
  const base = name.replace(/\([^)]*\)/g, "").trim();
  if (subtitle && subtitle.trim()) {
    return `${base} ${subtitle.trim()}`.trim();
  }
  return base || name;
}

async function fetchWookieepediaLore(name: string, subtitle?: string | null) {
  const term = buildLoreSearchTerm(name, subtitle);
  if (!term) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const searchUrl = new URL("https://starwars.fandom.com/api.php");
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("srsearch", term);
    searchUrl.searchParams.set("srlimit", "1");
    searchUrl.searchParams.set("format", "json");

    const searchResponse = await fetch(searchUrl.toString(), {
      method: "GET",
      signal: controller.signal,
    });
    if (!searchResponse.ok) {
      return null;
    }

    const searchJson = (await searchResponse.json()) as Record<string, unknown>;
    const searchResults = (searchJson.query as Record<string, unknown> | undefined)
      ?.search as Array<Record<string, unknown>> | undefined;
    const pageId = searchResults?.[0]?.pageid as number | undefined;

    if (!pageId) {
      return null;
    }

    const extractUrl = new URL("https://starwars.fandom.com/api.php");
    extractUrl.searchParams.set("action", "query");
    extractUrl.searchParams.set("prop", "extracts");
    extractUrl.searchParams.set("exintro", "1");
    extractUrl.searchParams.set("explaintext", "1");
    extractUrl.searchParams.set("pageids", String(pageId));
    extractUrl.searchParams.set("format", "json");

    const extractResponse = await fetch(extractUrl.toString(), {
      method: "GET",
      signal: controller.signal,
    });

    if (!extractResponse.ok) {
      return null;
    }

    const extractJson = (await extractResponse.json()) as Record<string, unknown>;
    const pages = (extractJson.query as Record<string, unknown> | undefined)
      ?.pages as Record<string, Record<string, unknown>> | undefined;
    const page = pages?.[String(pageId)];
    const extract = typeof page?.extract === "string" ? page.extract : "";
    const trimmed = extract.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.length > 800 ? trimmed.slice(0, 800).trim() : trimmed;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractProducts(payload: Record<string, unknown> | null) {
  const products = payload?.products;
  if (!Array.isArray(products)) {
    return [];
  }
  return products
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const product = item as Record<string, unknown>;
      const title = typeof product.title === "string" ? product.title.trim() : "";
      const brand = typeof product.brand === "string" ? product.brand.trim() : "";
      const barcode = typeof product.barcode === "string" ? product.barcode.trim() : "";
      return {
        title,
        brand,
        barcode,
      };
    })
    .filter((item): item is { title: string; brand: string; barcode: string } =>
      Boolean(item?.title || item?.barcode)
    );
}

async function resolveScanLookup(
  supabase: ReturnType<typeof createClient>,
  barcode: string,
  lookupTtlHours: number,
  providerTtlHours: number
): Promise<ScanLookupResult> {
  const cached = await loadLookupCache(supabase, barcode);
  if (cached) {
    return cached;
  }

  const { data: exactFigures } = await supabase
    .from("figures")
    .select("*")
    .eq("upc", barcode)
    .limit(5);

  if (exactFigures && exactFigures.length) {
    const match = exactFigures[0];
    const related = exactFigures.slice(1);
    const confidence = exactFigures.length > 1 ? 0.6 : 0.95;
    await storeLookupCache(supabase, barcode, {
      figure_id: match.id as string,
      confidence,
      related_figure_ids: related.map((item) => item.id as string),
      ttlHours: lookupTtlHours,
    });
    const listings = await fetchListings(supabase, match.id as string);
    return {
      match,
      confidence,
      related,
      listings,
    };
  }

  let providerPayload: Record<string, unknown> | null = null;
  const cachedProvider = await loadProviderCache(supabase, barcode);
  if (cachedProvider?.payload && typeof cachedProvider.payload === "object") {
    providerPayload = cachedProvider.payload as Record<string, unknown>;
  } else {
    const fetched = await fetchBarcodeLookupProducts(barcode);
    if (fetched) {
      providerPayload = fetched;
      await storeProviderCache(
        supabase,
        barcode,
        "barcode_lookup",
        fetched,
        providerTtlHours
      );
    }
  }

  const products = extractProducts(providerPayload);
  const matchedFigures: Record<string, unknown>[] = [];

  for (const product of products) {
    const productBarcode = normalizeBarcode(product.barcode || barcode);
    if (productBarcode) {
      const { data } = await supabase
        .from("figures")
        .select("*")
        .eq("upc", productBarcode)
        .limit(1);
      if (data && data.length) {
        matchedFigures.push(data[0]);
        continue;
      }
    }

    if (product.title) {
      const { data } = await supabase
        .from("figures")
        .select("*")
        .ilike("name", `%${product.title}%`)
        .limit(2);
      if (data && data.length) {
        matchedFigures.push(...data);
      }
    }
  }

  const uniqueFigures = new Map<string, Record<string, unknown>>();
  for (const figure of matchedFigures) {
    const id = figure.id as string | undefined;
    if (id) {
      uniqueFigures.set(id, figure);
    }
  }

  const candidates = Array.from(uniqueFigures.values());
  if (candidates.length) {
    const match = candidates[0];
    const related = candidates.slice(1);
    const confidence = candidates.length > 1 ? 0.35 : 0.55;
    await storeLookupCache(supabase, barcode, {
      figure_id: match.id as string,
      confidence,
      related_figure_ids: related.map((item) => item.id as string),
      ttlHours: lookupTtlHours,
    });
    const listings = await fetchListings(supabase, match.id as string);
    return {
      match,
      confidence,
      related,
      listings,
    };
  }

  await storeLookupCache(supabase, barcode, {
    figure_id: null,
    confidence: 0,
    related_figure_ids: [],
    ttlHours: lookupTtlHours,
  });

  return {
    match: null,
    confidence: 0,
    related: [],
    listings: [],
  };
}

async function requireUser(supabase: AuthedSupabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, error: error ?? new Error("Unauthorized") };
  }
  return { user, error: null };
}

function isUserFigureStatus(value: unknown): value is (typeof USER_FIGURE_STATUSES)[number] {
  return typeof value === "string" && USER_FIGURE_STATUSES.includes(value as any);
}

function isUserFigureCondition(
  value: unknown
): value is (typeof USER_FIGURE_CONDITIONS)[number] {
  return typeof value === "string" && USER_FIGURE_CONDITIONS.includes(value as any);
}

function parseNumeric(value: unknown) {
  if (value === null || value === undefined) {
    return { ok: true, value: null as number | null };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { ok: true, value };
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return { ok: true, value: parsed };
    }
  }
  return { ok: false, value: null as number | null };
}

function normalizeUserFigure(row: Record<string, unknown> | null) {
  if (!row) {
    return row;
  }
  const normalized = { ...row } as Record<string, unknown>;
  if (typeof normalized.purchase_price === "string") {
    const parsed = Number(normalized.purchase_price);
    if (Number.isFinite(parsed)) {
      normalized.purchase_price = parsed;
    }
  }
  if (normalized.purchase_price === null) {
    delete normalized.purchase_price;
  }
  if (normalized.purchase_currency === null) {
    delete normalized.purchase_currency;
  }
  if (normalized.purchase_date === null) {
    delete normalized.purchase_date;
  }
  if (normalized.notes === null) {
    delete normalized.notes;
  }
  if (normalized.custom_figure_payload === null) {
    delete normalized.custom_figure_payload;
  }
  if (Array.isArray(normalized.photo_refs)) {
    normalized.photo_refs = normalized.photo_refs.filter(
      (value) => typeof value === "string"
    );
  } else if (normalized.photo_refs === null) {
    delete normalized.photo_refs;
  }
  return normalized;
}

function isGoalProgressRule(value: unknown): value is (typeof GOAL_PROGRESS_RULES)[number] {
  return typeof value === "string" && GOAL_PROGRESS_RULES.includes(value as any);
}

function buildGoalTarget(goal: Record<string, unknown>) {
  const figureIds = Array.isArray(goal.target_figure_ids)
    ? goal.target_figure_ids.filter((value) => typeof value === "string")
    : [];
  if (figureIds.length) {
    return { type: "figures", figure_ids: figureIds };
  }
  if (typeof goal.target_wave === "string" && goal.target_wave.trim()) {
    return { type: "wave", wave: goal.target_wave };
  }
  if (typeof goal.target_era === "string" && goal.target_era.trim()) {
    return { type: "era", era: goal.target_era };
  }
  return null;
}

async function ensureActiveGoal(
  supabase: AuthedSupabase,
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data: active, error: activeError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeError) {
    throw activeError;
  }
  if (active) {
    return active as Record<string, unknown>;
  }

  const { data: existing, error: existingError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingError) {
    throw existingError;
  }
  if (existing) {
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("goals")
      .update({ is_active: true, updated_at: now })
      .eq("id", existing.id as string)
      .select("*")
      .maybeSingle();
    if (updateError) {
      throw updateError;
    }
    return updated ? (updated as Record<string, unknown>) : null;
  }

  const { data: template, error: templateError } = await supabase
    .from("goals")
    .select("*")
    .eq("is_template", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (templateError) {
    throw templateError;
  }
  if (!template) {
    return null;
  }

  const now = new Date().toISOString();
  const record = {
    user_id: userId,
    name: template.name,
    target_figure_ids: template.target_figure_ids ?? null,
    target_wave: template.target_wave ?? null,
    target_era: template.target_era ?? null,
    progress_rule: isGoalProgressRule(template.progress_rule)
      ? template.progress_rule
      : "OWNED_COUNT",
    is_active: true,
    is_template: false,
    created_at: now,
    updated_at: now,
  };

  const { data: created, error: createError } = await supabase
    .from("goals")
    .insert(record)
    .select("*")
    .maybeSingle();
  if (createError) {
    throw createError;
  }
  return created ? (created as Record<string, unknown>) : null;
}

async function computeGoalProgress(
  supabase: AuthedSupabase,
  userId: string,
  goal: Record<string, unknown>
) {
  const target = buildGoalTarget(goal);
  if (!target) {
    return { target: null, owned: 0, total: 0 };
  }

  if (target.type === "figures") {
    const { count: totalCount, error: totalError } = await supabase
      .from("figures")
      .select("id", { count: "exact", head: true })
      .in("id", target.figure_ids);
    if (totalError) {
      throw totalError;
    }
    const { count: ownedCount, error: ownedError } = await supabase
      .from("user_figures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "OWNED")
      .in("figure_id", target.figure_ids);
    if (ownedError) {
      throw ownedError;
    }
    return {
      target,
      owned: ownedCount ?? 0,
      total: totalCount ?? 0,
    };
  }

  if (target.type === "wave") {
    const { count: totalCount, error: totalError } = await supabase
      .from("figures")
      .select("id", { count: "exact", head: true })
      .eq("wave", target.wave);
    if (totalError) {
      throw totalError;
    }
    const { count: ownedCount, error: ownedError } = await supabase
      .from("user_figures")
      .select("id, figures!inner(id)", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "OWNED")
      .eq("figures.wave", target.wave);
    if (ownedError) {
      throw ownedError;
    }
    return {
      target,
      owned: ownedCount ?? 0,
      total: totalCount ?? 0,
    };
  }

  const { count: totalCount, error: totalError } = await supabase
    .from("figures")
    .select("id", { count: "exact", head: true })
    .eq("era", target.era);
  if (totalError) {
    throw totalError;
  }
  const { count: ownedCount, error: ownedError } = await supabase
    .from("user_figures")
    .select("id, figures!inner(id)", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "OWNED")
    .eq("figures.era", target.era);
  if (ownedError) {
    throw ownedError;
  }
  return {
    target,
    owned: ownedCount ?? 0,
    total: totalCount ?? 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  if (path === "/v1/figures" && req.method === "GET") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createAuthedClient(supabaseUrl, supabaseAnonKey, authHeader);
    const { error: authError } = await requireUser(supabase);
    if (authError) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const { error: filterError, filters } = parseFilters(url.searchParams);
    if (filterError) {
      return jsonResponse({ message: filterError }, 400);
    }

    const query = url.searchParams.get("query")?.trim();
    const limit = Number(url.searchParams.get("limit") || 25);

    let builder = supabase
      .from("figures")
      .select(FIGURE_SELECT_FIELDS)
      .order("name", { ascending: true })
      .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 25);

    if (query) {
      const escaped = query.replace(/%/g, "\\%");
      builder = builder.or(`name.ilike.%${escaped}%,subtitle.ilike.%${escaped}%`);
    }

    const eraValues = normalizeFilterValues(filters.era).map((value) =>
      value.toUpperCase()
    );
    const seriesValues = normalizeFilterValues(filters.series);
    const factionValues = normalizeFilterValues(filters.faction);

    if (eraValues.length) {
      builder = builder.in("era", eraValues);
    }
    if (seriesValues.length) {
      builder = builder.in("series", seriesValues);
    }
    if (factionValues.length) {
      builder = builder.in("faction", factionValues);
    }

    const { data, error } = await builder;
    if (error) {
      return jsonResponse({ message: error.message }, 500);
    }

    return jsonResponse({ items: data ?? [], next_cursor: null });
  }

  if (path.startsWith("/v1/figures/") && req.method === "GET") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const segments = path.split("/").filter(Boolean);
    const figureId = segments[2];
    const isLoreRequest = segments.length === 4 && segments[3] === "lore";

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createAuthedClient(supabaseUrl, supabaseAnonKey, authHeader);
    const { error: authError } = await requireUser(supabase);
    if (authError) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    if (!figureId) {
      return jsonResponse({ message: "Figure id is required." }, 400);
    }

    if (!isLoreRequest) {
      const { data, error } = await supabase
        .from("figures")
        .select(FIGURE_SELECT_FIELDS)
        .eq("id", figureId)
        .maybeSingle();
      if (error) {
        return jsonResponse({ message: error.message }, 500);
      }
      if (!data) {
        return jsonResponse({ message: "Figure not found." }, 404);
      }
      return jsonResponse(data);
    }

    const refreshParam = url.searchParams.get("refresh");
    const refresh =
      refreshParam === "1" || refreshParam?.toLowerCase() === "true";

    const { data: figure, error: figureError } = await supabase
      .from("figures")
      .select(FIGURE_LORE_FIELDS)
      .eq("id", figureId)
      .maybeSingle();
    if (figureError) {
      return jsonResponse({ message: figureError.message }, 500);
    }
    if (!figure) {
      return jsonResponse({ message: "Figure not found." }, 404);
    }

    const loreTtlHours = Number(
      Deno.env.get("LORE_CACHE_HOURS") || DEFAULT_LORE_TTL_HOURS
    );
    const needsRefresh =
      refresh ||
      !figure.lore ||
      !isLoreFresh(figure.lore_updated_at as string | null, loreTtlHours);

    let refreshed = false;
    let lore = figure.lore as string | null | undefined;
    let loreUpdatedAt = figure.lore_updated_at as string | null | undefined;
    let loreSource = figure.lore_source as string | null | undefined;

    if (needsRefresh) {
      const fetchedLore = await fetchWookieepediaLore(
        figure.name as string,
        (figure.subtitle as string | null | undefined) ?? null
      );
      if (fetchedLore) {
        const supabaseServiceKey =
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (!supabaseServiceKey) {
          return jsonResponse({ message: "Supabase env not configured." }, 500);
        }
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        const now = new Date().toISOString();
        const { error: updateError } = await serviceClient
          .from("figures")
          .update({
            lore: fetchedLore,
            lore_updated_at: now,
            lore_source: "wookieepedia",
          })
          .eq("id", figureId);
        if (updateError) {
          return jsonResponse({ message: updateError.message }, 500);
        }
        lore = fetchedLore;
        loreUpdatedAt = now;
        loreSource = "wookieepedia";
        refreshed = true;
      }
    }

    return jsonResponse({
      figure_id: figureId,
      lore,
      lore_updated_at: loreUpdatedAt ?? null,
      lore_source: loreSource ?? null,
      refreshed,
    });
  }

  if (path === "/v1/user-figures" && req.method === "GET") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createAuthedClient(supabaseUrl, supabaseAnonKey, authHeader);
    const { user, error: authError } = await requireUser(supabase);
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const statusParam = url.searchParams.get("status")?.toUpperCase();
    if (statusParam && !isUserFigureStatus(statusParam)) {
      return jsonResponse({ message: "Invalid status filter." }, 400);
    }

    const limitParam = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 50;

    const query = url.searchParams.get("query")?.trim();
    let figureIds: string[] | null = null;
    if (query) {
      const escaped = query.replace(/%/g, "\\%");
      const { data: figures, error: figuresError } = await supabase
        .from("figures")
        .select("id")
        .or(`name.ilike.%${escaped}%,subtitle.ilike.%${escaped}%`)
        .limit(200);
      if (figuresError) {
        return jsonResponse({ message: figuresError.message }, 500);
      }
      figureIds = (figures ?? []).map((item) => item.id as string);
      if (!figureIds.length) {
        return jsonResponse({ items: [], next_cursor: null });
      }
    }

    let builder = supabase
      .from("user_figures")
      .select(USER_FIGURE_SELECT_FIELDS)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (statusParam) {
      builder = builder.eq("status", statusParam);
    }
    if (figureIds) {
      builder = builder.in("figure_id", figureIds);
    }

    const { data, error } = await builder;
    if (error) {
      return jsonResponse({ message: error.message }, 500);
    }

    const items = (data ?? []).map((row) =>
      normalizeUserFigure(row as Record<string, unknown>)
    );
    return jsonResponse({ items, next_cursor: null });
  }

  if (path === "/v1/user-figures" && req.method === "POST") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createAuthedClient(supabaseUrl, supabaseAnonKey, authHeader);
    const { user, error: authError } = await requireUser(supabase);
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ message: "Invalid JSON body." }, 400);
    }
    if (!payload || Array.isArray(payload)) {
      return jsonResponse({ message: "Invalid JSON body." }, 400);
    }

    if (payload?.user_id && payload.user_id !== user.id) {
      return jsonResponse({ message: "Cannot create for another user." }, 403);
    }

    const figureId =
      typeof payload?.figure_id === "string" ? payload.figure_id : null;
    const customPayload =
      payload?.custom_figure_payload && typeof payload.custom_figure_payload === "object"
        ? payload.custom_figure_payload
        : null;

    if (!figureId && !customPayload) {
      return jsonResponse(
        { message: "figure_id or custom_figure_payload is required." },
        400
      );
    }

    if (!isUserFigureStatus(payload?.status)) {
      return jsonResponse({ message: "Invalid status." }, 400);
    }

    const condition = payload?.condition;
    if (condition !== undefined && !isUserFigureCondition(condition)) {
      return jsonResponse({ message: "Invalid condition." }, 400);
    }

    const price = parseNumeric(payload?.purchase_price);
    if (!price.ok) {
      return jsonResponse({ message: "Invalid purchase_price." }, 400);
    }

    if (
      payload?.purchase_date !== undefined &&
      payload?.purchase_date !== null &&
      (typeof payload.purchase_date !== "string" ||
        !DATE_ONLY_REGEX.test(payload.purchase_date))
    ) {
      return jsonResponse({ message: "Invalid purchase_date." }, 400);
    }

    if (
      payload?.purchase_currency !== undefined &&
      payload?.purchase_currency !== null &&
      typeof payload.purchase_currency !== "string"
    ) {
      return jsonResponse({ message: "Invalid purchase_currency." }, 400);
    }

    if (payload?.notes !== undefined && payload?.notes !== null && typeof payload.notes !== "string") {
      return jsonResponse({ message: "Invalid notes." }, 400);
    }

    if (
      payload?.photo_refs !== undefined &&
      payload?.photo_refs !== null &&
      (!Array.isArray(payload.photo_refs) ||
        payload.photo_refs.some((value) => typeof value !== "string"))
    ) {
      return jsonResponse({ message: "Invalid photo_refs." }, 400);
    }

    const record: Record<string, unknown> = {
      user_id: user.id,
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    if (figureId) {
      record.figure_id = figureId;
    }
    if (customPayload) {
      record.custom_figure_payload = customPayload;
    }
    if (condition !== undefined) {
      record.condition = condition;
    }
    if (price.value !== null) {
      record.purchase_price = price.value;
    }
    if (payload?.purchase_currency !== undefined) {
      record.purchase_currency = payload.purchase_currency;
    }
    if (payload?.purchase_date !== undefined) {
      record.purchase_date = payload.purchase_date;
    }
    if (payload?.notes !== undefined) {
      record.notes = payload.notes;
    }
    if (payload?.photo_refs !== undefined) {
      record.photo_refs = payload.photo_refs;
    }

    if (figureId) {
      const { data: existing, error: existingError } = await supabase
        .from("user_figures")
        .select(USER_FIGURE_SELECT_FIELDS)
        .eq("user_id", user.id)
        .eq("figure_id", figureId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (existingError) {
        return jsonResponse({ message: existingError.message }, 500);
      }
      const current = existing?.[0] as Record<string, unknown> | undefined;
      if (current) {
        const updates: Record<string, unknown> = { updated_at: record.updated_at };
        let changed = false;
        if (record.status && record.status !== current.status) {
          updates.status = record.status;
          changed = true;
        }
        if (record.condition !== undefined) {
          updates.condition = record.condition;
          changed = true;
        }
        if (record.purchase_price !== undefined) {
          updates.purchase_price = record.purchase_price;
          changed = true;
        }
        if (record.purchase_currency !== undefined) {
          updates.purchase_currency = record.purchase_currency;
          changed = true;
        }
        if (record.purchase_date !== undefined) {
          updates.purchase_date = record.purchase_date;
          changed = true;
        }
        if (record.notes !== undefined) {
          updates.notes = record.notes;
          changed = true;
        }
        if (record.photo_refs !== undefined) {
          updates.photo_refs = record.photo_refs;
          changed = true;
        }

        if (changed) {
          const { data: updated, error: updateError } = await supabase
            .from("user_figures")
            .update(updates)
            .eq("id", current.id as string)
            .select(USER_FIGURE_SELECT_FIELDS)
            .maybeSingle();
          if (updateError) {
            return jsonResponse({ message: updateError.message }, 500);
          }
          return jsonResponse({
            ...normalizeUserFigure(updated as Record<string, unknown>),
            duplicate: true,
            updated: true,
          });
        }

        return jsonResponse({
          ...normalizeUserFigure(current),
          duplicate: true,
          updated: false,
        });
      }
    }

    const { data, error } = await supabase
      .from("user_figures")
      .insert(record)
      .select(USER_FIGURE_SELECT_FIELDS)
      .maybeSingle();
    if (error) {
      return jsonResponse({ message: error.message }, 500);
    }

    return jsonResponse(normalizeUserFigure(data as Record<string, unknown>));
  }

  if (path.startsWith("/v1/user-figures/") && req.method === "PATCH") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createAuthedClient(supabaseUrl, supabaseAnonKey, authHeader);
    const { user, error: authError } = await requireUser(supabase);
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const segments = path.split("/").filter(Boolean);
    const userFigureId = segments[2];
    if (!userFigureId) {
      return jsonResponse({ message: "User figure id is required." }, 400);
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ message: "Invalid JSON body." }, 400);
    }
    if (!payload || Array.isArray(payload)) {
      return jsonResponse({ message: "Invalid JSON body." }, 400);
    }

    const updates: Record<string, unknown> = {};

    if ("status" in payload) {
      if (!isUserFigureStatus(payload.status)) {
        return jsonResponse({ message: "Invalid status." }, 400);
      }
      updates.status = payload.status;
    }

    if ("condition" in payload) {
      if (payload.condition !== null && !isUserFigureCondition(payload.condition)) {
        return jsonResponse({ message: "Invalid condition." }, 400);
      }
      updates.condition = payload.condition;
    }

    if ("purchase_price" in payload) {
      const parsed = parseNumeric(payload.purchase_price);
      if (!parsed.ok) {
        return jsonResponse({ message: "Invalid purchase_price." }, 400);
      }
      updates.purchase_price = parsed.value;
    }

    if ("purchase_currency" in payload) {
      if (
        payload.purchase_currency !== null &&
        payload.purchase_currency !== undefined &&
        typeof payload.purchase_currency !== "string"
      ) {
        return jsonResponse({ message: "Invalid purchase_currency." }, 400);
      }
      updates.purchase_currency = payload.purchase_currency ?? null;
    }

    if ("purchase_date" in payload) {
      if (
        payload.purchase_date !== null &&
        payload.purchase_date !== undefined &&
        (typeof payload.purchase_date !== "string" ||
          !DATE_ONLY_REGEX.test(payload.purchase_date))
      ) {
        return jsonResponse({ message: "Invalid purchase_date." }, 400);
      }
      updates.purchase_date = payload.purchase_date ?? null;
    }

    if ("notes" in payload) {
      if (payload.notes !== null && payload.notes !== undefined && typeof payload.notes !== "string") {
        return jsonResponse({ message: "Invalid notes." }, 400);
      }
      updates.notes = payload.notes ?? null;
    }

    if ("photo_refs" in payload) {
      if (
        payload.photo_refs !== null &&
        payload.photo_refs !== undefined &&
        (!Array.isArray(payload.photo_refs) ||
          payload.photo_refs.some((value) => typeof value !== "string"))
      ) {
        return jsonResponse({ message: "Invalid photo_refs." }, 400);
      }
      updates.photo_refs = payload.photo_refs ?? null;
    }

    if (!Object.keys(updates).length) {
      return jsonResponse({ message: "No valid fields to update." }, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_figures")
      .update(updates)
      .eq("id", userFigureId)
      .eq("user_id", user.id)
      .select(USER_FIGURE_SELECT_FIELDS)
      .maybeSingle();
    if (error) {
      return jsonResponse({ message: error.message }, 500);
    }
    if (!data) {
      return jsonResponse({ message: "User figure not found." }, 404);
    }

    return jsonResponse(normalizeUserFigure(data as Record<string, unknown>));
  }

  if (path.startsWith("/v1/user-figures/") && req.method === "DELETE") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createAuthedClient(supabaseUrl, supabaseAnonKey, authHeader);
    const { user, error: authError } = await requireUser(supabase);
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const segments = path.split("/").filter(Boolean);
    const userFigureId = segments[2];
    if (!userFigureId) {
      return jsonResponse({ message: "User figure id is required." }, 400);
    }

    const { error } = await supabase
      .from("user_figures")
      .delete()
      .eq("id", userFigureId)
      .eq("user_id", user.id);
    if (error) {
      return jsonResponse({ message: error.message }, 500);
    }

    return jsonResponse({ success: true });
  }

  if (path === "/v1/goals/active/progress" && req.method === "GET") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createAuthedClient(supabaseUrl, supabaseAnonKey, authHeader);
    const { user, error: authError } = await requireUser(supabase);
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    let goal: Record<string, unknown> | null = null;
    try {
      goal = await ensureActiveGoal(supabase, user.id);
    } catch (error) {
      return jsonResponse(
        { message: error instanceof Error ? error.message : "Failed to load goal." },
        500
      );
    }

    if (!goal) {
      return jsonResponse({ message: "No goal template configured." }, 404);
    }

    let progress;
    try {
      progress = await computeGoalProgress(supabase, user.id, goal);
    } catch (error) {
      return jsonResponse(
        { message: error instanceof Error ? error.message : "Failed to compute progress." },
        500
      );
    }

    const totalCount = progress.total;
    const ownedCount = progress.owned;
    const percent =
      totalCount > 0 ? Math.round((ownedCount / totalCount) * 1000) / 10 : 0;
    const target = progress.target;
    if (!target) {
      return jsonResponse({ message: "Goal target is missing." }, 500);
    }

    return jsonResponse({
      goal: {
        id: goal.id,
        user_id: goal.user_id ?? null,
        name: goal.name,
        target,
        progress_rule: isGoalProgressRule(goal.progress_rule)
          ? goal.progress_rule
          : "OWNED_COUNT",
        is_active: Boolean(goal.is_active),
        is_template: Boolean(goal.is_template),
        created_at: goal.created_at,
        updated_at: goal.updated_at,
      },
      progress: {
        owned_count: ownedCount,
        total_count: totalCount,
        percent_complete: percent,
      },
    });
  }

  if (path === "/v1/push/register" && req.method === "POST") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    let payload: { expo_push_token?: string; device_id?: string } | null = null;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ message: "Invalid JSON body." }, 400);
    }

    const expoPushToken = payload?.expo_push_token?.trim();
    if (!expoPushToken) {
      return jsonResponse({ message: "expo_push_token is required." }, 400);
    }

    const now = new Date().toISOString();
    const record = {
      user_id: user.id,
      expo_push_token: expoPushToken,
      device_id: payload?.device_id ?? null,
      updated_at: now,
      last_seen_at: now,
    };

    const onConflict = record.device_id
      ? "user_id,device_id"
      : "expo_push_token";

    const { error: upsertError } = await supabase
      .from("push_tokens")
      .upsert(record, { onConflict });

    if (upsertError) {
      return jsonResponse({ message: upsertError.message }, 500);
    }

    return jsonResponse({ success: true });
  }

  if (path === "/v1/scan/lookup" && req.method === "POST") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    let payload: { barcode?: string; symbology?: string; locale?: string } | null = null;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ message: "Invalid JSON body." }, 400);
    }

    const barcode = payload?.barcode?.trim();
    if (!barcode) {
      return jsonResponse({ message: "barcode is required." }, 400);
    }

    const lookupTtlHours = Number(
      Deno.env.get("SCAN_LOOKUP_CACHE_HOURS") || DEFAULT_LOOKUP_TTL_HOURS
    );
    const providerTtlHours = Number(
      Deno.env.get("SCAN_PROVIDER_CACHE_HOURS") || DEFAULT_PROVIDER_TTL_HOURS
    );

    const supabase = createClient(supabaseUrl, supabaseKey);
    const result = await resolveScanLookup(
      supabase,
      barcode,
      lookupTtlHours,
      providerTtlHours
    );

    return jsonResponse(result);
  }

  return jsonResponse({ message: "Not found." }, 404);
});
