# Mosen Chat - AI Change Partner

## Project Overview

Mosen is an AI-powered change management platform that helps leaders and employees navigate organizational change. Built on philosophies from "Love as a Business Strategy" (LAABS) and "Love as a Change Strategy" (LAACS) by Softway.

**Two personas:**
- **Leaders** — Mosen acts as a strategic thinking partner (not coach/consultant) to build structured change briefs and stay honest about unknowns
- **Employees** — Mosen acts as a trusted confidant to safely explore change, understand personal impact, and move from fear to willingness

## Tech Stack

- **Framework:** Next.js 14.2.5 (App Router)
- **Frontend:** React 18, pure CSS (inline styles), DM Sans/DM Mono fonts
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514` for chat, `claude-haiku-4-5-20251001` for feedback)
- **Storage:** Supabase Postgres (app profiles, orgs, invites, legacy chat/feedback; server uses service role)
- **Auth:** Clerk (`@clerk/nextjs`)
- **Analytics:** Microsoft Clarity
- **Deployment:** Vercel (serverless)

## Project Structure

```
app/
  page.js                    # Home — role selection (Leader/Employee)
  leader/page.js             # Leader chat interface + feedback modal
  employee/page.js           # Employee chat interface + feedback modal
  admin/page.js              # Admin dashboard (sessions, feedback, analytics)
  api/
    chat/route.js            # Anthropic API proxy
    sessions/route.js        # Chat persistence (Supabase GET/POST)
    feedback/route.js        # Adaptive feedback question generation
    feedback/save/route.js   # Store feedback responses
    admin/route.js           # Admin dashboard data
    admin/chats/route.js     # Full chat history for a session
    admin/feedback/route.js  # All feedback submissions
lib/
  mosen-prompts.js           # System prompts for leader, employee, feedback personas
  mosen-knowledge.js         # RAG knowledge base (LAABS + LAACS frameworks)
```

## Key Architecture Decisions

- **Clerk auth** — Leader/org flows use Clerk; legacy `/leader` and `/employee` still use browser id for PoC
- **Debounced persistence** — Chats auto-save (debounced) to Supabase
- **Consent-first model** — Employee data never surfaced without explicit consent; shows exact words before sharing
- **Adaptive feedback** — Claude generates 5 survey questions on-the-fly based on previous answers (not hardcoded)
- **API key security** — Anthropic key stays server-side; all requests proxied through Next.js route handlers

## Supabase schema (see `supabase/migrations/`)

| Table | Purpose |
|---|---|
| `app_user_profiles` | Clerk user id, email, name, org link |
| `organizations`, `org_employees`, `invites` | Org roster and invite tokens |
| `legacy_browser_chats` | PoC chat threads per browser + persona |
| `admin_session_previews` | Admin dashboard session list |
| `feedback_submissions` | Feedback survey responses |
| `chats_by_user` | Alternate chat storage keyed by user id |

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
```

## Development

```bash
npm install
cp .env.example .env.local  # Add API keys
npm run dev                  # http://localhost:3000
```

## Design System

- **Leader theme:** Purple (#534AB7)
- **Employee theme:** Green (#1D9E75)
- Warm, accessible UI with inline CSS (no framework)
- Single-question-per-message conversation design

## Important Conventions

- System prompts are in `lib/mosen-prompts.js` — edit here when changing Mosen's personality/behavior
- Knowledge base in `lib/mosen-knowledge.js` — contains LAABS/LAACS frameworks used as AI context
- All chat pages (leader/employee) share similar structure but have distinct system prompts, themes, and feedback flows
- Admin dashboard at `/admin` — no auth protection currently
