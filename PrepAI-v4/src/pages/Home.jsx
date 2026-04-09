import { useState, useMemo } from 'react';
import { ROLES, QUESTIONS, EXTENDED_ROLES, ALL_ROLES } from '../utils/questions';
import { ThemeToggle } from '../components/shared';
import UserMenu from '../components/UserMenu';
import { useApp } from '../context/AppContext';

function getSearchResults(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results = [];
  Object.entries(ALL_ROLES).forEach(([key, role]) => {
    const labelMatch = role.label.toLowerCase().includes(q);
    const catMatch   = role.cat ? role.cat.toLowerCase().includes(q) : false;
    if (labelMatch || catMatch) results.push({ key, ...role });
  });
  return results;
}

const CAT_COLORS = {
  'Software Development':    { bg: 'var(--accent-a-dim)', color: 'var(--accent-a)', border: 'var(--accent-a)' },
  'Data Science & AI':       { bg: 'var(--accent-c-dim)', color: 'var(--accent-c)', border: 'var(--accent-c)' },
  'Cloud & Infrastructure':  { bg: 'var(--accent-b-dim)', color: 'var(--accent-b)', border: 'var(--accent-b)' },
  'Cybersecurity':           { bg: 'var(--danger-dim)',   color: 'var(--danger)',   border: 'var(--danger)'   },
  'Specialized':             { bg: 'var(--success-dim)',  color: 'var(--success)',  border: 'var(--success)'  },
};

const FEATURES = [
  ['🎤', 'Voice Mode',   'Answer by speaking — live transcript with filler word detection.'],
  ['🧠', 'AI Feedback',  'Strict scoring with model answers and targeted improvement tips.'],
  ['⚡', 'Smart Mode',   'Adaptive offline engine — no API key needed, learns weak areas.'],
  ['📊', 'Analytics',    'Track streaks, scores and growth across 28 tech roles over time.'],
];

export default function Home({ role, setRole, onStart, onDashboard, onAbout, onBrowseRoles, onResumeReader, onProfile, onLogout }) {
  const { theme, toggleTheme, streak } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useMemo(() => getSearchResults(searchQuery), [searchQuery]);

  const randomSuggestions = useMemo(() => {
    const list = ['Blockchain','NLP','Cloud','Security','Game Dev','IoT','Frontend','Backend','Data','DevOps','Mobile'];
    return list.sort(() => 0.5 - Math.random()).slice(0, 5);
  }, []);

  const handleSelectRole = (key) => { setRole(key); setSearchQuery(''); };

  const diffCounts = useMemo(() => {
    if (!role || !QUESTIONS[role]) return {};
    return QUESTIONS[role].reduce((acc, q) => { acc[q.diff] = (acc[q.diff] || 0) + 1; return acc; }, {});
  }, [role]);

  const currentRoleInfo  = role ? (ALL_ROLES[role] || null) : null;
  const currentRoleLabel = currentRoleInfo?.label || role;
  const currentRoleIcon  = currentRoleInfo?.icon  || '📋';

  return (
    <div className="page-wrapper" style={{ overflow: 'hidden' }}>

      {/* Animated background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Nav */}
      <nav className="resp-nav nav-enter" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="Logo"
            className="hover-scale"
            style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>GenieBuilder</span>
        </div>
        <div className="resp-wrap" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {streak.count > 0 && (
            <div className="anim-bounce-in" style={{
              background: 'var(--warning-dim)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '4px 12px', fontSize: 12,
              color: 'var(--warning)', fontFamily: 'var(--font-mono)',
            }}>🔥 {streak.count} day streak</div>
          )}
          {[['About', onAbout], ['Dashboard', onDashboard], ['Resume Reader', onResumeReader]].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: 14, padding: '6px 12px', borderRadius: 8,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >{label}</button>
          ))}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <div style={{ marginLeft: 8, borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <UserMenu onProfile={onProfile} onLogout={onLogout} />
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="resp-hero" style={{ textAlign: 'center', padding: '72px 0 48px' }}>

          <div className="anim-fade-in d-1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-a-dim)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '5px 16px', fontSize: 11,
            fontFamily: 'var(--font-mono)', color: 'var(--accent-a)',
            letterSpacing: 2, marginBottom: 22,
          }}>
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            AI-POWERED INTERVIEW COACH
          </div>

          <h1 className="anim-fade-up d-2" style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(34px,6vw,62px)',
            fontWeight: 700, lineHeight: 1.15, marginBottom: 18,
          }}>
            Ace Your Next<br />
            <span className="gradient-text shine-text">Tech Interview</span>
          </h1>

          <p className="anim-fade-up d-3" style={{
            color: 'var(--text-secondary)', fontSize: 16, maxWidth: 500,
            margin: '0 auto 40px', lineHeight: 1.75,
          }}>
            Practice with AI-powered feedback, adaptive questions, and real interview
            scenarios across 28 tech roles.
          </p>

          {/* Search */}
          <div className="anim-fade-up d-4" style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
            <div style={{
              background: 'var(--bg-card)', border: '1.5px solid var(--border-strong)',
              borderRadius: 16, display: 'flex', alignItems: 'center',
              overflow: 'visible', boxShadow: 'var(--shadow)', transition: 'all .25s',
            }}>
              <div className="hide-mobile" style={{ padding: '0 16px', color: 'var(--text-muted)', fontSize: 18 }}>🔍</div>
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder='Search role… e.g. "Security", "Blockchain", "NLP"'
                className="resp-search-input"
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  background: 'transparent', padding: '15px 0',
                  fontSize: 15, color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 18, padding: '0 14px',
                }}>×</button>
              )}
            </div>

            {searchQuery && searchResults.length > 0 && (
              <div className="anim-scale-in" style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
                zIndex: 200, overflow: 'hidden', maxHeight: 360, overflowY: 'auto',
              }}>
                <div style={{ padding: '10px 16px 6px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
                  {searchResults.length} ROLE{searchResults.length !== 1 ? 'S' : ''} FOUND
                </div>
                {searchResults.map(r => {
                  const qCount = QUESTIONS[r.key]?.length || 0;
                  const catStyle = CAT_COLORS[r.cat] || { bg: 'var(--accent-a-dim)', color: 'var(--accent-a)', border: 'var(--accent-a)' };
                  return (
                    <div key={r.key} onClick={() => handleSelectRole(r.key)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', cursor: 'pointer', transition: 'background .15s',
                      background: role === r.key ? 'var(--accent-a-dim)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = role === r.key ? 'var(--accent-a-dim)' : 'transparent'; }}
                    >
                      <span style={{ fontSize: 20, minWidth: 28 }}>{r.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: role === r.key ? 'var(--accent-a)' : 'var(--text-primary)' }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {r.cat && <span>{r.cat} · </span>}{qCount > 0 ? `${qCount} questions` : 'Questions available'}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, background: catStyle.bg, color: catStyle.color,
                        border: `1px solid ${catStyle.border}40`, borderRadius: 10, padding: '2px 8px',
                        fontFamily: 'var(--font-mono)', letterSpacing: 0.5,
                      }}>{r.cat?.toUpperCase() || 'ROLE'}</span>
                      {role === r.key && <span style={{ color: 'var(--success)', fontSize: 14 }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="anim-fade-in" style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, zIndex: 200, padding: '16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No roles for "<strong>{searchQuery}</strong>". Try "cloud", "security"…</div>
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          <div className="anim-fade-up d-5" style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {randomSuggestions.map((ex, i) => (
              <button key={ex} onClick={() => setSearchQuery(ex)}
                className="hover-scale"
                style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '5px 14px', fontSize: 12,
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  animationDelay: `${0.5 + i * 0.05}s`,
                }}
              >{ex}</button>
            ))}
          </div>
        </div>

        {/* ── Browse All Roles CTA ──────────────────────────────────────── */}
        <div className="anim-fade-up d-6" style={{ textAlign: 'center', marginBottom: 48 }}>
          <button className="btn-primary btn-shine hover-lift" onClick={onBrowseRoles} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--accent-a)',
            color: 'var(--text-primary)', borderRadius: 12, padding: '14px 32px',
            fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            boxShadow: '0 8px 24px var(--glow-a)', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Browse All 28 Roles <span>→</span>
          </button>
        </div>

        {/* ── Selected Role CTA ──────────────────────────────────────────── */}
        {role && currentRoleInfo && (
          <div className="resp-padding anim-bounce-in hover-glow" style={{
            background: 'var(--bg-card)', border: '1.5px solid var(--accent-a)',
            borderRadius: 18, padding: '28px 32px', marginBottom: 48,
            boxShadow: '0 8px 32px var(--glow-a)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>SELECTED ROLE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span className="hero-icon-float" style={{ fontSize: 32, display: 'inline-block' }}>{currentRoleIcon}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{currentRoleLabel}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(diffCounts).map(([diff, count]) => (
                    <span key={diff} className="badge-pop" style={{
                      background: diff === 'Easy' ? 'var(--success-dim)' : diff === 'Medium' ? 'var(--warning-dim)' : 'var(--danger-dim)',
                      color:      diff === 'Easy' ? 'var(--success)'     : diff === 'Medium' ? 'var(--warning)'     : 'var(--danger)',
                      border: `1px solid ${diff === 'Easy' ? 'var(--success)' : diff === 'Medium' ? 'var(--warning)' : 'var(--danger)'}30`,
                      borderRadius: 20, padding: '3px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
                    }}>{diff}: {count}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn-ghost" onClick={onDashboard} style={{
                  color: 'var(--text-secondary)', borderRadius: 10, padding: '12px 20px',
                  fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Dashboard</button>
                <button className="btn-primary btn-shine" onClick={onStart} style={{
                  borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Start Interview →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Feature Cards ─────────────────────────────────────────────── */}
        <div className="stagger-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 14, marginBottom: 64,
        }}>
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} className="anim-flip-in card-hover-glow" style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '24px 20px', textAlign: 'center',
            }}>
              <div className="hero-icon-float" style={{ fontSize: 28, marginBottom: 12, display: 'inline-block' }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
