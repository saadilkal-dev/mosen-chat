-- Leader initiative fields + stores (ported from Redis)

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS initiative_type TEXT NOT NULL DEFAULT 'leader';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS leader_clerk_id TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS brief_complete BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS playbook_generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS brief_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_initiatives_leader ON initiatives(leader_clerk_id);

CREATE TABLE IF NOT EXISTS initiative_playbooks (
  initiative_id TEXT PRIMARY KEY REFERENCES initiatives(id) ON DELETE CASCADE,
  versions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS initiative_outreach_store (
  initiative_id TEXT PRIMARY KEY REFERENCES initiatives(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS initiative_pivot_log (
  initiative_id TEXT PRIMARY KEY REFERENCES initiatives(id) ON DELETE CASCADE,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS initiative_leader_chats (
  initiative_id TEXT PRIMARY KEY REFERENCES initiatives(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
