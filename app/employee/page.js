'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MOSEN_KNOWLEDGE, EMPLOYEE_CONTEXT } from '../../lib/mosen-knowledge';

const PERSONA = 'employee';
const COLOR = '#1D9E75';
const LIGHT = '#F0FAF6';
const LIGHTER = '#E6F7F0';
const DARK = '#0A4D3A';
const AVBG = '#DFF3EC';
const BORDER = '#C5EBE0';

const SYS = `You are Mosen, a confidant for employees navigating change. Not a survey tool. Warm, direct, peer-level. One question at a time. Never tell them how they feel. Short messages. Nothing leaves without consent. "That's not a policy — it's how I work."

You are deeply grounded in two books written by the Softway team — "Love as a Business Strategy" and "Love as a Change Strategy." Draw naturally from this knowledge when it illuminates what the employee is going through. Never lecture. Never recite frameworks. Just ask the next right question.

${MOSEN_KNOWLEDGE}

${EMPLOYEE_CONTEXT}`;
const OPEN = `START: Employee just opened Mosen. Build trust first. Use "That's not a policy — it's how I work" naturally. One opening question. 3-4 sentences max.`;

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

// ── Feedback Modal ──────────────────────────────────────────────────────────

function FeedbackModal({ browserId, chatId, onClose }) {
  const TOTAL = 5;
  const [step, setStep] = useState('intro');
  const [qNum, setQNum] = useState(1);
  const [question, setQuestion] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchQuestion = useCallback(async (num, hist) => {
    setLoading(true);
    setSelected(null);
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: PERSONA, history: hist, questionNumber: num })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setQuestion(d);
      setStep('question');
    } catch (e) {
      setStep('error');
    } finally {
      setLoading(false);
    }
  }, []);

  const startFeedback = () => {
    fetchQuestion(1, []);
  };

  const handleAnswer = async (option) => {
    setSelected(option);
    const newHistory = [...history, { question: question.question, answer: option, questionNumber: qNum }];
    setHistory(newHistory);

    if (question.isLast || qNum >= TOTAL) {
      setSaving(true);
      try {
        await fetch('/api/feedback/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ browserId, persona: PERSONA, chatId, responses: newHistory })
        });
      } catch {}
      setSaving(false);
      setStep('done');
    } else {
      const next = qNum + 1;
      setQNum(next);
      setTimeout(() => fetchQuestion(next, newHistory), 300);
    }
  };

  const progress = qNum / TOTAL;

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, backdropFilter: 'blur(2px)' }} />

      <div style={{
        position: 'fixed', bottom: 90, right: 24, width: 420, zIndex: 201,
        background: '#111', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        fontFamily: "'DM Sans',system-ui,sans-serif",
        animation: 'slideUp .25s ease'
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="#fff" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="8" r="2" fill="#222" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Quick feedback</div>
              <div style={{ fontSize: 11, color: '#666' }}>5 questions · helps us improve Mosen</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #333', background: 'transparent', color: '#666', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {step === 'question' && (
          <div style={{ height: 3, background: '#222' }}>
            <div style={{ height: '100%', background: '#fff', width: `${progress * 100}%`, transition: 'width .4s ease', borderRadius: 2 }} />
          </div>
        )}

        <div style={{ padding: '24px 20px 22px', minHeight: 180 }}>

          {step === 'intro' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>💬</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 10, lineHeight: 1.4 }}>
                How was your experience with Mosen?
              </div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 24 }}>
                Five quick questions. Your answers are anonymous and help us understand if Mosen actually helps people going through change.
              </div>
              <button onClick={startFeedback}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#fff', color: '#111', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
                Start — takes 2 minutes
              </button>
            </div>
          )}

          {(step === 'question' || loading) && (
            <div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Question {qNum} of {TOTAL}
              </div>

              {loading ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '12px 0' }}>
                  {[0,1,2].map(j => (
                    <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#444', animation: `blink 1.2s ease-in-out ${j*0.2}s infinite` }} />
                  ))}
                </div>
              ) : question && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.5, marginBottom: 18 }}>
                    {question.question}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(question.options || []).map((opt, i) => (
                      <button key={i} onClick={() => handleAnswer(opt)} disabled={selected !== null}
                        style={{
                          padding: '11px 14px', borderRadius: 10, border: `1px solid ${selected === opt ? '#fff' : '#2a2a2a'}`,
                          background: selected === opt ? '#fff' : '#1a1a1a',
                          color: selected === opt ? '#111' : '#ccc',
                          fontSize: 13, cursor: selected !== null ? 'default' : 'pointer',
                          textAlign: 'left', fontFamily: 'inherit', lineHeight: 1.45,
                          transition: 'all .15s', fontWeight: selected === opt ? 600 : 400,
                        }}
                        onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#fff'; }}}
                        onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#ccc'; }}}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{saving ? '…' : '✓'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 10 }}>
                {saving ? 'Saving your responses…' : 'Thank you.'}
              </div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 22 }}>
                {saving ? '' : 'Your answers are anonymous. They help us make Mosen more useful for everyone going through change.'}
              </div>
              {!saving && (
                <button onClick={onClose}
                  style={{ padding: '11px 24px', borderRadius: 10, border: '1px solid #333', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Close
                </button>
              )}
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Something went wrong loading the question.</div>
              <button onClick={() => fetchQuestion(qNum, history)}
                style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid #333', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Components ─────────────────────────────────────────────────────────

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

export default function EmployeePage() {
  const [browserId, setBrowserId] = useState(null);
  const [all, setAll] = useState([]);
  const [syncing, setSyncing] = useState(true);
  const [aid, setAid] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [hist, setHist] = useState([]);
  const [inp, setInp] = useState('');
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
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
    <div className="chat-page" style={{ height: '100vh', display: 'flex', fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: 14, color: '#1A1A18', background: '#FAFAF8', overflow: 'hidden' }}>

      {side && (
        <div style={{ width: 256, borderRight: '1px solid #EBEBEA', display: 'flex', flexDirection: 'column', background: '#ffffff', flexShrink: 0 }}>
          <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #EBEBEA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <MosenAvatar />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.01em' }}>Mosen</span>
              {syncing && <span style={{ fontSize: 10, color: '#C0C0BA', marginLeft: 'auto' }}>syncing…</span>}
            </div>
            <div style={{ fontSize: 11, color: COLOR, fontWeight: 600, background: LIGHTER, borderRadius: 6, padding: '3px 8px', display: 'inline-block', marginTop: 4 }}>Employee</div>
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
          {aid && <span style={{ fontSize: 12, color: '#C0C0BA', marginLeft: 2 }}>employee · {msgs.filter(m => m.from === 'user').length} turns</span>}
        </div>

        {!aid ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 40 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                <MosenAvatar />
                <span style={{ fontSize: 24, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.02em' }}>Mosen</span>
              </div>
              <div style={{ fontSize: 14, color: '#999', maxWidth: 300, lineHeight: 1.7 }}>
                A safe space to think through change.<br />Nothing leaves without you knowing.
              </div>
            </div>
            <button onClick={startNewChat}
              style={{ padding: '20px 28px', borderRadius: 16, border: `1px solid ${BORDER}`, background: LIGHT, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${COLOR}18`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLOR, marginBottom: 5 }}>I'm going through change</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>Talk through how it feels</div>
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

      {/* ── Feedback Button — only shown when a chat is active ── */}
      {aid && !showFeedback && (
        <button onClick={() => setShowFeedback(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 150,
            background: '#111', color: '#fff',
            padding: '13px 20px', borderRadius: 50,
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            letterSpacing: '-0.01em',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)'; }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Share feedback
        </button>
      )}

      {showFeedback && browserId && aid && (
        <FeedbackModal browserId={browserId} chatId={aid} onClose={() => setShowFeedback(false)} />
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:.8} }
        @keyframes slideUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        textarea::placeholder { color: #B8B8B0; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-thumb { background: #E0E0DC; border-radius: 2px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
