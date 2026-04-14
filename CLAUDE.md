# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm start            # Start production server
```

No test runner is configured. The project uses plain JavaScript (no TypeScript) with `jsconfig.json` providing the `@/*` path alias pointing to the project root.

---

## Architecture Overview

**Mosen** is a Next.js 14.2.5 App Router application. Two AI personas are supported: **Leader** (strategic change planner) and **Employee** (confidential discovery/feedback). The AI layer is built with **LangGraph** on top of Claude.

**Two personas:**
- **Leaders** — strategic thinking partner (not coach/consultant) to build structured change briefs and stay honest about unknowns
- **Employees** — trusted confidant to safely explore change, understand personal impact, and move from fear to willingness

---

## AI Agent System (`/lib/graph/`)

The AI layer uses **LangGraph** (`@langchain/langgraph`) with `StateGraph` + `MessagesAnnotation`. Each persona has its own graph, prompt, and tool set.

| File | Purpose |
|------|---------|
| `lib/graph/base.js` | Core `StateGraph` factory |
| `lib/graph/leader-graph.js` | Leader persona graph: brief → playbook → synthesis → outreach |
| `lib/graph/employee-graph.js` | Employee persona graph: discovery → empathy → consent → synthesis |
| `lib/graph/leader-tools.js` | `save_brief_answer`, `generate_playbook`, `confirm_playbook`, `version_playbook`, `generate_employee_brief`, `create_personalized_outreach`, `read_synthesis`, `log_pivot` |
| `lib/graph/employee-tools.js` | Consent tracking, synthesis contribution |

**Tools are auto-invoked by the system prompt** — not triggered by user action. The agent decides when to call them based on prompt directives.

**Models:**
- Chat: `claude-sonnet-4-20250514` (temp 0.7, max 4096 tokens, 3 retries)
- Summarization/feedback: `claude-haiku-4-5-20251001`

---

## System Prompts (`/lib/mosen-prompts.js`)

Eight prompt generator functions define all AI behavior. Edit here when changing personality or conversation flow:

| Function | Used When |
|----------|-----------|
| `leaderBriefPrompt()` | Structured 5-area discovery (what/why/who/success/uncertainty) |
| `leaderSystemPrompt()` | Post-brief strategic thinking partner mode |
| `employeeSystemPrompt()` | Employee trusted confidant mode |
| `onboardingPrompt()` | First message to unknown user |
| `playbookPrompt()` | Generate 3-4 phase playbook JSON (called as a tool) |
| `synthesisPrompt()` | Anonymize + theme employee feedback by culture pillars |
| `artifactGenerationPrompt()` | Generate structured doc artifacts (JSON schema with sections) |
| `outreachPrompt()` | Draft leader → employee outreach messages |

**Voice constraints** hardcoded in all prompts: one question per message, no bullet lists, no jargon, peer-level tone, never corrective.

---

## RAG System

- Query embedded via **Gemini API** (`@google/genai`)
- Supabase RPC `match_knowledge()` → cosine similarity on pgvector (`knowledge_embedding` table, threshold 0.55, top-5 chunks)
- Fallback: static knowledge in `lib/mosen-knowledge.js` (LAABS/LAACS frameworks — 6 culture pillars: Inclusion, Empathy, Vulnerability, Trust, Empowerment, Forgiveness)

---

## Key API Routes

### Chat
- `POST /api/chat` — Anthropic API proxy; key never leaves server

### Initiatives (core data model)
- `GET/POST /api/initiative` — List/create initiatives for authenticated user
- `/api/initiative/[id]/brief` — Brief answers (JSONB per area)
- `/api/initiative/[id]/playbook` — Playbook versions
- `/api/initiative/[id]/artifacts` — Generated artifacts
- `/api/initiative/[id]/synthesis` — Anonymized employee theme aggregation

### Platform Admin
- `/api/platform/provision-leader` — Create leader accounts
- `/api/platform/orgs/[orgId]` — Org CRUD
- `/api/platform/invite-leader` — Send leader invites (SendGrid)
- `/api/platform/invite-employees` — Batch employee invites

### Admin Dashboard (`/admin` — currently unprotected)
- `/api/admin`, `/api/admin/chats`, `/api/admin/feedback`

---

## Database Schema (Supabase Postgres)

**Initiative lifecycle** (the core data model):

| Table | Key Fields |
|-------|-----------|
| `initiatives` | id, org_id, leader_clerk_id, title, `brief_data` (JSONB), status, brief_complete, playbook_generated |
| `initiative_playbooks` | id, initiative_id, version, playbook_json |
| `initiative_chats` | initiative_id, chat_thread_id, messages (JSONB) |
| `initiative_responses` | Employee feedback per initiative |
| `initiative_synthesis` | initiative_id, version, themes_json, pillar_mapping |
| `initiative_consents` | initiative_id, employee_email, theme_key, consented |
| `initiative_assignments` | Employee ↔ Initiative mapping |
| `initiative_pivot_log` | Leader actions taken on feedback |
| `initiative_closed_loops` | Completed feedback → action → notification |

**Other tables:** `organizations`, `app_user_profiles`, `org_employees`, `invites`, `legacy_browser_chats`, `knowledge_embedding` (pgvector), `feedback_submissions`, `email_send_logs`

---

## Conversation Flows

### Leader Journey
1. `POST /api/initiative` → initiative created
2. `leaderBriefPrompt()` → one-question-at-a-time discovery (5 areas)
3. Tool `save_brief_answer` → persists each answer to `initiative.brief_data`
4. Tool `generate_playbook` → 3-4 phase JSON structure
5. Tool `confirm_playbook` → finalizes version in DB
6. Tool `generate_employee_brief` → plain-language summary
7. Tool `create_personalized_outreach` → draft leader → employee message
8. Ongoing: `read_synthesis` surfaces anonymized employee themes; `version_playbook` + `log_pivot` track plan changes

### Employee Journey
1. Assigned via `/api/platform/invite-employees`
2. Warm intro with `onboardingPrompt()`
3. Consent gate before contributing any signal: shows exact words, requires explicit opt-in (3-person anonymity threshold)
4. Responses → `initiative_responses` → aggregated to `initiative_synthesis`
5. Closed-loop notification: "Your input about X changed Y"

---

## Auth & Utilities

- **Clerk** (`@clerk/nextjs` v5) for leaders and org flows
- `lib/auth.js` → `requireAuth()`: validates Clerk JWT, returns `{userId, user: {orgId, ...}}`
- Legacy `/leader` and `/employee` routes use browser ID (PoC, no Clerk)
- `lib/supabase.js` → `getSupabase()`: service role client for all API routes

---

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY          # Optional — for RAG embeddings; falls back to lib/mosen-knowledge.js
SENDGRID_API_KEY        # Transactional email
NEXT_PUBLIC_CLARITY_ID  # Microsoft Clarity analytics
```

---

## Design System

- **Leader theme:** Purple (`#534AB7`)
- **Employee theme:** Green (`#1D9E75`)
- Inline CSS throughout (no CSS framework)
- Fonts: DM Sans + DM Mono

---

## Key Conventions

- All AI personality/behavior changes go in `lib/mosen-prompts.js`
- Static knowledge base in `lib/mosen-knowledge.js` — only edit if updating LAABS/LAACS framework content
- Artifacts are structured JSON (sections: heading, paragraph, table, checklist) rendered client-side
- PDF generation uses `@react-pdf/renderer` — registered as Next.js external server package in `next.config.js`
- `@/*` path alias resolves to the project root — use consistently
