-- Keep only foreign-key access paths that add a genuinely new leading column.
-- Existing primary, unique, partial, and workload indexes already cover the
-- leading columns for the dropped tuples; retaining all 47 would add needless
-- write amplification to ingestion-heavy tables.
drop index
  core.adapter_releases_fk_8ee72eb91e_idx,
  core.aoi_versions_fk_6ebde9f366_idx,
  core.collection_target_revisions_fk_16944aaa5e_idx,
  core.collection_target_revisions_fk_8b7218790e_idx,
  core.collection_target_revisions_fk_7240752225_idx,
  core.collection_targets_fk_5733854299_idx;

drop index
  ingest.collection_target_state_fk_3689c1d9de_idx,
  ingest.global_observations_fk_ab25f87805_idx,
  ingest.incident_relevance_fk_1c851cd346_idx,
  ingest.jobs_fk_3c6c48c3f8_idx,
  ingest.jobs_fk_d6551064e4_idx,
  ingest.jobs_fk_aa1c69a930_idx,
  ingest.jobs_fk_091936c2a2_idx,
  ingest.raw_objects_fk_4349a2830a_idx,
  ingest.raw_objects_fk_96801eea6d_idx,
  ingest.raw_objects_fk_bb7d4ec74f_idx,
  ingest.runs_fk_1acd6e784c_idx,
  ingest.runs_fk_6befa7c289_idx,
  ingest.runs_fk_e5229aa214_idx,
  ingest.source_revisions_fk_4f1b3cc015_idx,
  ingest.source_revisions_fk_c2638de88b_idx,
  ingest.source_revisions_fk_63bd025415_idx,
  ingest.source_revisions_fk_c3865543be_idx;

drop index
  truth.assertions_fk_d1451b10e9_idx,
  truth.events_fk_9cf7262059_idx,
  truth.evidence_fk_8a9ab3ad93_idx,
  truth.evidence_fk_98375dce07_idx,
  truth.material_changes_fk_bcb53a6e49_idx,
  truth.material_changes_fk_c161f0acee_idx,
  truth.material_changes_fk_682f9d8251_idx,
  truth.material_changes_fk_df06269d4a_idx,
  truth.outbox_fk_f06c43e01e_idx,
  truth.outbox_fk_16b60f4025_idx,
  truth.outbox_fk_4d24199486_idx,
  truth.publications_fk_559931e29a_idx,
  truth.publications_fk_d9053dfeab_idx,
  truth.publications_fk_4a17eea047_idx,
  truth.snapshots_fk_c3484133d5_idx,
  truth.snapshots_fk_9a5b512378_idx,
  truth.source_health_fk_807f356bbc_idx,
  truth.source_health_fk_2ea2aea682_idx,
  truth.source_health_fk_7dc75aeca8_idx,
  truth.source_health_fk_51d81b7ea6_idx;

alter index core.aoi_versions_fk_a56a1c19df_idx
  rename to aoi_versions_source_event_cursor_idx;
alter index core.collection_targets_fk_7d709e2f69_idx
  rename to collection_targets_source_id_idx;
alter index ingest.raw_objects_fk_95e9a9dfb0_idx
  rename to raw_objects_source_id_idx;
alter index truth.outbox_fk_aaad4938b0_idx
  rename to outbox_incident_id_idx;
