import React, { useState } from 'react';
import API_BASE_URL from '../config';

const Eye = ({ open }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    ) : (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    )}
  </svg>
);

const FloatInput = ({ type, label, value, onChange, required, autoComplete, eye, showEye, onToggleEye }) => {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div style={{ position: 'relative', marginBottom: 18 }}>
      <input
        type={eye ? (showEye ? 'text' : 'password') : type}
        value={value} onChange={onChange} required={required}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '22px 44px 8px 16px',
          background: focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
          border: `1.5px solid ${focused ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'}`,
          borderRadius: 14, outline: 'none', color: '#fff',
          fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif",
          transition: 'all 0.2s',
        }}
      />
      <label style={{
        position: 'absolute', left: 16, top: lifted ? 8 : '50%',
        transform: lifted ? 'none' : 'translateY(-50%)',
        fontSize: lifted ? 10 : 15, color: lifted ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.45)',
        pointerEvents: 'none', transition: 'all 0.2s',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        letterSpacing: lifted ? '0.08em' : 0,
        textTransform: lifted ? 'uppercase' : 'none',
      }}>{label}</label>
      {eye && (
        <button type="button" onClick={onToggleEye} style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', padding: 4, display: 'flex',
        }}><Eye open={showEye} /></button>
      )}
    </div>
  );
};

const PwStrength = ({ pw }) => {
  if (!pw) return null;
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const colors = ['#ef4444','#f97316','#eab308','#22c55e'];
  const labels = ['Weak','Fair','Good','Strong'];
  return (
    <div style={{ marginTop: -10, marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i < score ? colors[score-1] : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[score-1] || 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
        {score > 0 ? labels[score-1] : ''}
      </div>
    </div>
  );
};

const SignupPage = ({ onSignupComplete, onLoginRedirect }) => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showConf, setShowConf] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 6)  return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await res.json();
      if (res.ok) { onSignupComplete(); }
      else { setError(data.detail || 'Signup failed. Please try again.'); }
    } catch { setError('Connection error. Is the backend running?'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        .su-root {
          min-height: 100vh; width: 100%;
          background: linear-gradient(135deg, #0f0c1d 0%, #1a1035 40%, #0d1b3e 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; font-family: 'Plus Jakarta Sans', sans-serif; position: relative; overflow: hidden;
        }
        .su-blob { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; }
        .su-blob-1 { width:500px;height:500px;background:radial-gradient(circle,rgba(139,92,246,.18) 0%,transparent 70%);top:-100px;left:-100px; }
        .su-blob-2 { width:400px;height:400px;background:radial-gradient(circle,rgba(59,130,246,.15) 0%,transparent 70%);bottom:-80px;right:-80px; }
        .su-card {
          position:relative;z-index:10;width:100%;max-width:420px;
          background:rgba(255,255,255,.06);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
          border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:40px 36px;
          box-shadow:0 32px 64px rgba(0,0,0,.4);
          animation:cardIn .5s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @media(max-width:480px){.su-card{padding:30px 22px;border-radius:22px;}}
        @keyframes cardIn{from{opacity:0;transform:translateY(30px) scale(0.97)}to{opacity:1;transform:none}}
        .su-logo{text-align:center;margin-bottom:20px;animation:logoFadeIn 1s ease-out forwards;opacity:0;}
        .su-logo img{width:90px;filter:drop-shadow(0 0 20px rgba(139,92,246,.6));}
        @keyframes logoFadeIn{from{opacity:0;transform:translateY(16px) scale(0.9)}to{opacity:1;transform:scale(1)}}
        .su-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#fff;text-align:center;margin-bottom:6px;letter-spacing:-.5px;}
        .su-sub{text-align:center;font-size:13px;color:rgba(255,255,255,.45);margin-bottom:28px;line-height:1.6;}
        .su-alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.55;margin-bottom:18px;animation:alertIn .25s ease;}
        @keyframes alertIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        .su-alert-err{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;}
        .su-btn{width:100%;padding:15px;border-radius:50px;border:none;cursor:pointer;
          background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:700;font-size:15px;
          font-family:'Plus Jakarta Sans',sans-serif;transition:all .25s ease;
          box-shadow:0 4px 20px rgba(124,58,237,.4);display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px;}
        .su-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(124,58,237,.55);}
        .su-btn:disabled{opacity:.55;cursor:not-allowed;}
        .su-spin{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .65s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .su-login{text-align:center;font-size:13px;color:rgba(255,255,255,.45);margin-top:20px;}
        .su-login button{background:none;border:none;color:#a78bfa;font-weight:700;cursor:pointer;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;margin-left:4px;}
        .su-login button:hover{color:#c4b5fd;text-decoration:underline;}
        .pw-match-ok{font-size:11px;color:#86efac;margin-top:-10px;margin-bottom:14px;}
        .pw-match-no{font-size:11px;color:#fca5a5;margin-top:-10px;margin-bottom:14px;}
      `}</style>
      <div className="su-root">
        <div className="su-blob su-blob-1" />
        <div className="su-blob su-blob-2" />
        <div className="su-card">
          <div className="su-logo">
            <img src="/Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder" />
          </div>
          <div className="su-title">Create Account</div>
          <div className="su-sub">Join thousands of engineers preparing smarter</div>

          {error && <div className="su-alert su-alert-err"><span>⚠</span>{error}</div>}

          <form onSubmit={handleSubmit}>
            <FloatInput type="text"  label="Username"         value={username} onChange={e=>setUsername(e.target.value)} required autoComplete="username" />
            <FloatInput type="email" label="Email Address"    value={email}    onChange={e=>setEmail(e.target.value)}    required autoComplete="email" />
            <FloatInput type="password" label="Password"      value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password" eye showEye={showPw} onToggleEye={()=>setShowPw(p=>!p)} />
            <PwStrength pw={password} />
            <FloatInput type="password" label="Confirm Password" value={confirm} onChange={e=>setConfirm(e.target.value)} required autoComplete="new-password" eye showEye={showConf} onToggleEye={()=>setShowConf(p=>!p)} />
            {confirm && password && confirm === password  && <div className="pw-match-ok">✓ Passwords match</div>}
            {confirm && password && confirm !== password  && <div className="pw-match-no">✕ Passwords don't match</div>}

            <button type="submit" className="su-btn" disabled={loading || !username || !email || !password || password !== confirm}>
              {loading ? <><span className="su-spin"/>Creating account…</> : 'Create Account →'}
            </button>
          </form>

          <div className="su-login">
            Already have an account?<button type="button" onClick={onLoginRedirect}>Sign In</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupPage;
