# RAG (Retrieval Augmented Generation) Setup

Mosen uses RAG to inject relevant knowledge into every chat message, making the AI responses more grounded in your organization's frameworks and context.

## How it works

1. **User sends a message** → e.g., "How do I handle resistance to change?"
2. **Query is embedded** → Gemini embeds the message to a 768-dim vector
3. **Supabase searches** → Finds the 6 most relevant chunks using cosine similarity
4. **Results injected** → Top chunks are added to the AI system prompt
5. **AI responds** → With context from YOUR knowledge base

## Prerequisites

### 1. Your vectors must be in Supabase

You need a `knowledge_embeddings` table with these columns:
- `source` (text) — where the chunk came from
- `chunk_index` (int) — order within source
- `content` (text) — the actual text
- `embedding` (vector, 768 dims) — your pre-computed embeddings
- `metadata` (jsonb, optional) — extra fields

If you don't have this table yet, run the migration:
```sql
-- supabase/migrations/006_knowledge_embeddings.sql
-- Copy the contents and paste into Supabase SQL editor
```

### 2. Create the RPC function

Supabase needs a function to search the vectors:
```sql
create or replace function match_knowledge(
  query_embedding vector(768),
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
    1 - (ke.embedding <=> query_embedding) as similarity
  from knowledge_embeddings ke
  where 1 - (ke.embedding <=> query_embedding) > match_threshold
  order by ke.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

### 3. Set your Gemini key

In `.env.local`:
```
GEMINI_API_KEY=your_key_here
```

Get a free key from https://aistudio.google.com/app/apikey

## Testing RAG

Check if RAG is active:
```bash
curl -X GET http://localhost:3000/api/knowledge/status
# Response: { "available": true, "chunks": 42, "reason": "ready" }
```

Test a search:
```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I build trust during organizational change?"}'
```

## What happens if RAG is unavailable

If:
- GEMINI_API_KEY is missing
- Supabase is unreachable
- No embeddings exist yet

→ The app **silently falls back** to the full static `MOSEN_KNOWLEDGE` string. Zero disruption. Chat still works.

## Architecture

```
User message
    ↓
embedQuery() [Gemini API]
    ↓
Vector (768 dims)
    ↓
match_knowledge() RPC [Supabase]
    ↓
Top 6 chunks (>35% similarity)
    ↓
Format + inject into system prompt
    ↓
AI responds with context
```

## Cost

- **~$0.00002 per query** (Gemini text-embedding-004 is extremely cheap)
- No ingestion cost (documents already embedded externally)
- One call per chat message, cached if same query

## Files involved

- `lib/embedding-service.js` — Gemini query embedding
- `lib/rag-retriever.js` — Search + fallback logic
- `lib/graph/leader-graph.js` — Wired to use RAG
- `lib/graph/employee-graph.js` — Wired to use RAG
- `app/api/knowledge/search/route.js` — Test endpoint
- `supabase/migrations/006_knowledge_embeddings.sql` — Table + RPC
