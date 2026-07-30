import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260730132113_initial_truth_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const seed = readFileSync(
  new URL("../supabase/seed.sql", import.meta.url),
  "utf8",
);
const config = readFileSync(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8",
);

function functionDefinition(qualifiedName: string) {
  const start = migration.indexOf(
    `create or replace function ${qualifiedName}`,
  );
  expect(start, `${qualifiedName} exists`).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf("$$;", start);
  expect(end, `${qualifiedName} has a complete body`).toBeGreaterThan(start);
  return migration.slice(start, end + 3);
}

describe("Supabase production boundary", () => {
  it("exposes only the curated API schema", () => {
    expect(config).toMatch(/^schemas = \["api"\]$/m);
    expect(config).not.toMatch(/^schemas = .*\b(core|ingest|truth)\b/m);
  });

  it("keeps unused public account registration disabled", () => {
    expect(config.match(/^enable_signup = false$/gm)).toHaveLength(2);
    expect(config).not.toMatch(/^enable_signup = true$/m);
    expect(config).toMatch(/^enable_anonymous_sign_ins = false$/m);
  });

  it("enables and forces RLS on every application table", () => {
    const tables = Array.from(
      migration.matchAll(/^create table ((?:core|ingest|truth)\.[a-z_]+) \(/gm),
      (match) => match[1],
    );

    expect(tables.length).toBeGreaterThan(20);
    for (const table of tables) {
      expect(migration, `${table} enables RLS`).toContain(
        `alter table ${table} enable row level security;`,
      );
      expect(migration, `${table} forces RLS`).toContain(
        `alter table ${table} force row level security;`,
      );
    }
  });

  it("keeps security-definer worker functions on an empty search path", () => {
    const definitions = Array.from(
      migration.matchAll(
        /create or replace function [\s\S]*?\$\$;/g,
      ),
      (match) => match[0],
    ).filter((definition) => definition.includes("security definer"));

    expect(definitions.length).toBeGreaterThanOrEqual(6);
    for (const definition of definitions) {
      expect(definition).toContain("set search_path = ''");
    }
  });

  it("fences queue heartbeats and terminal writes with the live lease", () => {
    for (const name of [
      "ingest.heartbeat_collection_job",
      "ingest.finish_collection_job",
      "truth.heartbeat_outbox_message",
      "truth.finish_outbox_message",
    ]) {
      const definition = functionDefinition(name);
      expect(definition).toContain("lease_token = p_lease_token");
      expect(definition).toContain("lease_owner = p_worker_id");
      expect(definition).toContain("lease_expires_at > now()");
    }

    expect(migration).toMatch(
      /revoke update, delete on[\s\S]*?ingest\.jobs[\s\S]*?from service_role;/,
    );
    expect(migration).toMatch(
      /revoke update, delete on[\s\S]*?truth\.outbox[\s\S]*?from service_role;/,
    );
  });

  it("keeps public observations fail-closed on validation and licensing", () => {
    expect(migration).toContain("and validation_state = 'accepted'");
    expect(migration).toContain("and s.license_status = 'approved'");
    expect(migration).toContain("and s.redistribution_allowed is true");
    expect(migration).not.toContain("accepted_with_warnings");
  });

  it("requires full official-alert provenance before protective publication", () => {
    const authorityGate = functionDefinition(
      "truth.protective_event_has_publishable_authority",
    );
    const publicationGate = functionDefinition(
      "truth.validate_publication_chain",
    );

    expect(authorityGate).toContain("ep.source_kind = 'official_alert'");
    expect(authorityGate).toContain(
      "o.observation_kind = 'protective_instruction'",
    );
    expect(authorityGate).toContain("o.validation_state = 'accepted'");
    expect(authorityGate).toContain("from ingest.incident_relevance");
    expect(authorityGate).toContain("relevance.incident_id = e.incident_id");
    expect(authorityGate).toContain("relevance.evaluated_at <= p_action_at");
    expect(authorityGate).toContain("assertion.assertion_status = 'active'");
    expect(authorityGate).toContain("assertion.recorded_at <= p_action_at");
    expect(publicationGate).toContain(
      "truth.protective_event_has_publishable_authority",
    );
  });

  it("does not project private free-form JSON directly through public views", () => {
    const publicViews = migration.slice(
      migration.indexOf("create view api.source_catalog"),
    );

    expect(publicViews).not.toMatch(/\bo\.properties\b/);
    expect(publicViews).not.toMatch(/\be\.payload\b/);
    expect(publicViews).not.toMatch(/\blatest\.state\b/);
    expect(publicViews).not.toMatch(/\bc\.change_data\b/);
  });
});

describe("Evidence and contract invariants", () => {
  it("persists target configuration and snapshot identity provenance", () => {
    expect(migration).toMatch(
      /create table core\.collection_target_revisions \([\s\S]*?configuration_sha256 text not null/,
    );
    expect(migration).toMatch(
      /create table core\.collection_target_revisions \([\s\S]*?endpoint_id bigint not null/,
    );
    expect(migration).toMatch(
      /create table core\.collection_target_revisions \([\s\S]*?enabled boolean not null/,
    );
    expect(migration).toMatch(
      /create table truth\.snapshots \([\s\S]*?identity_version text not null/,
    );
  });

  it("prevents multiple independent publication roots for one subject", () => {
    expect(migration).toContain("publications_event_root_key");
    expect(migration).toContain("publications_snapshot_root_key");
    expect(migration).toContain("publications_change_root_key");
  });

  it("uses the current contract and identity versions in catalog seed data", () => {
    expect(seed).not.toMatch(/contract_version[^\n]*2\.0\.0/);
    expect(seed).not.toMatch(/identity_version[^\n]*1\.1\.0/);
    expect(seed).toContain("'1.1.0'");
    expect(seed).toContain("'2.0.0'");
  });

  it("seeds reproducible-looking, unique target hashes", () => {
    const hashes = Array.from(
      seed.matchAll(/'([a-f0-9]{64})'/g),
      (match) => match[1],
    );
    expect(hashes.length).toBeGreaterThanOrEqual(14);
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});

describe("disabled source catalog", () => {
  it.each([
    "nasa-firms",
    "nasa-eonet",
    "gdacs-alerts",
    "open-meteo-weather",
    "noaa-nws-alerts",
    "noaa-metar",
    "nasa-gibs",
    "hellenic-fire-service-updates",
    "greece-civil-protection-alerts",
    "effis",
    "gwis",
    "meteoalarm",
    "inforcyl",
    "infoca",
  ])("contains %s", (source) => {
    expect(seed).toContain(`'${source}'`);
  });

  it("does not provision evidence, credentials, or live incidents", () => {
    expect(seed).not.toMatch(/insert into (?:ingest\.(?:runs|raw_objects|source_revisions|global_observations|incident_relevance)|truth\.)/i);
    expect(seed).not.toMatch(/insert into core\.(?:incidents|aoi_versions|incident_bindings)/i);
    expect(seed).not.toMatch(/\bBearer\s+[A-Za-z0-9._~-]+/i);
    expect(seed).not.toMatch(/\b(?:sk|sbp)_[A-Za-z0-9_-]{16,}\b/);
    expect(seed).toContain("FIRMS_MAP_KEY");
  });
});
