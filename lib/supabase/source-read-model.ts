import { z } from "zod";

import {
  contractVersionSchema,
  errorClassSchema,
  sourceHealthStateSchema,
  sourceKeySchema,
  uuidV7Schema,
} from "../truth/v1";

import {
  readPostgrestRows,
  SupabasePostgrestReadError,
  type PostgrestReadOptions,
} from "./postgrest";

const postgresInstantSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)))
  .transform((value) => new Date(value).toISOString());
const nullablePostgresInstantSchema = postgresInstantSchema.nullable();
const nullableUrlSchema = z.url().nullable();
const intervalSchema = z.string().trim().min(1).max(128);
const nullableRatioSchema = z.number().finite().min(0).max(1).nullable();
const nullableNonnegativeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .safe()
  .nullable();

export const sourceCatalogRowSchema = z.strictObject({
  source_id: uuidV7Schema,
  contract_version: contractVersionSchema,
  provider_id: uuidV7Schema,
  provider_contract_version: contractVersionSchema,
  provider_slug: sourceKeySchema,
  provider_name: z.string().trim().min(1).max(256),
  slug: sourceKeySchema,
  name: z.string().trim().min(1).max(256),
  description: z.string().trim().min(1).max(2_000).nullable(),
  product_family: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  default_trust_class: z.enum([
    "authoritative",
    "official_observation",
    "official_aggregate",
    "modeled",
    "community",
    "inferred",
    "synthetic",
  ]),
  default_evidence_class: z
    .string()
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  operational_scope: z.enum([
    "global_discovery",
    "incident_operations",
    "context",
    "mixed",
  ]),
  homepage_url: nullableUrlSchema,
  terms_url: nullableUrlSchema,
  license_code: z.string().trim().min(1).max(256).nullable(),
  license_name: z.string().trim().min(1).max(256).nullable(),
  attribution_text: z.string().trim().min(1).max(1_000).nullable(),
  license_status: z.enum([
    "unreviewed",
    "approved",
    "restricted",
    "rejected",
  ]),
  commercial_use_allowed: z.boolean().nullable(),
  redistribution_allowed: z.boolean().nullable(),
  default_freshness: intervalSchema,
  default_max_staleness: intervalSchema,
  enabled: z.boolean(),
  updated_at: postgresInstantSchema,
});

export const sourceHealthRowSchema = z.strictObject({
  health_id: uuidV7Schema.nullable(),
  source_id: uuidV7Schema,
  source_slug: sourceKeySchema,
  collection_target_id: uuidV7Schema,
  collection_target_name: z.string().trim().min(1).max(256),
  status: sourceHealthStateSchema,
  circuit_state: z.enum(["closed", "open", "half_open"]).nullable(),
  checked_at: nullablePostgresInstantSchema,
  last_success_at: nullablePostgresInstantSchema,
  last_payload_changed_at: nullablePostgresInstantSchema,
  latest_source_observed_at: nullablePostgresInstantSchema,
  consecutive_failures: nullableNonnegativeIntegerSchema,
  error_class: errorClassSchema.nullable(),
  source_lag: intervalSchema.nullable(),
  fetch_latency_ms: nullableNonnegativeIntegerSchema,
  error_rate: nullableRatioSchema,
  duplicate_ratio: nullableRatioSchema,
  geographic_completeness: nullableRatioSchema,
  schema_failure_count: nullableNonnegativeIntegerSchema,
  rate_limit_resets_at: nullablePostgresInstantSchema,
});

const SOURCE_CATALOG_SELECT = [
  "source_id",
  "contract_version",
  "provider_id",
  "provider_contract_version",
  "provider_slug",
  "provider_name",
  "slug",
  "name",
  "description",
  "product_family",
  "default_trust_class",
  "default_evidence_class",
  "operational_scope",
  "homepage_url",
  "terms_url",
  "license_code",
  "license_name",
  "attribution_text",
  "license_status",
  "commercial_use_allowed",
  "redistribution_allowed",
  "default_freshness",
  "default_max_staleness",
  "enabled",
  "updated_at",
].join(",");

const SOURCE_HEALTH_SELECT = [
  "health_id",
  "source_id",
  "source_slug",
  "collection_target_id",
  "collection_target_name",
  "status",
  "circuit_state",
  "checked_at",
  "last_success_at",
  "last_payload_changed_at",
  "latest_source_observed_at",
  "consecutive_failures",
  "error_class",
  "source_lag",
  "fetch_latency_ms",
  "error_rate",
  "duplicate_ratio",
  "geographic_completeness",
  "schema_failure_count",
  "rate_limit_resets_at",
].join(",");

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const sourceShadowPageInputSchema = z.strictObject({
  after: uuidV7Schema.nullable().default(null),
  limit: z.number().int().min(1).max(100).default(50),
});

export type SourceShadowPageInput = z.input<typeof sourceShadowPageInputSchema>;

export async function readSourceShadowPage(
  input: SourceShadowPageInput = {},
  options: PostgrestReadOptions = {},
) {
  const page = sourceShadowPageInputSchema.parse(input);
  const healthQuery: Record<string, string> = {
    select: SOURCE_HEALTH_SELECT,
    order: "collection_target_id.asc",
    limit: String(page.limit + 1),
  };
  if (page.after) {
    healthQuery.collection_target_id = `gt.${page.after}`;
  }

  const healthRows = await readPostgrestRows({
    ...options,
    resource: "source_health",
    query: healthQuery,
    rowSchema: sourceHealthRowSchema,
  });
  const orderedHealthRows = [...healthRows].sort((left, right) =>
    compareText(left.collection_target_id, right.collection_target_id),
  );
  const hasNextPage = orderedHealthRows.length > page.limit;
  const pageHealthRows = orderedHealthRows.slice(0, page.limit);
  const sourceIds = Array.from(
    new Set(pageHealthRows.map((row) => row.source_id)),
  ).sort(compareText);
  const catalogRows = sourceIds.length
    ? await readPostgrestRows({
        ...options,
        resource: "source_catalog",
        query: {
          select: SOURCE_CATALOG_SELECT,
          source_id: `in.(${sourceIds.join(",")})`,
          order: "source_id.asc",
          limit: String(sourceIds.length),
        },
        rowSchema: sourceCatalogRowSchema,
      })
    : [];
  const catalogById = new Map(
    catalogRows.map((row) => [row.source_id, row] as const),
  );

  const items = pageHealthRows.map((healthRow) => {
    const row = catalogById.get(healthRow.source_id);
    if (!row) {
      throw new SupabasePostgrestReadError("invalid_response");
    }

    return {
      source: {
      id: row.source_id,
      contractVersion: row.contract_version,
      key: row.slug,
      name: row.name,
      description: row.description,
      productFamily: row.product_family,
      defaultTrustClass: row.default_trust_class,
      defaultEvidenceClass: row.default_evidence_class,
      operationalScope: row.operational_scope,
      provider: {
        id: row.provider_id,
        contractVersion: row.provider_contract_version,
        key: row.provider_slug,
        name: row.provider_name,
      },
      links: {
        homepage: row.homepage_url,
        terms: row.terms_url,
      },
      license: {
        code: row.license_code,
        name: row.license_name,
        attribution: row.attribution_text,
        status: row.license_status,
        commercialUseAllowed: row.commercial_use_allowed,
        redistributionAllowed: row.redistribution_allowed,
      },
      freshness: {
        expected: row.default_freshness,
        staleAfter: row.default_max_staleness,
      },
      enabled: row.enabled,
      updatedAt: row.updated_at,
      },
      target: {
        id: healthRow.collection_target_id,
        name: healthRow.collection_target_name,
      },
      health: {
        sampleId: healthRow.health_id,
        state: healthRow.status,
        circuitState: healthRow.circuit_state,
        checkedAt: healthRow.checked_at,
        lastSuccessAt: healthRow.last_success_at,
        lastChangedPayloadAt: healthRow.last_payload_changed_at,
        latestSourceObservedAt: healthRow.latest_source_observed_at,
        consecutiveFailures: healthRow.consecutive_failures,
        errorClass: healthRow.error_class,
        sourceLag: healthRow.source_lag,
        latencyMs: healthRow.fetch_latency_ms,
        errorRate: healthRow.error_rate,
        duplicateRatio: healthRow.duplicate_ratio,
        geographicCompleteness: healthRow.geographic_completeness,
        schemaFailureCount: healthRow.schema_failure_count,
        rateLimitResetsAt: healthRow.rate_limit_resets_at,
      },
    };
  });

  const asOf = items
    .flatMap((item) => [item.source.updatedAt, item.health.checkedAt])
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1) ?? null;
  const lastItem = items.at(-1);

  return {
    schemaVersion: 3 as const,
    mode: "shadow" as const,
    scope: "global-targets" as const,
    asOf,
    items,
    nextAfter:
      hasNextPage && lastItem ? lastItem.target.id : null,
  };
}

export type SourceShadowPage = Awaited<
  ReturnType<typeof readSourceShadowPage>
>;
