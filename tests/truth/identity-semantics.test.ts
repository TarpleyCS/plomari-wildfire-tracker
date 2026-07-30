import { describe, expect, it } from "vitest";

import { getSourceEndpoint } from "../../lib/truth/collection-registry";
import {
  getSourceDefinition,
  SOURCE_REGISTRY,
} from "../../lib/truth/source-registry";
import {
  IDENTITY_ALGORITHM_VERSION,
  LEGACY_IDENTITY_ALGORITHM_VERSION,
  decideSourceRevision,
  endpointBoundSourceItemSchema,
  firmsDetectionNaturalKey,
  globalObservationSchema,
  groupFirmsDetectionsIntoPasses,
  hashJson,
  incidentObservationLinkSchema,
  normalizeCanonicalUrl,
  observationSchema,
  assertionSchema,
  sourceItemSemanticKey,
  stableJsonStringify,
  validateObservationTimes,
  validateProtectiveActionProvenance,
  validateTemporalValue,
} from "../../lib/truth/v1";
import { validateLegacyReplayProtectiveActionProvenance } from "../../lib/truth/v1/semantics";
import {
  validAssertion,
  validEndpointBoundSourceItem,
  validGlobalObservation,
  validIncidentObservationLink,
  validObservation,
} from "../fixtures/canonical-entities";

const baseDetection = {
  identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
  product: "VIIRS",
  satellite: "NOAA-20",
  observedAt: "2026-07-29T15:40:00Z",
  latitude: 38.97514,
  longitude: 26.36624,
  scanKm: 0.39,
  trackKm: 0.36,
} as const;

describe("canonical identity", () => {
  it("hashes object keys independently of input order", () => {
    const left = { beta: 2, alpha: { zulu: true, bravo: "x" } };
    const right = { alpha: { bravo: "x", zulu: true }, beta: 2 };

    expect(stableJsonStringify(left, IDENTITY_ALGORITHM_VERSION)).toBe(
      stableJsonStringify(right, IDENTITY_ALGORITHM_VERSION),
    );
    expect(hashJson(left, IDENTITY_ALGORITHM_VERSION)).toBe(
      hashJson(right, IDENTITY_ALGORITHM_VERSION),
    );
  });

  it("orders canonical JSON by code units without locale-dependent collation", () => {
    expect(
      stableJsonStringify(
        { "ä": 3, z: 2, A: 1 },
        IDENTITY_ALGORITHM_VERSION,
      ),
    ).toBe('{"A":1,"z":2,"ä":3}');
  });

  it("normalizes URL fragments, parameter order, hostname, and trailing slash", () => {
    expect(
      normalizeCanonicalUrl(
        "https://EXAMPLE.org/fire/?z=2&a=1#temporary-fragment",
        IDENTITY_ALGORITHM_VERSION,
      ),
    ).toBe("https://example.org/fire?a=1&z=2");
  });

  it("uses documented FIRMS coordinate rounding without losing source values", () => {
    const withinRoundingCell = {
      ...baseDetection,
      latitude: 38.975139,
      longitude: 26.366239,
    };

    expect(firmsDetectionNaturalKey(withinRoundingCell)).toBe(
      firmsDetectionNaturalKey(baseDetection),
    );
    expect(withinRoundingCell.latitude).toBe(38.975139);
  });

  it("uses an explicit null token when FIRMS omits pixel dimensions", () => {
    expect(
      firmsDetectionNaturalKey({
        ...baseDetection,
        scanKm: null,
        trackKm: null,
      }),
    ).toContain("|null|null");
  });

  it("prefixes persisted semantic identities with the identity major", () => {
    const key = sourceItemSemanticKey({
      identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
      sourceEndpointId: "0198a1b2-c3d4-7e5f-8a9b-001122334502",
      externalId: "post-1",
      canonicalUrl: null,
      sensorNaturalKey: null,
      normalizedTimestamp: null,
      payloadHash: "a".repeat(64),
    });

    expect(key).toMatch(/^2\.0\.0\|/);
    expect(key).not.toBe(key.replace(/^2\.0\.0/, "1.0.0"));
    expect(firmsDetectionNaturalKey(baseDetection)).toMatch(/^2\.0\.0\|/);
    expect(() =>
      hashJson({ value: 1 }, LEGACY_IDENTITY_ALGORITHM_VERSION),
    ).toThrow(/read-only/);
  });

  it("groups detections ten minutes apart in one pass and starts a new pass after that", () => {
    const passes = groupFirmsDetectionsIntoPasses([
      baseDetection,
      {
        ...baseDetection,
        observedAt: "2026-07-29T15:50:00Z",
        latitude: 38.98,
      },
      {
        ...baseDetection,
        observedAt: "2026-07-29T16:00:01Z",
        latitude: 38.99,
      },
    ]);

    expect(passes).toHaveLength(2);
    expect(passes[0]?.detections).toHaveLength(2);
    expect(passes[1]?.detections).toHaveLength(1);
  });

  it("orders equal-time FIRMS platforms and detections independently of input order", () => {
    const detections = [
      { ...baseDetection, longitude: 26.4 },
      { ...baseDetection, satellite: "NOAA-21", longitude: 26.3 },
      { ...baseDetection, longitude: 26.2 },
    ] as const;
    const forward = groupFirmsDetectionsIntoPasses(detections);
    const reverse = groupFirmsDetectionsIntoPasses([...detections].reverse());

    expect(reverse).toEqual(forward);
    expect(forward.map((pass) => pass.naturalKey)).toEqual(
      [...forward.map((pass) => pass.naturalKey)].sort(),
    );
  });

  it("totally orders equal-time FIRMS rows when rounded natural keys collide", () => {
    const detections = [
      { ...baseDetection, latitude: 38.975141 },
      { ...baseDetection, latitude: 38.975139 },
    ] as const;
    expect(firmsDetectionNaturalKey(detections[0])).toBe(
      firmsDetectionNaturalKey(detections[1]),
    );

    const forward = groupFirmsDetectionsIntoPasses(detections);
    const reverse = groupFirmsDetectionsIntoPasses([...detections].reverse());

    expect(reverse).toEqual(forward);
  });

  it("forces a new revision when the identity major changes", () => {
    expect(
      decideSourceRevision(
        {
          versionNumber: 4,
          contentHash: "a".repeat(64),
          identityAlgorithmVersion: LEGACY_IDENTITY_ALGORITHM_VERSION,
        },
        {
          contentHash: "a".repeat(64),
          identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
        },
      ),
    ).toEqual({
      kind: "identity_rebaseline",
      nextVersionNumber: 5,
      priorIdentityAlgorithmVersion: "1.0.0",
      nextIdentityAlgorithmVersion: "2.0.0",
    });
  });
});

describe("semantic safety rules", () => {
  it("accepts a date-only value without manufacturing an exact age", () => {
    expect(
      validateTemporalValue(
        {
          precision: "date_only",
          date: "2026-07-29",
          sourceValue: "2026-07-29",
          sourceTimezone: "Europe/Athens",
        },
        "2026-07-30T00:30:00Z",
      ),
    ).toEqual({ state: "accepted", reasonCodes: [] });
  });

  it("quarantines implausibly future observation times", () => {
    const observation = observationSchema.parse({
      ...validObservation,
      observedTime: {
        precision: "exact",
        instant: "2026-07-31T00:30:00Z",
        sourceValue: "2026-07-31T03:30:00+03:00",
        sourceTimezone: "Europe/Athens",
      },
    });

    expect(
      validateObservationTimes(observation, "2026-07-30T00:30:00Z"),
    ).toEqual({
      state: "quarantined",
      reasonCodes: ["future_timestamp"],
    });
  });

  it("accepts protective actions only from a validated official-alert chain", () => {
    const source = getSourceDefinition("112-greece");
    if (!source) throw new Error("112 source missing");
    const observation = observationSchema.parse(validObservation);
    const assertion = assertionSchema.parse(validAssertion);

    expect(
      validateLegacyReplayProtectiveActionProvenance({
        source,
        observation,
        assertion,
      }),
    ).toEqual({ state: "accepted", reasonCodes: [] });
  });

  it("uses endpoint-level authority on the canonical global observation path", () => {
    const endpoint = getSourceEndpoint("112-greece-account");
    if (!endpoint) throw new Error("112 endpoint missing");
    const sourceItem = endpointBoundSourceItemSchema.parse(
      validEndpointBoundSourceItem,
    );
    const observation = globalObservationSchema.parse(validGlobalObservation);
    const incidentLink = incidentObservationLinkSchema.parse(
      validIncidentObservationLink,
    );
    const assertion = assertionSchema.parse(validAssertion);

    expect(
      validateProtectiveActionProvenance({
        endpoint,
        sourceItem,
        observation,
        incidentLink,
        assertion,
        evaluatedAt: "2026-07-29T14:00:00Z",
      }),
    ).toEqual({ state: "accepted", reasonCodes: [] });
  });

  it("fails closed for a retracted assertion and mismatched provenance ids", () => {
    const endpoint = getSourceEndpoint("112-greece-account");
    if (!endpoint) throw new Error("112 endpoint missing");
    const result = validateProtectiveActionProvenance({
      endpoint,
      sourceItem: endpointBoundSourceItemSchema.parse({
        ...validEndpointBoundSourceItem,
        sourceEndpointId: "0198a1b2-c3d4-7e5f-8a9b-001122334503",
      }),
      observation: globalObservationSchema.parse(validGlobalObservation),
      incidentLink: incidentObservationLinkSchema.parse({
        ...validIncidentObservationLink,
        observationId: "0198a1b2-c3d4-7e5f-8a9b-001122334407",
      }),
      assertion: assertionSchema.parse({
        ...validAssertion,
        state: "retracted",
      }),
      evaluatedAt: "2026-07-29T14:00:00Z",
    });

    expect(result.state).toBe("rejected");
    expect(result.reasonCodes).toContain("provenance_chain_mismatch");
    expect(result.reasonCodes).toContain("inactive_assertion");
  });

  it("rejects expired, not-yet-effective, or not-yet-recorded protective assertions", () => {
    const endpoint = getSourceEndpoint("112-greece-account");
    if (!endpoint) throw new Error("112 endpoint missing");
    const base = {
      endpoint,
      sourceItem: endpointBoundSourceItemSchema.parse(
        validEndpointBoundSourceItem,
      ),
      observation: globalObservationSchema.parse(validGlobalObservation),
      incidentLink: incidentObservationLinkSchema.parse(
        validIncidentObservationLink,
      ),
      evaluatedAt: "2026-07-29T14:00:00Z" as const,
    };

    const expired = validateProtectiveActionProvenance({
      ...base,
      assertion: assertionSchema.parse({
        ...validAssertion,
        expiresAt: "2026-07-29T13:59:00Z",
      }),
    });
    const future = validateProtectiveActionProvenance({
      ...base,
      assertion: assertionSchema.parse({
        ...validAssertion,
        effectiveTime: {
          precision: "exact",
          instant: "2026-07-29T14:01:00Z",
          sourceValue: "2026-07-29T17:01:00+03:00",
          sourceTimezone: "Europe/Athens",
        },
      }),
    });
    const futureLink = validateProtectiveActionProvenance({
      ...base,
      incidentLink: incidentObservationLinkSchema.parse({
        ...validIncidentObservationLink,
        linkedAt: "2026-07-29T14:01:00Z",
      }),
      assertion: assertionSchema.parse(validAssertion),
    });
    const futureAssertionRecord = validateProtectiveActionProvenance({
      ...base,
      assertion: assertionSchema.parse({
        ...validAssertion,
        recordedAt: "2026-07-29T14:01:00Z",
      }),
    });

    expect(expired.reasonCodes).toContain("expired_assertion");
    expect(future.reasonCodes).toContain("provenance_timing_mismatch");
    expect(futureLink.reasonCodes).toContain("provenance_timing_mismatch");
    expect(futureAssertionRecord.reasonCodes).toContain(
      "provenance_timing_mismatch",
    );
  });

  it("rejects the same evacuation wording when it comes from a publisher", () => {
    const source = SOURCE_REGISTRY.find(
      (candidate) => candidate.key === "stonisi",
    );
    if (!source) throw new Error("StoNisi source missing");
    const observation = observationSchema.parse(validObservation);
    const assertion = assertionSchema.parse(validAssertion);

    const result = validateLegacyReplayProtectiveActionProvenance({
      source,
      observation,
      assertion,
    });

    expect(result.state).toBe("rejected");
    expect(result.reasonCodes).toContain(
      "publisher_cannot_issue_protective_action",
    );
    expect(result.reasonCodes).toContain("untrusted_protective_instruction");
  });

  it("rejects publisher authority on the full production provenance chain", () => {
    const endpoint = getSourceEndpoint("stonisi-feed");
    if (!endpoint) throw new Error("StoNisi endpoint missing");
    const result = validateProtectiveActionProvenance({
      endpoint,
      sourceItem: endpointBoundSourceItemSchema.parse({
        ...validEndpointBoundSourceItem,
        sourceEndpointId: endpoint.id,
      }),
      observation: globalObservationSchema.parse(validGlobalObservation),
      incidentLink: incidentObservationLinkSchema.parse(
        validIncidentObservationLink,
      ),
      assertion: assertionSchema.parse(validAssertion),
      evaluatedAt: "2026-07-29T14:00:00Z",
    });

    expect(result.state).toBe("rejected");
    expect(result.reasonCodes).toContain(
      "publisher_cannot_issue_protective_action",
    );
  });
});
