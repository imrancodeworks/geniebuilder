import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { S, ThemeToggle } from '../components/shared';
import { useApp } from '../context/AppContext';
import { MNC_BENCHMARKS } from '../utils/benchmarks';

export default function MNCRankingPage({ avg, answersCount, onBack }) {
  const { theme, toggleTheme } = useApp();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Nav */}
      <nav className="resp-nav" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 58,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
          MNC Rankings
        </span>
        <div className="resp-wrap" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button onClick={onBack} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 14px',
            fontSize: 12, cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-a)'; e.currentTarget.style.color = 'var(--accent-a)'; e.currentTarget.style.boxShadow = '0 0 10px var(--accent-a)40'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.boxShadow = 'none'; }}
          >← Back</button>
        </div>
      </nav>

      <div className="resp-padding" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', animation: 'fadeUp .5s ease' }}>
        <div className="resp-padding" style={{ ...S.card, padding: '32px', marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ ...S.label, marginBottom: 4, fontSize: 18 }}>Company Readiness Benchmarks</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
            This chart compares your overall performance {avg ? `(${avg}%)` : ''} against the expected minimum scores for top companies and consultancies hiring in India.
            {answersCount > 0 ? '' : ' Complete an interview session to see your readiness level here!'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
            Hover over any bar to see roles available and hiring locations. Green bars = you qualify.
          </p>

          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: 16 }}>
            <div style={{ minWidth: 1000, height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MNC_BENCHMARKS} margin={{ top: 20, right: 10, left: -25, bottom: 55 }}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} interval={0} angle={-45} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--accent-a-dim)' }} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const entry = payload[0].payload;
                      const req = entry.targetScore;
                      const diff = (avg || 0) - req;
                      const qualified = req <= (avg || 0);
                      return (
                        <div style={{ background: 'var(--bg-card)', border: `1px solid ${qualified ? 'var(--success)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, maxWidth: 260, boxShadow: qualified ? '0 0 16px var(--success)30' : 'var(--shadow)' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>{entry.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>{entry.tier}</div>
                          {entry.roles && (
                            <div style={{ marginBottom: 6 }}>
                              <div style={{ color: 'var(--accent-a)', fontSize: 10, letterSpacing: 1, marginBottom: 2 }}>ROLES</div>
                              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{entry.roles}</div>
                            </div>
                          )}
                          {entry.locations && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ color: 'var(--accent-b)', fontSize: 10, letterSpacing: 1, marginBottom: 2 }}>📍 LOCATIONS</div>
                              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{entry.locations}</div>
                            </div>
                          )}
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Min Score: <strong>{req}%</strong></span>
                            <span style={{ color: qualified ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                              {qualified ? '✓ You Qualify!' : `Need +${Math.abs(diff)}%`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <ReferenceLine y={avg || 0} stroke="#B84040" strokeDasharray="3 3" label={{ position: 'top', value: `Your Score (${avg || 0}%)`, fill: '#B84040', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                  <Bar dataKey="targetScore" radius={[4, 4, 0, 0]}>
                    {MNC_BENCHMARKS.map((entry, index) => (
                      <Cell key={`cell-${index}`}
                        fill={entry.targetScore <= (avg || 0) ? 'var(--success)' : 'var(--bg-surface)'}
                        stroke={entry.targetScore <= (avg || 0) ? 'var(--success)' : 'var(--border)'}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend / Summary */}
          {avg > 0 && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
              <div style={{ background: 'var(--success-dim)', border: '1px solid var(--success)30', borderRadius: 10, padding: '12px 18px', flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 10, color: 'var(--success)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>✓ COMPANIES YOU QUALIFY</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{MNC_BENCHMARKS.filter(e => e.targetScore <= avg).length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>out of {MNC_BENCHMARKS.length} companies</div>
              </div>
              <div style={{ background: 'var(--accent-a-dim)', border: '1px solid var(--accent-a)30', borderRadius: 10, padding: '12px 18px', flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 10, color: 'var(--accent-a)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>🎯 NEXT TARGET</div>
                {(() => {
                  const next = MNC_BENCHMARKS.filter(e => e.targetScore > avg).sort((a,b) => a.targetScore - b.targetScore)[0];
                  return next ? (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{next.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Need {next.targetScore - avg}% more</div>
                    </>
                  ) : <div style={{ fontSize: 14, color: 'var(--success)' }}>You qualify for all! 🎉</div>;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
