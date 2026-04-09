import { useState, useMemo } from 'react';
import { ALL_ROLES, QUESTIONS } from '../utils/questions';
import { ThemeToggle } from '../components/shared';
import UserMenu from '../components/UserMenu';
import { useApp } from '../context/AppContext';

const CAT_COLORS = {
  'Software Development': { bg: 'var(--accent-a-dim)', color: 'var(--accent-a)', border: 'var(--accent-a)' },
  'Data Science & AI':    { bg: 'var(--accent-c-dim)', color: 'var(--accent-c)', border: 'var(--accent-c)' },
  'Cloud & Infrastructure':{ bg: 'var(--accent-b-dim)', color: 'var(--accent-b)', border: 'var(--accent-b)' },
  'Cybersecurity':        { bg: 'var(--danger-dim)',   color: 'var(--danger)',   border: 'var(--danger)' },
  'Specialized':          { bg: 'var(--success-dim)',  color: 'var(--success)',  border: 'var(--success)' },
  'Main Engineering Roles': { bg: 'var(--accent-a-dim)', color: 'var(--accent-a)', border: 'var(--accent-a)' },
};

export default function RolesPage({ role, setRole, onStart, onHome, onProfile, onLogout }) {
  const { theme, toggleTheme } = useApp();

  const diffCounts = useMemo(() => {
    if (!role || !QUESTIONS[role]) return {};
    return QUESTIONS[role].reduce((acc, q) => {
      acc[q.diff] = (acc[q.diff] || 0) + 1;
      return acc;
    }, {});
  }, [role]);

  const currentRoleInfo = role ? (ALL_ROLES[role] || null) : null;
  const currentRoleLabel = currentRoleInfo?.label || role;
  const currentRoleIcon  = currentRoleInfo?.icon || '📋';

  const groupedRoles = useMemo(() => {
    const groups = {};
    Object.entries(ALL_ROLES).forEach(([key, roleObj]) => {
      const cat = roleObj.cat || 'Main Engineering Roles';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ key, ...roleObj });
    });
    return groups;
  }, []);

  return (
    <div className="page-wrapper" style={{ overflow: 'hidden' }}>
      <div className="bg-orb bg-orb-1" style={{ opacity:0.5 }} />
      <div className="bg-orb bg-orb-2" style={{ opacity:0.4 }} />
      {/* Background gradient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: theme === 'light'
          ? 'radial-gradient(ellipse at 20% 20%, rgba(155,142,199,0.10) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(180,211,217,0.12) 0%, transparent 55%)'
          : 'radial-gradient(ellipse at 20% 20%, rgba(212,168,67,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(196,149,74,0.07) 0%, transparent 55%)',
      }} />

      {/* Nav */}
      <nav className="resp-nav nav-enter" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="float-anim" style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent-a)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16,
            boxShadow: '0 4px 14px var(--glow-a)',
          }}>◈</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>GenieBuilder</span>
        </div>
        <div className="resp-wrap" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="nav-btn" onClick={onHome} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 14, padding: '6px 12px', borderRadius: 8,
          }}>Home</button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <div style={{ marginLeft: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
            <UserMenu onProfile={onProfile} onLogout={onLogout} />
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 1, animation: 'pageReveal .6s cubic-bezier(0.22,1,0.36,1) both' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 36,
          fontWeight: 700, marginBottom: 12, textAlign: 'center', color: 'var(--text-primary)'
        }}>Browse Roles</h1>
        <p style={{
          color: 'var(--text-secondary)', fontSize: 16, textAlign: 'center',
          marginBottom: 48,
        }}>Select any of the 28 available roles below to start an interview.</p>

        {role && currentRoleInfo && (
          <div className="resp-padding pop-in" style={{
            background: 'var(--bg-card)', border: '1.5px solid var(--accent-a)',
            borderRadius: 18, padding: '28px 32px', marginBottom: 48,
            boxShadow: '0 8px 32px var(--glow-a)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                  SELECTED ROLE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{currentRoleIcon}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentRoleLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(diffCounts).map(([diff, count]) => (
                    <span key={diff} className="cat-badge" style={{
                      background: diff === 'Easy' ? 'var(--success-dim)' : diff === 'Medium' ? 'var(--warning-dim)' : 'var(--danger-dim)',
                      color: diff === 'Easy' ? 'var(--success)' : diff === 'Medium' ? 'var(--warning)' : 'var(--danger)',
                      border: `1px solid ${diff === 'Easy' ? 'var(--success)' : diff === 'Medium' ? 'var(--warning)' : 'var(--danger)'}30`,
                      borderRadius: 20, padding: '3px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
                    }}>
                      {diff}: {count}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn-primary" onClick={onStart} style={{
                  borderRadius: 10, padding: '12px 28px',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  Start Interview →
                </button>
              </div>
            </div>
          </div>
        )}

        {Object.entries(groupedRoles).map(([cat, roles]) => {
          const catStyle = CAT_COLORS[cat] || CAT_COLORS['Main Engineering Roles'];
          return (
            <div key={cat} style={{ marginBottom: 48 }}>
              <div style={{
                fontSize: 14, color: catStyle.color, letterSpacing: 1,
                fontFamily: 'var(--font-mono)', marginBottom: 16,
                borderBottom: `1px solid ${catStyle.border}40`, paddingBottom: 8,
                display: 'inline-block', fontWeight: 600
              }}>{cat.toUpperCase()}</div>
              
              <div className="stagger-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {roles.map(r => (
                  <div key={r.key} className={`role-card anim-flip-in card-hover-glow ${role === r.key ? 'role-active' : ''}`}
                    onClick={() => setRole(r.key)}
                    style={{
                      background: role === r.key ? 'var(--accent-a-dim)' : 'var(--bg-card)',
                      border: `1.5px solid ${role === r.key ? 'var(--accent-a)' : 'var(--border)'}`,
                      borderRadius: 14, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer', transition: 'all 0.25s',
                    }}>
                    <div style={{ fontSize: 24 }}>{r.icon}</div>
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: 600, marginBottom: 4,
                        color: role === r.key ? 'var(--accent-a)' : 'var(--text-primary)',
                      }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {(QUESTIONS[r.key] || []).length} questions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
