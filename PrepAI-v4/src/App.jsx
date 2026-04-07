import { useState, useEffect } from 'react';
import Home          from './pages/Home';
import Interview     from './pages/Interview';
import Result        from './pages/Result';
import DashboardPage from './pages/DashboardPage';
import RolesPage     from './pages/RolesPage';
import ResumeReader  from './pages/ResumeReader';
import About         from './pages/About';
import MNCRankingPage from './pages/MNCRankingPage';
import OpeningPage from './pages/OpeningPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import { QUESTIONS, ROLES, ALL_ROLES, shuffleQuestions } from './utils/questions';
import { selectAdaptiveQuestions, updateEngineState, getEngineStats } from './utils/questionEngine';
import { generateQuestionsFromJD } from './utils/analysis';
import { useApp } from './context/AppContext';

const PERSONAS = [
  { id: 'default',  label: 'Senior Engineer', icon: '👔' },
  { id: 'google',   label: 'Google L5',        icon: '🔵' },
  { id: 'startup',  label: 'Startup CTO',      icon: '🚀' },
  { id: 'friendly', label: 'Friendly Peer',    icon: '😊' },
];

const TIMER_OPTIONS = [
  { value: 60,  label: '60 sec'   },
  { value: 90,  label: '90 sec'   },
  { value: 120, label: '2 min'    },
  { value: 0,   label: 'No limit' },
];

const DIFF_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'];

function ModeToggle({ mode, onToggle }) {
  const isAI = mode === 'ai';
  return (
    <div onClick={onToggle} className={`mode-toggle ${isAI ? 'mode-toggle-ai' : 'mode-toggle-smart'}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
      }}>
      <div style={{
        padding: '9px 16px', fontSize: 12, fontWeight: 700,
        background: isAI ? 'var(--accent-a)' : 'transparent',
        color: isAI ? 'var(--bg-card)' : 'var(--text-muted)',
        transition: 'all .25s', letterSpacing: 0.5,
      }}>
        🤖 AI Mode
      </div>
      <div style={{
        padding: '9px 16px', fontSize: 12, fontWeight: 700,
        background: !isAI ? 'var(--success)' : 'transparent',
        color: !isAI ? '#fff' : 'var(--text-muted)',
        transition: 'all .25s', letterSpacing: 0.5,
      }}>
        ⚡ Smart Mode
      </div>
    </div>
  );
}

function SettingsModal({ role, onClose, onBegin }) {
  const { mode, toggleMode, apiKey, setApiKey } = useApp();
  const [persona,    setPersona]    = useState('default');
  const [timer,      setTimer]      = useState(90);
  const [difficulty, setDifficulty] = useState('All');
  const [source,     setSource]     = useState('role');
  const [jdText,     setJdText]     = useState('');
  const [resumeText, setResumeText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showKey,    setShowKey]    = useState(false);

  const engineStats = getEngineStats();
  const meta = ALL_ROLES[role] || ROLES[role];

  const handleBegin = async () => {
    let questions;
    if (source === 'jd' && jdText.trim()) {
      setGenerating(true);
      questions = await generateQuestionsFromJD(jdText, apiKey || null);
      setGenerating(false);
    } else if (source === 'resume' && resumeText.trim()) {
      setGenerating(true);
      questions = await generateQuestionsFromJD(
        `Generate interview questions based on this resume:\n${resumeText}`,
        apiKey || null
      );
      setGenerating(false);
    } else if (mode === 'smart') {
      let pool = QUESTIONS[role] || [];
      if (difficulty !== 'All') pool = pool.filter(q => q.diff === difficulty);
      questions = selectAdaptiveQuestions(pool.length >= 5 ? pool : (QUESTIONS[role] || pool), 5);
    } else {
      let pool = QUESTIONS[role] || [];
      if (difficulty !== 'All') pool = pool.filter(q => q.diff === difficulty);
      questions = shuffleQuestions(pool.length >= 5 ? pool : (QUESTIONS[role] || pool), 5);
    }
    onBegin({ questions, persona, timer, mode });
  };

  const Pill = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`pill-btn ${active ? 'pill-active' : ''}`} style={{
      background: active ? 'var(--accent-a)' : 'var(--bg-surface)',
      color: active ? 'var(--bg-card)' : 'var(--text-secondary)',
      border: `1px solid ${active ? 'var(--accent-a)' : 'var(--border)'}`,
      borderRadius: 20, padding: '7px 16px', fontSize: 13,
      fontFamily: 'var(--font-body)',
    }}>{label}</button>
  );

  const isAI = mode === 'ai';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      animation: 'fadeIn .18s ease',
    }}>
      <div className="resp-modal" style={{
        background: 'var(--bg-card)', borderRadius: 20,
        border: '1px solid var(--border)', width: '100%', maxWidth: 540,
        maxHeight: '92vh', overflowY: 'auto', margin: '16px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)', animation: 'scaleIn .22s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '22px 26px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              CONFIGURE SESSION
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>
              {meta?.icon} {meta?.label}
            </div>
          </div>
          <button className="btn-danger" onClick={onClose} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            width: 34, height: 34, borderRadius: '50%', fontSize: 18,
            cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div className="resp-padding" style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Mode Toggle */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
              SCORING MODE
            </div>
            <ModeToggle mode={mode} onToggle={toggleMode} />
            <div style={{
              marginTop: 10, background: 'var(--bg-surface)',
              border: `1px solid ${isAI ? 'var(--accent-a)' : 'var(--success)'}40`,
              borderRadius: 10, padding: '12px 14px',
              boxShadow: isAI ? '0 0 16px var(--glow-a)' : '0 0 16px var(--glow-success)',
              transition: 'all .3s',
            }}>
              {isAI ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>🤖 AI Mode — Powered by Claude</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    Every answer is evaluated by Claude AI with strict, no-grace-marks scoring across all 28 roles.
                    You get a precise score, specific strengths, improvements, and a model answer.
                    Requires an Anthropic API key (optional — falls back to local scoring).
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>⚡ Smart Mode — Adaptive Engine</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    Questions adapt based on your weak categories. Difficulty increases as you improve.
                    Keyword scoring covers all 28 roles. No internet or API key needed — works offline.
                  </div>
                  {engineStats.sessionCount > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ background: 'var(--accent-a-dim)', color: 'var(--accent-a)', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                        {engineStats.sessionCount} sessions tracked
                      </span>
                      {Object.entries(engineStats.categoryScores)
                        .sort((a, b) => a[1].avgScore - b[1].avgScore)
                        .slice(0, 2)
                        .map(([cat, data]) => (
                          <span key={cat} style={{ background: 'var(--danger-dim)', color: 'var(--danger)', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                            ↓ {cat} ({data.avgScore}%)
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* API Key */}
          {isAI && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                ANTHROPIC API KEY <span style={{ letterSpacing: 0, textTransform: 'none', fontSize: 10 }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{
                    flex: 1, background: 'var(--bg-surface)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)', outline: 'none', transition: 'border-color .2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent-a)'; e.target.style.boxShadow = '0 0 0 2px var(--accent-a-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button className="btn-ghost" onClick={() => setShowKey(v => !v)} style={{
                  borderRadius: 8, padding: '9px 12px', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: 13,
                }}>
                  {showKey ? '🙈' : '👁'}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Saved locally. Get a free key at console.anthropic.com
              </div>
            </div>
          )}

          {/* Question Source */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
              QUESTION SOURCE
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill active={source === 'role'}   onClick={() => setSource('role')}   label="🎯 Role Questions" />
              {isAI && <Pill active={source === 'jd'}     onClick={() => setSource('jd')}     label="📋 Job Description" />}
              {isAI && <Pill active={source === 'resume'} onClick={() => setSource('resume')} label="📄 My Resume" />}
            </div>
            {!isAI && source !== 'role' && setSource('role')}
            {source === 'jd' && (
              <textarea value={jdText} onChange={e => setJdText(e.target.value)}
                placeholder="Paste job description here…"
                style={{
                  marginTop: 10, width: '100%', minHeight: 100,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px', color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.7,
                  resize: 'vertical', outline: 'none',
                }}
              />
            )}
            {source === 'resume' && (
              <textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your resume here…"
                style={{
                  marginTop: 10, width: '100%', minHeight: 100,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px', color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.7,
                  resize: 'vertical', outline: 'none',
                }}
              />
            )}
          </div>

          {/* Difficulty */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>DIFFICULTY</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DIFF_OPTIONS.map(d => <Pill key={d} active={difficulty === d} onClick={() => setDifficulty(d)} label={d} />)}
            </div>
          </div>

          {/* Timer */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>TIME PER QUESTION</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIMER_OPTIONS.map(t => <Pill key={t.value} active={timer === t.value} onClick={() => setTimer(t.value)} label={t.label} />)}
            </div>
          </div>

          {/* Persona */}
          {isAI && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>INTERVIEWER PERSONA</div>
              <div className="resp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PERSONAS.map(p => (
                  <button key={p.id} onClick={() => setPersona(p.id)}
                    className={`persona-card ${persona === p.id ? 'persona-active' : ''}`}
                    style={{
                      background: persona === p.id ? 'var(--accent-a-dim)' : 'var(--bg-surface)',
                      border: `1.5px solid ${persona === p.id ? 'var(--accent-a)' : 'var(--border)'}`,
                      borderRadius: 10, padding: '12px 14px', textAlign: 'left',
                    }}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>{p.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: persona === p.id ? 'var(--accent-a)' : 'var(--text-primary)' }}>
                      {p.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Begin Button */}
          <button
            className="btn-primary"
            onClick={handleBegin}
            disabled={generating || (source === 'jd' && !jdText.trim()) || (source === 'resume' && !resumeText.trim())}
            style={{
              borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%',
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? '⏳ Generating questions…'
              : isAI ? '🤖 Begin AI Interview →'
              : '⚡ Begin Smart Interview →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { updateStreak } = useApp();
  const { token, logout } = useApp();
  const [page,    setPage]   = useState('opening');
  const [role,    setRole]   = useState('aiml');
  const [answers, setAnswers] = useState([]);
  const [history, setHistory] = useState([]);
  const [showSettings,  setShowSettings]  = useState(false);
  const [sessionConfig, setSessionConfig] = useState({ questions: [], persona: 'default', timer: 90, mode: 'ai' });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('geniebuilder_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    // If we have a token, skip opening/login and go home
    if (token && (page === 'opening' || page === 'login' || page === 'signup')) {
      setPage('home');
    } else if (!token && !['opening', 'login', 'signup'].includes(page)) {
      setPage('login');
    }
  }, [token, page]);

  const saveSession = (sessionAnswers) => {
    updateStreak();
    updateEngineState(sessionAnswers);
    const roleInfo = ALL_ROLES[role] || ROLES[role];
    const session = {
      id:       Date.now(),
      date:     new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      role, roleName: roleInfo?.label || role,
      answers:  sessionAnswers,
      avgScore: Math.round(sessionAnswers.reduce((s, a) => s + a.feedback.score, 0) / sessionAnswers.length),
      mode:     sessionConfig.mode,
    };
    const updated = [session, ...history].slice(0, 15);
    setHistory(updated);
    try { localStorage.setItem('geniebuilder_history', JSON.stringify(updated)); } catch {}
  };

  const handleBegin = (config) => {
    setShowSettings(false);
    setSessionConfig(config);
    setAnswers([]);
    setPage('interview');
  };

  const handleLogout = () => {
    logout();
    setPage('login');
  };

  if (page === 'opening') return <OpeningPage onComplete={() => setPage(token ? 'home' : 'login')} />;

  if (page === 'login') return (
    <LoginPage 
      onLogin={() => setPage('home')} 
      onSignup={() => setPage('signup')} 
    />
  );

  if (page === 'signup') return (
    <SignupPage 
      onSignupComplete={() => setPage('login')} 
      onLoginRedirect={() => setPage('login')} 
    />
  );

  if (page === 'home') return (
    <>
      <Home role={role} setRole={setRole}
        onStart={() => setShowSettings(true)}
        onDashboard={() => setPage('dashboard')}
        onAbout={() => setPage('about')}
        onBrowseRoles={() => setPage('roles')}
        onResumeReader={() => setPage('resume-reader')}
        onProfile={() => setPage('profile')}
        onLogout={handleLogout}
      />
      {showSettings && (
        <SettingsModal role={role} onClose={() => setShowSettings(false)} onBegin={handleBegin} />
      )}
    </>
  );

  if (page === 'roles') return (
    <>
      <RolesPage role={role} setRole={setRole}
        onStart={() => setShowSettings(true)}
        onHome={() => setPage('home')}
        onProfile={() => setPage('profile')}
        onLogout={handleLogout}
      />
      {showSettings && (
        <SettingsModal role={role} onClose={() => setShowSettings(false)} onBegin={handleBegin} />
      )}
    </>
  );

  if (page === 'about')     return <About onHome={() => setPage('home')} />;
  if (page === 'interview') return (
    <Interview
      role={role}
      questions={sessionConfig.questions}
      timerSetting={sessionConfig.timer}
      personaId={sessionConfig.persona}
      sessionMode={sessionConfig.mode}
      onComplete={(ans) => { setAnswers(ans); saveSession(ans); setPage('results'); }}
      onExit={() => setPage('home')}
    />
  );
  if (page === 'results') return (
    <>
      <Result answers={answers} role={role}
        onRetry={() => setShowSettings(true)}
        onHome={() => setPage('home')}
        onDashboard={() => setPage('dashboard')}
        onMNC={() => setPage('mnc-results')}
        onProfile={() => setPage('profile')}
        onLogout={handleLogout}
      />
      {showSettings && (
        <SettingsModal role={role} onClose={() => setShowSettings(false)} onBegin={handleBegin} />
      )}
    </>
  );
  if (page === 'dashboard') return (
    <>
      <DashboardPage history={history} role={role}
        onStart={() => setShowSettings(true)}
        onHome={() => setPage('home')}
        onMNC={() => setPage('mnc-dash')}
        onProfile={() => setPage('profile')}
        onLogout={handleLogout}
      />
      {showSettings && (
        <SettingsModal role={role} onClose={() => setShowSettings(false)} onBegin={handleBegin} />
      )}
    </>
  );
  if (page === 'mnc-results') return (
    <MNCRankingPage
      avg={answers.length > 0 ? Math.round(answers.reduce((s, a) => s + a.feedback.score, 0) / answers.length) : 0}
      answersCount={answers.length}
      onBack={() => setPage('results')}
    />
  );
  if (page === 'mnc-dash') return (
    <MNCRankingPage
      avg={history.length > 0 ? Math.round(history.reduce((s, h) => s + h.avgScore, 0) / history.length) : 0}
      answersCount={history.length}
      onBack={() => setPage('dashboard')}
    />
  );
  if (page === 'resume-reader') return (
    <ResumeReader 
      onHome={() => setPage('home')} 
      onProfile={() => setPage('profile')}
      onLogout={handleLogout}
    />
  );

  if (page === 'profile') return (
    <ProfilePage onHome={() => setPage('home')} />
  );
}
