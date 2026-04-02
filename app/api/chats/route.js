// Works with both @vercel/kv (Upstash Redis connected via Vercel)
// Env vars automatically set by Vercel when you connect Upstash:
// KV_REST_API_URL and KV_REST_API_TOKEN

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return Response.json({ chats: [] });
  
    try {
      const { kv } = await import('@vercel/kv');
      const chats = await kv.get(`chats:${userId}`) || [];
      return Response.json({ chats });
    } catch (err) {
      console.error('KV GET error:', err.message);
      return Response.json({ chats: [] });
    }
  }
  
  export async function POST(req) {
    try {
      const { userId, chats } = await req.json();
      if (!userId) return Response.json({ ok: false }, { status: 400 });
  
      const { kv } = await import('@vercel/kv');
      // Store for 90 days, strip apiHistory to keep it lean
      const slim = chats.map(({ apiHistory: _, ...rest }) => rest);
      await kv.set(`chats:${userId}`, slim, { ex: 60 * 60 * 24 * 90 });
      return Response.json({ ok: true });
    } catch (err) {
      console.error('KV POST error:', err.message);
      // Don't fail hard — gracefully return ok so UI doesn't break
      return Response.json({ ok: false, error: err.message }, { status: 500 });
    }
  }