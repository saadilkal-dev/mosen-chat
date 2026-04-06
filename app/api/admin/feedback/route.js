import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const dynamic = 'force-dynamic';

// GET /api/admin/feedback
// Returns all feedback submissions for admin dashboard
export async function GET() {
  try {
    const ids = await redis.zrange('admin:feedback', 0, -1, { rev: true });

    if (!ids || ids.length === 0) {
      return Response.json({ feedback: [], total: 0 });
    }

    const entries = await Promise.all(
      ids.map(id => redis.get(`feedback:${id}`))
    );

    const feedback = entries.filter(Boolean);
    return Response.json({ feedback, total: feedback.length });
  } catch (err) {
    console.error('Admin feedback GET error:', err.message);
    return Response.json({ feedback: [], total: 0 });
  }
}
