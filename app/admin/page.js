'use client';
import { useState, useEffect, useRef } from 'react';

const fmt = ts => {
  if (!ts) return '—';
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const fmtFull = ts => {
  if (!ts) return '';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 14, padding: '18px 22px', minWidth: 130 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#1A1A18', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MosenAvatar({ color, bg }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill={color} />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" fill={bg} />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFEFEC', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill="#AAA" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#AAA" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" fill="#EFEFEC" />
      </svg>
    </div>
  );
}

function SessionRow({ session, index, isSelected, onClick }) {
  const isLeader = session.persona === 'leader';
  const color = isLeader ? '#534AB7' : '#1D9E75';
  const bg = isLeader ? '#F0EFFE' : '#E6F7F0';
  return (
    <div onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: '36px 1fr 80px 65px 100px',
        alignItems: 'center', gap: 14, padding: '13px 20px',
        borderBottom: '1px solid #F2F2F0',
        background: isSelected ? (isLeader ? '#F6F5FF' : '#F0FAF6') : index % 2 === 0 ? '#fff' : '#FAFAF8',
        fontSize: 13, cursor: 'pointer', transition: 'background .15s',
        borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
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
    </div>
  );
}

function ChatViewer({ session, onClose }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  const isLeader = session.persona === 'leader';
  const color = isLeader ? '#534AB7' : '#1D9E75';
  const bg = isLeader ? '#F0EFFE' : '#E6F7F0';
  const msgBg = isLeader ? '#F6F5FF' : '#F0FAF6';
  const msgDark = isLeader ? '#2D2560' : '#0A4D3A';

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/chats?browserId=${encodeURIComponent(session.browserId)}&persona=${session.persona}`)
      .then(r => r.json())
      .then(d => {
        const c = Array.isArray(d.chats) ? d.chats : [];
        setChats(c);
        if (c.length > 0) setActiveChat(c[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session.browserId, session.persona]);

  useEffect(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [activeChat]);

  const messages = activeChat?.messages || [];

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
      background: '#fff', borderLeft: '1px solid #EBEBEA',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
      fontFamily: "'DM Sans',system-ui,sans-serif",
    }}>
      {/* Panel header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #EBEBEA', background: 'transparent', cursor: 'pointer', color: '#888', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ×
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 20 }}>{session.persona}</span>
            <span style={{ fontSize: 11, color: '#C0C0BA', fontFamily: 'monospace' }}>{session.browserId?.slice(0, 14)}…</span>
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{session.chatCount || 0} conversations · {session.messageCount || 0} messages total</div>
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC', fontSize: 13 }}>Loading conversations…</div>
      ) : chats.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC', fontSize: 13 }}>No messages yet</div>
      ) : (
        <>
          {/* Chat tabs (if multiple conversations) */}
          {chats.length > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid #EBEBEA', overflowX: 'auto', flexShrink: 0 }}>
              {chats.map((c, i) => {
                const isActive = activeChat?.id === c.id;
                const preview = c.messages?.filter(m => m.from === 'user')[0]?.text?.slice(0, 28) || `Conversation ${i + 1}`;
                return (
                  <button key={c.id} onClick={() => setActiveChat(c)}
                    style={{
                      padding: '5px 10px', borderRadius: 8, border: `1px solid ${isActive ? color : '#EBEBEA'}`,
                      background: isActive ? bg : 'transparent', color: isActive ? color : '#888',
                      fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                      fontWeight: isActive ? 600 : 400,
                    }}>
                    {preview}…
                  </button>
                );
              })}
            </div>
          )}

          {/* Conversation metadata */}
          {activeChat && (
            <div style={{ padding: '8px 18px', background: '#FAFAF8', borderBottom: '1px solid #F2F2F0', fontSize: 11, color: '#C0C0BA', flexShrink: 0 }}>
              Started {fmtFull(activeChat.createdAt)} · {activeChat.messages?.filter(m => m.from === 'user').length || 0} turns
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m, i) => {
              if (m.from === 'error') return (
                <div key={i} style={{ padding: '8px 12px', background: '#FFF3F0', borderRadius: 8, fontSize: 12, color: '#C0392B' }}>{m.text}</div>
              );
              const isUser = m.from === 'user';
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                  {isUser ? <UserAvatar /> : <MosenAvatar color={color} bg={bg} />}
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px', fontSize: 13, lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: isUser ? '#ffffff' : msgBg,
                    color: isUser ? '#1A1A18' : msgDark,
                    border: isUser ? '1px solid #E8E8E4' : 'none',
                    borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                    boxShadow: isUser ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                  }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </>
      )}
    </div>
  );
}

const fmtFull2 = ts => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function FeedbackPanel() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then(r => r.json())
      .then(d => { setFeedback(d.feedback || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '48px 20px', textAlign: 'center', color: '#CCC', fontSize: 13 }}>Loading feedback…</div>;
  if (feedback.length === 0) return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#CCC', fontSize: 13, lineHeight: 1.8 }}>
      No feedback yet.<br /><span style={{ fontSize: 12 }}>Appears once a leader or employee completes the feedback flow.</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px 24px' }}>
      {feedback.map((entry, i) => {
        const isLeader = entry.persona === 'leader';
        const color = isLeader ? '#534AB7' : '#1D9E75';
        const bg = isLeader ? '#F0EFFE' : '#E6F7F0';
        const isOpen = expanded === i;
        return (
          <div key={i} style={{ border: '1px solid #EBEBEA', borderRadius: 12, background: '#fff' }}>
            <div onClick={() => setExpanded(isOpen ? null : i)}
              style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: isOpen ? '#FAFAF8' : '#fff', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{entry.persona}</span>
              <span style={{ fontSize: 11, color: '#C0C0BA', fontFamily: 'monospace', flexShrink: 0 }}>{entry.browserId?.slice(0, 10)}…</span>
              {entry.chatId && (
                <span style={{ fontSize: 10, color: '#C0C0BA', background: '#F5F5F2', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0 }}>
                  chat: {entry.chatId.slice(0, 10)}…
                </span>
              )}
              <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>{fmtFull2(entry.submittedAt)}</span>
              <span style={{ fontSize: 12, color: '#CCC', marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid #F2F2F0', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(entry.responses || []).map((r, j) => (
                  <div key={j}>
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 5, fontWeight: 600 }}>Q{r.questionNumber}</div>
                    <div style={{ fontSize: 13, color: '#333', marginBottom: 6, lineHeight: 1.5 }}>{r.question}</div>
                    <div style={{ fontSize: 13, color, background: bg, padding: '7px 12px', borderRadius: 8, display: 'inline-block', fontWeight: 500 }}>
                      → {r.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('sessions'); // 'sessions' | 'feedback'

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
    <div style={{ minHeight: '100vh', overflowY: 'auto', background: '#F7F7F5', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#1A1A18' }}>

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
            <div style={{ fontSize: 11, color: '#999' }}>Session dashboard · click any row to read the conversation</div>
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

      <div style={{ maxWidth: selected ? 900 : 1000, margin: '0 auto', padding: '32px 24px', transition: 'max-width .2s' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: '#EEEEED', borderRadius: 12, padding: 4, marginBottom: 28, width: 'fit-content' }}>
          {[{ id: 'sessions', label: 'Sessions' }, { id: 'feedback', label: 'Feedback' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: tab === t.id ? 600 : 400,
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? '#1A1A18' : '#999',
                boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 32, flexWrap: 'wrap' }}>
          <StatCard label="Total browsers" value={allSessions.length} />
          <StatCard label="Leader sessions" value={leaderCount} color="#534AB7" />
          <StatCard label="Employee sessions" value={employeeCount} color="#1D9E75" />
          <StatCard label="Total messages" value={totalMessages} />
        </div>

        {tab === 'feedback' && (
          <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EBEBEA' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>Feedback responses</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>Click any entry to expand the full Q&A</div>
            </div>
            <FeedbackPanel />
          </div>
        )}

        {/* Session table */}
        {tab === 'sessions' && <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>
              Sessions
              {selected && <span style={{ fontSize: 11, color: '#999', fontWeight: 400, marginLeft: 8 }}>— click a row to switch conversation</span>}
            </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 65px 100px', gap: 14, padding: '8px 20px', background: '#FAFAF8', borderBottom: '1px solid #F2F2F0' }}>
            {['', 'Browser / last message', 'Chats', 'Messages', 'Last active'].map((h, i) => (
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
            <SessionRow
              key={`${session.persona}-${session.browserId}`}
              session={session}
              index={i}
              isSelected={selected?.browserId === session.browserId && selected?.persona === session.persona}
              onClick={() => setSelected(s =>
                s?.browserId === session.browserId && s?.persona === session.persona ? null : session
              )}
            />
          ))}
        </div>

        }

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

      {/* Slide-in chat viewer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 99 }} />
          <ChatViewer session={selected} onClose={() => setSelected(null)} />
        </>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-thumb { background: #E0E0DC; border-radius: 2px; }
      `}</style>
    </div>
  );
}
