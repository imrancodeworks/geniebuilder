import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Avatar } from './shared';

export default function UserMenu({ onProfile, onLogout }) {
  const { user, theme } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border)',
          borderRadius: '50px',
          padding: '4px 12px 4px 4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 15px var(--glow-a)' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { if(!isOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
      >
        <Avatar 
          id={user.avatar_id} 
          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--accent-a)' }}
        />
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.username || 'User'}
        </span>
        <span style={{ fontSize: '10px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '200px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease forwards',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-a-dim), transparent)' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{user.username || 'User'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{user.email}</div>
          </div>
          
          <div style={{ padding: '8px' }}>
            <button 
              onClick={() => { setIsOpen(false); onProfile(); }}
              style={{
                width: '100%',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--accent-a)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              👤 Profile Settings
            </button>
            
            <button 
              onClick={() => { setIsOpen(false); onLogout(); }}
              style={{
                width: '100%',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--danger)',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-dim)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
