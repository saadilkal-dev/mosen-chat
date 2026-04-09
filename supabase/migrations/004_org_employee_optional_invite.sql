-- Allow roster rows without an invite token (invite emails sent later, e.g. from outreach).

ALTER TABLE org_employees
  ALTER COLUMN invite_token DROP NOT NULL;
