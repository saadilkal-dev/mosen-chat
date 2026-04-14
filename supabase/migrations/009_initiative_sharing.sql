-- Phase 1: Add sharing columns to initiatives table
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS published_by TEXT;  -- clerk_id
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS shared_with TEXT[];  -- array of org member emails

-- Phase 5: Track initiative invites
CREATE TABLE IF NOT EXISTS initiative_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  token TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_initiative_invites_initiative_id ON initiative_invites(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_invites_email ON initiative_invites(employee_email);
CREATE INDEX IF NOT EXISTS idx_initiative_invites_token ON initiative_invites(token);

-- Track escalations from employee to leader
CREATE TABLE IF NOT EXISTS escalation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  question TEXT NOT NULL,
  context TEXT,
  is_anonymized BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'responded', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalation_requests_initiative ON escalation_requests(initiative_id);
CREATE INDEX IF NOT EXISTS idx_escalation_requests_email ON escalation_requests(employee_email);

-- Leader responses to escalations
CREATE TABLE IF NOT EXISTS escalation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES escalation_requests(id) ON DELETE CASCADE,
  leader_response TEXT NOT NULL,
  shared_back BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalation_responses_escalation ON escalation_responses(escalation_id);
