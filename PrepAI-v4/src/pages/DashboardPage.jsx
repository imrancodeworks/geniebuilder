import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { S, ThemeToggle, Badge } from '../components/shared';
import { getColor, getVerdict } from '../utils/analysis';
import { ROLES } from '../utils/questions';
import { useApp } from '../context/AppContext';
import { MNC_BENCHMARKS } from '../utils/benchmarks';
import UserMenu from '../components/UserMenu';

export default function DashboardPage({ history, onStart, onHome, onMNC, onProfile, onLogout }) {
  const { theme, toggleTheme, streak } = useApp();
  const hasHistory = history && history.length > 0;
  const avg  = hasHistory ? Math.round(history.reduce((s, h) => s + h.avgScore, 0) / history.length) : 0;
  const best = hasHistory ? Math.max(...history.map(h => h.avgScore)) : 0;
  const recentTrend    = history.slice(0, 8).reverse().map((h, i) => ({ session: i + 1, score: h.avgScore, role: h.roleName }));
  const qualifiedCount = hasHistory ? MNC_BENCHMARKS.filter(c => c.targetScore <= avg).length : 0;

  const metrics = [
    ['Sessions',   history.length,           null,                    null ],
    ['Avg Score',  avg  ? avg  + '%' : '—',  avg  ? getColor(avg)  : null, null ],
    ['Best Score', best ? best + '%' : '—',  best ? getColor(best) : null, null ],
    ['Qual. MNCs', qualifiedCount + '/30',    avg >= 60 ? 'var(--success)' : 'var(--danger)', onMNC ],
    ['Streak',     streak.count + ' days',    'var(--warning)',              null ],
  ];

  return (
    <div className="page-wrapper">
      <div className="bg-orb bg-orb-1" style={{ opacity: 0.5 }} />
      <div className="bg-orb bg-orb-2" style={{ opacity: 0.4 }} />

      {/* Nav */}
      <nav className="resp-nav nav-enter" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 58, backdropFilter: 'blur(16px)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Dashboard</span>
        <div className="resp-wrap" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button onClick={onStart} className="btn-primary btn-shine" style={{
            background: 'var(--accent-a)', color: 'var(--bg-card)', border: 'none',
            borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>New Session</button>
          <button onClick={onHome} style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 14px',
            fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
          }}>Home</button>
          <div style={{ marginLeft: 12, borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <UserMenu onProfile={onProfile} onLogout={onLogout} />
          </div>
        </div>
      </nav>

      <div className="resp-padding" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 1 }}>

        {/* Streak banner */}
        {streak.count > 0 && (
          <div className="anim-slide-left" style={{
            background: 'var(--warning-dim)', border: '1px solid var(--warning)',
            borderRadius: 14, padding: '16px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span className="hero-icon-float" style={{ fontSize: 32, display: 'inline-block' }}>🔥</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--warning)' }}>
                {streak.count}-Day Practice Streak
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Keep it up! Consistency is the #1 factor in interview success.
              </div>
            </div>
          </div>
        )}

        {/* Summary metrics */}
        <div className="resp-wrap stagger-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24,
        }}>
          {metrics.map(([label, value, color, onClick]) => (
            <div key={label} onClick={onClick} className={`anim-fade-up card-hover-glow${onClick ? ' hover-lift' : ''}`} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px 16px', textAlign: 'center',
              cursor: onClick ? 'pointer' : 'default',
            }}>
              <div style={{ ...S.label, marginBottom: 8 }}>{label} {onClick && '→'}</div>
              <div className="count-up" style={{
                fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
                color: color || 'var(--text-primary)',
              }}>{value}</div>
            </div>
          ))}
        </div>

        {hasHistory ? (
          <>
            {/* Trend chart */}
            {recentTrend.length > 1 && (
              <div className="anim-fade-up d-3" style={{ ...S.card, padding: '22px', marginBottom: 20 }}>
                <div style={{ ...S.label, marginBottom: 16 }}>Score Trend (last {recentTrend.length} sessions)</div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="session" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 12, color: 'var(--text-primary)',
                      }} cursor={{ stroke: 'var(--border)' }} />
                      <Line type="monotone" dataKey="score" stroke="var(--accent-a)" strokeWidth={2.5}
                        dot={{ fill: 'var(--accent-a)', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Session history */}
            <div style={{ ...S.label, marginBottom: 14 }}>Session History</div>
            <div className="stagger-grid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((session, i) => (
                <div key={session.id} className="anim-fade-up card-hover-glow" style={{
                  ...S.card, padding: '18px 22px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: `${getColor(session.avgScore)}15`,
                    border: `2px solid ${getColor(session.avgScore)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
                    color: getColor(session.avgScore),
                  }}>{session.avgScore}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Badge text={session.roleName} />
                      <Badge text={getVerdict(session.avgScore)} color={getColor(session.avgScore)} />
                      {i === 0 && <Badge text="Latest" color="var(--accent-b)" />}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {session.date} · {session.answers.length} questions
                    </div>
                  </div>
                  <div className="resp-text-center" style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>avg</div>
                    <div style={{
                      fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: getColor(session.avgScore),
                    }}>{session.avgScore}%</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="anim-scale-in" style={{ ...S.card, padding: '48px 24px', textAlign: 'center' }}>
            <div className="hero-icon-float" style={{ fontSize: 40, marginBottom: 16, display: 'inline-block' }}>📊</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 10 }}>No sessions yet</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              Complete your first interview to start tracking your progress.
            </div>
            <button onClick={onStart} className="btn-primary btn-shine" style={{
              background: 'var(--accent-a)', color: 'var(--bg-card)', border: 'none',
              borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>Start First Session →</button>
          </div>
        )}
      </div>
    </div>
  );
}
