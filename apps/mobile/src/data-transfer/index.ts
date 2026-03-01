import type { UserFigureCondition, UserFigureStatus } from "@force-collector/shared";
import { supabase } from "../auth/supabase";

const VALID_STATUSES: UserFigureStatus[] = ["OWNED", "WISHLIST", "PREORDER", "SOLD"];
const VALID_CONDITIONS: UserFigureCondition[] = ["MINT", "OPENED", "LOOSE", "UNKNOWN"];
const EXPORT_VERSION = 1;

const EXPORT_COLUMNS = [
  "user_figure_id",
  "figure_id",
  "figure_upc",
  "figure_name",
  "figure_series",
  "figure_edition",
  "figure_release_year",
  "status",
  "condition",
  "purchase_price",
  "purchase_currency",
  "purchase_date",
  "notes",
  "photo_refs",
  "custom_figure_payload",
  "updated_at",
] as const;

type ExportColumn = (typeof EXPORT_COLUMNS)[number];

type FigureLookup = {
  id: string;
  upc: string | null;
  name: string;
  series: string | null;
  edition: string | null;
  release_year: number | null;
};

type UserFigureRow = {
  id: string;
  figure_id: string | null;
  status: UserFigureStatus;
  condition: UserFigureCondition;
  purchase_price: number | null;
  purchase_currency: string | null;
  purchase_date: string | null;
  notes: string | null;
  photo_refs: string[] | null;
  custom_figure_payload: Record<string, unknown> | null;
  updated_at: string;
};

export type ExportItem = {
  user_figure_id: string;
  figure_id: string | null;
  figure_upc: string | null;
  figure_name: string | null;
  figure_series: string | null;
  figure_edition: string | null;
  figure_release_year: number | null;
  status: UserFigureStatus;
  condition: UserFigureCondition;
  purchase_price: number | null;
  purchase_currency: string | null;
  purchase_date: string | null;
  notes: string | null;
  photo_refs: string[] | null;
  custom_figure_payload: Record<string, unknown> | null;
  updated_at: string;
};

export type ExportPayload = {
  version: number;
  exported_at: string;
  source: "force-collector";
  items: ExportItem[];
};

export type ExportFormat = "json" | "csv";

export type ImportInputRow = {
  source_row: number;
  figure_id: string | null;
  figure_upc: string | null;
  figure_name: string | null;
  figure_series: string | null;
  status: UserFigureStatus;
  condition: UserFigureCondition;
  purchase_price: number | null;
  purchase_currency: string | null;
  purchase_date: string | null;
  notes: string | null;
  photo_refs: string[] | null;
  custom_figure_payload: Record<string, unknown> | null;
};

export type ImportAction =
  | "update_existing"
  | "create_with_figure"
  | "create_custom"
  | "skip";

export type ImportPreviewItem = {
  source_row: number;
  figure_name: string | null;
  figure_upc: string | null;
  status: UserFigureStatus;
  action: ImportAction;
  reason: string;
  matched_figure: FigureLookup | null;
  existing_user_figure_id: string | null;
  import_row: ImportInputRow;
};

export type ImportPreview = {
  rows: ImportPreviewItem[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    will_create: number;
    will_update: number;
    will_create_custom: number;
    will_skip: number;
  };
};

export type ImportApplyResult = {
  created: number;
  updated: number;
  created_custom: number;
  skipped: number;
  errors: Array<{ source_row: number; message: string }>;
};

type MatchResult = {
  figure: FigureLookup | null;
  reason: string;
};

function isUuid(value: string | null | undefined) {
  if (!value) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeStatus(value: unknown): UserFigureStatus {
  if (typeof value !== "string") {
    return "OWNED";
  }
  const normalized = value.toUpperCase().trim() as UserFigureStatus;
  return VALID_STATUSES.includes(normalized) ? normalized : "OWNED";
}

function normalizeCondition(value: unknown): UserFigureCondition {
  if (typeof value !== "string") {
    return "UNKNOWN";
  }
  const normalized = value.toUpperCase().trim() as UserFigureCondition;
  return VALID_CONDITIONS.includes(normalized) ? normalized : "UNKNOWN";
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizePhotoRefs(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const refs = value.filter((entry): entry is string => typeof entry === "string");
    return refs.length ? refs : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const refs = parsed.filter((entry): entry is string => typeof entry === "string");
        return refs.length ? refs : null;
      }
    } catch {
      return trimmed
        .split("|")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return null;
}

function normalizeCustomPayload(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeTextForKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeUpc(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/[^0-9]/g, "");
}

function buildCustomKey(payload: Record<string, unknown> | null) {
  if (!payload) {
    return "";
  }
  const name =
    normalizeTextForKey(payload.name) ||
    normalizeTextForKey(payload.figure_name) ||
    normalizeTextForKey(payload.title);
  const upc = normalizeUpc(payload.upc) || normalizeUpc(payload.figure_upc);
  if (!name && !upc) {
    return "";
  }
  return `${name}|${upc}`;
}

function csvEscape(value: string) {
  if (!value.includes(",") && !value.includes("\"") && !value.includes("\n")) {
    return value;
  }
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function serializeCsv(items: ExportItem[]) {
  const header = EXPORT_COLUMNS.join(",");
  const lines = items.map((item) => {
    const fields = EXPORT_COLUMNS.map((column) => {
      const value = item[column];
      if (value === null || value === undefined) {
        return "";
      }
      if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        return csvEscape(JSON.stringify(value));
      }
      return csvEscape(String(value));
    });
    return fields.join(",");
  });
  return [header, ...lines].join("\n");
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function rowFromUnknown(raw: Record<string, unknown>, sourceRow: number): ImportInputRow {
  const figureId = normalizeNullableString(raw.figure_id ?? raw["figureId"]);
  const figureUpc = normalizeNullableString(raw.figure_upc ?? raw["figureUpc"] ?? raw.upc);
  const figureName = normalizeNullableString(raw.figure_name ?? raw["figureName"] ?? raw.name);
  const figureSeries = normalizeNullableString(
    raw.figure_series ?? raw["figureSeries"] ?? raw.series
  );

  return {
    source_row: sourceRow,
    figure_id: figureId,
    figure_upc: figureUpc,
    figure_name: figureName,
    figure_series: figureSeries,
    status: normalizeStatus(raw.status),
    condition: normalizeCondition(raw.condition),
    purchase_price: normalizePrice(raw.purchase_price ?? raw["purchasePrice"]),
    purchase_currency: normalizeNullableString(
      raw.purchase_currency ?? raw["purchaseCurrency"]
    ),
    purchase_date: normalizeDate(raw.purchase_date ?? raw["purchaseDate"]),
    notes: normalizeNullableString(raw.notes),
    photo_refs: normalizePhotoRefs(raw.photo_refs ?? raw["photoRefs"]),
    custom_figure_payload: normalizeCustomPayload(
      raw.custom_figure_payload ?? raw["customFigurePayload"]
    ),
  };
}

function parseJsonRows(content: string): ImportInputRow[] {
  const parsed = JSON.parse(content) as unknown;
  const records = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "items" in parsed
      ? (parsed as { items?: unknown }).items
      : null;

  if (!Array.isArray(records)) {
    throw new Error("JSON file must be an array or an object with an items array.");
  }

  return records
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry, index) => rowFromUnknown(entry, index + 1));
}

function parseCsvRows(content: string): ImportInputRow[] {
  const rows = parseCsv(content);
  if (!rows.length) {
    return [];
  }

  const header = rows[0].map((value) => value.trim());
  const entries = rows.slice(1).filter((row) => row.some((value) => value.trim().length > 0));

  return entries.map((values, index) => {
    const record: Record<string, unknown> = {};
    header.forEach((column, columnIndex) => {
      record[column] = values[columnIndex] ?? "";
    });
    return rowFromUnknown(record, index + 2);
  });
}

export async function buildExportPayload(userId: string): Promise<ExportPayload> {
  const { data: userFigures, error: userFiguresError } = await supabase
    .from("user_figures")
    .select(
      "id,figure_id,status,condition,purchase_price,purchase_currency,purchase_date,notes,photo_refs,custom_figure_payload,updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (userFiguresError) {
    throw new Error(userFiguresError.message);
  }

  const rows = (userFigures ?? []) as UserFigureRow[];
  const figureIds = Array.from(
    new Set(
      rows
        .map((row) => row.figure_id)
        .filter((figureId): figureId is string => typeof figureId === "string")
    )
  );

  const figureMap = new Map<string, FigureLookup>();
  if (figureIds.length > 0) {
    const { data: figures, error: figuresError } = await supabase
      .from("figures")
      .select("id,upc,name,series,edition,release_year")
      .in("id", figureIds);
    if (figuresError) {
      throw new Error(figuresError.message);
    }
    for (const figure of (figures ?? []) as FigureLookup[]) {
      figureMap.set(figure.id, figure);
    }
  }

  const items: ExportItem[] = rows.map((row) => {
    const figure = row.figure_id ? figureMap.get(row.figure_id) ?? null : null;
    return {
      user_figure_id: row.id,
      figure_id: row.figure_id,
      figure_upc: figure?.upc ?? null,
      figure_name: figure?.name ?? normalizeNullableString(row.custom_figure_payload?.name) ?? null,
      figure_series:
        figure?.series ??
        normalizeNullableString(row.custom_figure_payload?.series) ??
        null,
      figure_edition: figure?.edition ?? null,
      figure_release_year: figure?.release_year ?? null,
      status: row.status,
      condition: row.condition,
      purchase_price: row.purchase_price,
      purchase_currency: row.purchase_currency,
      purchase_date: row.purchase_date,
      notes: row.notes,
      photo_refs: row.photo_refs ?? null,
      custom_figure_payload: row.custom_figure_payload ?? null,
      updated_at: row.updated_at,
    };
  });

  return {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    source: "force-collector",
    items,
  };
}

export function exportPayloadToContent(payload: ExportPayload, format: ExportFormat) {
  if (format === "json") {
    return JSON.stringify(payload, null, 2);
  }
  return serializeCsv(payload.items);
}

export function parseImportRows(content: string, extensionOrMime: string): ImportInputRow[] {
  const lower = extensionOrMime.toLowerCase();
  if (lower.includes("json") || lower.endsWith(".json")) {
    return parseJsonRows(content);
  }
  if (lower.includes("csv") || lower.endsWith(".csv")) {
    return parseCsvRows(content);
  }

  try {
    return parseJsonRows(content);
  } catch {
    return parseCsvRows(content);
  }
}

async function matchByFigureId(figureId: string): Promise<MatchResult> {
  const { data, error } = await supabase
    .from("figures")
    .select("id,upc,name,series,edition,release_year")
    .eq("id", figureId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { figure: null, reason: "No catalog match for provided figure_id." };
  }
  return { figure: data as FigureLookup, reason: "Matched by figure_id." };
}

async function matchByUpc(upc: string): Promise<MatchResult> {
  const normalized = normalizeUpc(upc);
  if (!normalized) {
    return { figure: null, reason: "UPC missing." };
  }
  const { data, error } = await supabase
    .from("figures")
    .select("id,upc,name,series,edition,release_year")
    .eq("upc", normalized)
    .limit(5);
  if (error) {
    throw new Error(error.message);
  }
  const matches = (data ?? []) as FigureLookup[];
  if (!matches.length) {
    return { figure: null, reason: "No catalog UPC match." };
  }
  if (matches.length > 1) {
    return { figure: matches[0], reason: "Multiple UPC matches; selected first result." };
  }
  return { figure: matches[0], reason: "Matched by UPC." };
}

function chooseNameMatch(candidates: FigureLookup[], name: string, series: string | null) {
  const normalizedName = normalizeTextForKey(name);
  const normalizedSeries = normalizeTextForKey(series ?? "");

  const exact = candidates.find(
    (item) =>
      normalizeTextForKey(item.name) === normalizedName &&
      (!normalizedSeries || normalizeTextForKey(item.series ?? "") === normalizedSeries)
  );
  if (exact) {
    return exact;
  }

  const seriesFiltered = normalizedSeries
    ? candidates.filter(
        (item) => normalizeTextForKey(item.series ?? "") === normalizedSeries
      )
    : candidates;

  return seriesFiltered[0] ?? candidates[0] ?? null;
}

async function matchByName(name: string, series: string | null): Promise<MatchResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { figure: null, reason: "Name missing." };
  }
  const { data, error } = await supabase
    .from("figures")
    .select("id,upc,name,series,edition,release_year")
    .ilike("name", `%${trimmedName}%`)
    .limit(10);
  if (error) {
    throw new Error(error.message);
  }
  const matches = (data ?? []) as FigureLookup[];
  if (!matches.length) {
    return { figure: null, reason: "No catalog name match." };
  }
  const selected = chooseNameMatch(matches, trimmedName, series);
  if (!selected) {
    return { figure: null, reason: "No name candidate selected." };
  }
  if (matches.length > 1) {
    return { figure: selected, reason: "Matched by name heuristic." };
  }
  return { figure: selected, reason: "Matched by name." };
}

export async function buildImportPreview(
  userId: string,
  rows: ImportInputRow[]
): Promise<ImportPreview> {
  const { data: existingRows, error: existingError } = await supabase
    .from("user_figures")
    .select("id,figure_id,custom_figure_payload")
    .eq("user_id", userId);
  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByFigureId = new Map<string, string>();
  const existingCustomByKey = new Map<string, string>();
  for (const row of (existingRows ?? []) as Array<{
    id: string;
    figure_id: string | null;
    custom_figure_payload: Record<string, unknown> | null;
  }>) {
    if (row.figure_id) {
      existingByFigureId.set(row.figure_id, row.id);
    }
    const customKey = buildCustomKey(row.custom_figure_payload ?? null);
    if (customKey) {
      existingCustomByKey.set(customKey, row.id);
    }
  }

  const matchCache = new Map<string, MatchResult>();
  const previewRows: ImportPreviewItem[] = [];
  let matched = 0;
  let unmatched = 0;
  let willCreate = 0;
  let willUpdate = 0;
  let willCreateCustom = 0;
  let willSkip = 0;

  for (const row of rows) {
    const cacheKey = `${row.figure_id ?? ""}|${row.figure_upc ?? ""}|${row.figure_name ?? ""}|${
      row.figure_series ?? ""
    }`;

    let match = matchCache.get(cacheKey) ?? null;
    if (!match) {
      if (row.figure_id && isUuid(row.figure_id)) {
        match = await matchByFigureId(row.figure_id);
      }
      if ((!match || !match.figure) && row.figure_upc) {
        match = await matchByUpc(row.figure_upc);
      }
      if ((!match || !match.figure) && row.figure_name) {
        match = await matchByName(row.figure_name, row.figure_series);
      }
      if (!match) {
        match = { figure: null, reason: "No usable figure identifiers in row." };
      }
      matchCache.set(cacheKey, match);
    }

    if (match.figure) {
      matched += 1;
      const existingId = existingByFigureId.get(match.figure.id) ?? null;
      if (existingId) {
        willUpdate += 1;
        previewRows.push({
          source_row: row.source_row,
          figure_name: row.figure_name ?? match.figure.name,
          figure_upc: row.figure_upc ?? match.figure.upc,
          status: row.status,
          action: "update_existing",
          reason: `${match.reason} Existing entry will be updated.`,
          matched_figure: match.figure,
          existing_user_figure_id: existingId,
          import_row: row,
        });
      } else {
        willCreate += 1;
        previewRows.push({
          source_row: row.source_row,
          figure_name: row.figure_name ?? match.figure.name,
          figure_upc: row.figure_upc ?? match.figure.upc,
          status: row.status,
          action: "create_with_figure",
          reason: `${match.reason} New collection entry will be created.`,
          matched_figure: match.figure,
          existing_user_figure_id: null,
          import_row: row,
        });
      }
      continue;
    }

    unmatched += 1;
    const inferredCustomPayload = {
      ...(row.custom_figure_payload ?? {}),
      ...(row.figure_name ? { name: row.figure_name } : {}),
      ...(row.figure_series ? { series: row.figure_series } : {}),
      ...(row.figure_upc ? { upc: row.figure_upc } : {}),
    } as Record<string, unknown>;
    const customKey = buildCustomKey(inferredCustomPayload);
    const existingCustomId = customKey ? existingCustomByKey.get(customKey) ?? null : null;

    if (customKey || row.custom_figure_payload) {
      willCreateCustom += 1;
      if (existingCustomId) {
        willUpdate += 1;
      } else {
        willCreate += 1;
      }
      previewRows.push({
        source_row: row.source_row,
        figure_name: row.figure_name,
        figure_upc: row.figure_upc,
        status: row.status,
        action: "create_custom",
        reason: `${match.reason} Custom figure payload will be ${existingCustomId ? "updated" : "created"}.`,
        matched_figure: null,
        existing_user_figure_id: existingCustomId,
        import_row: {
          ...row,
          custom_figure_payload: inferredCustomPayload,
        },
      });
    } else {
      willSkip += 1;
      previewRows.push({
        source_row: row.source_row,
        figure_name: row.figure_name,
        figure_upc: row.figure_upc,
        status: row.status,
        action: "skip",
        reason: `${match.reason} Row missing enough data to create custom figure.`,
        matched_figure: null,
        existing_user_figure_id: null,
        import_row: row,
      });
    }
  }

  return {
    rows: previewRows,
    summary: {
      total: rows.length,
      matched,
      unmatched,
      will_create: willCreate,
      will_update: willUpdate,
      will_create_custom: willCreateCustom,
      will_skip: willSkip,
    },
  };
}

function buildWritePayload(item: ImportPreviewItem) {
  const row = item.import_row;
  return {
    status: row.status,
    condition: row.condition,
    purchase_price: row.purchase_price,
    purchase_currency: row.purchase_currency,
    purchase_date: row.purchase_date,
    notes: row.notes,
    photo_refs: row.photo_refs,
  };
}

export async function applyImportPreview(
  userId: string,
  preview: ImportPreview
): Promise<ImportApplyResult> {
  const { data: existingRows, error: existingError } = await supabase
    .from("user_figures")
    .select("id,figure_id,custom_figure_payload")
    .eq("user_id", userId);
  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByFigureId = new Map<string, string>();
  const existingCustomByKey = new Map<string, string>();
  for (const row of (existingRows ?? []) as Array<{
    id: string;
    figure_id: string | null;
    custom_figure_payload: Record<string, unknown> | null;
  }>) {
    if (row.figure_id) {
      existingByFigureId.set(row.figure_id, row.id);
    }
    const customKey = buildCustomKey(row.custom_figure_payload ?? null);
    if (customKey) {
      existingCustomByKey.set(customKey, row.id);
    }
  }

  let created = 0;
  let updated = 0;
  let createdCustom = 0;
  let skipped = 0;
  const errors: Array<{ source_row: number; message: string }> = [];

  for (const item of preview.rows) {
    if (item.action === "skip") {
      skipped += 1;
      continue;
    }

    const writePayload = buildWritePayload(item);

    try {
      if (item.action === "update_existing" && item.existing_user_figure_id) {
        const { error } = await supabase
          .from("user_figures")
          .update({
            ...writePayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.existing_user_figure_id)
          .eq("user_id", userId);
        if (error) {
          throw new Error(error.message);
        }
        updated += 1;
        continue;
      }

      if (item.action === "create_with_figure" && item.matched_figure) {
        const existingId =
          item.existing_user_figure_id ??
          existingByFigureId.get(item.matched_figure.id) ??
          null;
        const insertPayload = {
          user_id: userId,
          figure_id: item.matched_figure.id,
          ...writePayload,
          updated_at: new Date().toISOString(),
        };

        if (existingId) {
          const { error } = await supabase
            .from("user_figures")
            .update(insertPayload)
            .eq("id", existingId)
            .eq("user_id", userId);
          if (error) {
            throw new Error(error.message);
          }
          updated += 1;
        } else {
          const { data, error } = await supabase
            .from("user_figures")
            .insert(insertPayload)
            .select("id")
            .maybeSingle();
          if (error) {
            throw new Error(error.message);
          }
          created += 1;
          const insertedId = (data as { id?: string } | null)?.id;
          if (insertedId) {
            existingByFigureId.set(item.matched_figure.id, insertedId);
          }
        }
        continue;
      }

      if (item.action === "create_custom") {
        const customPayload =
          item.import_row.custom_figure_payload ??
          ({
            ...(item.figure_name ? { name: item.figure_name } : {}),
            ...(item.import_row.figure_series ? { series: item.import_row.figure_series } : {}),
            ...(item.figure_upc ? { upc: item.figure_upc } : {}),
          } as Record<string, unknown>);
        const customKey = buildCustomKey(customPayload);
        const existingId =
          item.existing_user_figure_id ??
          (customKey ? existingCustomByKey.get(customKey) ?? null : null);

        const customWritePayload = {
          user_id: userId,
          figure_id: null,
          custom_figure_payload: customPayload,
          ...writePayload,
          updated_at: new Date().toISOString(),
        };

        if (existingId) {
          const { error } = await supabase
            .from("user_figures")
            .update(customWritePayload)
            .eq("id", existingId)
            .eq("user_id", userId);
          if (error) {
            throw new Error(error.message);
          }
          updated += 1;
        } else {
          const { data, error } = await supabase
            .from("user_figures")
            .insert(customWritePayload)
            .select("id")
            .maybeSingle();
          if (error) {
            throw new Error(error.message);
          }
          created += 1;
          const insertedId = (data as { id?: string } | null)?.id;
          if (insertedId && customKey) {
            existingCustomByKey.set(customKey, insertedId);
          }
        }
        createdCustom += 1;
      }
    } catch (error) {
      errors.push({
        source_row: item.source_row,
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  return {
    created,
    updated,
    created_custom: createdCustom,
    skipped,
    errors,
  };
}
