# Supabase setup for Mosen

## 1. Create a project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a project (choose a region close to your GCP app).
2. Wait until the database is ready.

## 2. Apply the schema

1. Open **SQL Editor** → **New query**.
2. Paste the full contents of [`migrations/001_mosen_core.sql`](./migrations/001_mosen_core.sql).
3. Run the query. You should see “Success” with no errors.

Alternatively, with [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

(Only if you use CLI-managed migrations; the SQL file alone is enough for dashboard setup.)

## 3. Environment variables (Next.js)

In **Project Settings → API** copy:

| Dashboard field   | Env variable                     |
|-------------------|----------------------------------|
| Project URL       | `NEXT_PUBLIC_SUPABASE_URL`       |
| `service_role` **secret** | `SUPABASE_SERVICE_ROLE_KEY` |

Add them to `.env.local` at the repo root (see root `.env.example`).

**Security:** The `service_role` key must only exist on the server (e.g. GCP Secret Manager, Vercel env). Do not prefix it with `NEXT_PUBLIC_` and do not import `getSupabase()` in client components.

## 4. Optional: Row Level Security (RLS)

This app uses the **service role** from API routes only, so RLS is bypassed. If you later add Supabase from the browser with the **anon** key, enable RLS and policies on these tables.

## 5. Verify

Restart `npm run dev` after changing env. Sign in with Clerk, complete onboarding (org + team), and confirm rows appear in **Table Editor** (`app_user_profiles`, `organizations`, etc.).
