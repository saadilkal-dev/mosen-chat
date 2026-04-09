'use client'

import { useState, useEffect, useRef } from 'react'
import { THEME } from '../../lib/theme'
import { fmt, fmtFull } from '../../lib/utils'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

function StatCard({ label, value, color }) {
  return (
    <Card padding="18px 22px" style={{ minWidth: 130 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || THEME.colors.text, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 12, color: THEME.colors.textMuted, marginTop: 4 }}>{label}</div>
    </Card>
  )
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
  const color = isLeader ? THEME.colors.leader.primary : THEME.colors.employee.primary;
  const bg = isLeader ? THEME.colors.leader.lighter : THEME.colors.employee.lighter;
  return (
    <div onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: '36px 1fr 80px 65px 100px',
        alignItems: 'center', gap: 14, padding: '13px 20px',
        borderBottom: `1px solid ${THEME.colors.border}`,
        background: isSelected ? (isLeader ? THEME.colors.leader.light : THEME.colors.employee.light) : index % 2 === 0 ? THEME.colors.surface : THEME.colors.bg,
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
          <span style={{ fontSize: 11, color: THEME.colors.textLight, fontFamily: THEME.fontMono }}>
            {session.browserId?.slice(0, 10)}…
          </span>
        </div>
        <div style={{ fontSize: 12, color: THEME.colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.lastPreview || 'No messages yet'}
        </div>
      </div>
      <div style={{ fontSize: 12, color: THEME.colors.textMuted, textAlign: 'right' }}>{session.chatCount || 0} chats</div>
      <div style={{ fontSize: 12, color: THEME.colors.textMuted, textAlign: 'right' }}>{session.messageCount || 0} msgs</div>
      <div style={{ fontSize: 11, color: THEME.colors.textLight, textAlign: 'right' }}>{fmt(session.lastActivity)}</div>
    </div>
  );
}

function ChatViewer({ session, onClose }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  const isLeader = session.persona === 'leader';
  const color = isLeader ? THEME.colors.leader.primary : THEME.colors.employee.primary;
  const bg = isLeader ? THEME.colors.leader.lighter : THEME.colors.employee.lighter;
  const msgBg = isLeader ? THEME.colors.leader.light : THEME.colors.employee.light;
  const msgDark = isLeader ? THEME.colors.leader.dark : THEME.colors.employee.dark;

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
      background: THEME.colors.surface, borderLeft: `1px solid ${THEME.colors.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: THEME.shadow.lg,
      fontFamily: THEME.font,
    }}>
      {/* Panel header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${THEME.colors.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${THEME.colors.border}`, background: 'transparent', cursor: 'pointer', color: THEME.colors.textMuted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ×
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 20 }}>{session.persona}</span>
            <span style={{ fontSize: 11, color: THEME.colors.textLight, fontFamily: THEME.fontMono }}>{session.browserId?.slice(0, 14)}…</span>
          </div>
          <div style={{ fontSize: 11, color: THEME.colors.textMuted, marginTop: 2 }}>{session.chatCount || 0} conversations · {session.messageCount || 0} messages total</div>
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.colors.textLight, fontSize: 13 }}>Loading conversations…</div>
      ) : chats.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.colors.textLight, fontSize: 13 }}>No messages yet</div>
      ) : (
        <>
          {/* Chat tabs (if multiple conversations) */}
          {chats.length > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: `1px solid ${THEME.colors.border}`, overflowX: 'auto', flexShrink: 0 }}>
              {chats.map((c, i) => {
                const isActive = activeChat?.id === c.id;
                const preview = c.messages?.filter(m => m.from === 'user')[0]?.text?.slice(0, 28) || `Conversation ${i + 1}`;
                return (
                  <button key={c.id} onClick={() => setActiveChat(c)}
                    style={{
                      padding: '5px 10px', borderRadius: 8, border: `1px solid ${isActive ? color : THEME.colors.border}`,
                      background: isActive ? bg : 'transparent', color: isActive ? color : THEME.colors.textMuted,
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
            <div style={{ padding: '8px 18px', background: THEME.colors.bg, borderBottom: `1px solid ${THEME.colors.border}`, fontSize: 11, color: THEME.colors.textLight, flexShrink: 0 }}>
              Started {fmtFull(activeChat.createdAt)} · {activeChat.messages?.filter(m => m.from === 'user').length || 0} turns
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m, i) => {
              if (m.from === 'error') return (
                <div key={i} style={{ padding: '8px 12px', background: THEME.colors.errorBg, borderRadius: 8, fontSize: 12, color: THEME.colors.error }}>{m.text}</div>
              );
              const isUser = m.from === 'user';
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                  {isUser ? <UserAvatar /> : <MosenAvatar color={color} bg={bg} />}
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px', fontSize: 13, lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: isUser ? THEME.colors.surface : msgBg,
                    color: isUser ? THEME.colors.text : msgDark,
                    border: isUser ? `1px solid ${THEME.colors.border}` : 'none',
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
        const color = isLeader ? THEME.colors.leader.primary : THEME.colors.employee.primary;
        const bg = isLeader ? THEME.colors.leader.lighter : THEME.colors.employee.lighter;
        const isOpen = expanded === i;
        return (
          <div key={i} style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.md, background: THEME.colors.surface }}>
            <div onClick={() => setExpanded(isOpen ? null : i)}
              style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: isOpen ? THEME.colors.bg : THEME.colors.surface, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{entry.persona}</span>
              <span style={{ fontSize: 11, color: THEME.colors.textLight, fontFamily: THEME.fontMono, flexShrink: 0 }}>{entry.browserId?.slice(0, 10)}…</span>
              {entry.chatId && (
                <span style={{ fontSize: 10, color: '#C0C0BA', background: '#F5F5F2', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0 }}>
                  chat: {entry.chatId.slice(0, 10)}…
                </span>
              )}
              <span style={{ fontSize: 11, color: THEME.colors.textMuted, marginLeft: 'auto' }}>{fmtFull(entry.submittedAt)}</span>
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
  const [initiativeBanner, setInitiativeBanner] = useState(null);

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

  useEffect(() => {
    fetch('/api/initiative', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('initiative api unavailable');
        return r.json();
      })
      .then(d => {
        const n = Array.isArray(d.initiatives) ? d.initiatives.length : 0;
        setInitiativeBanner(
          `Connected to initiatives API: ${n} record(s). Full initiative analytics will expand when the leader experience ships.`,
        );
      })
      .catch(() => {
        setInitiativeBanner(
          'Initiative-level views will connect when GET /api/initiative is available from the leader experience branch. Prototype sessions and feedback below are unchanged.',
        );
      });
  }, []);

  const allSessions = data ? [...(data.leader || []), ...(data.employee || [])].sort((a, b) => b.lastActivity - a.lastActivity) : [];
  const shown = filter === 'all' ? allSessions : allSessions.filter(s => s.persona === filter);
  const leaderCount = data?.leader?.length || 0;
  const employeeCount = data?.employee?.length || 0;
  const totalMessages = allSessions.reduce((acc, s) => acc + (s.messageCount || 0), 0);

  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto', background: THEME.colors.bg, fontFamily: THEME.font, color: THEME.colors.text }}>

      {/* Header */}
      <div style={{ background: THEME.colors.surface, borderBottom: `1px solid ${THEME.colors.border}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: THEME.colors.leader.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill={THEME.colors.leader.primary} />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={THEME.colors.leader.primary} strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="8" r="2" fill={THEME.colors.leader.avatarBg} />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.colors.text, letterSpacing: '-0.01em' }}>Mosen Admin</div>
            <div style={{ fontSize: 11, color: THEME.colors.textMuted }}>Session dashboard · click any row to read the conversation</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && <span style={{ fontSize: 11, color: THEME.colors.textLight }}>Updated {fmt(lastRefresh)}</span>}
          <Button variant="secondary" size="sm" onClick={load} loading={loading} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: selected ? 900 : 1000, margin: '0 auto', padding: '32px 24px', transition: 'max-width .2s' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: THEME.colors.border, borderRadius: THEME.radius.md, padding: 4, marginBottom: 20, width: 'fit-content' }}>
          {[{ id: 'sessions', label: 'Sessions' }, { id: 'feedback', label: 'Feedback' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '8px 18px', borderRadius: THEME.radius.sm, border: 'none', fontSize: 13, cursor: 'pointer',
                fontFamily: THEME.font, fontWeight: tab === t.id ? 600 : 400,
                background: tab === t.id ? THEME.colors.surface : 'transparent',
                color: tab === t.id ? THEME.colors.text : THEME.colors.textMuted,
                boxShadow: tab === t.id ? THEME.shadow.sm : 'none',
                transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {initiativeBanner && (
          <Card padding={16} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: THEME.colors.text, marginBottom: 6 }}>Initiatives (v2)</div>
            <p style={{ fontSize: 13, color: THEME.colors.textMuted, lineHeight: 1.55, margin: 0 }}>{initiativeBanner}</p>
          </Card>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 32, flexWrap: 'wrap' }}>
          <StatCard label="Total browsers" value={allSessions.length} />
          <StatCard label="Leader sessions" value={leaderCount} color={THEME.colors.leader.primary} />
          <StatCard label="Employee sessions" value={employeeCount} color={THEME.colors.employee.primary} />
          <StatCard label="Total messages" value={totalMessages} />
        </div>

        {tab === 'feedback' && (
          <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${THEME.colors.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.text }}>Feedback responses</div>
              <div style={{ fontSize: 11, color: THEME.colors.textMuted, marginTop: 3 }}>Click any entry to expand the full Q&A</div>
            </div>
            <FeedbackPanel />
          </div>
        )}

        {/* Session table */}
        {tab === 'sessions' && <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${THEME.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.text }}>
              Sessions
              {selected && <span style={{ fontSize: 11, color: THEME.colors.textMuted, fontWeight: 400, marginLeft: 8 }}>— click a row to switch conversation</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, background: THEME.colors.bg, borderRadius: 20, padding: 3 }}>
              {['all', 'leader', 'employee'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    padding: '5px 12px', borderRadius: 16, border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: THEME.font, transition: 'all .15s',
                    background: filter === f ? (f === 'leader' ? THEME.colors.leader.light : f === 'employee' ? THEME.colors.employee.light : THEME.colors.surface) : 'transparent',
                    color: filter === f ? (f === 'leader' ? THEME.colors.leader.primary : f === 'employee' ? THEME.colors.employee.primary : THEME.colors.text) : THEME.colors.textMuted,
                    fontWeight: filter === f ? 600 : 400,
                  }}>
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 65px 100px', gap: 14, padding: '8px 20px', background: THEME.colors.bg, borderBottom: `1px solid ${THEME.colors.border}` }}>
            {['', 'Browser / last message', 'Chats', 'Messages', 'Last active'].map((h, i) => (
              <div key={i} style={{ fontSize: 10, color: THEME.colors.textLight, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, textAlign: i > 1 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>

          {loading && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: THEME.colors.textLight, fontSize: 13 }}>Loading sessions…</div>
          )}
          {!loading && shown.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: THEME.colors.textLight, fontSize: 13, lineHeight: 1.8 }}>
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
              onClick={() => setSelected(prev =>
                prev?.browserId === session.browserId && prev?.persona === session.persona ? null : session
              )}
            />
          ))}
        </div>
        }

        {/* Quick links */}
        <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Leader site →', href: '/leader', color: THEME.colors.leader.primary, bg: THEME.colors.leader.light },
            { label: 'Employee site →', href: '/employee', color: THEME.colors.employee.primary, bg: THEME.colors.employee.light },
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
