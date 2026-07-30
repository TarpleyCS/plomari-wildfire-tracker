import { z } from "zod";

import { CONTRACT_VERSION } from "./constants";
import {
  assertionSchema,
  canonicalEventSchema,
  collectionTargetRevisionSchema,
  collectionTargetSchema,
  endpointBoundSourceItemSchema,
  eventEvidenceSchema,
  globalObservationSchema,
  incidentObservationLinkSchema,
  incidentSchema,
  incidentSourceBindingSchema,
  incidentStateSnapshotSchema,
  ingestionRunSchema,
  materialChangeSchema,
  observationSchema,
  protectiveActionSchema,
  sourceDefinitionSchema,
  sourceEndpointSchema,
  sourceHealthSampleSchema,
  sourceItemSchema,
  sourceProviderSchema,
  targetedIngestionRunSchema,
  targetedSourceHealthSampleSchema,
} from "./schemas";

const schemas = {
  incident: incidentSchema,
  sourceProvider: sourceProviderSchema,
  sourceEndpoint: sourceEndpointSchema,
  collectionTarget: collectionTargetSchema,
  collectionTargetRevision: collectionTargetRevisionSchema,
  incidentSourceBinding: incidentSourceBindingSchema,
  sourceDefinition: sourceDefinitionSchema,
  ingestionRun: ingestionRunSchema,
  targetedIngestionRun: targetedIngestionRunSchema,
  sourceItem: sourceItemSchema,
  endpointBoundSourceItem: endpointBoundSourceItemSchema,
  globalObservation: globalObservationSchema,
  incidentObservationLink: incidentObservationLinkSchema,
  observation: observationSchema,
  assertion: assertionSchema,
  canonicalEvent: canonicalEventSchema,
  eventEvidence: eventEvidenceSchema,
  protectiveAction: protectiveActionSchema,
  incidentStateSnapshot: incidentStateSnapshotSchema,
  materialChange: materialChangeSchema,
  sourceHealthSample: sourceHealthSampleSchema,
  targetedSourceHealthSample: targetedSourceHealthSampleSchema,
} as const;

export type TruthJsonSchemaName = keyof typeof schemas;

const runtimeOnlyRefinements: Partial<
  Record<TruthJsonSchemaName, readonly string[]>
> = {
  incident: ["updatedAt/endedAt temporal ordering"],
  collectionTarget: ["geometry/precision pairing", "cadence before staleness"],
  collectionTargetRevision: [
    "geometry/precision pairing",
    "cadence before staleness",
    "revision/supersedes lifecycle",
    "configurationHash verification against canonical configuration",
  ],
  ingestionRun: ["status/finishedAt lifecycle", "timestamp ordering"],
  targetedIngestionRun: ["status/finishedAt lifecycle", "timestamp ordering"],
  sourceItem: ["revision/supersedes lifecycle", "timestamp ordering"],
  endpointBoundSourceItem: [
    "revision/supersedes lifecycle",
    "timestamp ordering",
  ],
  globalObservation: [
    "geometry/precision pairing",
    "validation state/reasons consistency",
  ],
  observation: [
    "geometry/precision pairing",
    "validation state/reasons consistency",
  ],
  assertion: ["expiry after exact effective time"],
  canonicalEvent: ["geometry/precision pairing"],
  materialChange: ["protective action/materiality consistency"],
};

export function truthJsonSchemaId(name: TruthJsonSchemaName): string {
  return `https://plomari-firewatch.org/schemas/truth/${CONTRACT_VERSION}/${name}.schema.json`;
}

export function buildTruthJsonSchema(name: TruthJsonSchemaName) {
  const schema = z.toJSONSchema(schemas[name], {
    target: "draft-2020-12",
    unrepresentable: "any",
    io: "input",
  });

  const refinements = runtimeOnlyRefinements[name];
  return {
    ...schema,
    $id: truthJsonSchemaId(name),
    title: `${name} truth-layer contract v${CONTRACT_VERSION}`,
    "x-contract-version": CONTRACT_VERSION,
    ...(refinements
      ? {
          "x-runtime-refinements": refinements,
          "x-runtime-validation-note":
            "JSON Schema cannot represent these cross-field rules; validate with the runtime contract and named registry or repository validators before persistence.",
        }
      : {}),
  };
}

export const TRUTH_JSON_SCHEMAS = Object.freeze(
  Object.fromEntries(
    (Object.keys(schemas) as TruthJsonSchemaName[]).map((name) => [
      name,
      buildTruthJsonSchema(name),
    ]),
  ) as Record<TruthJsonSchemaName, ReturnType<typeof buildTruthJsonSchema>>,
);
