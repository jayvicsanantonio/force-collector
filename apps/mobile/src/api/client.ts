import { z } from "zod";
import { env } from "../env";
import { getAuthToken } from "./auth";

export type ApiErrorType =
  | "config"
  | "auth"
  | "network"
  | "http"
  | "validation"
  | "unknown";

export type ApiError = {
  type: ApiErrorType;
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
  cause?: unknown;
};

export type ApiRequestOptions<T> = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  schema: z.ZodType<T>;
  auth?: "required" | "optional";
  headers?: Record<string, string>;
};

function buildError(
  type: ApiErrorType,
  message: string,
  extras?: Omit<ApiError, "type" | "message">
): ApiError {
  return {
    type,
    message,
    ...extras,
  };
}

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
}

export async function apiRequest<T>({
  path,
  method = "GET",
  body,
  schema,
  auth = "optional",
  headers,
}: ApiRequestOptions<T>): Promise<T> {
  if (!env.API_BASE_URL) {
    throw buildError("config", "Missing API_BASE_URL for API requests.");
  }

  const authToken = await getAuthToken();
  if (auth === "required" && !authToken) {
    throw buildError("auth", "Missing auth token for protected request.");
  }

  const resolvedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (authToken) {
    resolvedHeaders.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${env.API_BASE_URL}${path}`, {
      method,
      headers: resolvedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw buildError("network", "Network request failed.", { cause: error });
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : response.statusText) || "Request failed";

    throw buildError("http", message, {
      status: response.status,
      details: payload,
    });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw buildError("validation", "Invalid API response payload.", {
      details: {
        issues: parsed.error.issues,
        path,
      },
    });
  }

  return parsed.data;
}
