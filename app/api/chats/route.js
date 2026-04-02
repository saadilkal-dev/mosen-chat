import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return Response.json({ chats: [] });
  try {
    const chats = await redis.get(`chats:${userId}`) || [];
    return Response.json({ chats });
  } catch (err) {
    console.error('Redis GET error:', err.message);
    return Response.json({ chats: [] });
  }
}

export async function POST(req) {
  try {
    const { userId, chats } = await req.json();
    if (!userId) return Response.json({ ok: false }, { status: 400 });
    const slim = chats.map(({ apiHistory: _, ...rest }) => rest);
    await redis.set(`chats:${userId}`, slim, { ex: 60 * 60 * 24 * 90 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('Redis POST error:', err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}