-- Caches AI-generated artifact content for playbook activities
create table if not exists initiative_artifacts (
  id            uuid default gen_random_uuid() primary key,
  initiative_id text not null references initiatives(id) on delete cascade,
  artifact_key  text not null,
  content       text not null,
  generated_at  timestamptz default now(),

  unique(initiative_id, artifact_key)
);

-- Index for fast lookups
create index if not exists idx_artifacts_init_key
  on initiative_artifacts(initiative_id, artifact_key);
