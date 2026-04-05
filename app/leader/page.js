'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const PERSONA = 'leader';
const COLOR = '#534AB7';
const LIGHT = '#F6F5FF';
const LIGHTER = '#F0EFFE';
const DARK = '#2D2560';
const AVBG = '#EAE8FC';
const BORDER = '#D8D5F5';

const SYS = `You are Mosen, an AI change partner for leaders. Not a tool — a trusted colleague. Warm but direct. Peer-level. One question per message. No bullet points. No jargon. Short messages. If given a business answer to a people question, redirect: "That's the business case. I'm curious about the human one."`;
const OPEN = `START: Leader just opened Mosen. Send opening message — warm, direct, peer-level, showing you understand leading change. Single most important question. 3-4 sentences max.`;

const mkId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmt = ts => {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function getBrowserId() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(r => r.startsWith('mosen_browser_id='));
  if (match) return match.split('=')[1];
  const newId = mkId();
  document.cookie = `mosen_browser_id=${newId}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  return newId;
}

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

async function kvLoad(browserId) {
  try {
    const r = await fetch(`/api/sessions?browserId=${encodeURIComponent(browserId)}&persona=${PERSONA}`);
    const d = await r.json();
    return Array.isArray(d.chats) ? d.chats : [];
  } catch { return []; }
}

async function kvSave(browserId, chats) {
  try {
    const slim = chats.map(({ apiHistory: _, ...rest }) => rest);
    await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ browserId, persona: PERSONA, chats: slim })
    });
  } catch {}
}

function MosenAvatar() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: AVBG, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill={COLOR} />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={COLOR} strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" fill={AVBG} />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFEFEC', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill="#AAA" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#AAA" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" fill="#EFEFEC" />
      </svg>
    </div>
  );
}

function SideItem({ chat, active, onOpen, onDel }) {
  const [hov, setHov] = useState(false);
  const prev = chat.messages?.filter(m => m.from === 'user').slice(-1)[0]?.text?.slice(0, 50) || 'New conversation';
  return (
    <div onClick={() => onOpen(chat)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '7px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1, background: active ? LIGHTER : hov ? '#F5F5F2' : 'transparent' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? COLOR : '#D8D8D4', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: active ? COLOR : '#444', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prev}</div>
        <div style={{ fontSize: 10, color: '#C0C0BA', marginTop: 1 }}>{fmt(chat.updatedAt)}</div>
      </div>
      {hov && (
        <button onClick={e => onDel(chat.id, e)}
          style={{ border: 'none', background: 'transparent', color: '#CCC', cursor: 'pointer', fontSize: 17, padding: '0 2px', lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E74C3C'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#CCC'; }}>×</button>
      )}
    </div>
  );
}

export default function LeaderPage() {
  const [browserId, setBrowserId] = useState(null);
  const [all, setAll] = useState([]);
  const [syncing, setSyncing] = useState(true);
  const [aid, setAid] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [hist, setHist] = useState([]);
  const [inp, setInp] = useState('');
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState(true);
  const endRef = useRef(null);
  const taRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    const bid = getBrowserId();
    setBrowserId(bid);
  }, []);

  useEffect(() => {
    if (!browserId) return;
    setSyncing(true);
    kvLoad(browserId).then(chats => { setAll(chats); setSyncing(false); });
  }, [browserId]);

  const scroll = useCallback(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);
  useEffect(scroll, [msgs, busy, scroll]);

  const persist = useCallback((chats) => {
    if (!browserId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => kvSave(browserId, chats), 800);
  }, [browserId]);

  useEffect(() => {
    if (!aid || msgs.length === 0) return;
    setAll(prev => {
      const lu = msgs.filter(m => m.from === 'user').slice(-1)[0];
      const updated = prev.map(c =>
        c.id === aid
          ? { ...c, messages: msgs, apiHistory: hist, updatedAt: Date.now(), preview: lu?.text?.slice(0, 50) || c.preview }
          : c
      );
      persist(updated);
      return updated;
    });
  }, [msgs, hist, aid, persist]);

  const startNewChat = useCallback(() => {
    const id = mkId();
    const nc = { id, persona: PERSONA, messages: [], apiHistory: [], preview: 'New conversation', createdAt: Date.now(), updatedAt: Date.now() };
    setAll(prev => { const u = [nc, ...prev]; persist(u); return u; });
    setAid(id); setMsgs([]); setHist([]); setInp(''); setBusy(true);
    const ms = [{ role: 'user', content: OPEN }];
    ask(ms, SYS)
      .then(text => {
        const nh = [...ms, { role: 'assistant', content: text }];
        const nm = [{ from: 'mosen', text }];
        setHist(nh); setMsgs(nm);
        setAll(prev => {
          const u = prev.map(c => c.id === id ? { ...c, messages: nm, apiHistory: nh, updatedAt: Date.now() } : c);
          persist(u);
          return u;
        });
      })
      .catch(e => setMsgs([{ from: 'error', text: e.message }]))
      .finally(() => setBusy(false));
  }, [persist]);

  const openChat = useCallback((chat) => {
    setAid(chat.id);
    setMsgs(chat.messages || []); setHist(chat.apiHistory || []); setInp('');
  }, []);

  const delChat = useCallback((id, e) => {
    e.stopPropagation();
    setAll(prev => { const u = prev.filter(c => c.id !== id); persist(u); return u; });
    if (aid === id) { setAid(null); setMsgs([]); setHist([]); }
  }, [aid, persist]);

  const send = useCallback(async () => {
    const txt = inp.trim(); if (!txt || busy) return;
    setInp(''); if (taRef.current) taRef.current.style.height = 'auto';
    const nm = [...msgs, { from: 'user', text: txt }]; setMsgs(nm);
    const nh = [...hist, { role: 'user', content: txt }]; setBusy(true);
    try {
      const text = await ask(nh, SYS);
      setMsgs([...nm, { from: 'mosen', text }]);
      setHist([...nh, { role: 'assistant', content: text }]);
    } catch (e) {
      setMsgs([...nm, { from: 'error', text: '⚠ ' + e.message }]);
    } finally { setBusy(false); }
  }, [inp, busy, msgs, hist]);

  return (
    <div style={{ height: '100vh', display: 'flex', fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: 14, color: '#1A1A18', background: '#FAFAF8', overflow: 'hidden' }}>

      {side && (
        <div style={{ width: 256, borderRight: '1px solid #EBEBEA', display: 'flex', flexDirection: 'column', background: '#ffffff', flexShrink: 0 }}>
          <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #EBEBEA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <MosenAvatar />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.01em' }}>Mosen</span>
              {syncing && <span style={{ fontSize: 10, color: '#C0C0BA', marginLeft: 'auto' }}>syncing…</span>}
            </div>
            <div style={{ fontSize: 11, color: COLOR, fontWeight: 600, background: LIGHTER, borderRadius: 6, padding: '3px 8px', display: 'inline-block', marginTop: 4 }}>Leader</div>
          </div>

          <div style={{ padding: '10px 10px 4px' }}>
            <button onClick={startNewChat}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px dashed ${BORDER}`, background: 'transparent', color: '#999', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR; e.currentTarget.style.color = COLOR; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = '#999'; }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New conversation
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
            {syncing && <div style={{ padding: '24px 8px', color: '#CCC', fontSize: 12, textAlign: 'center' }}>Loading…</div>}
            {!syncing && all.length === 0 && (
              <div style={{ padding: '32px 8px', color: '#CCC', fontSize: 12, textAlign: 'center', lineHeight: 1.8 }}>
                Start a conversation<br />to see it here
              </div>
            )}
            {all.map(c => <SideItem key={c.id} chat={c} active={c.id === aid} onOpen={openChat} onDel={delChat} />)}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '11px 18px', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', flexShrink: 0, minHeight: 52 }}>
          <button onClick={() => setSide(o => !o)}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EBEBEA', background: 'transparent', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            {side ? '←' : '☰'}
          </button>
          {aid && <span style={{ fontSize: 12, color: '#C0C0BA', marginLeft: 2 }}>leader · {msgs.filter(m => m.from === 'user').length} turns</span>}
        </div>

        {!aid ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 40 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                <MosenAvatar />
                <span style={{ fontSize: 24, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.02em' }}>Mosen</span>
              </div>
              <div style={{ fontSize: 14, color: '#999', maxWidth: 300, lineHeight: 1.7 }}>
                Your AI change partner.<br />Here to help you lead with clarity.
              </div>
            </div>
            <button onClick={startNewChat}
              style={{ padding: '20px 28px', borderRadius: 16, border: `1px solid ${BORDER}`, background: LIGHT, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${COLOR}18`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLOR, marginBottom: 5 }}>I'm leading a change</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>Navigate strategy and people</div>
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
              {msgs.map((m, i) => {
                if (m.from === 'error') return (
                  <div key={i} style={{ padding: '10px 14px', background: '#FFF3F0', borderRadius: 10, fontSize: 12, color: '#C0392B', border: '1px solid #FDDDD9' }}>{m.text}</div>
                );
                const fu = m.from === 'user';
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: fu ? 'row-reverse' : 'row' }}>
                    {fu ? <UserAvatar /> : <MosenAvatar />}
                    <div style={{
                      maxWidth: '72%', padding: '12px 16px', fontSize: 13.5, lineHeight: 1.75,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: fu ? '#ffffff' : LIGHT, color: fu ? '#1A1A18' : DARK,
                      border: fu ? '1px solid #E8E8E4' : 'none',
                      borderRadius: fu ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      boxShadow: fu ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {busy && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <MosenAvatar />
                  <div style={{ padding: '14px 18px', background: LIGHT, borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR, opacity: 0.4, animation: `blink 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div style={{ padding: '12px 24px 18px', borderTop: '1px solid #EBEBEA', background: '#ffffff', flexShrink: 0, maxWidth: 800, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, background: '#F5F5F2', border: '1px solid #E8E8E4', borderRadius: 14, display: 'flex', alignItems: 'flex-end' }}
                  onFocusCapture={e => e.currentTarget.style.borderColor = COLOR}
                  onBlurCapture={e => e.currentTarget.style.borderColor = '#E8E8E4'}>
                  <textarea ref={taRef} value={inp}
                    onChange={e => { setInp(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Type your message…" disabled={busy} rows={1}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#1A1A18', fontSize: 13.5, padding: '12px 16px', resize: 'none', minHeight: 46, maxHeight: 140, lineHeight: 1.6, fontFamily: 'inherit' }} />
                </div>
                <button onClick={send} disabled={busy || !inp.trim()}
                  style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: COLOR, color: '#fff', cursor: busy || !inp.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, opacity: busy || !inp.trim() ? 0.3 : 1, transition: 'opacity .15s' }}>↑</button>
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
