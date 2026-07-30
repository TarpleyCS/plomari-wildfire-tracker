import {
  DEFAULT_FUTURE_TOLERANCE_SECONDS,
  validationReasonCodes,
} from "./constants";
import {
  sourceDefinitionSchema,
  type Assertion,
  type EndpointBoundSourceItem,
  type GlobalObservation,
  type IncidentObservationLink,
  type IsoDateTime,
  type Observation,
  type SourceDefinition,
  type SourceEndpoint,
  type TemporalValue,
  type ValidationReasonCode,
  type ValidationState,
} from "./schemas";

export type SemanticValidationResult = {
  readonly state: ValidationState;
  readonly reasonCodes: readonly ValidationReasonCode[];
};

function uniqueReasons(
  reasons: readonly ValidationReasonCode[],
): readonly ValidationReasonCode[] {
  return [...new Set(reasons)];
}

export function validateTemporalValue(
  value: TemporalValue,
  now: string,
  futureToleranceSeconds = DEFAULT_FUTURE_TOLERANCE_SECONDS,
): SemanticValidationResult {
  if (value.precision !== "exact") {
    return { state: "accepted", reasonCodes: [] };
  }

  const nowMs = Date.parse(now);
  const valueMs = Date.parse(value.instant);
  if (!Number.isFinite(nowMs) || !Number.isFinite(valueMs)) {
    return { state: "rejected", reasonCodes: ["invalid_timestamp"] };
  }
  if (valueMs > nowMs + futureToleranceSeconds * 1_000) {
    return { state: "quarantined", reasonCodes: ["future_timestamp"] };
  }
  return { state: "accepted", reasonCodes: [] };
}

export function validateObservationTimes(
  observation: Pick<GlobalObservation, "observedTime" | "effectiveTime">,
  now: string,
  futureToleranceSeconds = DEFAULT_FUTURE_TOLERANCE_SECONDS,
): SemanticValidationResult {
  const observed = validateTemporalValue(
    observation.observedTime,
    now,
    futureToleranceSeconds,
  );
  const effective = validateTemporalValue(
    observation.effectiveTime,
    now,
    futureToleranceSeconds,
  );
  const reasons = uniqueReasons([
    ...observed.reasonCodes,
    ...effective.reasonCodes,
  ]);
  if (observed.state === "rejected" || effective.state === "rejected") {
    return { state: "rejected", reasonCodes: reasons };
  }
  if (observed.state === "quarantined" || effective.state === "quarantined") {
    return { state: "quarantined", reasonCodes: reasons };
  }
  return { state: "accepted", reasonCodes: [] };
}

export type LegacyReplayProtectiveActionProvenance = {
  readonly source: SourceDefinition;
  readonly observation: Observation;
  readonly assertion: Assertion;
};

export type ProtectiveActionProvenance = {
  readonly endpoint: SourceEndpoint;
  readonly sourceItem: EndpointBoundSourceItem;
  readonly observation: GlobalObservation;
  readonly incidentLink: IncidentObservationLink;
  readonly assertion: Assertion;
  readonly evaluatedAt: IsoDateTime;
};

function validateProtectiveActionChain(
  source: Pick<SourceDefinition, "sourceKind" | "authorityScopes">,
  observation: Pick<
    GlobalObservation,
    "validationState" | "observationType"
  >,
  assertion: Assertion,
): SemanticValidationResult {
  const reasons: ValidationReasonCode[] = [];
  if (
    source.sourceKind === "publisher" ||
    source.sourceKind === "public_broadcaster"
  ) {
    reasons.push("publisher_cannot_issue_protective_action");
  }
  if (
    source.sourceKind !== "official_alert" ||
    !source.authorityScopes.includes("protective_instruction")
  ) {
    reasons.push("untrusted_protective_instruction");
  }
  if (
    observation.validationState !== "accepted" ||
    observation.observationType !== "protective_instruction"
  ) {
    reasons.push("untrusted_protective_instruction");
  }
  if (
    assertion.assertionType !== "instruction" ||
    assertion.authorityScope !== "protective_instruction"
  ) {
    reasons.push("authority_scope_mismatch");
  }
  if (
    assertion.extractionMethod !== "source_field" &&
    assertion.extractionMethod !== "deterministic_parser"
  ) {
    reasons.push("untrusted_protective_instruction");
  }

  const unique = uniqueReasons(reasons);
  return unique.length === 0
    ? { state: "accepted", reasonCodes: [] }
    : { state: "rejected", reasonCodes: unique };
}

/** @deprecated Replay-only check; it is not a production authorization gate. */
export function validateLegacyReplayProtectiveActionProvenance(
  provenance: LegacyReplayProtectiveActionProvenance,
): SemanticValidationResult {
  const { source, observation, assertion } = provenance;
  return validateProtectiveActionChain(source, observation, assertion);
}

export function validateProtectiveActionProvenance(
  provenance: ProtectiveActionProvenance,
): SemanticValidationResult {
  const {
    endpoint,
    sourceItem,
    observation,
    incidentLink,
    assertion,
    evaluatedAt,
  } = provenance;
  const base = validateProtectiveActionChain(
    endpoint,
    observation,
    assertion,
  );
  const reasons: ValidationReasonCode[] = [...base.reasonCodes];

  if (
    sourceItem.sourceEndpointId !== endpoint.id ||
    observation.sourceItemId !== sourceItem.id ||
    incidentLink.observationId !== observation.id ||
    assertion.observationId !== observation.id ||
    assertion.incidentId !== incidentLink.incidentId
  ) {
    reasons.push("provenance_chain_mismatch");
  }
  if (assertion.state !== "active") {
    reasons.push("inactive_assertion");
  }
  const evaluatedAtMs = Date.parse(evaluatedAt);
  if (!Number.isFinite(evaluatedAtMs)) {
    reasons.push("invalid_timestamp");
  } else {
    if (
      assertion.expiresAt !== null &&
      Date.parse(assertion.expiresAt) <= evaluatedAtMs
    ) {
      reasons.push("expired_assertion");
    }
    if (
      Date.parse(sourceItem.recordedAt) > evaluatedAtMs ||
      Date.parse(observation.recordedAt) > evaluatedAtMs ||
      Date.parse(incidentLink.linkedAt) > evaluatedAtMs ||
      Date.parse(assertion.recordedAt) > evaluatedAtMs ||
      (assertion.effectiveTime.precision === "exact" &&
        Date.parse(assertion.effectiveTime.instant) > evaluatedAtMs)
    ) {
      reasons.push("provenance_timing_mismatch");
    }
  }

  const unique = uniqueReasons(reasons);
  return unique.length === 0
    ? { state: "accepted", reasonCodes: [] }
    : { state: "rejected", reasonCodes: unique };
}

export function validateSourceRegistryDefinitions(
  registry: readonly SourceDefinition[],
): readonly string[] {
  const errors: string[] = [];
  const keys = new Set<string>();

  registry.forEach((source, index) => {
    const parsed = sourceDefinitionSchema.safeParse(source);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        errors.push(
          `${source.key || `source[${index}]`}: ${issue.path.join(".") || "root"} ${issue.message}`,
        );
      });
    }

    if (keys.has(source.key)) {
      errors.push(`duplicate source key: ${source.key}`);
    }
    keys.add(source.key);

    if (
      source.sourceKind === "publisher" &&
      source.authorityScopes.includes("protective_instruction")
    ) {
      errors.push(
        `${source.key}: publishers cannot hold protective-instruction authority`,
      );
    }
    if (
      source.sourceKind === "public_broadcaster" &&
      source.authorityScopes.includes("protective_instruction")
    ) {
      errors.push(
        `${source.key}: broadcasters cannot hold protective-instruction authority`,
      );
    }
  });

  return errors;
}

export function isValidationReasonCode(
  value: string,
): value is ValidationReasonCode {
  return (validationReasonCodes as readonly string[]).includes(value);
}
