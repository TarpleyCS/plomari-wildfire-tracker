import { z } from "zod";

import { deepFreeze, type DeepReadonly } from "../immutability";
import {
  CONTRACT_VERSION,
  LEGACY_CONTRACT_VERSION,
} from "./constants";
import {
  errorClassSchema,
  ingestionStatusSchema,
  sha256Schema,
  sourceKeySchema,
  targetedIngestionRunSchema,
  utcInstantSchema,
  uuidV7Schema,
  versionSchema,
  type TargetedIngestionRun,
} from "./schemas";

export const LEGACY_V10_INGESTION_UPGRADE_ADAPTER =
  "legacy-v1.0-ingestion-run-to-v1.1-targeted-v1" as const;

/** Exact unversioned ingestion shape emitted before contract envelopes. */
export const legacyV10IngestionRunSchema = z.strictObject({
  id: uuidV7Schema,
  sourceKey: sourceKeySchema,
  startedAt: utcInstantSchema,
  finishedAt: utcInstantSchema.nullable(),
  status: ingestionStatusSchema,
  httpStatus: z.number().int().min(100).max(599).nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  payloadHash: sha256Schema.nullable(),
  rawObjectKey: z.string().min(1).max(1_024).nullable(),
  itemCount: z.number().int().nonnegative(),
  errorClass: errorClassSchema.nullable(),
  errorDetailSafe: z.string().min(1).max(1_000).nullable(),
  collectorVersion: versionSchema,
});

export type LegacyV10IngestionUpgrade = DeepReadonly<{
  sourceContractVersion: typeof LEGACY_CONTRACT_VERSION;
  targetContractVersion: typeof CONTRACT_VERSION;
  adapter: typeof LEGACY_V10_INGESTION_UPGRADE_ADAPTER;
  legacySourceKey: string;
  value: TargetedIngestionRun;
}>;

/**
 * Explicit migration boundary for unversioned v1.0 runs. The returned wrapper
 * preserves original version/key provenance instead of silently relabeling it.
 */
export function upgradeLegacyV10IngestionRun(
  input: unknown,
  context: {
    readonly collectionTargetId: string;
    readonly collectionTargetRevisionId: string;
  },
): LegacyV10IngestionUpgrade {
  const legacy = legacyV10IngestionRunSchema.parse(input);
  const value = targetedIngestionRunSchema.parse({
    contractVersion: CONTRACT_VERSION,
    id: legacy.id,
    collectionTargetId: context.collectionTargetId,
    collectionTargetRevisionId: context.collectionTargetRevisionId,
    startedAt: legacy.startedAt,
    finishedAt: legacy.finishedAt,
    status: legacy.status,
    httpStatus: legacy.httpStatus,
    latencyMs: legacy.latencyMs,
    payloadHash: legacy.payloadHash,
    rawObjectKey: legacy.rawObjectKey,
    itemCount: legacy.itemCount,
    errorClass: legacy.errorClass,
    errorDetailSafe: legacy.errorDetailSafe,
    collectorVersion: legacy.collectorVersion,
  });

  return deepFreeze({
    sourceContractVersion: LEGACY_CONTRACT_VERSION,
    targetContractVersion: CONTRACT_VERSION,
    adapter: LEGACY_V10_INGESTION_UPGRADE_ADAPTER,
    legacySourceKey: legacy.sourceKey,
    value,
  });
}
