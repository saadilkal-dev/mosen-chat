-- Drop ALL existing match_knowledge overloads
drop function if exists public.match_knowledge(vector, integer, double precision) cascade;
drop function if exists public.match_knowledge(vector, double precision, integer, text) cascade;
drop function if exists public.match_knowledge(vector(768), double precision, integer, text) cascade;
drop function if exists public.match_knowledge(vector(3072), double precision, integer, text) cascade;

-- Recreate with 768 dims matching gemini-embedding-001
create or replace function match_knowledge(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 10,
  filter_source text default null
)
returns table (
  id bigint,
  source text,
  chunk_index int,
  content text,
  similarity float
)
language sql stable
as $$
  select k.id, k.source, k.chunk_index, k.content,
         1 - (k.embedding <=> query_embedding) as similarity
  from knowledge_embedding k
  where 1 - (k.embedding <=> query_embedding) > match_threshold
    and (filter_source is null or k.source = filter_source)
  order by similarity desc
  limit match_count;
$$;
