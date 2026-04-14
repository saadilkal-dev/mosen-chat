-- Add rolling conversation summary to employee chats for cross-request memory
ALTER TABLE initiative_chats
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
