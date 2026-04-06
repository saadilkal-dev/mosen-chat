import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const dynamic = 'force-dynamic';

// GET /api/admin/chats?browserId=xxx&persona=leader
// Returns full chat history for a browser+persona (admin only)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const browserId = searchParams.get('browserId');
  const persona = searchParams.get('persona');

  if (!browserId || !persona) return Response.json({ chats: [] });

  try {
    const key = `browser:${browserId}:${persona}`;
    const chats = await redis.get(key) || [];
    return Response.json({ chats });
  } catch (err) {
    console.error('Admin chats GET error:', err.message);
    return Response.json({ chats: [] });
  }
}
