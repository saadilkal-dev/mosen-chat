-- RPC function for semantic search on the knowledge_embeddings table
-- Table columns: id (uuid), source (text), chunk_index (int), content (text), embedding (vector), metadata (jsonb), created_at (timestamptz)

create or replace function match_knowledge(
  query_embedding vector,
  match_count int default 6,
  match_threshold float default 0.35
)
returns table (
  id uuid,
  source text,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ke.id,
    ke.source,
    ke.chunk_index,
    ke.content,
    ke.metadata,
    (1 - (ke.embedding <=> query_embedding))::float as similarity
  from knowledge_embeddings ke
  where 1 - (ke.embedding <=> query_embedding) > match_threshold
  order by ke.embedding <=> query_embedding
  limit match_count;
end;
$$;
