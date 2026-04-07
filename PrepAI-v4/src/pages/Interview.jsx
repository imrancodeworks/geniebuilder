import { useState, useEffect, useRef } from 'react';
import { S, Loader, SkeletonCard, ThemeToggle } from '../components/shared';
import QuestionCard  from '../components/QuestionCard';
import VoiceRecorder from '../components/VoiceRecorder';
import FeedbackCard  from '../components/FeedbackCard';
import { ROLES, ALL_ROLES } from '../utils/questions';
import { getAIFeedback, getSmartFeedback } from '../utils/analysis';
import { useApp } from '../context/AppContext';

const PERSONA_PROMPTS = {
  default:  null,
  google:   'You are a Google L5 software engineer. Be thorough, ask for specifics on scalability and trade-offs.',
  startup:  'You are a startup CTO. Value practical, pragmatic answers. Be direct and concise.',
  friendly: 'You are a friendly senior peer doing a mock interview. Be encouraging but give honest feedback.',
};

export default function Interview({ role, questions, timerSetting, personaId, sessionMode, onComplete, onExit }) {
  const { theme, toggleTheme, apiKey } = useApp();
  const [idx,      setIdx]      = useState(0);
  const [answers,  setAnswers]  = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [done,     setDone]     = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSetting || 90);
  const [timerOn,  setTimerOn]  = useState((timerSetting || 90) > 0);
  const timerRef = useRef(null);
  const maxTime  = timerSetting || 90;
  const meta     = ALL_ROLES[role] || ROLES[role];
  const isAI     = sessionMode === 'ai';
  const persona  = PERSONA_PROMPTS[personaId] || null;
  const personaLabel = { default: 'Senior Eng', google: 'Google L5', startup: 'Startup CTO', friendly: 'Friendly Peer' }[personaId] || 'Senior Eng';

  useEffect(() => {
    if (timerSetting === 0) { setTimerOn(false); return; }
    if (timerOn && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (timerOn && timeLeft === 0) {
      submit();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerOn, timeLeft]);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit();
      if (e.key === 'Escape') { setTimerOn(false); onExit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [input, done]);

  const fmt = t => `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(t % 60).padStart(2,'0')}`;
  const pct = maxTime > 0 ? (timeLeft / maxTime) * 100 : 100;
  const timerColor = timeLeft > 30 ? 'var(--success)' : timeLeft > 15 ? 'var(--warning)' : 'var(--danger)';

  const submit = async () => {
    if (!input.trim() || done) return;
    setTimerOn(false); setDone(true); setLoading(true);

    let fb;
    if (isAI) {
      fb = await getAIFeedback(questions[idx].q, input, persona, apiKey || null);
    } else {
      // Smart Mode: instant local scoring — no loading wait needed
      fb = getSmartFeedback(questions[idx], input);
    }

    setLoading(false);
    setFeedback(fb);
    const rec = { question: questions[idx], answer: input, feedback: fb };
    const newAns = [...answers, rec];
    setAnswers(newAns);
    if (idx >= questions.length - 1) {
      setTimeout(() => onComplete(newAns), isAI ? 2000 : 800);
    }
  };

  const nextQ = () => {
    setIdx(i => i + 1);
    setInput(''); setFeedback(null); setDone(false);
    if (timerSetting > 0) { setTimeLeft(timerSetting); setTimerOn(true); }
  };

  const q = questions[idx];
  if (!q) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div className="resp-flex-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
          <div className="resp-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-ghost btn-danger" onClick={() => { setTimerOn(false); onExit(); }} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', borderRadius: 8,
              padding: '7px 13px', fontSize: 12, cursor: 'pointer',
            }}>← Exit</button>
            <span style={{
              background: 'var(--accent-a-dim)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '4px 12px', fontSize: 11,
              color: 'var(--accent-a)', fontFamily: 'var(--font-mono)',
            }}>
              {meta.icon} {meta.label}
            </span>
            {/* Mode badge */}
            <span style={{
              background: isAI ? 'var(--accent-b-dim)' : 'var(--success-dim)',
              border: `1px solid ${isAI ? 'var(--accent-b)' : 'var(--success)'}`,
              borderRadius: 20, padding: '4px 10px', fontSize: 10,
              color: isAI ? 'var(--accent-b)' : 'var(--success)',
              fontFamily: 'var(--font-mono)',
            }}>
              {isAI ? `🤖 AI · ${personaLabel}` : '⚡ Smart Mode'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {timerSetting > 0 && (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 14,
                color: timerColor, fontWeight: 700, minWidth: 52, textAlign: 'right',
              }}>
                {fmt(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: 32, height: 5, borderRadius: 3,
              background: i < idx ? 'var(--success)' : i === idx ? 'var(--accent-a)' : 'var(--bg-surface)',
              transition: 'background .3s',
            }} />
          ))}
        </div>

        {/* Timer bar */}
        {timerSetting > 0 && (
          <div style={{ height: 3, background: 'var(--bg-surface)', borderRadius: 2, marginBottom: 18, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, background: timerColor,
              borderRadius: 2, transition: 'width .9s linear, background .3s',
            }} />
          </div>
        )}

        <QuestionCard question={q} idx={idx} total={questions.length} role={role} />

        {/* Answer input */}
        {!done && (
          <div className="resp-padding" style={{ ...S.card, padding: '22px', marginTop: 16, animation: 'fadeUp .4s ease' }}>
            <div className="resp-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
              <div style={S.label}>Your Answer</div>
              <VoiceRecorder onTranscript={setInput} />
            </div>
            <textarea
              value={input} onChange={e => setInput(e.target.value)}
              placeholder="Type your answer here, or use the voice button…"
              style={{
                width: '100%', minHeight: 140,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px', color: 'var(--text-primary)',
                fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.75,
                resize: 'vertical', outline: 'none',
              }}
            />
            {/* Word count bar */}
            <div style={{ marginTop: 10, marginBottom: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {input.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  target: 80–150
                </span>
              </div>
              {(() => {
                const wc  = input.trim().split(/\s+/).filter(Boolean).length;
                const pct = Math.min((wc / 150) * 100, 100);
                const col = wc < 40 ? 'var(--danger)' : wc < 80 ? 'var(--warning)' : 'var(--success)';
                return (
                  <div style={{ height: 4, background: 'var(--bg-surface)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2, transition: 'width .3s, background .3s' }} />
                  </div>
                );
              })()}
            </div>
            <div className="resp-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 14 }}>
              <span className="hide-mobile" style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Ctrl+Enter to submit
              </span>
              <button className="btn-primary submit-btn" onClick={submit} disabled={!input.trim() || loading} style={{
                borderRadius: 9, padding: '11px 26px',
                fontSize: 14, fontWeight: 700,
                cursor: !input.trim() ? 'not-allowed' : 'pointer',
                opacity: (!input.trim() || loading) ? 0.4 : 1,
                fontFamily: 'var(--font-body)',
              }}>
                {loading ? 'Analyzing…' : 'Submit Answer →'}
              </button>
            </div>
          </div>
        )}

        {/* Loading — only in AI mode (Smart Mode is instant) */}
        {loading && isAI && (
          <div style={{ marginTop: 16 }}>
            <SkeletonCard />
          </div>
        )}

        {feedback && !loading && (
          <div style={{ marginTop: 16 }}>
            <FeedbackCard
              feedback={feedback} idx={idx}
              total={questions.length} onNext={nextQ}
              isAI={isAI}
            />
          </div>
        )}
      </div>
    </div>
  );
}
