'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const SYSTEM_PROMPTS = {
  leader: `You are Mosen, an AI change partner for leaders. You are not a tool, platform, or assistant. You are a trusted colleague who happens to know a lot about change.

PERSONA: Strategic consultant and thinking partner for the leader driving this initiative.

VOICE — THREE PILLARS:
1. Warm but direct. You care — but you never hedge. Say what you see, clearly.
2. Curious, not corrective. Ask before you tell. One question at a time. Never a list of questions.
3. Peer-level, never superior. Use "we" and "let's" naturally. Never sound like software.

RULES — NEVER BREAK THESE:
- Never say "Great question!" or "Absolutely!" or any variant.
- Never use bullet points. Speak in whole sentences and paragraphs.
- Never tell someone how they feel. Describe what you noticed and ask.
- Never give multiple options when one clear suggestion works.
- Never use change management jargon ("stakeholder alignment", "change curve", etc.).
- Never refer to yourself as a tool, platform, AI, or assistant.
- Maximum one question per message. Always end with it.
- Short messages are a sign of confidence. Long messages signal anxiety. Keep it tight.

YOUR JOB IN THIS PHASE (change brief):
You are helping the leader articulate the WHY before anything else. The sequence:
1. Get them to name the human problem — not the business case.
2. Ask who is most at risk of struggling with this change.
3. Ask what success looks like for the people in it — not the org.
4. Ask what they're most uncertain about.
Only when you have these four things do you help them build the playbook.

STATE AWARENESS:
You will receive a JSON state object in each message showing: phase, signals collected, what the leader has shared so far. Use this to avoid repeating questions you've already asked.

THE MOST IMPORTANT RULE:
If a leader gives you a business outcome answer to a people question, don't accept it. Gently redirect: "That's the business case. I'm curious about the human one."`,

  employee: `You are Mosen, a confidant for employees navigating change at work. You are not a survey tool, not a reporting system, not a way for their manager to find out what they think.

PERSONA: A trusted, warm colleague who sits outside the org chart.

VOICE:
1. Warm and direct. Never hedge. Never perform warmth — be it.
2. Curious, not corrective. One question at a time. Let silences exist.
3. Peer-level. You sound like a thoughtful colleague, not a system.

RULES — NEVER BREAK THESE:
- Never say "Great!" or performative affirmations.
- Never use bullet points. Sentences only.
- Never tell them how they feel. Describe what you noticed. Ask.
- Never pressure. If they hesitate, name the hesitation and give them space.
- Never ask more than one question per message.
- Keep messages short. Brevity signals respect for their time.

TRUST ARCHITECTURE:
Nothing they share leaves this conversation without their explicit consent. When you want to surface something to their leadership, you ask permission first, show them the exact wording, and they can decline. The phrase that matters most: "That's not a policy — it's how I work."

YOUR JOB:
Phase 1 (first_contact): Build trust. Make them feel safe. Don't push.
Phase 2 (check_in): Understand what this change means for them personally.
Phase 3 (consent): If they've shared something meaningful, ask permission to surface it — anonymously, in their words.
Phase 4 (closed_loop): Tell them what happened with what they shared.`
};

const OPENING_PROMPTS = {
  leader: `START CONVERSATION: The leader has just opened Mosen for the first time to get help with their initiative. Send your opening message following your voice guidelines exactly — warm, direct, peer-level. Ask the one most important question to get the change brief started.`,
  employee: `START CONVERSATION: An employee has just been introduced to Mosen. Send your first contact message — establish trust before anything else. Use the phrase "That's not a policy — it's how I work" naturally. Ask one opening question about how they're feeling about this change. Keep it to 3-4 sentences max.`
};

const HINTS = {
  leader: ["We're restructuring", "New system rollout", "Culture shift", "Team reorg"],
  employee: ["I'm not sure yet", "A bit anxious", "What is this?", "Cautiously okay"]
};

async function callAPI(messages, systemPrompt) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  if (!text) throw new Error('Empty response');
  return text;
}

function detectConsentRequest(text) {
  const lower = text.toLowerCase();
  const patterns = ["here's what i'd share", "here is what i would share", "is that fair to share", "can i share this", "would you be comfortable"];
  if (patterns.some(p => lower.includes(p))) {
    const match = text.match(/"([^"]{20,200})"/);
    if (match) return match[1];
  }
  return null;
}

export default function MosenApp() {
  const [persona, setPersona] = useState('leader');
  const [chats, setChats] = useState({ leader: [], employee: [] });
  const [apiHist, setApiHist] = useState({ leader: [], employee: [] });
  const [phases, setPhases] = useState({ leader: 'change_brief', employee: 'first_contact' });
  const [signals, setSignals] = useState({ leader: [], employee: [] });
  const [turns, setTurns] = useState({ leader: 0, employee: 0 });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState({ leader: false, employee: false });
  const endRef = useRef(null);
  const taRef = useRef(null);

  const scroll = useCallback(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);

  useEffect(() => {
    const p = persona;
    if (started[p]) return;
    setStarted(prev => ({ ...prev, [p]: true }));
    setLoading(true);

    (async () => {
      try {
        const msgs = [{ role: 'user', content: OPENING_PROMPTS[p] }];
        const text = await callAPI(msgs, SYSTEM_PROMPTS[p]);
        setApiHist(prev => ({ ...prev, [p]: [...msgs, { role: 'assistant', content: text }] }));
        setChats(prev => ({ ...prev, [p]: [{ from: 'mosen', text }] }));
      } catch (err) {
        setChats(prev => ({ ...prev, [p]: [{ from: 'error', text: `Could not connect: ${err.message}` }] }));
      } finally {
        setLoading(false);
      }
    })();
  }, [persona, started]);

  useEffect(scroll, [chats, loading, scroll]);

  const updatePhase = useCallback((p, userMsg, turn) => {
    if (p === 'leader' && turn >= 3) {
      setPhases(prev => ({ ...prev, leader: 'playbook' }));
    }
    if (p === 'employee') {
      if (turn >= 2) setPhases(prev => ({ ...prev, employee: 'check_in' }));
      const honestSignals = ['nervous', 'uncertain', "don't understand", 'worried', 'not sure', 'confused', 'frustrated', 'unclear'];
      if (honestSignals.some(s => userMsg.toLowerCase().includes(s))) {
        setSignals(prev => {
          const updated = [...prev[p], userMsg.substring(0, 120)];
          return { ...prev, [p]: updated };
        });
        setPhases(prev => ({ ...prev, employee: 'consent' }));
      }
    }
  }, []);

  const send = async (overrideText) => {
    const txt = (overrideText || input).trim();
    if (!txt || loading) return;
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';

    const p = persona;
    const updatedChat = [...chats[p], { from: 'user', text: txt }];
    setChats(prev => ({ ...prev, [p]: updatedChat }));

    const newTurns = turns[p] + 1;
    setTurns(prev => ({ ...prev, [p]: newTurns }));

    const stateCtx = JSON.stringify({ persona: p, phase: phases[p], signals_collected: signals[p].length, turn: newTurns });
    const newHist = [...apiHist[p], { role: 'user', content: txt + `\n\n[STATE: ${stateCtx}]` }];

    setLoading(true);
    try {
      const text = await callAPI(newHist, SYSTEM_PROMPTS[p]);
      const consentWording = p === 'employee' ? detectConsentRequest(text) : null;
      setApiHist(prev => ({ ...prev, [p]: [...newHist, { role: 'assistant', content: text }] }));
      setChats(prev => ({ ...prev, [p]: [...updatedChat, { from: 'mosen', text, consentWording }] }));
      updatePhase(p, txt, newTurns);
    } catch (err) {
      setChats(prev => ({ ...prev, [p]: [...updatedChat, { from: 'error', text: `⚠ ${err.message}` }] }));
    } finally {
      setLoading(false);
    }
  };

  const handleConsent = (approved, wording) => {
    const response = approved
      ? `I've noted what you said. Here's the wording I'd use: "${wording}" — I'll share that with your leadership team anonymously.`
      : `No problem at all. What you share here stays here.`;
    setChats(prev => ({
      ...prev,
      [persona]: [...prev[persona], { from: 'mosen', text: response }]
    }));
    if (approved) {
      setSignals(prev => ({ ...prev, [persona]: [...prev[persona], `[consented] ${wording}`] }));
    }
  };

  const reset = () => {
    const p = persona;
    setChats(prev => ({ ...prev, [p]: [] }));
    setApiHist(prev => ({ ...prev, [p]: [] }));
    setTurns(prev => ({ ...prev, [p]: 0 }));
    setSignals(prev => ({ ...prev, [p]: [] }));
    setPhases(prev => ({ ...prev, [p]: p === 'leader' ? 'change_brief' : 'first_contact' }));
    setStarted(prev => ({ ...prev, [p]: false }));
  };

  const switchPersona = (p) => {
    setInput('');
    setPersona(p);
  };

  const msgs = chats[persona];
  const phase = phases[persona];
  const isLeader = persona === 'leader';

  const s = {
    app: { height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 820, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" },
    header: { padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--surface)' },
    dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--teal-soft)', animation: 'pulse 2s ease-in-out infinite' },
    brand: { fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--teal-soft)', letterSpacing: '0.06em' },
    toggle: { display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 20, padding: 3 },
    badge: { fontSize: 11, fontFamily: "'DM Mono', monospace", padding: '3px 10px', borderRadius: 10, background: 'rgba(29,158,117,.1)', color: 'var(--teal-soft)' },
    stateBar: { padding: '8px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', background: 'var(--surface)', flexShrink: 0 },
    pill: (active, warn) => ({
      fontSize: 10, fontFamily: "'DM Mono', monospace", padding: '2px 9px', borderRadius: 10,
      background: active ? 'rgba(29,158,117,.12)' : warn ? 'rgba(239,159,39,.12)' : 'var(--surface2)',
      color: active ? 'var(--teal-soft)' : warn ? 'var(--amber-soft)' : 'var(--text-dim)'
    }),
    messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 },
    row: (fromUser) => ({ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: fromUser ? 'row-reverse' : 'row', animation: 'fadeUp .3s ease' }),
    avatar: (type) => {
      const styles = {
        mosen_l: { background: 'var(--purple-dark)', color: 'var(--purple-soft)' },
        mosen_e: { background: 'var(--teal-dark)', color: 'var(--teal-soft)' },
        user_l: { background: 'rgba(83,74,183,.2)', color: 'var(--purple-soft)' },
        user_e: { background: 'rgba(29,158,117,.2)', color: 'var(--teal-soft)' },
      };
      return { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0, ...styles[type] };
    },
    bubble: (fromUser) => ({
      maxWidth: '78%', padding: '10px 14px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      background: fromUser ? 'var(--surface3)' : isLeader ? 'var(--ldr-bubble)' : 'var(--emp-bubble)',
      color: fromUser ? 'var(--text)' : isLeader ? 'var(--ldr-text)' : 'var(--emp-text)',
      border: fromUser ? '1px solid var(--border)' : 'none',
      borderRadius: fromUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px'
    }),
    inputArea: { padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
    inputWrap: { flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'flex-end' },
    sendBtn: { width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--teal-dark)', color: 'var(--teal-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 3, flexShrink: 0, fontSize: 15 },
    infoBar: { padding: '8px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, fontFamily: "'DM Mono', monospace", color: 'var(--text-dim)', display: 'flex', gap: 16, flexWrap: 'wrap', flexShrink: 0 },
  };

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={s.dot} />
          <span style={s.brand}>Mosen</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={s.toggle}>
          {['leader', 'employee'].map(p => (
            <button key={p} onClick={() => switchPersona(p)} style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 16, border: 'none',
              background: persona === p ? (p === 'leader' ? 'var(--purple-dark)' : 'var(--teal-dark)') : 'transparent',
              color: persona === p ? (p === 'leader' ? 'var(--purple-soft)' : 'var(--teal-soft)') : 'var(--text-dim)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s'
            }}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div style={s.badge}>{phase.replace(/_/g, ' ')}</div>
      </div>

      {/* State bar */}
      <div style={s.stateBar}>
        <span style={s.pill(true)}>persona: {persona}</span>
        <span style={s.pill(false)}>phase: {phase}</span>
        <span style={s.pill(false, signals[persona].length > 0)}>signals: {signals[persona].length}</span>
        <span style={s.pill(false)}>turns: {turns[persona]}</span>
      </div>

      {/* Messages */}
      <div style={s.messages}>
        {msgs.map((m, i) => {
          if (m.from === 'error') {
            return (
              <div key={i} style={{ padding: 12, background: 'rgba(216,90,48,.08)', borderRadius: 8, fontSize: 12, color: 'var(--coral)', fontFamily: "'DM Mono', monospace" }}>
                {m.text}
              </div>
            );
          }
          const fromUser = m.from === 'user';
          const avType = fromUser ? `user_${isLeader ? 'l' : 'e'}` : `mosen_${isLeader ? 'l' : 'e'}`;
          return (
            <div key={`${persona}-${i}`} style={s.row(fromUser)}>
              <div style={s.avatar(avType)}>{fromUser ? (isLeader ? 'L' : 'E') : 'M'}</div>
              <div>
                <div style={s.bubble(fromUser)}>{m.text}</div>
                {m.consentWording && (
                  <div style={{ marginTop: 8, background: 'var(--surface2)', border: '1px solid var(--teal)', borderRadius: 12, padding: '12px 14px', maxWidth: 360 }}>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--teal-soft)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Consent request</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 10, padding: '8px 10px', background: 'rgba(29,158,117,.05)', borderRadius: 6 }}>
                      "{m.consentWording}"
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleConsent(true, m.consentWording)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '1px solid var(--teal)', background: 'rgba(29,158,117,.08)', color: 'var(--teal-soft)', cursor: 'pointer' }}>Yes, share this</button>
                      <button onClick={() => handleConsent(false, m.consentWording)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '1px solid var(--coral)', background: 'transparent', color: 'var(--coral)', cursor: 'pointer' }}>No, keep private</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={s.avatar(`mosen_${isLeader ? 'l' : 'e'}`)}>M</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 14px', background: isLeader ? 'var(--ldr-bubble)' : 'var(--emp-bubble)', borderRadius: '4px 12px 12px 12px' }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-dim)', animation: `blink 1.2s ease-in-out ${j * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Hints */}
      {msgs.length <= 2 && !loading && (
        <div style={{ padding: '0 20px 8px', display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--night)' }}>
          {HINTS[persona].map(h => (
            <button key={h} onClick={() => send(h)} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 14, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s'
            }}>{h}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={s.inputArea}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={s.inputWrap}>
            <textarea
              ref={taRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type your message…"
              disabled={loading}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '10px 14px', resize: 'none', minHeight: 42, maxHeight: 140, lineHeight: 1.6 }}
            />
          </div>
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.35 : 1, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer' }}>↑</button>
        </div>
      </div>

      {/* Info bar */}
      <div style={s.infoBar}>
        <span>model: claude-sonnet-4-20250514</span>
        <span>turns: {turns[persona]}</span>
        <span>signals: {signals[persona].length}</span>
        <span style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={reset}>↺ reset</span>
      </div>
    </div>
  );
}
