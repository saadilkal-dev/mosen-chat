export const dynamic = 'force-dynamic';

// Seed prompts for each persona — grounded in Mosen's research goals
const SEED = {
  leader: `You are designing a short adaptive feedback survey for a leader who has just used Mosen — an AI change partner that helps leaders navigate organisational change.

Your goal is to generate exactly ONE question at a time. Each question probes something valuable for validating whether Mosen helps leaders:
- Articulate their "why" behind a change (not just the business case — the human one)
- Have more honest conversations with their team
- Move from announcing change to genuinely understanding resistance
- Build confidence that their team is crossing over (from resistant to willing to experiment)

You must generate exactly 5 questions total across the conversation. The questions must branch based on previous answers — if someone says they feel confident, go deeper on what built that confidence. If they say they're struggling, probe what specifically feels hard.

FORMAT YOUR RESPONSE AS JSON:
{
  "question": "the question text (1 sentence, conversational, no jargon)",
  "options": ["option A", "option B", "option C", "option D"],
  "questionNumber": <1-5>,
  "isLast": <true if this is question 5, false otherwise>
}

Rules:
- Question text must be conversational, warm, peer-level — never survey-speak
- Options must be specific and realistic — not generic like "strongly agree"
- 3 or 4 options only
- Never ask more than one thing per question
- Options should feel like things a real leader would actually think or say`,

  employee: `You are designing a short adaptive feedback survey for an employee who has just used Mosen — an AI confidant that helps employees navigate organisational change safely.

Your goal is to generate exactly ONE question at a time. Each question probes something valuable for validating whether Mosen helps employees:
- Feel safe enough to be honest (not performative) about how they feel about change
- Understand what the change actually means for them personally
- Move from privately afraid to willing to experiment
- Trust that their input matters and will be heard

You must generate exactly 5 questions total across the conversation. Questions must branch based on previous answers.

FORMAT YOUR RESPONSE AS JSON:
{
  "question": "the question text (1 sentence, conversational, never clinical)",
  "options": ["option A", "option B", "option C"],
  "questionNumber": <1-5>,
  "isLast": <true if this is question 5, false otherwise>
}

Rules:
- Never clinical or HR-sounding — peer-level, warm, direct
- Options must feel like genuine thoughts an employee might have — not abstract scales
- 3 options only for employees (lower cognitive load)
- Never presume how they feel — offer options that let them self-identify
- The last question should always invite a short reflection on what would have made the change easier`
};

// POST /api/feedback/question
// Body: { persona, history: [{question, answer}], questionNumber }
// Returns next question with options
export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'API key not set' }, { status: 500 });

  try {
    const { persona, history = [], questionNumber = 1 } = await req.json();

    // Build the message history for Claude
    const messages = [];

    if (history.length === 0) {
      // First question — no prior answers
      messages.push({
        role: 'user',
        content: `Generate question ${questionNumber} of 5. This is the first question — start with something that opens up their experience without assuming anything.`
      });
    } else {
      // Build conversation history so Claude can branch
      for (const h of history) {
        messages.push({ role: 'user', content: `Question was: "${h.question}"\nThey answered: "${h.answer}"` });
        messages.push({ role: 'assistant', content: `Understood. Moving to next question.` });
      }
      messages.push({
        role: 'user',
        content: `Based on their answers so far, generate question ${questionNumber} of 5. Make it relevant to what they've shared.`
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SEED[persona] || SEED.leader,
        messages
      })
    });

    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

    // Parse JSON from Claude's response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return Response.json({ error: 'Could not parse question' }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);

  } catch (err) {
    console.error('Feedback question error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
