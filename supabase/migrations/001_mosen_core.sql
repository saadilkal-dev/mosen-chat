-- Mosen app data (accessed only from Next.js API routes via service role).

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_user_profiles (
  clerk_user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'leader',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_user_profiles_org ON app_user_profiles(org_id);

CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  emp_email TEXT NOT NULL,
  emp_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_org ON invites(org_id);

CREATE TABLE IF NOT EXISTS org_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  invite_token TEXT NOT NULL UNIQUE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Legacy PoC: /leader and /employee chat persistence
CREATE TABLE IF NOT EXISTS legacy_browser_chats (
  browser_id TEXT NOT NULL,
  persona TEXT NOT NULL,
  chats JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (browser_id, persona)
);

CREATE TABLE IF NOT EXISTS admin_session_previews (
  persona TEXT NOT NULL,
  browser_id TEXT NOT NULL,
  chat_count INT NOT NULL DEFAULT 0,
  message_count INT NOT NULL DEFAULT 0,
  last_activity_ms BIGINT NOT NULL,
  last_preview TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (persona, browser_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_previews_activity ON admin_session_previews(last_activity_ms DESC);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id TEXT PRIMARY KEY,
  browser_id TEXT NOT NULL,
  persona TEXT NOT NULL,
  chat_id TEXT,
  responses JSONB NOT NULL,
  submitted_at_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_submitted ON feedback_submissions(submitted_at_ms DESC);

CREATE TABLE IF NOT EXISTS chats_by_user (
  user_id TEXT PRIMARY KEY,
  chats JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
