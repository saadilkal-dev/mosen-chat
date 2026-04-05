import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const dynamic = 'force-dynamic';

// GET /api/admin
// Returns all sessions for the admin dashboard, grouped by persona
export async function GET() {
  try {
    // Get all members from the admin index, sorted by most recent activity
    const members = await redis.zrange('admin:sessions', 0, -1, { rev: true });

    if (!members || members.length === 0) {
      return Response.json({ leader: [], employee: [] });
    }

    // Fetch preview data for each session
    const previews = await Promise.all(
      members.map(async (member) => {
        const [persona, ...rest] = member.split(':');
        const browserId = rest.join(':');
        const previewKey = `admin:preview:${persona}:${browserId}`;
        const data = await redis.get(previewKey);
        return data ? { ...data, persona, browserId } : null;
      })
    );

    const valid = previews.filter(Boolean);
    const leader = valid.filter(s => s.persona === 'leader');
    const employee = valid.filter(s => s.persona === 'employee');

    return Response.json({ leader, employee, total: valid.length });
  } catch (err) {
    console.error('Admin GET error:', err.message);
    return Response.json({ leader: [], employee: [], total: 0 });
  }
}
