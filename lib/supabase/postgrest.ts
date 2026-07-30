import { Buffer } from "node:buffer";

import { z } from "zod";

import {
  readSupabaseServerEnvironment,
  type SupabaseServerEnvironment,
} from "./server-env";

const apiResourceSchema = z.enum(["source_catalog", "source_health"]);
const timeoutSchema = z.number().int().min(1).max(10_000);

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 512_000;

export type SupabaseApiResource = z.infer<typeof apiResourceSchema>;
export type SupabasePostgrestReadErrorCode =
  | "timeout"
  | "unavailable"
  | "invalid_response";

export class SupabasePostgrestReadError extends Error {
  constructor(readonly code: SupabasePostgrestReadErrorCode) {
    super(
      code === "timeout"
        ? "Supabase Data API read timed out."
        : code === "unavailable"
          ? "Supabase Data API read is unavailable."
          : "Supabase Data API returned an invalid response.",
    );
    this.name = "SupabasePostgrestReadError";
  }
}

export type PostgrestReadOptions = Readonly<{
  environment?: SupabaseServerEnvironment;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}>;

type ReadPostgrestRowsInput<Schema extends z.ZodType> =
  PostgrestReadOptions &
    Readonly<{
      resource: SupabaseApiResource;
      query: Readonly<Record<string, string>>;
      rowSchema: Schema;
    }>;

export async function readPostgrestRows<Schema extends z.ZodType>(
  input: ReadPostgrestRowsInput<Schema>,
): Promise<Array<z.output<Schema>>> {
  const resource = apiResourceSchema.parse(input.resource);
  const timeoutMs = timeoutSchema.parse(input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const environment =
    input.environment ?? readSupabaseServerEnvironment();
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const endpoint = new URL(`/rest/v1/${resource}`, environment.url);

  Object.entries(input.query).forEach(([name, value]) => {
    endpoint.searchParams.set(name, value);
  });

  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Profile": "api",
        apikey: environment.publishableKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new SupabasePostgrestReadError("unavailable");
    }

    const declaredBytes = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > MAX_RESPONSE_BYTES
    ) {
      throw new SupabasePostgrestReadError("invalid_response");
    }

    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
      throw new SupabasePostgrestReadError("invalid_response");
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(body);
    } catch {
      throw new SupabasePostgrestReadError("invalid_response");
    }

    const rows = z.array(input.rowSchema).safeParse(decoded);
    if (!rows.success) {
      throw new SupabasePostgrestReadError("invalid_response");
    }

    return rows.data;
  } catch (error) {
    if (error instanceof SupabasePostgrestReadError) throw error;
    if (controller.signal.aborted) {
      throw new SupabasePostgrestReadError("timeout");
    }
    throw new SupabasePostgrestReadError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
