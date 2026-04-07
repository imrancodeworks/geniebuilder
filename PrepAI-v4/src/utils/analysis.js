import { adaptiveLocalScore } from './questionEngine';

const TECH_TERMS = [
  'function','component','state','api','database','algorithm','performance','optimize',
  'implement','design','pattern','architecture','cache','async','promise','hook','class',
  'array','query','index','jwt','rest','model','layer','node','server','render','memory',
  'thread','container','deploy','scale','closure','prototype','event','loop','recursion',
  'microservice','docker','kubernetes','pipeline','transformer','embedding','gradient',
  'neural','training','inference','latency','throughput','consistency','availability',
];

const FILLER_WORDS = ['um','uh','like','basically','literally','you know','kind of','sort of','right','actually','so','just'];

export const getColor   = s => s >= 75 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--danger)';
export const getVerdict = s => s >= 85 ? 'Outstanding' : s >= 75 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Average' : 'Needs Work';

export function detectFillerWords(text) {
  const lower = text.toLowerCase();
  const found = {};
  FILLER_WORDS.forEach(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) found[w] = matches.length;
  });
  const total = Object.values(found).reduce((a, b) => a + b, 0);
  const penalty = Math.min(total * 3, 25);
  return { found, total, penalty };
}

export const localAnalyze = (question, answer) => {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wc    = words.length;
  const found = TECH_TERMS.filter(w => answer.toLowerCase().includes(w));
  const filler = detectFillerWords(answer);
  let score = 0;
  if (wc >= 15) score += 15;
  if (wc >= 40) score += 15;
  if (wc >= 70) score += 10;
  score += Math.min(found.length * 8, 30);
  if (answer.includes('example') || answer.includes('instance')) score += 10;
  if (answer.includes('because') || answer.includes('therefore'))  score += 10;
  score = Math.max(0, Math.min(score - filler.penalty, 95));
  return {
    score, verdict: getVerdict(score),
    strengths: [
      wc >= 40 ? 'Well-detailed response' : 'Concise attempt',
      found.length > 2 ? `Good use of ${found.length} technical terms` : 'Structured answer',
    ],
    improvements: [
      wc  < 40 ? 'Expand with more detail' : 'Great depth!',
      found.length < 3 ? 'Add more technical vocabulary' : 'Good terminology!',
    ],
    tip: 'Use the STAR method: Situation → Task → Action → Result.',
    keywords_found: found.slice(0, 6),
    communication_score: Math.min(Math.round(wc * 1.2), 100),
    technical_score:     Math.min(found.length * 14, 100),
    filler_words: filler,
    model_answer: null,
    mode: 'fallback',
  };
};

// ─── AI Mode — strict scoring, aware of all 28 roles ─────────────────────────
export const getAIFeedback = async (question, answer, persona = null, apiKey = null) => {
  const fillerData = detectFillerWords(answer);
  const personaCtx = persona
    ? `You are playing the role of: ${persona}. Adjust your feedback tone accordingly.`
    : 'You are a senior technical interviewer at a top-tier tech company.';

  const headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (apiKey) headers['x-api-key'] = apiKey;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `${personaCtx}

You are evaluating candidates across 28 different tech roles including: Frontend Dev, Backend Dev, AI/ML Engineer, Full Stack Dev, DevOps Engineer, Mobile Dev, Security Engineer, Data Engineer, Software Architect, QA/Automation Engineer, Data Scientist, NLP Engineer, Computer Vision Engineer, AI Ethics Specialist, Cloud Engineer, SRE, Systems Administrator, Network Architect, Cybersecurity Analyst, Ethical Hacker/Pen Tester, Security Architect, InfoSec Manager, Digital Forensics Specialist, Blockchain Developer, Game Developer, Embedded Systems Engineer, IoT Engineer, UI/UX Designer, AR/VR Developer, Database Administrator.

Evaluate this interview answer with STRICT, ACCURATE, NO-GRACE-MARKS scoring. Score ONLY what the candidate actually said — do NOT infer what they might have meant. Be professionally honest.

STRICT SCORING RUBRIC:
- 0–25:  Completely wrong, irrelevant, or blank answer
- 25–45: Vague, buzzword-only, or fundamentally incorrect understanding
- 45–60: Partial understanding — misses core concepts or lacks specifics
- 60–75: Solid answer — correct concepts but missing depth or examples
- 75–88: Strong answer — thorough, specific, with good examples
- 88–95: Exceptional — comprehensive, nuanced, real-world expertise demonstrated
- 95+:   Reserved for near-perfect, production-level insight

DO NOT inflate scores to seem encouraging. The candidate needs honest feedback to improve.

Question Category: ${question.cat || 'General'}
Question: ${question.q || question}
Candidate Answer: ${answer}

Respond ONLY with a raw JSON object (no markdown fences, no extra text):
{
  "score": 55,
  "verdict": "Average",
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific gap 1 — what was missing", "specific improvement 2"],
  "tip": "one concrete, actionable tip specific to this question",
  "keywords_found": ["relevant technical term used"],
  "communication_score": 60,
  "technical_score": 50,
  "model_answer": "2-3 sentence ideal answer demonstrating what an expert would say"
}`,
        }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    parsed.filler_words = fillerData;
    parsed.score = Math.max(0, parsed.score - fillerData.penalty);
    parsed.mode = 'ai';
    return parsed;
  } catch {
    return localAnalyze(question, answer);
  }
};

// ─── Smart Mode ───────────────────────────────────────────────────────────────
export const getSmartFeedback = (question, answer) => {
  const fillerData = detectFillerWords(answer);
  const result = adaptiveLocalScore(question, answer);
  result.filler_words = fillerData;
  result.score = Math.max(0, result.score - fillerData.penalty);
  return result;
};

export const generateQuestionsFromJD = async (jobDescription, apiKey = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (apiKey) headers['x-api-key'] = apiKey;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Generate 5 technical interview questions based on this job description. Return ONLY a raw JSON array, no markdown:\n\n${jobDescription}\n\nFormat: [{"q":"question","cat":"category","diff":"Easy|Medium|Hard"},...]`,
        }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return [{ q: 'Tell me about your relevant experience for this role.', cat: 'General', diff: 'Easy' }];
  }
};
