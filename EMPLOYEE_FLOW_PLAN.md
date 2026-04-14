# Employee Experience Implementation Plan

## Overview
After a leader completes the change brief and playbook, they get a modal to share the initiative with employees. Sharing sends invite emails. Employees see the initiative on their dashboard, can chat about the change, and provide consent-gated feedback.

---

## Phase 1: Playbook Completion → Public/Private Modal

### 1.1 Database Schema Update
**File:** `supabase/migrations/009_initiative_sharing.sql`

Add columns to `initiatives` table:
```sql
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS published_by TEXT;  -- clerk_id
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS shared_with TEXT[];  -- array of org member emails
```

### 1.2 UI: Share Modal Component
**File:** `components/leader/ShareInitiativeModal.js` (new)

- Modal triggered after playbook generation
- Two options: "Make Public (Team-Wide)" | "Keep Private (Draft)"
- Public option shows note: "Keeping initiatives public promotes a culture of transparency, building trust..."
- Button: "Share with Team" → calls API

### 1.3 API: Publish/Share Endpoint
**File:** `app/api/initiative/[id]/publish/route.js` (new)

```javascript
POST /api/initiative/[id]/publish
Body: { is_public: boolean }

- Update initiatives.is_public = true
- Set published_at = now()
- If public:
  - Get all org members
  - Call sendInitiativeInvites() → sends emails
  - Update initiatives.shared_with = [...]
- Return: { success, message, invites_sent }
```

### 1.4 Email: Invite Template
**File:** `lib/email.js` - add `buildInitiativeShareEmail()`

Template:
```
Subject: [Organization] New Change Initiative: {title}

Hi {employee_name},

A new change initiative is underway: {title}

Leader: {leader_name}
Brief: {summary_excerpt}...

Take the brief → Chat with Mosen about how you're feeling
👉 {link_with_token_or_auth}

Your feedback shapes outcomes. Read our data policy...
```

---

## Phase 2: Employee Dashboard

### 2.1 Employee Home/Dashboard Page
**File:** `app/employee/dashboard/page.js` (new)

- Redirect from `/employee` → `/employee/dashboard`
- List all initiatives shared with this user:
  - Card per initiative showing:
    - Title
    - Leader name
    - Brief excerpt
    - "View & Chat" button
    - Status badge (pending, in-progress, voted, closed-loop)

### 2.2 API: Get Shared Initiatives
**File:** `app/api/employee/initiatives/route.js` (new)

```javascript
GET /api/employee/initiatives

- Fetch all initiatives where:
  - is_public = true OR current_user email in shared_with[]
- Return: [ { id, title, leader, brief, status, ... } ]
```

---

## Phase 3: Employee Chat Experience

### 3.1 Employee Initiative Page (Enhanced)
**File:** `app/initiative/[id]/employee/page.js` (existing, enhance)

**Right panel (Brief side blade):**
- Sticky header showing initiative title
- Show:
  - **Brief**: Full employee brief
  - **Playbook**: Link to view playbook phases/activities (read-only for employee)
  - **Context**: Key goals & expected timeline

**Left panel (Chat):**
- Chat interface powered by RAG
- System prompt includes:
  - Initiative brief
  - Playbook summary
  - Six Pillars context (from RAG)
  - Love as Change Strategy frameworks (from RAG)

### 3.2 RAG Enhancement for Employees
**File:** `lib/rag-retriever.js` (enhance existing)

For employee chat, inject:
```
Initiative Brief:
{brief_content}

Playbook Summary:
- Phase 1: {phases[0].name}
- Phase 2: {phases[1].name}
...

+ [RAG results for query]
```

### 3.3 System Prompt: Employee
**File:** `lib/mosen-prompts.js` (add export)

```javascript
export function employeeChangePrompt({ 
  employee_name, 
  initiative_title, 
  brief, 
  playbook 
}) {
  return `You are Mosen, a trusted confidant helping {employee_name} 
          navigate change about "{initiative_title}".
          
  Brief: {brief}
  
  Playbook: {playbook}
  
  Your role:
  - Ask open questions about concerns, feelings, readiness
  - Validate emotions (fear, confusion, excitement all okay)
  - If you don't know: "I don't have that answer. Would you like me 
    to reach out to {leader_name} to get clarification?"
  - Never defend the change; stay neutral and empathetic
  - Build psychological safety through anonymity + data ownership
  `
}
```

### 3.4 "Ask Leader" Flow
**File:** `app/api/initiative/[id]/employee/escalate/route.js` (new)

```javascript
POST /api/initiative/[id]/employee/escalate
Body: { employee_email, question, context }

- Create escalation record in DB table: escalation_requests
- Send email to leader with:
  - Employee question (anonymized by default)
  - Checkbox: "Share response back to employee?"
- Leader can respond via admin panel
- Response sent to employee via email
```

---

## Phase 4: Consent Gates & Synthesis

### 4.1 Consent Card (Already Exists)
**File:** `components/employee/ConsentCard.js` (existing)

- Shows: "Share this theme with leadership?"
- Only appears if question is "shareable" (themes, not individual complaints)
- Employee sees exact text before approval
- Can edit or decline

### 4.2 Synthesis Aggregation (Already Exists)
**File:** `app/api/initiative/[id]/synthesis/route.js` (existing)

- Aggregates consents where **3+ employees approve same theme**
- Calculates:
  - Theme prevalence
  - Sentiment per pillar (Inclusion, Empathy, etc.)
  - Recommended pivots

### 4.3 Closed Loop (Already Exists)
**File:** `app/api/initiative/[id]/closed-loop/route.js` (existing)

When leader makes a pivot:
- Send email to all employees:
  - "Your feedback led to change X"
  - "Here's what we heard, here's what we're doing"
  - Link back to see the pivot in playbook

---

## Phase 5: Database Schema & API Structure

### New Tables
```sql
-- Track who initiative is shared with
CREATE TABLE initiative_invites (
  id UUID PRIMARY KEY,
  initiative_id TEXT FK,
  employee_email TEXT,
  status TEXT ('pending', 'accepted', 'declined'),
  token TEXT UNIQUE,  -- for email link
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

-- Escalations from employee to leader
CREATE TABLE escalation_requests (
  id UUID PRIMARY KEY,
  initiative_id TEXT FK,
  employee_email TEXT,
  question TEXT,
  context TEXT,
  is_anonymized BOOLEAN,
  status TEXT ('open', 'responded', 'closed'),
  created_at TIMESTAMPTZ
);

-- Leader responses to escalations
CREATE TABLE escalation_responses (
  id UUID PRIMARY KEY,
  escalation_id UUID FK,
  leader_response TEXT,
  shared_back BOOLEAN,
  created_at TIMESTAMPTZ
);
```

### New API Routes
```
POST   /api/initiative/[id]/publish          — Share with team
GET    /api/employee/initiatives             — Dashboard list
POST   /api/initiative/[id]/employee/escalate — Ask leader
GET    /api/initiative/[id]/escalations      — Leader sees questions
PUT    /api/escalation/[id]/respond          — Leader responds
```

---

## Implementation Order

1. ✅ Database migration (add is_public, published_at, shared_with)
2. ✅ Share modal component + publish API
3. ✅ Email template for invites
4. ✅ Employee dashboard + API
5. ✅ Enhance employee chat with brief + playbook context
6. ✅ System prompt for employee persona
7. ✅ Escalation flow (ask leader)
8. ✅ Test end-to-end: leader creates → shares → employee receives → chats → provides feedback

---

## UX Flow Summary

**Leader Side:**
```
Playbook complete 
  → "Share with team?" modal 
  → Select public/private 
  → Confirm & send invites
  → Back to initiative (now shows "Published")
```

**Employee Side:**
```
Receives email "New change: {title}"
  → Clicks link (token auth)
  → Goes to dashboard/initiative view
  → Sees brief on right
  → Starts chat with Mosen on left
  → Chat includes brief + playbook + RAG
  → Provides feedback
  → Consent gate (3+ threshold)
  → Closed loop notification
```

**Leader Feedback Loop:**
```
Employee escalates question
  → Leader sees in escalation queue
  → Leader responds
  → Response optionally shared back
  → Closed-loop email sent
  → Pivot made & communicated
```
