'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const SYS = {
  leader: `You are Mosen, an AI change partner for leaders. Not a tool — a trusted colleague. Warm but direct. Peer-level. One question per message. No bullet points. No jargon. Short messages. If given a business answer to a people question, redirect: "That's the business case. I'm curious about the human one."`,
  employee: `You are Mosen, a confidant for employees navigating change. Not a survey tool. Warm, direct, peer-level. One question at a time. Never tell them how they feel. Short messages. Nothing leaves without consent. "That's not a policy — it's how I work."`
};
const OPEN = {
  leader: `START: Leader just opened Mosen. Send opening message — warm, direct, peer-level, showing you understand leading change. Single most important question. 3-4 sentences max.`,
  employee: `START: Employee just opened Mosen. Build trust first. Use "That's not a policy — it's how I work" naturally. One opening question. 3-4 sentences max.`
};

async function ask(messages, sys) {
  const r = await fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: sys, messages })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  const t = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  if (!t) throw new Error('Empty');
  return t;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmt = ts => {
  const d = new Date(ts), n = new Date(), df = n - d;
  if (df < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (df < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
const K = 'mosen_v4';
const ld = () => { try { const r = localStorage.getItem(K); return r ? JSON.parse(r) : []; } catch { return []; } };
const sv = c => { try { localStorage.setItem(K, JSON.stringify(c)); } catch {} };

// Avatar components
function MosenAvatar({ color, bg }) {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill={color} opacity="0.9" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
        <circle cx="12" cy="8" r="2" fill={bg} />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0F0EC', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill="#999" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="12" cy="8" r="2" fill="#F0F0EC" />
      </svg>
    </div>
  );
}

function SideItem({ c, active, ac, al, onOpen, onDel }) {
  const [hov, setHov] = useState(false);
  const prev = c.messages?.filter(m => m.from === 'user').slice(-1)[0]?.text?.slice(0, 50) || 'New conversation';
  return (
    <div onClick={() => onOpen(c)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '7px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1, background: active ? al : hov ? '#F5F5F2' : 'transparent' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? ac : '#D8D8D4', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: active ? ac : '#444', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prev}</div>
        <div style={{ fontSize: 10, color: '#C0C0BA', marginTop: 1 }}>{fmt(c.updatedAt)}</div>
      </div>
      {hov && (
        <button onClick={e => onDel(c.id, e)}
          style={{ border: 'none', background: 'transparent', color: '#CCC', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#E74C3C'}
          onMouseLeave={e => e.currentTarget.style.color = '#CCC'}>×</button>
      )}
    </div>
  );
}

export default function App() {
  const [all, setAll] = useState([]);
  const [aid, setAid] = useState(null);
  const [p, setP] = useState('leader');
  const [msgs, setMsgs] = useState([]);
  const [hist, setHist] = useState([]);
  const [inp, setInp] = useState('');
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState(true);
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { setAll(ld()); }, []);
  const scroll = useCallback(() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60), []);
  useEffect(scroll, [msgs, busy]);

  useEffect(() => {
    if (!aid || msgs.length === 0) return;
    setAll(prev => {
      const lu = msgs.filter(m => m.from === 'user').slice(-1)[0];
      const u = prev.map(c => c.id === aid
        ? { ...c, messages: msgs, apiHistory: hist, updatedAt: Date.now(), preview: lu?.text?.slice(0, 50) || c.preview }
        : c);
      sv(u); return u;
    });
  }, [msgs, hist, aid]);

  const newChat = useCallback(pid => {
    const id = uid();
    const nc = { id, persona: pid, messages: [], apiHistory: [], preview: 'New conversation', createdAt: Date.now(), updatedAt: Date.now() };
    setAll(prev => { const u = [nc, ...prev]; sv(u); return u; });
    setAid(id); setP(pid); setMsgs([]); setHist([]); setInp(''); setBusy(true);
    const ms = [{ role: 'user', content: OPEN[pid] }];
    ask(ms, SYS[pid])
      .then(text => {
        const nh = [...ms, { role: 'assistant', content: text }], nm = [{ from: 'mosen', text }];
        setHist(nh); setMsgs(nm);
        setAll(prev => { const u = prev.map(c => c.id === id ? { ...c, messages: nm, apiHistory: nh, updatedAt: Date.now() } : c); sv(u); return u; });
      })
      .catch(e => setMsgs([{ from: 'error', text: e.message }]))
      .finally(() => setBusy(false));
  }, []);

  const openChat = c => { setAid(c.id); setP(c.persona); setMsgs(c.messages || []); setHist(c.apiHistory || []); setInp(''); };
  const delChat = (id, e) => {
    e.stopPropagation();
    setAll(prev => { const u = prev.filter(c => c.id !== id); sv(u); return u; });
    if (aid === id) { setAid(null); setMsgs([]); setHist([]); }
  };

  const send = useCallback(async ov => {
    const txt = (ov || inp).trim(); if (!txt || busy) return;
    setInp(''); if (taRef.current) taRef.current.style.height = 'auto';
    const nm = [...msgs, { from: 'user', text: txt }]; setMsgs(nm);
    const nh = [...hist, { role: 'user', content: txt }]; setBusy(true);
    try {
      const text = await ask(nh, SYS[p]);
      setMsgs([...nm, { from: 'mosen', text }]);
      setHist([...nh, { role: 'assistant', content: text }]);
    } catch (e) { setMsgs([...nm, { from: 'error', text: '⚠ ' + e.message }]); }
    finally { setBusy(false); }
  }, [inp, busy, msgs, hist, p]);

  const ac = p === 'leader' ? '#534AB7' : '#1D9E75';
  const al = p === 'leader' ? '#F0EFFE' : '#F0FAF6';
  const ab = p === 'leader' ? '#F6F5FF' : '#F0FAF6';
  const at = p === 'leader' ? '#2D2560' : '#0A4D3A';
  const avatarBg = p === 'leader' ? '#EAE8FC' : '#E0F5EC';
  const lc = all.filter(c => c.persona === 'leader');
  const ec = all.filter(c => c.persona === 'employee');

  return (
    <div style={{ height: '100vh', display: 'flex', fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: 14, color: '#1A1A18', background: '#FAFAF8', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      {side && (
        <div style={{ width: 256, borderRight: '1px solid #EBEBEA', display: 'flex', flexDirection: 'column', background: '#ffffff', flexShrink: 0 }}>
          {/* Brand */}
          <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #EBEBEA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <MosenAvatar color={ac} bg={avatarBg} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.01em' }}>Mosen</span>
            </div>
            {/* Persona toggle */}
            <div style={{ display: 'flex', gap: 2, background: '#F3F3F0', borderRadius: 20, padding: 3 }}>
              {['leader', 'employee'].map(pt => {
                const c = pt === 'leader' ? '#534AB7' : '#1D9E75';
                const l = pt === 'leader' ? '#EEEDFA' : '#E6F7F0';
                const on = p === pt;
                return (
                  <button key={pt} onClick={() => setP(pt)}
                    style={{ flex: 1, fontSize: 11, padding: '5px 0', borderRadius: 16, border: 'none', background: on ? l : 'transparent', color: on ? c : '#999', cursor: 'pointer', fontWeight: on ? 600 : 400, fontFamily: 'inherit', transition: 'all .15s' }}>
                    {pt[0].toUpperCase() + pt.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* New chat */}
          <div style={{ padding: '10px 10px 4px' }}>
            <button onClick={() => newChat(p)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px dashed #D8D8D4', background: 'transparent', color: '#999', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.color = ac; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#D8D8D4'; e.currentTarget.style.color = '#999'; }}>
              <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span> New conversation
            </button>
          </div>

          {/* Chat list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
            {all.length === 0 && (
              <div style={{ padding: '32px 8px', color: '#CCC', fontSize: 12, textAlign: 'center', lineHeight: 1.8 }}>
                Start a conversation<br />to see it here
              </div>
            )}
            {lc.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: '#C8C8C2', padding: '12px 8px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Leader</div>
                {lc.map(c => <SideItem key={c.id} c={c} active={c.id === aid} ac="#534AB7" al="#F0EFFE" onOpen={openChat} onDel={delChat} />)}
              </>
            )}
            {ec.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: '#C8C8C2', padding: '12px 8px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Employee</div>
                {ec.map(c => <SideItem key={c.id} c={c} active={c.id === aid} ac="#1D9E75" al="#F0FAF6" onOpen={openChat} onDel={delChat} />)}
              </>
            )}
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ padding: '11px 18px', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', flexShrink: 0, minHeight: 52 }}>
          <button onClick={() => setSide(o => !o)}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EBEBEA', background: 'transparent', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
            {side ? '←' : '☰'}
          </button>
          {aid && (
            <span style={{ fontSize: 12, color: '#C0C0BA', marginLeft: 2 }}>
              {p} · {msgs.filter(m => m.from === 'user').length} turns
            </span>
          )}
        </div>

        {/* EMPTY STATE */}
        {!aid ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 40 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                <MosenAvatar color={ac} bg={avatarBg} />
                <span style={{ fontSize: 24, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.02em' }}>Mosen</span>
              </div>
              <div style={{ fontSize: 14, color: '#999', maxWidth: 300, lineHeight: 1.7 }}>
                An AI change partner.<br />Choose a role to start a conversation.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                { pt: 'leader', label: "I'm leading a change", desc: 'Navigate strategy and people', color: '#534AB7', light: '#F6F5FF', border: '#D8D5F5' },
                { pt: 'employee', label: "I'm going through change", desc: 'Talk through how it feels', color: '#1D9E75', light: '#F0FAF6', border: '#C5EBE0' },
              ].map(({ pt, label, desc, color, light, border }) => (
                <button key={pt} onClick={() => newChat(pt)}
                  style={{ padding: '20px 22px', borderRadius: 16, border: `1px solid ${border}`, background: light, cursor: 'pointer', textAlign: 'left', width: 196, fontFamily: 'inherit', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}18`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* MESSAGES */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
              {msgs.map((m, i) => {
                if (m.from === 'error') return (
                  <div key={i} style={{ padding: '10px 14px', background: '#FFF3F0', borderRadius: 10, fontSize: 12, color: '#C0392B', border: '1px solid #FDDDD9' }}>{m.text}</div>
                );
                const fu = m.from === 'user';
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: fu ? 'row-reverse' : 'row' }}>
                    {fu ? <UserAvatar /> : <MosenAvatar color={ac} bg={avatarBg} />}
                    <div style={{
                      maxWidth: '72%', padding: '12px 16px', fontSize: 13.5, lineHeight: 1.75,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: fu ? '#ffffff' : ab,
                      color: fu ? '#1A1A18' : at,
                      border: fu ? '1px solid #E8E8E4' : 'none',
                      borderRadius: fu ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      boxShadow: fu ? '0 1px 4px rgba(0,0,0,0.04)' : 'none'
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {busy && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <MosenAvatar color={ac} bg={avatarBg} />
                  <div style={{ padding: '14px 18px', background: ab, borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: ac, opacity: 0.4, animation: `blink 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* INPUT */}
            <div style={{ padding: '12px 24px 18px', borderTop: '1px solid #EBEBEA', background: '#ffffff', flexShrink: 0, maxWidth: 800, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, background: '#F5F5F2', border: '1px solid #E8E8E4', borderRadius: 14, display: 'flex', alignItems: 'flex-end', transition: 'border-color .15s' }}
                  onFocusCapture={e => e.currentTarget.style.borderColor = ac}
                  onBlurCapture={e => e.currentTarget.style.borderColor = '#E8E8E4'}>
                  <textarea ref={taRef} value={inp}
                    onChange={e => { setInp(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Type your message…"
                    disabled={busy} rows={1}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#1A1A18', fontSize: 13.5, padding: '12px 16px', resize: 'none', minHeight: 46, maxHeight: 140, lineHeight: 1.6, fontFamily: 'inherit' }} />
                </div>
                <button onClick={() => send()} disabled={busy || !inp.trim()}
                  style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: ac, color: '#fff', cursor: busy || !inp.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, opacity: busy || !inp.trim() ? 0.3 : 1, transition: 'opacity .15s' }}>↑</button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:.8} }
        textarea::placeholder { color: #B8B8B0; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-thumb { background: #E0E0DC; border-radius: 2px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}