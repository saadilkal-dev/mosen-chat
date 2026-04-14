-- Add rolling conversation summary to leader chats for cross-request memory
ALTER TABLE initiative_leader_chats
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
