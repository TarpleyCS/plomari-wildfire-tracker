-- Keep the hosted Supabase Data API aligned with the application boundary.
-- This explicit role setting makes the database migration the source of truth:
-- only curated security-invoker projections in api are exposed.
alter role authenticator set pgrst.db_schemas = 'api';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
