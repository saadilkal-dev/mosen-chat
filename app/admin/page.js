'use client';
import { useState, useEffect } from 'react';

const fmt = ts => {
  if (!ts) return '—';
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 14, padding: '18px 22px', minWidth: 130 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#1A1A18', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SessionRow({ session, index }) {
  const isLeader = session.persona === 'leader';
  const color = isLeader ? '#534AB7' : '#1D9E75';
  const bg = isLeader ? '#F0EFFE' : '#E6F7F0';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr 90px 70px 70px 110px',
      alignItems: 'center', gap: 16, padding: '13px 20px',
      borderBottom: '1px solid #F2F2F0', background: index % 2 === 0 ? '#fff' : '#FAFAF8',
      fontSize: 13
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill={color} />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 7px', borderRadius: 20 }}>
            {session.persona}
          </span>
          <span style={{ fontSize: 11, color: '#C0C0BA', fontFamily: 'monospace' }}>
            {session.browserId?.slice(0, 10)}…
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.lastPreview || 'No messages yet'}
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>{session.chatCount || 0} chats</div>
      <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>{session.messageCount || 0} msgs</div>
      <div style={{ fontSize: 11, color: '#C0C0BA', textAlign: 'right' }}>{fmt(session.lastActivity)}</div>
      <div />
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | leader | employee
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin');
      const d = await r.json();
      setData(d);
      setLastRefresh(Date.now());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allSessions = data ? [...(data.leader || []), ...(data.employee || [])].sort((a, b) => b.lastActivity - a.lastActivity) : [];
  const shown = filter === 'all' ? allSessions : allSessions.filter(s => s.persona === filter);
  const leaderCount = data?.leader?.length || 0;
  const employeeCount = data?.employee?.length || 0;
  const totalMessages = allSessions.reduce((acc, s) => acc + (s.messageCount || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#1A1A18' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EBEBEA', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0EFFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="#534AB7" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="8" r="2" fill="#F0EFFE" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.01em' }}>Mosen Admin</div>
            <div style={{ fontSize: 11, color: '#999' }}>Session dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && <span style={{ fontSize: 11, color: '#C0C0BA' }}>Updated {fmt(lastRefresh)}</span>}
          <button onClick={load} disabled={loading}
            style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid #EBEBEA', background: '#fff', color: '#555', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 32, flexWrap: 'wrap' }}>
          <StatCard label="Total browsers" value={allSessions.length} />
          <StatCard label="Leader sessions" value={leaderCount} color="#534AB7" />
          <StatCard label="Employee sessions" value={employeeCount} color="#1D9E75" />
          <StatCard label="Total messages" value={totalMessages} />
        </div>

        {/* Session table */}
        <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 16, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>Sessions</div>
            <div style={{ display: 'flex', gap: 4, background: '#F3F3F0', borderRadius: 20, padding: 3 }}>
              {['all', 'leader', 'employee'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    padding: '5px 12px', borderRadius: 16, border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                    background: filter === f ? (f === 'leader' ? '#EEEDFA' : f === 'employee' ? '#E6F7F0' : '#fff') : 'transparent',
                    color: filter === f ? (f === 'leader' ? '#534AB7' : f === 'employee' ? '#1D9E75' : '#1A1A18') : '#999',
                    fontWeight: filter === f ? 600 : 400,
                  }}>
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 70px 70px 110px', gap: 16, padding: '8px 20px', background: '#FAFAF8', borderBottom: '1px solid #F2F2F0' }}>
            {['', 'Browser / last message', 'Chats', 'Messages', 'Last active', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, color: '#C0C0BA', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, textAlign: i > 1 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>

          {loading && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#CCC', fontSize: 13 }}>Loading sessions…</div>
          )}
          {!loading && shown.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#CCC', fontSize: 13, lineHeight: 1.8 }}>
              No sessions yet.<br />
              <span style={{ fontSize: 12 }}>Sessions appear here once someone chats on /leader or /employee.</span>
            </div>
          )}
          {!loading && shown.map((session, i) => (
            <SessionRow key={`${session.persona}-${session.browserId}`} session={session} index={i} />
          ))}
        </div>

        {/* Quick links */}
        <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Leader site →', href: '/leader', color: '#534AB7', bg: '#F0EFFE' },
            { label: 'Employee site →', href: '/employee', color: '#1D9E75', bg: '#E6F7F0' },
          ].map(({ label, href, color, bg }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer"
              style={{ padding: '8px 14px', borderRadius: 10, background: bg, color, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: `1px solid ${color}22` }}>
              {label}
            </a>
          ))}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-thumb { background: #E0E0DC; border-radius: 2px; }
      `}</style>
    </div>
  );
}
