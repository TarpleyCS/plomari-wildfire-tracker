-- Cover every foreign-key tuple identified by the hosted Supabase advisor.
-- PostgreSQL does not create indexes for referencing columns automatically.
create index adapter_releases_fk_8ee72eb91e_idx on core.adapter_releases (previous_release_id, source_id);
create index aoi_versions_fk_6ebde9f366_idx on core.aoi_versions (previous_version_id, incident_id);
create index aoi_versions_fk_a56a1c19df_idx on core.aoi_versions (source_event_cursor, incident_id);
create index collection_target_revisions_fk_16944aaa5e_idx on core.collection_target_revisions (aoi_version_id, incident_id);
create index collection_target_revisions_fk_8b7218790e_idx on core.collection_target_revisions (previous_revision_id, collection_target_id);
create index collection_target_revisions_fk_7240752225_idx on core.collection_target_revisions (collection_target_id, endpoint_id);
create index collection_targets_fk_5733854299_idx on core.collection_targets (endpoint_id, source_id);
create index collection_targets_fk_7d709e2f69_idx on core.collection_targets (source_id);

create index collection_target_state_fk_3689c1d9de_idx on ingest.collection_target_state (collection_target_revision_id, collection_target_id);
create index global_observations_fk_ab25f87805_idx on ingest.global_observations (source_revision_id, source_id, source_record_key);
create index incident_relevance_fk_1c851cd346_idx on ingest.incident_relevance (aoi_version_id, incident_id);
create index jobs_fk_3c6c48c3f8_idx on ingest.jobs (adapter_release_id, source_id);
create index jobs_fk_d6551064e4_idx on ingest.jobs (endpoint_id, source_id);
create index jobs_fk_aa1c69a930_idx on ingest.jobs (collection_target_id, endpoint_id);
create index jobs_fk_091936c2a2_idx on ingest.jobs (collection_target_revision_id, collection_target_id);
create index raw_objects_fk_4349a2830a_idx on ingest.raw_objects (blob_id, content_sha256);
create index raw_objects_fk_96801eea6d_idx on ingest.raw_objects (endpoint_id, source_id);
create index raw_objects_fk_bb7d4ec74f_idx on ingest.raw_objects (run_id, source_id, endpoint_id);
create index raw_objects_fk_95e9a9dfb0_idx on ingest.raw_objects (source_id);
create index runs_fk_1acd6e784c_idx on ingest.runs (adapter_release_id, source_id);
create index runs_fk_6befa7c289_idx on ingest.runs (endpoint_id, source_id);
create index runs_fk_e5229aa214_idx on ingest.runs (job_id, source_id, endpoint_id, collection_target_id, collection_target_revision_id, adapter_release_id);
create index source_revisions_fk_4f1b3cc015_idx on ingest.source_revisions (adapter_release_id, source_id);
create index source_revisions_fk_c2638de88b_idx on ingest.source_revisions (previous_revision_id, source_id, source_record_key);
create index source_revisions_fk_63bd025415_idx on ingest.source_revisions (raw_object_id, run_id, source_id);
create index source_revisions_fk_c3865543be_idx on ingest.source_revisions (run_id, source_id, adapter_release_id);

create index assertions_fk_d1451b10e9_idx on truth.assertions (previous_assertion_cursor, incident_id, assertion_key);
create index events_fk_9cf7262059_idx on truth.events (supersedes_event_cursor, incident_id);
create index evidence_fk_8a9ab3ad93_idx on truth.evidence (assertion_cursor, incident_id);
create index evidence_fk_98375dce07_idx on truth.evidence (event_cursor, incident_id);
create index material_changes_fk_bcb53a6e49_idx on truth.material_changes (basis_event_cursor, incident_id);
create index material_changes_fk_c161f0acee_idx on truth.material_changes (basis_evidence_id, incident_id);
create index material_changes_fk_682f9d8251_idx on truth.material_changes (from_snapshot_cursor, incident_id);
create index material_changes_fk_df06269d4a_idx on truth.material_changes (to_snapshot_cursor, incident_id);
create index outbox_fk_f06c43e01e_idx on truth.outbox (material_change_cursor, incident_id);
create index outbox_fk_16b60f4025_idx on truth.outbox (event_cursor, incident_id);
create index outbox_fk_aaad4938b0_idx on truth.outbox (incident_id);
create index outbox_fk_4d24199486_idx on truth.outbox (publication_cursor, incident_id);
create index publications_fk_559931e29a_idx on truth.publications (material_change_cursor, incident_id);
create index publications_fk_d9053dfeab_idx on truth.publications (event_cursor, incident_id);
create index publications_fk_4a17eea047_idx on truth.publications (snapshot_cursor, incident_id);
create index snapshots_fk_c3484133d5_idx on truth.snapshots (basis_event_cursor, incident_id);
create index snapshots_fk_9a5b512378_idx on truth.snapshots (previous_snapshot_cursor, incident_id);
create index source_health_fk_807f356bbc_idx on truth.source_health (endpoint_id, source_id);
create index source_health_fk_2ea2aea682_idx on truth.source_health (run_id, source_id, endpoint_id, collection_target_id, collection_target_revision_id);
create index source_health_fk_7dc75aeca8_idx on truth.source_health (collection_target_id, endpoint_id);
create index source_health_fk_51d81b7ea6_idx on truth.source_health (collection_target_revision_id, collection_target_id);

-- Keep the earlier, semantically named time/cursor index.
drop index truth.material_changes_incident_cursor_idx;
