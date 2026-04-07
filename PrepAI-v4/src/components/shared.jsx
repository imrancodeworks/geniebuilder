import { getColor } from '../utils/analysis';
import { useState } from 'react';

export const S = {
  wrap:  { minHeight: '100vh', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' },
  card:  { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-card)' },
  btn:   (c) => ({
    background: 'transparent',
    border: '1px solid var(--border-strong)',
    color: c || 'var(--accent-a)',
    borderRadius: 8, padding: '10px 22px', fontSize: 13,
    fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all .2s',
  }),
  btnSolid: () => ({
    background: 'var(--accent-a)',
    border: '1px solid var(--accent-a)',
    color: 'var(--bg-card)',
    borderRadius: 8, padding: '12px 28px', fontSize: 13,
    fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
  }),
  label: { fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' },
  muted: { color: 'var(--text-secondary)', fontSize: 12 },
};

export function ScoreRing({ score, size = 140 }) {
  const r = (size - 24) / 2, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ, c = getColor(score), cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90,${cx},${cy})`}
        style={{ transition: 'stroke-dasharray 1.3s ease-out', animation: 'scoreReveal 1.3s ease-out' }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={c} fontSize={Math.round(size * 0.2)} fontWeight="700" fontFamily="var(--font-mono)">{score}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text-muted)" fontSize={10} fontFamily="var(--font-mono)">/ 100</text>
    </svg>
  );
}

export function Waveform({ active }) {
  const anims = ['wave0','wave1','wave2','wave3','wave4','wave3','wave2','wave1','wave0','wave4','wave1','wave2'];
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 44 }}>
      {anims.map((a, i) => (
        <div key={i} style={{
          width: 4, borderRadius: 4,
          background: active ? 'var(--accent-a)' : 'var(--border-strong)',
          height: active ? undefined : 4,
          minHeight: 4,
          animation: active ? `${a} ${0.3 + (i % 5) * 0.08}s ease-in-out infinite alternate` : 'none',
          transition: 'background .3s',
        }} />
      ))}
    </div>
  );
}

export function Loader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
      {[90, 70, 80].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 18, width: `${w}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ ...S.card, padding: '24px' }}>
      <div className="skeleton" style={{ height: 12, width: '30%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 20, width: '85%', marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 20, width: '65%', marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="skeleton" style={{ height: 80 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    </div>
  );
}

export function Badge({ text, color }) {
  return (
    <span style={{
      background: color ? `${color}18` : 'var(--accent-a-dim)',
      color: color || 'var(--accent-a)',
      border: `1px solid ${color ? color + '30' : 'var(--border)'}`,
      borderRadius: 5, padding: '2px 9px', fontSize: 10,
      fontFamily: 'var(--font-mono)', letterSpacing: 1,
    }}>
      {text}
    </span>
  );
}

export function ThemeToggle({ theme, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 20, padding: '6px 14px',
      cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
      color: 'var(--text-secondary)', transition: 'all .2s',
    }}>
      {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

export function Confetti({ show }) {
  if (!show) return null;
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['var(--accent-a)', 'var(--accent-b)', 'var(--accent-c)', 'var(--success)', 'var(--warning)'][i % 5],
    delay: Math.random() * 2,
    size: 6 + Math.random() * 8,
    duration: 2.5 + Math.random() * 2,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: '-10px',
          width: p.size, height: p.size,
          background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : 2,
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

export function Avatar({ id, className, style = {} }) {
  const [error, setError] = useState(false);

  const getAvatarUrl = (avatarId) => {
    if (!avatarId) return null;
    // Using DiceBear PNG format for maximum compatibility across all browsers/regions
    // Adding a version parameter to bust any potential local cache issues
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${avatarId}&backgroundColor=b6e3f4,c0aede,d1d4f9&v=1`;
  };

  const url = getAvatarUrl(id);

  if (error || !url) {
    return (
      <div className={className} style={{
        ...style,
        background: 'linear-gradient(135deg, #F5DEB3 0%, #E6E6FA 100%)', // Biscuit to Lavender
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: (style.width ? parseInt(style.width) / 2.5 : 16) + 'px',
        color: 'rgba(0,0,0,0.3)',
        fontWeight: 'bold',
        overflow: 'hidden',
        border: style.border || '1px solid var(--border)'
      }}>
        {id ? id.replace(/\d+/g, '')[0].toUpperCase() : '?'}
      </div>
    );
  }

  return (
    <img 
      src={url} 
      className={className} 
      style={{ ...style, objectFit: 'cover' }} 
      onError={() => setError(true)}
      alt="User Avatar"
    />
  );
}
