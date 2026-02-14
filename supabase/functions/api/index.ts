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
