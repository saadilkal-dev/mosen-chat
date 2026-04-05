import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// GET /api/sessions?browserId=xxx&persona=leader
// Returns all sessions for this browser+persona combo
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const browserId = searchParams.get('browserId');
  const persona = searchParams.get('persona'); // 'leader' or 'employee'

  if (!browserId || !persona) return Response.json({ chats: [] });

  try {
    const key = `browser:${browserId}:${persona}`;
    const chats = await redis.get(key) || [];
    return Response.json({ chats });
  } catch (err) {
    console.error('Sessions GET error:', err.message);
    return Response.json({ chats: [] });
  }
}

// POST /api/sessions
// Body: { browserId, persona, chats }
// Saves session for this browser+persona, and logs to global admin index
export async function POST(req) {
  try {
    const { browserId, persona, chats } = await req.json();
    if (!browserId || !persona) return Response.json({ ok: false }, { status: 400 });

    const slim = chats.map(({ apiHistory: _, ...rest }) => rest);

    // 1. Save per-browser-persona key (what leader/employee sees)
    const key = `browser:${browserId}:${persona}`;
    await redis.set(key, slim, { ex: 60 * 60 * 24 * 90 });

    // 2. Log this browserId+persona to the global admin index (sorted set by timestamp)
    const adminKey = `admin:sessions`;
    const member = `${persona}:${browserId}`;
    await redis.zadd(adminKey, { score: Date.now(), member });

    // 3. Store a snapshot for admin preview
    const previewKey = `admin:preview:${persona}:${browserId}`;
    const lastMsg = slim.flatMap(c => c.messages || []).filter(m => m.from === 'user').slice(-1)[0];
    const preview = {
      browserId,
      persona,
      chatCount: slim.length,
      messageCount: slim.flatMap(c => c.messages || []).length,
      lastActivity: Date.now(),
      lastPreview: lastMsg?.text?.slice(0, 80) || 'No messages yet',
    };
    await redis.set(previewKey, preview, { ex: 60 * 60 * 24 * 90 });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Sessions POST error:', err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
