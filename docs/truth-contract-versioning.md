# Truth contract versioning

The truth layer uses explicit semantic versions. Version 1 is exported from
`lib/truth/v1`, and every generated JSON Schema has a stable `$id` containing
the contract version.

## Current contract: 1.1.0

Version 1.1 adds the global, multi-incident collection boundary without
rewriting v1.0 evidence:

- `Incident` is a versioned contract with a versioned area of interest.
- An organization-level `SourceProvider` is separate from each
  `SourceEndpoint` or account. Source kind, claim authority, content policy,
  adapter, license policy, and credential reference are endpoint-specific; a
  provider default never authorizes reuse of a different product.
- `CollectionTarget` owns query parameters, geography, cadence, freshness, and
  operational enablement. The Plomari profile is target configuration, not
  part of a global endpoint identity.
- Every mutable target configuration is captured as an immutable,
  content-hashed `CollectionTargetRevision`. Canonical ingestion and health
  records reference both the target and exact revision used.
- `IncidentSourceBinding` selects the targets relevant to an incident.
- Canonical `GlobalObservation` records contain no incident ID. An immutable
  `IncidentObservationLink` records relevance method, rationale, distance,
  and the exact area-of-interest geometry and version used for evaluation.
- Canonical `EndpointBoundSourceItem` records reference a registered endpoint
  and ingestion run; canonical runs and source-health samples contain no free
  legacy `sourceKey` that could disagree with their target.
- Persisted entities must supply `contractVersion: "1.1.0"` explicitly. The
  runtime and generated JSON Schemas reject missing or older values.
- Unversioned v1.0 runs cross only the explicitly named
  `upgradeLegacyV10IngestionRun` adapter. Its result preserves source version,
  target version, adapter name, and legacy key metadata; no parser silently
  relabels an old envelope.

The combined `SourceDefinition`, incident-scoped `Observation`, source-keyed
`IngestionRun`, source-keyed `SourceItem`, and source-keyed
`SourceHealthSample` schemas remain deprecated compatibility contracts. New
writers use the endpoint-bound or target-revision-bound counterparts.

## Compatibility policy

- **Patch** changes may clarify descriptions, add validation that only rejects
  values already outside the documented contract, or add optional fields.
- **Minor** changes may add enum members, new event variants, or new optional
  fields. Consumers must preserve unknown evidence and must not silently
  reinterpret a new enum member.
- **Major** changes are required when a field is removed, renamed, made
  required, changes meaning or units, or when identity/canonicalization changes.
- Persisted evidence records retain the contract, adapter, parser, collector,
  reconciliation, and ruleset versions that produced them.
- Readers may support multiple major versions during migration. Writers emit
  exactly one configured major version.
- A major-version migration creates new normalized records or read models; it
  never mutates immutable source evidence in place.

## Runtime validation boundary

Zod schemas are the TypeScript source of truth. The corresponding Draft
2020-12 JSON Schemas are exported through `TRUTH_JSON_SCHEMAS`. Canonical
objects use strict schemas, so undocumented fields fail validation instead of
being silently discarded.

JSON Schema cannot express every cross-field rule, such as timestamp ordering,
revision/supersession lifecycle, geometry/precision pairing, or configuration
hash recomputation. Generated schemas identify these in
`x-runtime-refinements`; persistence still requires the Zod runtime boundary
and any named registry or repository validator identified by the contract.

Structural rejection and semantic quarantine are intentionally different:

- malformed envelopes and impossible types are rejected;
- structurally valid but unsafe values, such as future timestamps or invalid
  authority claims, are retained as quarantined evidence;
- only accepted observations may reach reconciliation, read models, maps, or
  notification evaluation.

## Identity policy and pre-deployment rebaseline

Contract version and identity-algorithm version are independent axes. Contract
1.1 establishes identity algorithm `2.0.0`, a major identity change because it
replaces locale collation with deterministic ECMAScript code-unit ordering.
Every canonical source item, collection-target revision, and incident-state
snapshot persists `identityAlgorithmVersion`. Every semantic, FIRMS detection,
and FIRMS pass key is prefixed with that version, so v1 and v2 keys cannot
collide.

This repository has not yet established a production persistence baseline.
Before Phase 1 provisioning, sanitized fixtures and any disposable shadow data
must be rebaselined under identity v2. If v1 hashes exist in a durable store,
they are never recomputed or overwritten: a v2 calculation creates a new
immutable revision with `kind: identity_rebaseline`, the prior version remains
auditable, and compound uniqueness includes the identity version.

Source identity uses, in order:

1. a stable source-provided identifier;
2. a normalized canonical URL;
3. a sensor-specific natural key;
4. source endpoint ID, normalized time, and canonical payload hash.

Canonical JSON sorts object keys by deterministic ECMAScript code-unit order,
never locale collation, and rejects non-finite numbers before hashing.
FIRMS identity rounds latitude and longitude to four decimal places while
retaining the original coordinates in evidence. Missing scan or track values
use an explicit `null` token in the natural key; they are never replaced with a
fabricated numeric value. A FIRMS detecting pass groups consecutive detections
from the same product and satellite when their gap is no more than ten minutes.
Equal-time detections and passes use natural-key code-unit tie-breakers, so
input order cannot alter the persisted grouping.

Record UUIDv7 values remain separate from semantic keys. Idempotency is based
on the semantic key and content hash, not on regenerating the same UUID.

## Fixture policy

The sanitized fixture corpus covers every registered source and adapter family.
It contains no credentials, authorization headers, user location, or full
publisher article bodies. Every source has at least one success fixture and one
failure fixture, while the corpus also covers:

- successful zero results;
- source corrections;
- malformed and future timestamps;
- partial parse failure;
- timeout;
- authentication failure;
- quota exhaustion;
- malformed payloads;
- publisher evacuation wording that must never become an official protective
  action.

Contract tests replay identical FIRMS input 100 times, verify correction
versioning and identity rebaselining, enforce the full endpoint → source item →
global observation → incident link → active, already-recorded, unexpired
assertion chain for protective actions, and keep source health independent from
incident status.
