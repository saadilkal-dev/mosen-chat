# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm start            # Start production server
```

No test runner is configured. The project uses plain JavaScript (no TypeScript). `jsconfig.json` provides the `@/*` path alias pointing to the project root — use it consistently over relative paths.

---

## Architecture Overview

**Mosen** is a Next.js 14.2.5 App Router application. Two AI personas are supported: **Leader** (strategic change planner) and **Employee** (confidential discovery/feedback). The AI layer is built with **LangGraph** on top of Claude Sonnet.

**Two personas:**
- **Leaders** — strategic thinking partner to build change briefs, generate playbooks, and act on employee synthesis
- **Employees** — trusted confidant to safely explore change impact; operates on invite tokens (no Clerk sign-in required)

---

## AI Agent System (`/lib/graph/`)

The AI layer uses **LangGraph** (`@langchain/langgraph`) with `StateGraph` + `MessagesAnnotation`. Each persona has its own graph, system prompt, and tool set. **Tools are auto-invoked by the system prompt** — the agent decides when to call them; no user action required.

| File | Purpose |
|------|---------|
| `lib/graph/base.js` | `createBaseGraph()`, `invokeMosenGraph()` — Claude Sonnet binding + graph factory |
| `lib/graph/leader-graph.js` | `buildLeaderGraph()`, `invokeLeaderChat()` — Leader agent with RAG + context injection |
| `lib/graph/employee-graph.js` | `buildEmployeeGraph()`, `invokeEmployeeChat()` — Employee agent |
| `lib/graph/leader-tools.js` | All leader tools (see below) |
| `lib/graph/employee-tools.js` | Employee tools: consent tracking, synthesis contribution, closed-loop delivery |

**Leader tools** (all in `createLeaderTools()`):
`save_brief_answer`, `generate_playbook`, `confirm_playbook`, `version_playbook`, `update_playbook_activity`, `generate_employee_brief`, `create_personalized_outreach`, `propose_outreach`, `read_synthesis`, `read_playbook_status`, `suggest_experiment`, `log_pivot`, `present_options`

**Models:**
- Chat: `claude-sonnet-4-20250514` (temp 0.7, max 4096 tokens, 3 retries)
- Summarization: `claude-haiku-4-5-20251001`

---

## System Prompts (`/lib/mosen-prompts.js`)

All AI personality and conversation flow is defined here. Key functions:

| Function | Used When |
|----------|-----------|
| `leaderBriefPrompt()` | Before brief is complete — structured 5-area discovery |
| `leaderSystemPrompt()` | After brief complete — strategic thinking partner mode |
| `employeeSystemPrompt()` | Employee trusted confidant mode |
| `employeeInitiativePrompt()` | Employee persona with full initiative context |
| `onboardingPrompt()` | First message to unknown user |
| `playbookPrompt()` | Internal — generate 3-4 phase playbook JSON |
| `synthesisPrompt()` | Anonymize + theme employee feedback by culture pillar |
| `artifactGenerationPrompt()` | Generate structured doc artifacts (JSON with typed sections) |
| `outreachPrompt()` | Draft leader → employee outreach messages |

**Voice constraints** hardcoded in all prompts: one question per message, no bullet lists, no jargon, peer-level tone, never corrective.

---

## RAG System

- Queries embedded via **Gemini API** (`@google/genai`)
- Supabase RPC `match_knowledge()` → cosine similarity on pgvector (`knowledge_embedding` table, threshold 0.55, top-5 chunks)
- Fallback: static knowledge in `lib/mosen-knowledge.js` (LAABS/LAACS frameworks — 6 culture pillars: Inclusion, Empathy, Vulnerability, Trust, Empowerment, Forgiveness)

---

## Key API Routes

### Leader
- `POST/GET /api/initiative/[id]/chat` — Leader ↔ Mosen conversation (invokes LangGraph)
- `GET/PUT /api/initiative/[id]/playbook` — Playbook versions; PUT marks activities complete
- `POST /api/initiative/[id]/playbook/confirm` — Lock in confirmed playbook version
- `POST /api/initiative/[id]/artifact` — Generate/cache a single artifact
- `POST /api/initiative/[id]/synthesis` — Trigger synthesis report generation
- `POST /api/initiative/[id]/publish` — Make initiative visible to assigned employees
- `POST /api/initiative/[id]/escalate` — Escalate initiative status

### Employee (token-based, no Clerk)
- `POST/GET /api/initiative/[id]/employee/chat` — Employee ↔ Mosen via invite token
- `POST /api/initiative/[id]/employee/brief` — Load change brief for employee
- `GET /api/employee/initiatives` — List initiatives assigned to employee

### Platform / Admin
- `/api/platform/provision-leader` — Create leader accounts
- `/api/platform/orgs/[orgId]` — Org CRUD
- `/api/platform/invite-leader`, `/api/platform/invite-employees` — Send invites (SendGrid)
- `/api/admin`, `/api/admin/chats`, `/api/admin/feedback` — Admin dashboard (currently unprotected)

---

## Data Model (Supabase Postgres)

All data access uses the service-role client from `lib/supabase.js` (`getSupabase()`). There is no client-side Supabase — only API routes touch the DB.

**Core initiative tables:**

| Table | Key Fields |
|-------|-----------|
| `initiatives` | id, org_id, leader_clerk_id, title, `brief_data` (JSONB), summary, status, brief_complete, playbook_generated, is_public |
| `playbook_versions` | initiative_id, `versions` (JSON array — all historical versions with phases/activities) |
| `leader_chats` | initiative_id, messages (JSON array), conversation_summary, updated_at |
| `initiative_chats` | initiative_id, emp_email, messages (JSON array) — employee conversations |
| `initiative_briefs` | initiative_id, content, approved |
| `employee_responses` | initiative_id, emp_email, responses (JSON array with theme/sentiment/pillar) |
| `initiative_synthesis` | initiative_id, reports (JSON array of aggregated themes) |
| `initiative_consents` | initiative_id, emp_email, consent_id, theme, proposed_text, status (pending/granted/denied) |
| `closed_loop_messages` | initiative_id, emp_email, messages (JSON array) |
| `invites` | token, org_id, emp_email, emp_name, expires_at |
| `knowledge_embedding` | pgvector embeddings for RAG |

**`brief_data` JSONB** on `initiatives` holds: per-area brief answers AND a `leader_flags` sub-object used for one-time signals like `pending_phase_completion` (consumed + cleared on next leader chat load).

---

## Conversation Flows

### Leader Chat
1. `POST /api/initiative/[id]/chat` → `requireAuth()` verifies ownership
2. `loadLeaderInitContext(id)` → fetches initiative, playbook versions, synthesis, org/leader name
3. Sliding window: keep last 10 messages; older ones summarised via Haiku and stored in `conversation_summary`
4. `buildLeaderGraph(initContext, summary, userMessage)` → injects system prompt + RAG context + tool set
5. `invokeMosenGraph()` → LangGraph runs; tools mutate DB in-flight (save_brief_answer writes to `brief_data`, generate_playbook writes to `playbook_versions`, etc.)
6. Response + any `artifacts` array returned → saved to `leader_chats`, sent to client
7. Client renders text + artifact cards (`PlaybookApprovalCard`, `ArtifactChatCard`, `OptionCardsChat`, etc.)

### Employee Chat
1. `POST /api/initiative/[id]/employee/chat?token=xyz` → `getInviteByToken(token)` verifies
2. Builds `empContext` with initiative brief, current playbook activity, employee name
3. `buildEmployeeGraph(empContext)` → `employeeSystemPrompt` + 6 employee tools
4. Tools produce artifact cards: `consent_card`, `closed_loop`, `data_ownership_banner`
5. Response saved to `initiative_chats`, returned to client

### Synthesis Flow
1. Employee grants consent → status `granted` in `initiative_consents`
2. Once ≥3 employees grant consent for a theme: `generate_synthesis` aggregates via Haiku
3. Synthesis stored in `initiative_synthesis`; leader system prompt injects: "X themes available — call read_synthesis"
4. Leader sees synthesis in chat; Mosen proposes playbook updates using `update_playbook_activity` (minor) or `version_playbook` (structural)

---

## Auth

- **Clerk** (`@clerk/nextjs` v5) for leaders and org flows
- `lib/auth.js` → `requireAuth()` validates Clerk JWT, calls `getOrCreateAppUser()` to sync profile into `app_user_profiles`, returns `{ userId, user: { orgId, role, ... } }`
- Client context: `components/providers/AuthProvider.js` — `useAuth()` hook fetches `/api/auth/me`, exposes `{ user, loading, refresh, logout }`
- **Employees use invite tokens only** — no Clerk account needed; access verified via `invites.token`

---

## Playbook Data Structure

Playbooks are stored as a `versions` JSON array in `playbook_versions`. Each version:

```js
{
  version: 2,
  phases: [
    {
      name: "Discover",
      duration: "Week 1-2",
      description: "...",
      activities: [
        { title: "...", description: "...", hypothesis: "...", owner: "...", completed: false, artifacts: ["Stakeholder Map"] }
      ]
    }
  ],
  changeNote: "Added phase 3 based on synthesis",
  diff: { added: ["New activity title"], removed: ["Old activity"], unchanged: 4 }
}
```

`lib/playbook-helpers.js` provides: `buildPhaseCompletionLines()`, `buildTimelineAlertLine()`, `diffPhaseActivitiesByTitle()`, `findFirstIncompleteActivityIndex()`, `mergePlaybookVersionSafe()`.

---

## Artifact System

Artifacts are structured JSON documents (not markdown). Each has typed sections:

```js
{ version: 1, title: "...", sections: [
  { kind: "heading", level: 1, text: "..." },
  { kind: "paragraph", text: "..." },
  { kind: "table", headers: [...], rows: [[...]] },
  { kind: "checklist", items: [{ text: "...", checked: false }] },
  { kind: "timeline", events: [{ date: "Day 1", label: "...", status: "upcoming" }] },
  { kind: "chart", chartType: "bar", data: [{ label: "...", value: 30 }] },
  { kind: "callout", variant: "info", text: "..." }
]}
```

`lib/artifact-service.js` handles generation + caching (`generateAndCacheArtifact`, `backgroundGenerateAllArtifacts`). Cache key is `phaseName::activityTitle::artifactName`. PDF generation uses `@react-pdf/renderer` — registered as external server package in `next.config.js`.

---

## Employee Experience

### Two Employee Access Patterns

There are **two separate ways** employees interact with Mosen — understanding this distinction is critical:

**1. Clerk-authenticated employee** (in-app, Clerk sign-in required)
- Route: `/app/initiative/[id]/page.js` renders `EmployeeView` when `user.role === 'employee'`
- Chat calls `POST /api/chat` directly — a simple Anthropic API proxy — using `employeeInitiativePrompt()` client-side
- No LangGraph, no tools, no DB-persisted chat. Stateless per-session.
- Used when employees are provisioned as Clerk users in the org

**2. Token-based employee** (invite link, no Clerk)
- Route: `/app/initiative/[id]/employee/` (separate page)
- Chat calls `POST /api/initiative/[id]/employee/chat?token=xyz`
- Full LangGraph employee graph with 6 tools: `record_employee_response`, `request_consent`, `check_synthesis_threshold`, `generate_synthesis`, `deliver_closed_loop`, `show_data_ownership`
- Consent, synthesis, and closed-loop are only available through this path
- Used when leaders send invite links via SendGrid

### Employee Pages

| Page | Path | Purpose |
|------|------|---------|
| Employee dashboard | `/app/employee/dashboard/page.js` | Lists initiatives assigned to the employee (Clerk auth, calls `/api/employee/initiatives`) |
| Employee home | `/app/employee/home/page.js` | Employee landing/home view |
| Employee portal | `/app/emp/page.js` | Legacy employee landing — initiative list with `InitiativeCard`, uses `AuthProvider` + `THEME` |
| Initiative (employee view) | `/app/initiative/[id]/page.js` → `EmployeeView` | Embedded in shared initiative page; renders for Clerk-authed employees |

### Employee Components (`/components/employee/`)

| Component | Purpose |
|-----------|---------|
| `BriefDisplay.js` | Shows the change brief to the employee — handles null brief, empty brief, and JSONB `{content}` shape |
| `ConsentCard.js` | Consent request UI with grant/deny buttons; three render states: pending, granted, denied |
| `ClosedLoopCard.js` | Amber/gold card showing what specifically changed because of the employee's input; renders nothing if `changeDescription` is empty |
| `DataOwnershipBanner.js` | Standalone privacy reassurance banner (dismissible); green theme; a simpler inline strip also exists embedded directly in the employee chat page |

### Consent & Privacy Model

- Mosen asks: "Can I share this insight with your leader?" before surfacing any employee signal
- Shows the exact proposed text before consent is given
- Stored in `initiative_consents` with status: `pending` / `granted` / `denied`
- **Synthesis threshold:** themes only surface to leaders when ≥3 employees have granted consent for that theme — prevents individual attribution
- Closed loop: leader describes what changed → `deliver_closed_loop` tool writes back to `closed_loop_messages` → employee sees `ClosedLoopCard`

---

## Key UI Components (`/components/leader/`)

| Component | Purpose |
|-----------|---------|
| `PlaybookApprovalCard.js` | Two-pane draft review UI (TOC left, content right) — renders `playbook_draft` artifact cards |
| `PlaybookCard.js` | Full playbook workspace — phases, activity chips, detail panel, version diff expandable |
| `OptionCardsChat.js` | Pill-button option selector for brief questions with finite choices; once selected, others dim |
| `ArtifactChatCard.js` | Clickable chat card that opens an artifact in workspace |
| `WorkspaceView.js` | Right-panel workspace (playbook, brief, outreach, synthesis tabs) |
| `SplitPanel.js` | Left chat + right workspace layout (60/40 default, shifts to 50/50 when artifact open) |
| `ShareInitiativeModal.js` | Share initiative with employees modal — publishes initiative and sends invites |

### Shared Initiative Page Architecture

`/app/initiative/[id]/page.js` is the most complex file — it serves both personas from the same URL:

```
InitiativePage
  └── useAuth() → determine role
      ├── role === 'leader'  → <LeaderView>
      │     ├── SplitPanel (chat left, WorkspaceView right)
      │     ├── sendMessage() → POST /api/initiative/[id]/chat (LangGraph)
      │     └── Renders: PlaybookApprovalCard | OptionCardsChat | ArtifactChatCard per card.type
      │
      └── role === 'employee' → <EmployeeView>
            ├── Simple chat layout (no split panel)
            ├── sendMessage() → POST /api/chat (direct Anthropic proxy)
            ├── BriefDisplay sidebar (right panel)
            └── DataOwnershipBanner inline
```

Artifact card routing in `LeaderView` uses `VIEW_FOR_TYPE` map — types mapped to `null` render inline (e.g. `option_cards`, `playbook_updated`); others open a workspace tab.

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

- **Leader theme:** Purple (`#534AB7` primary, `#F6F5FF` light, `#D8D5F5` border)
- **Employee theme:** Green (`#1D9E75` primary, `#E6F7F0` light)
- Inline CSS throughout — no CSS framework
- Fonts: DM Sans (UI) + DM Mono (code)
