-- Employee initiative experience (ported from Redis keys)

CREATE TABLE IF NOT EXISTS initiatives (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_org ON initiatives(org_id);

CREATE TABLE IF NOT EXISTS initiative_briefs (
  initiative_id TEXT PRIMARY KEY REFERENCES initiatives(id) ON DELETE CASCADE,
  content JSONB,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS initiative_chats (
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  emp_email TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (initiative_id, emp_email)
);

CREATE TABLE IF NOT EXISTS initiative_consents (
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  emp_email TEXT NOT NULL,
  consent_id TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT '',
  proposed_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at_ms BIGINT,
  created_at_ms BIGINT NOT NULL,
  PRIMARY KEY (initiative_id, emp_email, consent_id)
);

CREATE INDEX IF NOT EXISTS idx_initiative_consents_lookup
  ON initiative_consents (initiative_id, theme, status);

CREATE TABLE IF NOT EXISTS initiative_responses (
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  emp_email TEXT NOT NULL,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (initiative_id, emp_email)
);

CREATE TABLE IF NOT EXISTS initiative_closed_loops (
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  emp_email TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (initiative_id, emp_email)
);

CREATE TABLE IF NOT EXISTS initiative_synthesis (
  initiative_id TEXT PRIMARY KEY REFERENCES initiatives(id) ON DELETE CASCADE,
  reports JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS initiative_assignments (
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  emp_email TEXT NOT NULL,
  PRIMARY KEY (initiative_id, emp_email)
);

CREATE TABLE IF NOT EXISTS email_send_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at_ms BIGINT NOT NULL,
  provider_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
