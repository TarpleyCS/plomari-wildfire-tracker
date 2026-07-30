import { createHash } from "node:crypto";

import {
  FIRMS_COORDINATE_IDENTITY_DECIMALS,
  FIRMS_PASS_GAP_MINUTES,
  IDENTITY_ALGORITHM_VERSION,
} from "./constants";
import type {
  IdentityAlgorithmVersion,
  IsoDateTime,
  JsonValue,
} from "./schemas";

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertCurrentIdentityAlgorithm(
  version: IdentityAlgorithmVersion,
): asserts version is typeof IDENTITY_ALGORITHM_VERSION {
  if (version !== IDENTITY_ALGORITHM_VERSION) {
    throw new TypeError(
      `Identity algorithm ${version} is read-only; stored hashes must not be recomputed`,
    );
  }
}

function canonicalizeJson(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON cannot contain non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => compareCodeUnits(left, right))
    .map(
      ([key, entry]) =>
        `${JSON.stringify(key)}:${canonicalizeJson(entry as JsonValue)}`,
    )
    .join(",")}}`;
}

export function stableJsonStringify(
  value: JsonValue,
  identityAlgorithmVersion: IdentityAlgorithmVersion,
): string {
  assertCurrentIdentityAlgorithm(identityAlgorithmVersion);
  return canonicalizeJson(value);
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashJson(
  value: JsonValue,
  identityAlgorithmVersion: IdentityAlgorithmVersion,
): string {
  return sha256Text(stableJsonStringify(value, identityAlgorithmVersion));
}

export function normalizeCanonicalUrl(
  value: string,
  identityAlgorithmVersion: IdentityAlgorithmVersion,
): string {
  assertCurrentIdentityAlgorithm(identityAlgorithmVersion);
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new TypeError("Canonical source URLs must use HTTPS");
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/$/, "");
  }

  const sortedParameters = [...url.searchParams.entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      compareCodeUnits(leftKey, rightKey) ||
      compareCodeUnits(leftValue, rightValue),
  );
  url.search = "";
  sortedParameters.forEach(([key, entry]) => url.searchParams.append(key, entry));

  return url.toString();
}

export type SourceItemIdentityInput = {
  readonly identityAlgorithmVersion: IdentityAlgorithmVersion;
  readonly sourceEndpointId: string;
  readonly externalId: string | null;
  readonly canonicalUrl: string | null;
  readonly sensorNaturalKey: string | null;
  readonly normalizedTimestamp: string | null;
  readonly payloadHash: string;
};

export function sourceItemSemanticKey(
  input: SourceItemIdentityInput,
): string {
  assertCurrentIdentityAlgorithm(input.identityAlgorithmVersion);
  if (input.externalId) {
    return `${input.identityAlgorithmVersion}|${input.sourceEndpointId}|external|${input.externalId.trim()}`;
  }
  if (input.canonicalUrl) {
    return `${input.identityAlgorithmVersion}|${input.sourceEndpointId}|url|${normalizeCanonicalUrl(
      input.canonicalUrl,
      input.identityAlgorithmVersion,
    )}`;
  }
  if (input.sensorNaturalKey) {
    return `${input.identityAlgorithmVersion}|${input.sourceEndpointId}|sensor|${input.sensorNaturalKey}`;
  }
  return [
    input.identityAlgorithmVersion,
    input.sourceEndpointId,
    "fallback",
    input.normalizedTimestamp ?? "unknown-time",
    input.payloadHash,
  ].join("|");
}

/** @deprecated Compatibility identity for the combined v1 source registry. */
export function legacySourceItemSemanticKey(input: {
  readonly identityAlgorithmVersion: IdentityAlgorithmVersion;
  readonly sourceKey: string;
  readonly externalId: string | null;
  readonly canonicalUrl: string | null;
  readonly sensorNaturalKey: string | null;
  readonly normalizedTimestamp: string | null;
  readonly payloadHash: string;
}): string {
  return sourceItemSemanticKey({
    ...input,
    sourceEndpointId: input.sourceKey,
  });
}

export type FirmsDetectionIdentityInput = {
  readonly identityAlgorithmVersion: IdentityAlgorithmVersion;
  readonly product: string;
  readonly satellite: string;
  readonly observedAt: IsoDateTime;
  readonly latitude: number;
  readonly longitude: number;
  readonly scanKm: number | null;
  readonly trackKm: number | null;
};

function fixedIdentityNumber(
  value: number | null,
  decimals: number,
): string {
  if (value === null) return "null";
  if (!Number.isFinite(value)) {
    throw new TypeError("Identity inputs must be finite numbers");
  }
  return value.toFixed(decimals);
}

export function firmsDetectionNaturalKey(
  detection: FirmsDetectionIdentityInput,
): string {
  assertCurrentIdentityAlgorithm(detection.identityAlgorithmVersion);
  return [
    detection.identityAlgorithmVersion,
    detection.product.trim().toLowerCase(),
    detection.satellite.trim().toLowerCase(),
    detection.observedAt,
    fixedIdentityNumber(
      detection.latitude,
      FIRMS_COORDINATE_IDENTITY_DECIMALS,
    ),
    fixedIdentityNumber(
      detection.longitude,
      FIRMS_COORDINATE_IDENTITY_DECIMALS,
    ),
    fixedIdentityNumber(detection.scanKm, 3),
    fixedIdentityNumber(detection.trackKm, 3),
  ].join("|");
}

function firmsDetectionDeterministicSortKey(
  detection: FirmsDetectionIdentityInput,
): string {
  return stableJsonStringify(
    {
      identityAlgorithmVersion: detection.identityAlgorithmVersion,
      product: detection.product,
      satellite: detection.satellite,
      observedAt: detection.observedAt,
      latitude: detection.latitude,
      longitude: detection.longitude,
      scanKm: detection.scanKm,
      trackKm: detection.trackKm,
    },
    detection.identityAlgorithmVersion,
  );
}

export type FirmsPass = {
  readonly product: string;
  readonly satellite: string;
  readonly passStart: IsoDateTime;
  readonly detections: readonly FirmsDetectionIdentityInput[];
  readonly naturalKey: string;
};

export function firmsPassNaturalKey(
  product: string,
  satellite: string,
  passStart: IsoDateTime,
  identityAlgorithmVersion: IdentityAlgorithmVersion,
): string {
  assertCurrentIdentityAlgorithm(identityAlgorithmVersion);
  return [
    identityAlgorithmVersion,
    product.trim().toLowerCase(),
    satellite.trim().toLowerCase(),
    passStart,
  ].join("|");
}

export function groupFirmsDetectionsIntoPasses(
  detections: readonly FirmsDetectionIdentityInput[],
): readonly FirmsPass[] {
  const groupedByPlatform = new Map<
    string,
    FirmsDetectionIdentityInput[]
  >();

  detections.forEach((detection) => {
    const key = `${detection.product.trim().toLowerCase()}|${detection.satellite
      .trim()
      .toLowerCase()}`;
    const group = groupedByPlatform.get(key) ?? [];
    group.push(detection);
    groupedByPlatform.set(key, group);
  });

  const maximumGapMs = FIRMS_PASS_GAP_MINUTES * 60 * 1_000;
  const passes: FirmsPass[] = [];

  [...groupedByPlatform.keys()].sort(compareCodeUnits).forEach((platformKey) => {
    const platformDetections = groupedByPlatform.get(platformKey);
    if (!platformDetections) return;
    const sorted = [...platformDetections].sort(
      (left, right) =>
        Date.parse(left.observedAt) - Date.parse(right.observedAt) ||
        compareCodeUnits(
          firmsDetectionNaturalKey(left),
          firmsDetectionNaturalKey(right),
        ) ||
        compareCodeUnits(
          firmsDetectionDeterministicSortKey(left),
          firmsDetectionDeterministicSortKey(right),
        ),
    );
    let current: FirmsDetectionIdentityInput[] = [];

    const commitCurrent = () => {
      const first = current[0];
      if (first === undefined) return;
      passes.push({
        product: first.product,
        satellite: first.satellite,
        passStart: first.observedAt,
        detections: current,
        naturalKey: firmsPassNaturalKey(
          first.product,
          first.satellite,
          first.observedAt,
          first.identityAlgorithmVersion,
        ),
      });
      current = [];
    };

    sorted.forEach((detection) => {
      const previous = current[current.length - 1];
      if (
        previous &&
        Date.parse(detection.observedAt) - Date.parse(previous.observedAt) >
          maximumGapMs
      ) {
        commitCurrent();
      }
      current.push(detection);
    });
    commitCurrent();
  });

  return passes.sort(
    (left, right) =>
      Date.parse(left.passStart) - Date.parse(right.passStart) ||
      compareCodeUnits(left.naturalKey, right.naturalKey),
  );
}

export type RevisionDecision =
  | { readonly kind: "identical"; readonly nextVersionNumber: null }
  | { readonly kind: "correction"; readonly nextVersionNumber: number }
  | {
      readonly kind: "identity_rebaseline";
      readonly nextVersionNumber: number;
      readonly priorIdentityAlgorithmVersion: IdentityAlgorithmVersion;
      readonly nextIdentityAlgorithmVersion: IdentityAlgorithmVersion;
    };

export function decideSourceRevision(
  previous: {
    readonly versionNumber: number;
    readonly contentHash: string;
    readonly identityAlgorithmVersion: IdentityAlgorithmVersion;
  },
  next: {
    readonly contentHash: string;
    readonly identityAlgorithmVersion: IdentityAlgorithmVersion;
  },
): RevisionDecision {
  if (previous.identityAlgorithmVersion !== next.identityAlgorithmVersion) {
    return {
      kind: "identity_rebaseline",
      nextVersionNumber: previous.versionNumber + 1,
      priorIdentityAlgorithmVersion: previous.identityAlgorithmVersion,
      nextIdentityAlgorithmVersion: next.identityAlgorithmVersion,
    };
  }
  if (previous.contentHash === next.contentHash) {
    return { kind: "identical", nextVersionNumber: null };
  }
  return {
    kind: "correction",
    nextVersionNumber: previous.versionNumber + 1,
  };
}
