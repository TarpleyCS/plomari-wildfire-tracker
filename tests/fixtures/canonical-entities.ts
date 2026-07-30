import {
  PLOMARI_COLLECTION_TARGET_REVISIONS,
  PLOMARI_COLLECTION_TARGETS,
  PLOMARI_INCIDENT_SOURCE_BINDINGS,
  SOURCE_ENDPOINTS,
  SOURCE_PROVIDERS,
} from "../../lib/truth/collection-registry";
import { SOURCE_REGISTRY } from "../../lib/truth/source-registry";

const CONTRACT_VERSION = "1.1.0" as const;
const IDENTITY_ALGORITHM_VERSION = "2.0.0" as const;

export const IDS = {
  ingestionRun: "0198a1b2-c3d4-7e5f-8a9b-001122334401",
  sourceItem: "0198a1b2-c3d4-7e5f-8a9b-001122334402",
  priorSourceItem: "0198a1b2-c3d4-7e5f-8a9b-001122334403",
  incident: "0198a1b2-c3d4-7e5f-8a9b-001122334404",
  observation: "0198a1b2-c3d4-7e5f-8a9b-001122334405",
  assertion: "0198a1b2-c3d4-7e5f-8a9b-001122334406",
  event: "0198a1b2-c3d4-7e5f-8a9b-001122334407",
  snapshotBefore: "0198a1b2-c3d4-7e5f-8a9b-001122334408",
  snapshotAfter: "0198a1b2-c3d4-7e5f-8a9b-001122334409",
  change: "0198a1b2-c3d4-7e5f-8a9b-001122334410",
  sourceHealth: "0198a1b2-c3d4-7e5f-8a9b-001122334411",
  observationLink: "0198a1b2-c3d4-7e5f-8a9b-001122334412",
} as const;

export const exactTime = {
  precision: "exact",
  instant: "2026-07-29T13:58:00Z",
  sourceValue: "29-07-2026 16:58",
  sourceTimezone: "Europe/Athens",
} as const;

export const dateOnlyTime = {
  precision: "date_only",
  date: "2026-07-29",
  sourceValue: "2026-07-29",
  sourceTimezone: "Europe/Athens",
} as const;

export const validIncident = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.incident,
  slug: "plomari-2026-07-29",
  canonicalName: "Plomari wildfire",
  displayNames: {
    en: "Plomari wildfire",
    el: "Δασική πυρκαγιά Πλωμαρίου",
  },
  lifecycle: "active",
  startedAt: exactTime,
  endedAt: null,
  areaOfInterest: {
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
  },
  areaOfInterestVersion: 1,
  defaultTimezone: "Europe/Athens",
  createdAt: "2026-07-29T13:59:00Z",
  updatedAt: "2026-07-29T13:59:00Z",
} as const;

export const validSourceProvider = SOURCE_PROVIDERS.find(
  (provider) => provider.key === "greek-civil-protection",
)!;
export const validSourceEndpoint = SOURCE_ENDPOINTS.find(
  (endpoint) => endpoint.key === "112-greece-account",
)!;
export const validCollectionTarget = PLOMARI_COLLECTION_TARGETS.find(
  (target) => target.key === "plomari-112-account",
)!;
export const validCollectionTargetRevision =
  PLOMARI_COLLECTION_TARGET_REVISIONS.find(
    (revision) => revision.collectionTargetId === validCollectionTarget.id,
  )!;
export const validIncidentSourceBinding =
  PLOMARI_INCIDENT_SOURCE_BINDINGS.find(
    (binding) => binding.collectionTargetId === validCollectionTarget.id,
  )!;

export const validIngestionRun = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.ingestionRun,
  sourceKey: "112-greece",
  collectionTargetId: null,
  startedAt: "2026-07-29T13:59:00Z",
  finishedAt: "2026-07-29T13:59:01Z",
  status: "success",
  httpStatus: 200,
  latencyMs: 812,
  payloadHash: "a".repeat(64),
  rawObjectKey: "official/112/2026-07-29/post-1.json",
  itemCount: 1,
  errorClass: null,
  errorDetailSafe: null,
  collectorVersion: "1.0.0",
} as const;

export const validTargetedIngestionRun = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.ingestionRun,
  collectionTargetId: validCollectionTarget.id,
  collectionTargetRevisionId: validCollectionTargetRevision.id,
  startedAt: validIngestionRun.startedAt,
  finishedAt: validIngestionRun.finishedAt,
  status: validIngestionRun.status,
  httpStatus: validIngestionRun.httpStatus,
  latencyMs: validIngestionRun.latencyMs,
  payloadHash: validIngestionRun.payloadHash,
  rawObjectKey: validIngestionRun.rawObjectKey,
  itemCount: validIngestionRun.itemCount,
  errorClass: validIngestionRun.errorClass,
  errorDetailSafe: validIngestionRun.errorDetailSafe,
  collectorVersion: validIngestionRun.collectorVersion,
} as const;

export const validSourceItem = {
  contractVersion: CONTRACT_VERSION,
  identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
  id: IDS.sourceItem,
  sourceKey: "112-greece",
  externalId: "2082468150189167080",
  canonicalUrl: "https://x.com/112Greece/status/2082468150189167080",
  versionNumber: 1,
  supersedesId: null,
  contentHash: "b".repeat(64),
  title: "Emergency alert for Plomari",
  language: "el",
  publishedTime: exactTime,
  modifiedTime: {
    precision: "unknown",
    sourceValue: null,
    sourceTimezone: null,
  },
  retrievedAt: "2026-07-29T13:59:00Z",
  recordedAt: "2026-07-29T13:59:01Z",
  rawExcerpt: "Δασική πυρκαγιά στην περιοχή Πλωμάρι.",
  rawPayload: {
    postId: "2082468150189167080",
    verifiedAccount: true,
  },
} as const;

export const validEndpointBoundSourceItem = {
  contractVersion: CONTRACT_VERSION,
  identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
  id: IDS.sourceItem,
  sourceEndpointId: validSourceEndpoint.id,
  ingestionRunId: IDS.ingestionRun,
  externalId: validSourceItem.externalId,
  canonicalUrl: validSourceItem.canonicalUrl,
  versionNumber: validSourceItem.versionNumber,
  supersedesId: validSourceItem.supersedesId,
  contentHash: validSourceItem.contentHash,
  title: validSourceItem.title,
  language: validSourceItem.language,
  publishedTime: validSourceItem.publishedTime,
  modifiedTime: validSourceItem.modifiedTime,
  retrievedAt: validSourceItem.retrievedAt,
  recordedAt: validSourceItem.recordedAt,
  rawExcerpt: validSourceItem.rawExcerpt,
  rawPayload: validSourceItem.rawPayload,
} as const;

export const validObservation = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.observation,
  incidentId: IDS.incident,
  sourceItemId: IDS.sourceItem,
  observationType: "protective_instruction",
  observedTime: exactTime,
  effectiveTime: exactTime,
  geometry: {
    type: "Point",
    coordinates: [26.368, 38.976],
  },
  geometryPrecisionM: 1_000,
  measurements: {},
  quality: {
    accountVerified: true,
  },
  relevanceMethod: "exact_identifier",
  parserVersion: "1.0.0",
  recordedAt: "2026-07-29T13:59:01Z",
  validationState: "accepted",
  validationReasons: [],
} as const;

export const validGlobalObservation = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.observation,
  sourceItemId: IDS.sourceItem,
  observationType: "protective_instruction",
  observedTime: exactTime,
  effectiveTime: exactTime,
  geometry: {
    type: "Point",
    coordinates: [26.368, 38.976],
  },
  geometryPrecisionM: 1_000,
  measurements: {},
  quality: {
    accountVerified: true,
  },
  parserVersion: "1.0.0",
  recordedAt: "2026-07-29T13:59:01Z",
  validationState: "accepted",
  validationReasons: [],
} as const;

export const validIncidentObservationLink = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.observationLink,
  incidentId: IDS.incident,
  observationId: IDS.observation,
  relevanceMethod: "geometry",
  rationaleCode: "inside-incident-area",
  incidentAreaVersion: validIncident.areaOfInterestVersion,
  incidentAreaOfInterest: validIncident.areaOfInterest,
  distanceToAreaKm: 0,
  linkedAt: "2026-07-29T13:59:02Z",
  linkedBy: "incident-relevance-1.0.0",
} as const;

export const validAssertion = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.assertion,
  incidentId: IDS.incident,
  observationId: IDS.observation,
  subjectType: "incident",
  subjectKey: "plomari-2026-07-29",
  predicate: "protective_instruction",
  value: {
    kind: "evacuate",
    destination: "Agios Isidoros",
  },
  assertionType: "instruction",
  authorityScope: "protective_instruction",
  effectiveTime: exactTime,
  expiresAt: null,
  extractionMethod: "deterministic_parser",
  extractionVersion: "1.0.0",
  state: "active",
  recordedAt: "2026-07-29T13:59:03Z",
} as const;

export const validCanonicalEvent = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.event,
  incidentId: IDS.incident,
  eventType: "protective_instruction",
  firstEffectiveTime: exactTime,
  lastEffectiveTime: exactTime,
  geometry: {
    type: "Point",
    coordinates: [26.368, 38.976],
  },
  geometryPrecisionM: 1_000,
  lifecycle: "active",
  verificationState: "official",
  currentSummaryEn: "Authorities issued an evacuation instruction.",
  currentSummaryEl: "Οι αρχές εξέδωσαν οδηγία απομάκρυνσης.",
  translationState: "complete",
  reconciliationVersion: "1.0.0",
  recordedAt: "2026-07-29T13:59:02Z",
  details: {
    instructionKind: "evacuate",
    actionText: "Move toward Agios Isidoros.",
    originalLanguage: "el",
    originExplicit: true,
    destinationExplicit: true,
    affectedAreaExplicit: true,
  },
} as const;

export const validEventEvidence = {
  contractVersion: CONTRACT_VERSION,
  eventId: IDS.event,
  assertionId: IDS.assertion,
  relationship: "supports",
  rationaleCode: "official-alert-direct",
  linkedBy: "reconcile-1.0.0",
} as const;

export const validProtectiveAction = {
  contractVersion: CONTRACT_VERSION,
  sourceEventId: IDS.event,
  instructionEn: "Move toward Agios Isidoros.",
  instructionEl: "Απομακρυνθείτε προς τον Άγιο Ισίδωρο.",
  sourceLanguageText: "Απομακρυνθείτε προς παραλία Πλωμαρίου.",
  sourceLanguage: "el",
  sourceUrl: "https://x.com/112Greece/status/2082468150189167080",
  issuedAt: "2026-07-29T13:58:00Z",
  origin: null,
  affectedArea: {
    type: "Point",
    coordinates: [26.368, 38.976],
  },
  destination: {
    type: "Point",
    coordinates: [26.392, 38.969],
  },
} as const;

export const validIncidentStateSnapshot = {
  contractVersion: CONTRACT_VERSION,
  identityAlgorithmVersion: IDENTITY_ALGORITHM_VERSION,
  id: IDS.snapshotAfter,
  incidentId: IDS.incident,
  sequence: 2,
  calculatedAt: "2026-07-29T13:59:03Z",
  stateHash: "c".repeat(64),
  state: {
    officialStatus: "in_progress",
    activeInstructionEventIds: [IDS.event],
  },
  rulesetVersion: "1.0.0",
} as const;

export const validMaterialChange = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.change,
  incidentId: IDS.incident,
  sequence: 2,
  changeType: "protective_instruction",
  materiality: "critical",
  calculatedAt: "2026-07-29T13:59:04Z",
  beforeSnapshotId: IDS.snapshotBefore,
  afterSnapshotId: IDS.snapshotAfter,
  ruleId: "official-protective-instruction",
  ruleVersion: 1,
  evidenceEventIds: [IDS.event],
  summaryEn: "Authorities issued an evacuation instruction.",
  summaryEl: "Οι αρχές εξέδωσαν οδηγία απομάκρυνσης.",
  protectiveAction: validProtectiveAction,
  notificationEligible: true,
} as const;

export const validSourceHealthSample = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.sourceHealth,
  sourceKey: "112-greece",
  collectionTargetId: null,
  sampledAt: "2026-07-29T13:59:05Z",
  state: "healthy",
  lastAttemptAt: "2026-07-29T13:59:00Z",
  lastSuccessAt: "2026-07-29T13:59:00Z",
  lastChangedPayloadAt: "2026-07-29T13:59:00Z",
  latestSourcePublicationAt: "2026-07-29T13:58:00Z",
  consecutiveFailures: 0,
  latencyMs: 812,
  errorClass: null,
} as const;

export const validTargetedSourceHealthSample = {
  contractVersion: CONTRACT_VERSION,
  id: IDS.sourceHealth,
  collectionTargetId: validCollectionTarget.id,
  collectionTargetRevisionId: validCollectionTargetRevision.id,
  sampledAt: validSourceHealthSample.sampledAt,
  state: validSourceHealthSample.state,
  lastAttemptAt: validSourceHealthSample.lastAttemptAt,
  lastSuccessAt: validSourceHealthSample.lastSuccessAt,
  lastChangedPayloadAt: validSourceHealthSample.lastChangedPayloadAt,
  latestSourcePublicationAt:
    validSourceHealthSample.latestSourcePublicationAt,
  consecutiveFailures: validSourceHealthSample.consecutiveFailures,
  latencyMs: validSourceHealthSample.latencyMs,
  errorClass: validSourceHealthSample.errorClass,
} as const;

export const VALID_SCHEMA_EXAMPLES = {
  incident: validIncident,
  sourceProvider: validSourceProvider,
  sourceEndpoint: validSourceEndpoint,
  collectionTarget: validCollectionTarget,
  collectionTargetRevision: validCollectionTargetRevision,
  incidentSourceBinding: validIncidentSourceBinding,
  sourceDefinition: SOURCE_REGISTRY[0]!,
  ingestionRun: validIngestionRun,
  targetedIngestionRun: validTargetedIngestionRun,
  sourceItem: validSourceItem,
  endpointBoundSourceItem: validEndpointBoundSourceItem,
  globalObservation: validGlobalObservation,
  incidentObservationLink: validIncidentObservationLink,
  observation: validObservation,
  assertion: validAssertion,
  canonicalEvent: validCanonicalEvent,
  eventEvidence: validEventEvidence,
  protectiveAction: validProtectiveAction,
  incidentStateSnapshot: validIncidentStateSnapshot,
  materialChange: validMaterialChange,
  sourceHealthSample: validSourceHealthSample,
  targetedSourceHealthSample: validTargetedSourceHealthSample,
} as const;
