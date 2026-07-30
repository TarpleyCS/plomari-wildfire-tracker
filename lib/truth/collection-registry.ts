import { deepFreeze, type DeepReadonly } from "./immutability";
import { SOURCE_REGISTRY, type SourceKey } from "./source-registry";
import {
  CONTRACT_VERSION,
  IDENTITY_ALGORITHM_VERSION,
} from "./v1/constants";
import { hashJson } from "./v1/identity";
import {
  collectionTargetRevisionSchema,
  collectionTargetSchema,
  incidentSourceBindingSchema,
  sourceEndpointSchema,
  sourceProviderSchema,
  type CollectionTarget,
  type CollectionTargetRevision,
  type GeoJsonGeometry,
  type IncidentSourceBinding,
  type JsonValue,
  type SourceEndpoint,
  type SourceProvider,
} from "./v1/schemas";

const CONFIGURED_AT = "2026-07-30T00:00:00Z";
export const PLOMARI_INCIDENT_ID =
  "0198a1b2-c3d4-7e5f-8a9b-001122334404";

const PLOMARI_COLLECTION_AREA: GeoJsonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [26.2, 38.85],
      [26.6, 38.85],
      [26.6, 39.15],
      [26.2, 39.15],
      [26.2, 38.85],
    ],
  ],
};

const PLOMARI_INCIDENT_POINT: GeoJsonGeometry = {
  type: "Point",
  coordinates: [26.382489, 38.989013],
};

const providerInputs = [
  {
    key: "hellenic-fire-service",
    name: "Hellenic Fire Service",
    homepageUrl: "https://www.fireservice.gr/",
    defaultLicensePolicy: "source_terms_apply",
    notes:
      "Provider identity only. Authority and reuse terms are declared per endpoint.",
  },
  {
    key: "greek-civil-protection",
    name: "Greek Civil Protection",
    homepageUrl: "https://civilprotection.gov.gr/",
    defaultLicensePolicy: "source_terms_apply",
    notes:
      "Provider for the 112 account and Civil Protection publication endpoints.",
  },
  {
    key: "municipality-mytilene",
    name: "Municipality of Mytilene",
    homepageUrl: "https://www.mytilene.gr/",
    defaultLicensePolicy: "source_terms_apply",
    notes: "Municipal publication provider.",
  },
  {
    key: "ert",
    name: "Hellenic Broadcasting Corporation",
    homepageUrl: "https://www.ertnews.gr/",
    defaultLicensePolicy: "source_terms_apply",
    notes: "Public broadcaster provider.",
  },
  {
    key: "stonisi",
    name: "StoNisi",
    homepageUrl: "https://www.stonisi.gr/",
    defaultLicensePolicy: "source_terms_apply",
    notes: "Publisher provider.",
  },
  {
    key: "aeolos",
    name: "Aeolos",
    homepageUrl: "https://aeolos.tv/",
    defaultLicensePolicy: "source_terms_apply",
    notes: "Publisher provider with multiple feeds.",
  },
  {
    key: "nasa-earthdata",
    name: "NASA Earthdata",
    homepageUrl: "https://www.earthdata.nasa.gov/",
    defaultLicensePolicy: "source_terms_apply",
    notes:
      "Organization-level identity only; FIRMS detections and GIBS imagery have separate endpoint semantics and terms.",
  },
  {
    key: "open-meteo",
    name: "Open-Meteo",
    homepageUrl: "https://open-meteo.com/",
    defaultLicensePolicy: "source_terms_apply",
    notes: "Weather-model provider.",
  },
  {
    key: "aviation-weather",
    name: "AviationWeather",
    homepageUrl: "https://aviationweather.gov/",
    defaultLicensePolicy: "source_terms_apply",
    notes: "Aviation weather observation provider.",
  },
] as const;

export const SOURCE_PROVIDERS: DeepReadonly<readonly SourceProvider[]> = deepFreeze(
  providerInputs.map((provider) =>
    sourceProviderSchema.parse({
      contractVersion: CONTRACT_VERSION,
      ...provider,
    }),
  ),
);

const endpointDescriptors = [
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334501",
    sourceKey: "fire-service-board",
    endpointKey: "fire-service-board",
    providerKey: "hellenic-fire-service",
    endpointKind: "page",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334502",
    sourceKey: "112-greece",
    endpointKey: "112-greece-account",
    providerKey: "greek-civil-protection",
    endpointKind: "account",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334503",
    sourceKey: "hellenic-fire-service-x",
    endpointKey: "hellenic-fire-service-account",
    providerKey: "hellenic-fire-service",
    endpointKind: "account",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334504",
    sourceKey: "civil-protection",
    endpointKey: "civil-protection-press-feed",
    providerKey: "greek-civil-protection",
    endpointKind: "feed",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334505",
    sourceKey: "mytilene-civil-protection",
    endpointKey: "mytilene-civil-protection-feed",
    providerKey: "municipality-mytilene",
    endpointKind: "feed",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334506",
    sourceKey: "mytilene-plomari",
    endpointKey: "mytilene-plomari-feed",
    providerKey: "municipality-mytilene",
    endpointKind: "feed",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334507",
    sourceKey: "ert-north-aegean",
    endpointKey: "ert-north-aegean-feed",
    providerKey: "ert",
    endpointKind: "feed",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334508",
    sourceKey: "stonisi",
    endpointKey: "stonisi-feed",
    providerKey: "stonisi",
    endpointKind: "feed",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334509",
    sourceKey: "aeolos-lesvos",
    endpointKey: "aeolos-lesvos-feed",
    providerKey: "aeolos",
    endpointKind: "feed",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334510",
    sourceKey: "aeolos-breaking",
    endpointKey: "aeolos-breaking-feed",
    providerKey: "aeolos",
    endpointKind: "feed",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334511",
    sourceKey: "firms-noaa20",
    endpointKey: "firms-noaa20",
    providerKey: "nasa-earthdata",
    endpointKind: "dataset",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334512",
    sourceKey: "firms-noaa21",
    endpointKey: "firms-noaa21",
    providerKey: "nasa-earthdata",
    endpointKind: "dataset",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334513",
    sourceKey: "firms-snpp",
    endpointKey: "firms-snpp",
    providerKey: "nasa-earthdata",
    endpointKind: "dataset",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334514",
    sourceKey: "nasa-gibs",
    endpointKey: "nasa-gibs-imagery",
    providerKey: "nasa-earthdata",
    endpointKind: "imagery",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334515",
    sourceKey: "open-meteo-plomari",
    endpointKey: "open-meteo-forecast",
    providerKey: "open-meteo",
    endpointKind: "model",
  },
  {
    id: "0198a1b2-c3d4-7e5f-8a9b-001122334516",
    sourceKey: "aviation-weather-lgmt",
    endpointKey: "aviation-weather-metar",
    providerKey: "aviation-weather",
    endpointKind: "station",
  },
] as const satisfies readonly {
  readonly id: string;
  readonly sourceKey: SourceKey;
  readonly endpointKey: string;
  readonly providerKey: string;
  readonly endpointKind:
    | "feed"
    | "account"
    | "dataset"
    | "station"
    | "page"
    | "model"
    | "imagery";
}[];

const legacySourcesByKey = new Map(
  SOURCE_REGISTRY.map((source) => [source.key, source]),
);

function requireLegacySource(key: SourceKey) {
  const source = legacySourcesByKey.get(key);
  if (!source) throw new Error(`Missing compatibility source ${key}`);
  return source;
}

export const SOURCE_ENDPOINTS: DeepReadonly<readonly SourceEndpoint[]> = deepFreeze(
  endpointDescriptors.map((descriptor) => {
    const legacy = requireLegacySource(descriptor.sourceKey);
    const credentialEnv =
      "credentialEnv" in legacy ? legacy.credentialEnv : null;
    return sourceEndpointSchema.parse({
      contractVersion: CONTRACT_VERSION,
      id: descriptor.id,
      key: descriptor.endpointKey,
      providerKey: descriptor.providerKey,
      endpointKind: descriptor.endpointKind,
      name:
        descriptor.sourceKey === "open-meteo-plomari"
          ? "Open-Meteo forecast API"
          : descriptor.sourceKey === "aviation-weather-lgmt"
            ? "AviationWeather METAR API"
            : legacy.name,
      sourceKind: legacy.sourceKind,
      authorityScopes: legacy.authorityScopes,
      contentPolicy: legacy.contentPolicy,
      licensePolicy: legacy.licensePolicy,
      dataUrl: legacy.dataUrl,
      adapterName: legacy.adapterName,
      adapterVersion: legacy.adapterVersion,
      credentialRef: credentialEnv ? `env:${credentialEnv}` : null,
    });
  }),
);

const collectionTargetDescriptors = [
  ["0198a1b2-c3d4-7e5f-8a9b-001122334601", "fire-service-board", "plomari-fire-service-board"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334602", "112-greece", "plomari-112-account"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334603", "hellenic-fire-service-x", "plomari-fire-service-account"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334604", "civil-protection", "plomari-civil-protection-feed"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334605", "mytilene-civil-protection", "plomari-mytilene-civil-protection-feed"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334606", "mytilene-plomari", "plomari-mytilene-feed"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334607", "ert-north-aegean", "plomari-ert-feed"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334608", "stonisi", "plomari-stonisi-feed"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334609", "aeolos-lesvos", "plomari-aeolos-lesvos-feed"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334610", "aeolos-breaking", "plomari-aeolos-breaking-feed"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334611", "firms-noaa20", "plomari-firms-noaa20"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334612", "firms-noaa21", "plomari-firms-noaa21"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334613", "firms-snpp", "plomari-firms-snpp"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334614", "nasa-gibs", "plomari-gibs"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334615", "open-meteo-plomari", "plomari-open-meteo"],
  ["0198a1b2-c3d4-7e5f-8a9b-001122334616", "aviation-weather-lgmt", "plomari-lgmt"],
] as const satisfies readonly (readonly [string, SourceKey, string])[];

function targetKindFor(sourceKey: SourceKey): CollectionTarget["targetKind"] {
  if (sourceKey === "112-greece" || sourceKey === "hellenic-fire-service-x") {
    return "account";
  }
  if (sourceKey.startsWith("firms-") || sourceKey === "nasa-gibs") {
    return "geographic_area";
  }
  if (sourceKey === "open-meteo-plomari") return "point";
  if (sourceKey === "aviation-weather-lgmt") return "station";
  if (sourceKey === "fire-service-board") return "global";
  return "feed";
}

function targetGeometryFor(sourceKey: SourceKey): GeoJsonGeometry | null {
  if (sourceKey.startsWith("firms-") || sourceKey === "nasa-gibs") {
    return PLOMARI_COLLECTION_AREA;
  }
  if (sourceKey === "open-meteo-plomari") return PLOMARI_INCIDENT_POINT;
  return null;
}

function targetRequestConfigFor(
  sourceKey: SourceKey,
): Record<string, JsonValue> {
  const incidentTerms = ["Πλωμάρι", "Plomari"];
  if (sourceKey.startsWith("firms-")) {
    const datasetByKey: Record<string, string> = {
      "firms-noaa20": "VIIRS_NOAA20_NRT",
      "firms-noaa21": "VIIRS_NOAA21_NRT",
      "firms-snpp": "VIIRS_SNPP_NRT",
    };
    return {
      dataset: datasetByKey[sourceKey] ?? sourceKey,
      west: 26.2,
      south: 38.85,
      east: 26.6,
      north: 39.15,
      lookbackDays: 2,
    };
  }
  if (sourceKey === "nasa-gibs") {
    return {
      thermalLayers: [
        "VIIRS_NOAA20_Thermal_Anomalies_375m_All",
        "VIIRS_NOAA21_Thermal_Anomalies_375m_All",
        "VIIRS_SNPP_Thermal_Anomalies_375m_All",
      ],
      aerosolLayer:
        "VIIRS_NOAA20_Aerosol_Type_Deep_Blue_Land_Ocean_v2.1_NRT",
      west: 26.2,
      south: 38.85,
      east: 26.6,
      north: 39.15,
    };
  }
  if (sourceKey === "open-meteo-plomari") {
    return {
      latitude: 38.989013,
      longitude: 26.382489,
      timezone: "Europe/Athens",
      variables: [
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ],
    };
  }
  if (sourceKey === "aviation-weather-lgmt") {
    return { stationId: "LGMT", hours: 2 };
  }
  return { incidentTerms };
}

type RevisionConfiguration = Pick<
  CollectionTargetRevision,
  | "identityAlgorithmVersion"
  | "endpointId"
  | "targetKind"
  | "requestConfig"
  | "geometry"
  | "geometryPrecisionM"
  | "expectedCadenceSeconds"
  | "staleAfterSeconds"
  | "enabled"
>;

export function calculateCollectionTargetRevisionHash(
  revision: RevisionConfiguration,
): string {
  const configuration: Record<string, JsonValue> = {
    endpointId: revision.endpointId,
    targetKind: revision.targetKind,
    requestConfig: revision.requestConfig,
    geometry: revision.geometry,
    geometryPrecisionM: revision.geometryPrecisionM,
    expectedCadenceSeconds: revision.expectedCadenceSeconds,
    staleAfterSeconds: revision.staleAfterSeconds,
    enabled: revision.enabled,
  };
  return hashJson(configuration, revision.identityAlgorithmVersion);
}

const endpointsByLegacySource = new Map(
  endpointDescriptors.map((descriptor, index) => [
    descriptor.sourceKey,
    SOURCE_ENDPOINTS[index],
  ]),
);

export const PLOMARI_COLLECTION_TARGETS: DeepReadonly<
  readonly CollectionTarget[]
> =
  deepFreeze(
    collectionTargetDescriptors.map(([id, sourceKey, key]) => {
      const source = requireLegacySource(sourceKey);
      const endpoint = endpointsByLegacySource.get(sourceKey);
      if (!endpoint) throw new Error(`Missing endpoint for ${sourceKey}`);
      const geometry = targetGeometryFor(sourceKey);
      return collectionTargetSchema.parse({
        contractVersion: CONTRACT_VERSION,
        id,
        key,
        endpointId: endpoint.id,
        targetKind: targetKindFor(sourceKey),
        name: `Plomari profile · ${source.name}`,
        requestConfig: targetRequestConfigFor(sourceKey),
        geometry,
        geometryPrecisionM: geometry ? 1_000 : null,
        expectedCadenceSeconds: source.expectedCadenceSeconds,
        staleAfterSeconds: source.staleAfterSeconds,
        enabledByDefault: source.enabledByDefault,
        createdAt: CONFIGURED_AT,
        updatedAt: CONFIGURED_AT,
      });
    }),
  );

export const PLOMARI_COLLECTION_TARGET_REVISIONS: DeepReadonly<
  readonly CollectionTargetRevision[]
> =
  deepFreeze(
    PLOMARI_COLLECTION_TARGETS.map((target, index) => {
      const configuration = {
        identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
        endpointId: target.endpointId,
        targetKind: target.targetKind,
        requestConfig: target.requestConfig,
        geometry: target.geometry,
        geometryPrecisionM: target.geometryPrecisionM,
        expectedCadenceSeconds: target.expectedCadenceSeconds,
        staleAfterSeconds: target.staleAfterSeconds,
        enabled: target.enabledByDefault,
      };
      return collectionTargetRevisionSchema.parse({
        contractVersion: CONTRACT_VERSION,
        identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
        id: `0198a1b2-c3d4-7e5f-8a9b-0011223348${String(index + 1).padStart(2, "0")}`,
        collectionTargetId: target.id,
        endpointId: target.endpointId,
        versionNumber: 1,
        supersedesId: null,
        targetKind: target.targetKind,
        requestConfig: target.requestConfig,
        geometry: target.geometry,
        geometryPrecisionM: target.geometryPrecisionM,
        expectedCadenceSeconds: target.expectedCadenceSeconds,
        staleAfterSeconds: target.staleAfterSeconds,
        enabled: target.enabledByDefault,
        configurationHash:
          calculateCollectionTargetRevisionHash(configuration),
        createdAt: CONFIGURED_AT,
      });
    }),
  );

export const PLOMARI_INCIDENT_SOURCE_BINDINGS: DeepReadonly<
  readonly IncidentSourceBinding[]
> =
  deepFreeze(
    PLOMARI_COLLECTION_TARGETS.map((target, index) =>
      incidentSourceBindingSchema.parse({
        contractVersion: CONTRACT_VERSION,
        id: `0198a1b2-c3d4-7e5f-8a9b-0011223347${String(index + 1).padStart(2, "0")}`,
        incidentId: PLOMARI_INCIDENT_ID,
        collectionTargetId: target.id,
        purpose:
          target.key.includes("fire-service") || target.key.includes("112")
            ? "primary"
            : "context",
        priority: Math.max(1, 100 - index),
        relevanceMethod:
          target.geometry === null ? "keyword" : "geometry",
        relevanceConfig:
          target.geometry === null
            ? { incidentTerms: ["Πλωμάρι", "Plomari"] }
            : { incidentAreaVersion: 1 },
        enabled: target.enabledByDefault,
        createdAt: CONFIGURED_AT,
        updatedAt: CONFIGURED_AT,
      }),
    ),
  );

export function getSourceProvider(key: string): SourceProvider | null {
  return SOURCE_PROVIDERS.find((provider) => provider.key === key) ?? null;
}

export function getSourceEndpoint(key: string): SourceEndpoint | null {
  return SOURCE_ENDPOINTS.find((endpoint) => endpoint.key === key) ?? null;
}

export function getCollectionTarget(key: string): CollectionTarget | null {
  return (
    PLOMARI_COLLECTION_TARGETS.find((target) => target.key === key) ?? null
  );
}

export function getCollectionTargetRevision(
  id: string,
): CollectionTargetRevision | null {
  return (
    PLOMARI_COLLECTION_TARGET_REVISIONS.find(
      (revision) => revision.id === id,
    ) ?? null
  );
}

export function validateCollectionRegistry(): readonly string[] {
  const errors: string[] = [];
  const providerKeys = new Set(SOURCE_PROVIDERS.map(({ key }) => key));
  const endpointIds = new Set(SOURCE_ENDPOINTS.map(({ id }) => id));
  const targetIds = new Set(PLOMARI_COLLECTION_TARGETS.map(({ id }) => id));
  const targetById = new Map(
    PLOMARI_COLLECTION_TARGETS.map((target) => [target.id, target]),
  );

  const validateUnique = (
    values: readonly string[],
    label: string,
  ): void => {
    if (new Set(values).size !== values.length) {
      errors.push(`duplicate ${label}`);
    }
  };

  validateUnique(SOURCE_PROVIDERS.map(({ key }) => key), "provider key");
  validateUnique(SOURCE_ENDPOINTS.map(({ id }) => id), "endpoint id");
  validateUnique(SOURCE_ENDPOINTS.map(({ key }) => key), "endpoint key");
  validateUnique(
    PLOMARI_COLLECTION_TARGETS.map(({ id }) => id),
    "collection target id",
  );
  validateUnique(
    PLOMARI_COLLECTION_TARGETS.map(({ key }) => key),
    "collection target key",
  );
  validateUnique(
    PLOMARI_COLLECTION_TARGET_REVISIONS.map(({ id }) => id),
    "collection target revision id",
  );

  SOURCE_PROVIDERS.forEach((provider) => {
    if (!sourceProviderSchema.safeParse(provider).success) {
      errors.push(`${provider.key}: invalid provider`);
    }
  });
  SOURCE_ENDPOINTS.forEach((endpoint) => {
    if (!sourceEndpointSchema.safeParse(endpoint).success) {
      errors.push(`${endpoint.key}: invalid endpoint`);
    }
    if (!providerKeys.has(endpoint.providerKey)) {
      errors.push(`${endpoint.key}: unknown provider ${endpoint.providerKey}`);
    }
  });
  PLOMARI_COLLECTION_TARGETS.forEach((target) => {
    if (!collectionTargetSchema.safeParse(target).success) {
      errors.push(`${target.key}: invalid collection target`);
    }
    if (!endpointIds.has(target.endpointId)) {
      errors.push(`${target.key}: unknown endpoint ${target.endpointId}`);
    }
  });
  PLOMARI_COLLECTION_TARGET_REVISIONS.forEach((revision) => {
    if (!collectionTargetRevisionSchema.safeParse(revision).success) {
      errors.push(`${revision.id}: invalid collection target revision`);
    }
    const target = targetById.get(revision.collectionTargetId);
    if (!target) {
      errors.push(
        `${revision.id}: unknown collection target ${revision.collectionTargetId}`,
      );
      return;
    }
    if (revision.endpointId !== target.endpointId) {
      errors.push(`${revision.id}: endpoint does not match collection target`);
    }
    if (
      calculateCollectionTargetRevisionHash(revision) !==
      revision.configurationHash
    ) {
      errors.push(`${revision.id}: configuration hash mismatch`);
    }
  });
  PLOMARI_INCIDENT_SOURCE_BINDINGS.forEach((binding) => {
    if (!incidentSourceBindingSchema.safeParse(binding).success) {
      errors.push(`${binding.id}: invalid incident-source binding`);
    }
    if (!targetIds.has(binding.collectionTargetId)) {
      errors.push(
        `${binding.id}: unknown collection target ${binding.collectionTargetId}`,
      );
    }
  });

  return errors;
}

const collectionRegistryErrors = validateCollectionRegistry();
if (collectionRegistryErrors.length > 0) {
  throw new Error(
    `Invalid collection registry: ${collectionRegistryErrors.join("; ")}`,
  );
}
