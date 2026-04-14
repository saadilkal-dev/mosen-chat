-- Pre-provision org + roster before the leader's Clerk account exists (claimed on first sign-in by email).

ALTER TABLE organizations
  ALTER COLUMN admin_user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS leader_provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  leader_email TEXT NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_clerk_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leader_provisions_pending_email
  ON leader_provisions (lower(leader_email))
  WHERE claimed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leader_provisions_org ON leader_provisions (org_id);
