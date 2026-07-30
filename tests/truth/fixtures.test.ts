import { describe, expect, it } from "vitest";

import {
  PLOMARI_COLLECTION_TARGET_REVISIONS,
  PLOMARI_COLLECTION_TARGETS,
  PLOMARI_INCIDENT_SOURCE_BINDINGS,
  SOURCE_ENDPOINTS,
  SOURCE_PROVIDERS,
  calculateCollectionTargetRevisionHash,
  validateCollectionRegistry,
} from "../../lib/truth/collection-registry";
import {
  SOURCE_REGISTRY,
  validateSourceRegistry,
} from "../../lib/truth/source-registry";
import {
  adapterFixtureSchema,
  adapterNames,
  replayAdapterFixture,
} from "../../lib/truth/v1";
import { ADAPTER_FIXTURES } from "../fixtures/adapter-fixtures";
import { IDS } from "../fixtures/canonical-entities";

const failureScenarios = new Set([
  "timeout",
  "authentication",
  "quota",
  "malformed_payload",
]);

function fixtureById(id: string) {
  const fixture = ADAPTER_FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Missing test fixture ${id}`);
  return fixture;
}

describe("source registry and adapter fixture corpus", () => {
  it("validates the complete source registry", () => {
    expect(validateSourceRegistry()).toEqual([]);
  });

  it("validates provider, endpoint, target, and incident-binding references", () => {
    expect(validateCollectionRegistry()).toEqual([]);
    expect(SOURCE_ENDPOINTS).toHaveLength(PLOMARI_COLLECTION_TARGETS.length);
    expect(PLOMARI_COLLECTION_TARGET_REVISIONS).toHaveLength(
      PLOMARI_COLLECTION_TARGETS.length,
    );
    expect(PLOMARI_INCIDENT_SOURCE_BINDINGS).toHaveLength(
      PLOMARI_COLLECTION_TARGETS.length,
    );
  });

  it("deep-freezes registry records and nested target configuration", () => {
    const openMeteo = PLOMARI_COLLECTION_TARGETS.find(
      (target) => target.key === "plomari-open-meteo",
    );
    const variables = openMeteo?.requestConfig.variables;

    expect(Object.isFrozen(SOURCE_PROVIDERS)).toBe(true);
    expect(Object.isFrozen(SOURCE_PROVIDERS[0])).toBe(true);
    expect(Object.isFrozen(SOURCE_REGISTRY)).toBe(true);
    expect(Object.isFrozen(SOURCE_REGISTRY[0]?.authorityScopes)).toBe(true);
    expect(Object.isFrozen(PLOMARI_COLLECTION_TARGETS)).toBe(true);
    expect(Object.isFrozen(openMeteo?.requestConfig)).toBe(true);
    expect(Object.isFrozen(variables)).toBe(true);
    expect(PLOMARI_COLLECTION_TARGET_REVISIONS.every(Object.isFrozen)).toBe(
      true,
    );
  });

  it("hashes every immutable target revision and changes on configuration drift", () => {
    PLOMARI_COLLECTION_TARGET_REVISIONS.forEach((revision) => {
      expect(calculateCollectionTargetRevisionHash(revision)).toBe(
        revision.configurationHash,
      );
      expect(
        calculateCollectionTargetRevisionHash({
          ...revision,
          staleAfterSeconds: revision.staleAfterSeconds + 1,
        }),
      ).not.toBe(revision.configurationHash);
    });
  });

  it("keeps product authority and licensing below the organization level", () => {
    const nasa = SOURCE_PROVIDERS.find(
      (provider) => provider.key === "nasa-earthdata",
    );
    const firms = SOURCE_ENDPOINTS.find(
      (endpoint) => endpoint.key === "firms-noaa20",
    );
    const gibs = SOURCE_ENDPOINTS.find(
      (endpoint) => endpoint.key === "nasa-gibs-imagery",
    );

    expect(nasa).not.toHaveProperty("authorityScopes");
    expect(firms?.authorityScopes).toEqual(["thermal_anomaly"]);
    expect(gibs?.authorityScopes).toEqual(["satellite_imagery"]);
    expect(firms?.licensePolicy).toBeTruthy();
    expect(gibs?.licensePolicy).toBeTruthy();
  });

  it("contains Plomari query semantics only in collection targets", () => {
    const endpoint = SOURCE_ENDPOINTS.find(
      (candidate) => candidate.key === "open-meteo-forecast",
    );
    const target = PLOMARI_COLLECTION_TARGETS.find(
      (candidate) => candidate.key === "plomari-open-meteo",
    );

    expect(endpoint?.name).not.toMatch(/Plomari/i);
    expect(target?.requestConfig).toMatchObject({
      latitude: 38.989013,
      longitude: 26.382489,
      timezone: "Europe/Athens",
    });

    const gibsTarget = PLOMARI_COLLECTION_TARGETS.find(
      (candidate) => candidate.key === "plomari-gibs",
    );
    expect(gibsTarget?.requestConfig).toMatchObject({
      thermalLayers: [
        "VIIRS_NOAA20_Thermal_Anomalies_375m_All",
        "VIIRS_NOAA21_Thermal_Anomalies_375m_All",
        "VIIRS_SNPP_Thermal_Anomalies_375m_All",
      ],
      aerosolLayer:
        "VIIRS_NOAA20_Aerosol_Type_Deep_Blue_Land_Ocean_v2.1_NRT",
    });
  });

  it("keeps source keys and fixture ids unique", () => {
    expect(new Set(SOURCE_REGISTRY.map((source) => source.key)).size).toBe(
      SOURCE_REGISTRY.length,
    );
    expect(new Set(ADAPTER_FIXTURES.map((fixture) => fixture.id)).size).toBe(
      ADAPTER_FIXTURES.length,
    );
  });

  it("validates every fixture envelope", () => {
    ADAPTER_FIXTURES.forEach((fixture) => {
      expect(() => adapterFixtureSchema.parse(fixture)).not.toThrow();
    });
  });

  it("provides at least one success and failure fixture for every source", () => {
    SOURCE_REGISTRY.forEach((source) => {
      const fixtures = ADAPTER_FIXTURES.filter(
        (fixture) => fixture.sourceKey === source.key,
      );
      expect(
        fixtures.some((fixture) => fixture.scenario === "success"),
        `${source.key} is missing a success fixture`,
      ).toBe(true);
      expect(
        fixtures.some((fixture) => failureScenarios.has(fixture.scenario)),
        `${source.key} is missing a failure fixture`,
      ).toBe(true);
    });
  });

  it("covers every registered adapter family", () => {
    adapterNames.forEach((adapterName) => {
      expect(
        ADAPTER_FIXTURES.some(
          (fixture) => fixture.adapterName === adapterName,
        ),
        `${adapterName} has no fixtures`,
      ).toBe(true);
    });
  });

  it("covers required cross-corpus scenarios", () => {
    const scenarios = new Set<string>(
      ADAPTER_FIXTURES.map((fixture) => fixture.scenario),
    );
    [
      "success",
      "zero_result",
      "correction",
      "malformed_time",
      "future_time",
      "partial_failure",
      "timeout",
      "authentication",
      "quota",
      "malformed_payload",
    ].forEach((scenario) => expect(scenarios.has(scenario)).toBe(true));
  });

  it("contains no authorization headers or obvious secret-bearing URLs", () => {
    ADAPTER_FIXTURES.forEach((fixture) => {
      const headers = Object.keys(fixture.request.headers).map((header) =>
        header.toLowerCase(),
      );
      expect(headers).not.toContain("authorization");
      expect(fixture.request.url).not.toMatch(
        /(?:token|api[_-]?key|bearer)=/i,
      );
    });
  });
});

describe("deterministic fixture replay", () => {
  it("replays each source success fixture into a valid source item", () => {
    SOURCE_REGISTRY.forEach((source) => {
      const fixture = ADAPTER_FIXTURES.find(
        (candidate) =>
          candidate.sourceKey === source.key &&
          candidate.scenario === "success",
      );
      if (!fixture) throw new Error(`Missing ${source.key} success fixture`);

      const result = replayAdapterFixture(fixture, {
        sourceItemId: IDS.sourceItem,
        priorSourceItem: null,
        recordedAt: "2026-07-30T00:30:01Z",
      });
      expect(result.semanticDelta).toBe("created");
      expect(result.sourceItem?.sourceKey).toBe(source.key);
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  it("replaying an identical FIRMS fixture 100 times creates no delta", () => {
    const fixture = fixtureById("firms-noaa20-success");
    const first = replayAdapterFixture(fixture, {
      sourceItemId: IDS.sourceItem,
      priorSourceItem: null,
      recordedAt: "2026-07-30T00:30:01Z",
    });
    expect(first.sourceItem).not.toBeNull();

    for (let replay = 0; replay < 100; replay += 1) {
      const repeated = replayAdapterFixture(fixture, {
        sourceItemId: IDS.sourceItem,
        priorSourceItem: {
          id: IDS.sourceItem,
          versionNumber: 1,
          contentHash: first.contentHash!,
          identityAlgorithmVersion: "2.0.0",
        },
        recordedAt: "2026-07-30T00:30:01Z",
      });
      expect(repeated.semanticKey).toBe(first.semanticKey);
      expect(repeated.contentHash).toBe(first.contentHash);
      expect(repeated.semanticDelta).toBe("none");
      expect(repeated.sourceItem).toBeNull();
    }
  });

  it("creates an immutable second version for a correction", () => {
    const first = replayAdapterFixture(
      fixtureById("fire-service-board-success"),
      {
        sourceItemId: IDS.sourceItem,
        priorSourceItem: null,
        recordedAt: "2026-07-30T00:30:01Z",
      },
    );
    const corrected = replayAdapterFixture(
      fixtureById("fire-service-board-correction"),
      {
        sourceItemId: "0198a1b2-c3d4-7e5f-8a9b-001122334412",
        priorSourceItem: {
          id: IDS.sourceItem,
          versionNumber: 1,
          contentHash: first.contentHash!,
          identityAlgorithmVersion: "2.0.0",
        },
        recordedAt: "2026-07-30T00:35:01Z",
      },
    );

    expect(corrected.semanticKey).toBe(first.semanticKey);
    expect(corrected.semanticDelta).toBe("corrected");
    expect(corrected.sourceItem?.versionNumber).toBe(2);
    expect(corrected.sourceItem?.supersedesId).toBe(IDS.sourceItem);
  });

  it("creates a new version when legacy identity hashes are rebaselined", () => {
    const fixture = fixtureById("firms-noaa20-success");
    const first = replayAdapterFixture(fixture, {
      sourceItemId: IDS.sourceItem,
      priorSourceItem: null,
      recordedAt: "2026-07-30T00:30:01Z",
    });
    const rebaselined = replayAdapterFixture(fixture, {
      sourceItemId: "0198a1b2-c3d4-7e5f-8a9b-001122334413",
      priorSourceItem: {
        id: IDS.sourceItem,
        versionNumber: 1,
        contentHash: first.contentHash!,
        identityAlgorithmVersion: "1.0.0",
      },
      recordedAt: "2026-07-30T00:30:01Z",
    });

    expect(rebaselined.semanticDelta).toBe("identity_rebaselined");
    expect(rebaselined.sourceItem?.versionNumber).toBe(2);
    expect(rebaselined.sourceItem?.identityAlgorithmVersion).toBe("2.0.0");
  });

  it("treats a successful zero-row FIRMS response as no detections, not all-clear", () => {
    const result = replayAdapterFixture(
      fixtureById("firms-noaa20-zero-result"),
      {
        sourceItemId: IDS.sourceItem,
        priorSourceItem: null,
        recordedAt: "2026-07-30T00:30:01Z",
      },
    );

    expect(result.ingestionStatus).toBe("success");
    expect(result.sourceItem).toBeNull();
    expect(result.semanticDelta).toBe("none");
    expect(result.protectiveActionCount).toBe(0);
  });

  it("cannot promote a publisher evacuation headline into an official action", () => {
    const publisherFixture = fixtureById("stonisi-evacuation-headline");
    const result = replayAdapterFixture(publisherFixture, {
      sourceItemId: IDS.sourceItem,
      priorSourceItem: null,
      recordedAt: "2026-07-30T00:30:01Z",
    });
    expect(result.protectiveActionCount).toBe(0);

    expect(() =>
      replayAdapterFixture(
        {
          ...publisherFixture,
          expected: {
            ...publisherFixture.expected,
            protectiveActionCount: 1,
          },
        },
        {
          sourceItemId: IDS.sourceItem,
          priorSourceItem: null,
          recordedAt: "2026-07-30T00:30:01Z",
        },
      ),
    ).toThrow(/cannot produce an official protective action/);
  });
});
