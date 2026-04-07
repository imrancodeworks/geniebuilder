import { ThemeToggle } from '../components/shared';
import { useApp } from '../context/AppContext';

const FEATURES = [
  {
    icon: '🔍',
    title: 'Role-Based Question Search',
    desc: 'Search any CS role — AI Engineer, DevOps, Mobile Dev — and instantly get tailored interview questions. 8 roles, 25+ questions each, shuffled every session so it never repeats.',
  },
  {
    icon: '🎤',
    title: 'Voice Input with Filler Detection',
    desc: 'Answer questions by speaking. GenieBuilder transcribes your answer in real-time and flags filler words like "um", "uh", and "basically" — the same thing real interviewers notice.',
  },
  {
    icon: '🧠',
    title: 'AI-Powered Scoring & Feedback',
    desc: 'Every answer is evaluated by Claude (Anthropic\'s AI) on technical accuracy, communication, and depth. You get a score, specific strengths, improvements, and keywords you used.',
  },
  {
    icon: '💡',
    title: 'Model Answer Comparison',
    desc: 'After submitting your answer, see a concise model answer side-by-side. Understand what an ideal response looks like and where you diverged.',
  },
  {
    icon: '🎭',
    title: 'Mock Interviewer Personas',
    desc: 'Choose your interviewer — a tough Google senior engineer, a startup CTO, or a friendly mid-level peer. The AI adjusts its feedback tone and expectations accordingly.',
  },
  {
    icon: '📋',
    title: 'Custom Job Description Mode',
    desc: 'Paste any job description and GenieBuilder generates 5 targeted questions from the actual requirements. Great for company-specific prep.',
  },
  {
    icon: '⏱️',
    title: 'Configurable Timer',
    desc: 'Set your preferred time limit per question: 60s, 90s, 120s, or no limit. Simulates real interview pacing or lets you practice at your own speed.',
  },
  {
    icon: '🎯',
    title: 'Difficulty Filtering',
    desc: 'Filter questions by Easy, Medium, or Hard. Warm up with basics, then challenge yourself as your confidence grows.',
  },
  {
    icon: '🔥',
    title: 'Streak Tracker',
    desc: 'Daily practice streak counter keeps you consistent. The best preparation is showing up every day — GenieBuilder makes that visible.',
  },
  {
    icon: '📊',
    title: 'Session Dashboard',
    desc: 'Review all past sessions with score charts, role history, and per-question breakdowns. Track your improvement over time.',
  },
];

const TECH_STACK = [
  ['React 18', 'UI framework with hooks'],
  ['Vite', 'Lightning-fast build tool'],
  ['Recharts', 'Score visualization charts'],
  ['Claude API', 'AI feedback & question gen'],
  ['Web Speech API', 'Browser voice recognition'],
  ['CSS Variables', 'Dual light/dark theme'],
];

export default function About({ onHome }) {
  const { theme, toggleTheme } = useApp();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Nav */}
      <nav className="resp-nav" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent-a)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16,
          }}>◈</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>GenieBuilder</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onHome} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 14, padding: '6px 12px',
          }}>← Home</button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </nav>

      <div className="resp-padding" style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px', animation: 'fadeUp .6s ease' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-block',
            background: 'var(--accent-a-dim)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '5px 16px', fontSize: 11,
            fontFamily: 'var(--font-mono)', color: 'var(--accent-a)', letterSpacing: 2, marginBottom: 24,
          }}>ABOUT THIS PROJECT</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, lineHeight: 1.2,
          }}>
            GenieBuilder — Your Personal<br />
            <span style={{ color: 'var(--accent-a)' }}>Interview Coach</span>
          </h1>
          <p style={{
            color: 'var(--text-secondary)', fontSize: 16, maxWidth: 580,
            margin: '0 auto', lineHeight: 1.8,
          }}>
            GenieBuilder is an AI-powered technical interview simulator built for computer science students
            and developers. It helps you practice real interview questions, get AI feedback on your
            answers, and build the confidence to land your dream tech role.
          </p>
        </div>

        {/* What it does summary */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: '32px', marginBottom: 48,
          boxShadow: 'var(--shadow-card)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)',
            marginBottom: 16,
          }}>What can GenieBuilder do?</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 16 }}>
            GenieBuilder covers the full interview prep journey — from finding the right questions for your
            target role, to practicing your delivery with voice input, to receiving structured AI feedback
            that shows exactly what interviewers look for.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>
            Unlike generic quiz apps, GenieBuilder evaluates <em>how</em> you answer — not just whether
            the keywords are present. It tracks filler words in speech, compares your response to
            a model answer, and adapts its tone based on the interviewer persona you choose.
          </p>
        </div>

        {/* Feature grid */}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)',
          marginBottom: 24, textAlign: 'center',
        }}>All Features</h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16, marginBottom: 60,
        }}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '22px 20px',
            }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: '32px', marginBottom: 48,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 24, color: 'var(--text-primary)' }}>
            Built With
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {TECH_STACK.map(([tech, desc]) => (
              <div key={tech} style={{
                background: 'var(--bg-surface)', borderRadius: 10, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent-a)', flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{tech}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <button onClick={onHome} style={{
            background: 'var(--accent-a)', color: 'var(--bg-card)',
            border: 'none', borderRadius: 12, padding: '14px 36px',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}>
            Start Practicing →
          </button>
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            No account needed. Your data stays in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
