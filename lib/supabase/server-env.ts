import { env as processEnvironment } from "node:process";

import { z } from "zod";

const LOCAL_SUPABASE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isServerSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    const secure = url.protocol === "https:";
    const local =
      url.protocol === "http:" && LOCAL_SUPABASE_HOSTS.has(url.hostname);

    return (
      (secure || local) &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

const supabaseServerEnvironmentSchema = z.strictObject({
  SUPABASE_URL: z
    .string()
    .trim()
    .min(1)
    .max(2_048)
    .refine(isServerSupabaseUrl),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(16).max(8_192),
});

export type SupabaseServerEnvironment = Readonly<{
  url: string;
  publishableKey: string;
}>;

export type SupabaseServerEnvironmentInput = Readonly<{
  [name: string]: string | undefined;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
}>;

export class SupabaseServerConfigurationError extends Error {
  readonly code = "supabase_server_unconfigured";

  constructor() {
    super("Supabase server reads are not configured.");
    this.name = "SupabaseServerConfigurationError";
  }
}

/**
 * Reads only server-scoped names. Neither value may use a NEXT_PUBLIC_ alias,
 * and the service-role key is intentionally not part of this contract.
 */
export function readSupabaseServerEnvironment(
  environment: SupabaseServerEnvironmentInput = processEnvironment,
): SupabaseServerEnvironment {
  const parsed = supabaseServerEnvironmentSchema.safeParse({
    SUPABASE_URL: environment.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: environment.SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    throw new SupabaseServerConfigurationError();
  }

  return Object.freeze({
    url: new URL(parsed.data.SUPABASE_URL).origin,
    publishableKey: parsed.data.SUPABASE_PUBLISHABLE_KEY,
  });
}
