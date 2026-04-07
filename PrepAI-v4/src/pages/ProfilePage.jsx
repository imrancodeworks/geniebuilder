import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Avatar } from '../components/shared';
import API_BASE_URL from '../config';

export default function ProfilePage({ onHome }) {
  const { user, setUser, token, logout, theme } = useApp();
  const [username, setUsername] = useState(user?.username || '');
  const [gender, setGender] = useState(user?.gender || 'not_specified');
  const [avatarId, setAvatarId] = useState(user?.avatar_id || 'boy1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });


  useEffect(() => {
    // Initial sync with backend to ensure session is valid
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setUser({ ...user, ...data });
          setUsername(data.username || '');
          setGender(data.gender || 'not_specified');
          setAvatarId(data.avatar_id || 'boy1');
        }
      } catch (err) {
        console.error("Failed to sync profile:", err);
      }
    };
    if (token) fetchProfile();
  }, [token]);

  useEffect(() => {
    if (user && !username) { // Only set if local state is empty
      setUsername(user.username || '');
      setGender(user.gender || 'not_specified');
      setAvatarId(user.avatar_id || 'boy1');
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, gender, avatar_id: avatarId })
      });

      if (response.ok) {
        const updatedUser = { ...user, username, gender, avatar_id: avatarId };
        setUser(updatedUser);
        setMessage({ type: 'success', text: '✅ Profile updated successfully!' });
      } else {
        if (response.status === 401) {
          logout();
          return;
        }
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Failed to update profile.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'System unreachable. Please try again later.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const avatarsList = {
    male: Array.from({ length: 15 }, (_, i) => `boy${i + 1}`),
    female: Array.from({ length: 15 }, (_, i) => `girl${i + 1}`)
  };

  return (
    <div className="resp-padding" style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 24px' }}>
      <style>{`
        .profile-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          max-width: 800px;
          margin: 0 auto;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
          backdrop-filter: blur(20px);
          animation: fadeUp 0.6s ease;
        }
        .header-bg {
          height: 120px;
          background: linear-gradient(135deg, var(--accent-a), var(--accent-b));
          position: relative;
        }
        .avatar-main {
          width: 120px; height: 120px;
          border-radius: 50%;
          border: 4px solid var(--bg-card);
          background: var(--bg-surface);
          position: absolute;
          bottom: -60px;
          left: 40px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          object-fit: cover;
        }
        .section-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 2px;
          color: var(--text-muted);
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 12px;
          margin-top: 15px;
        }
        .avatar-item {
          width: 60px; height: 60px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 2px solid transparent;
        }
        .avatar-item:hover { transform: scale(1.1); }
        .avatar-active { border-color: var(--accent-a); box-shadow: 0 0 15px var(--glow-a); transform: scale(1.1); }
        
        .gender-btn {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .gender-active { background: var(--accent-a-dim); border-color: var(--accent-a); color: var(--accent-a); }

        .input-profile {
          width: 100%;
          padding: 12px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 16px;
          outline: none;
          transition: all 0.3s;
        }
        .input-profile:focus { border-color: var(--accent-a); box-shadow: 0 0 0 3px var(--accent-a-dim); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 600px) {
          .profile-card { border-radius: 0; }
          .profile-header-wrap { flex-direction: column; align-items: stretch !important; gap: 20px; }
          .gender-container { flex-wrap: wrap; }
          .avatar-main { left: 50%; transform: translateX(-50%); bottom: -40px; }
          .profile-padding { padding: 60px 20px 24px !important; }
        }
      `}</style>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '24px' }}>
        <button 
          onClick={onHome}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ← Back to Home
        </button>
      </div>

      <div className="profile-card">
        <div className="header-bg">
          <Avatar id={avatarId} className="avatar-main" />
        </div>
        
        <div className="profile-padding" style={{ padding: '80px 40px 40px' }}>
          <div className="profile-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{username || 'Unknown Genie'}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Customize your professional persona</p>
            </div>
            <button 
              onClick={handleUpdate}
              disabled={loading}
              style={{
                background: 'var(--accent-a)',
                color: 'var(--bg-card)',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px var(--glow-a)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {message.text && (
            <div style={{ 
              padding: '12px 16px', 
              borderRadius: '12px', 
              background: message.type === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)',
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}40`,
              marginBottom: '24px',
              animation: 'fadeIn 0.3s'
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }} className="resp-grid-1">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <div className="section-label">Username</div>
                <input 
                  className="input-profile" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username" 
                />
              </div>

              <div>
                <div className="section-label">Gender</div>
                <div className="gender-container" style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className={`gender-btn ${gender === 'male' ? 'gender-active' : ''}`}
                    onClick={() => setGender('male')}
                  >
                    👨 Male
                  </button>
                  <button 
                    className={`gender-btn ${gender === 'female' ? 'gender-active' : ''}`}
                    onClick={() => setGender('female')}
                  >
                    👩 Female
                  </button>
                  <button 
                    className={`gender-btn ${gender === 'not_specified' ? 'gender-active' : ''}`}
                    onClick={() => setGender('not_specified')}
                  >
                    🌈 Other
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="section-label">Profile Avatar</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Select an illustration that represents you
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Men (15 avatars)</div>
                <div className="avatar-grid">
                  {avatarsList.male.map(id => (
                    <div key={id} onClick={() => setAvatarId(id)}>
                      <Avatar 
                        id={id} 
                        className={`avatar-item ${avatarId === id ? 'avatar-active' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Female (15 avatars)</div>
                <div className="avatar-grid">
                  {avatarsList.female.map(id => (
                    <div key={id} onClick={() => setAvatarId(id)}>
                      <Avatar 
                        id={id} 
                        className={`avatar-item ${avatarId === id ? 'avatar-active' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
