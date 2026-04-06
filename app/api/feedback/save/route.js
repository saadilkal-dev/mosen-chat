import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const dynamic = 'force-dynamic';

// POST /api/feedback/save
// Body: { browserId, persona, chatId, responses: [{question, answer, questionNumber}] }
export async function POST(req) {
  try {
    const { browserId, persona, chatId, responses } = await req.json();
    if (!browserId || !persona || !responses) {
      return Response.json({ ok: false }, { status: 400 });
    }

    const entry = {
      browserId,
      persona,
      chatId: chatId || null,
      responses,
      submittedAt: Date.now(),
    };

    // Save individual feedback entry
    const feedbackId = `${persona}:${browserId}:${Date.now()}`;
    await redis.set(`feedback:${feedbackId}`, entry, { ex: 60 * 60 * 24 * 180 });

    // Add to global feedback index (sorted set)
    await redis.zadd('admin:feedback', { score: Date.now(), member: feedbackId });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Feedback save error:', err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
