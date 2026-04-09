import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import API_BASE_URL from '../config';

/* ─── Particle background ─────────────────────────────────────────── */
const ParticleCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.2,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${d.a})`;
        ctx.fill();
      });
      dots.forEach((d, i) => {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = d.x - dots[j].x, dy = d.y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

/* ─── Eye icon ────────────────────────────────────────────────────── */
const Eye = ({ open }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    ) : (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    )}
  </svg>
);

/* ─── Floating label input ────────────────────────────────────────── */
const FloatInput = ({ type, label, value, onChange, required, autoComplete, maxLength, inputMode, eye, showEye, onToggleEye }) => {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div style={{ position: 'relative', marginBottom: 18 }}>
      <input
        type={eye ? (showEye ? 'text' : 'password') : type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '22px 44px 8px 16px',
          background: focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
          border: `1.5px solid ${focused ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'}`,
          borderRadius: 14, outline: 'none', color: '#fff',
          fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif",
          transition: 'all 0.2s ease',
        }}
      />
      <label style={{
        position: 'absolute', left: 16, top: lifted ? 8 : '50%',
        transform: lifted ? 'none' : 'translateY(-50%)',
        fontSize: lifted ? 10 : 15, color: lifted ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.45)',
        pointerEvents: 'none', transition: 'all 0.2s ease',
        fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: lifted ? '0.08em' : 0,
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

/* ─── OTP digit boxes ─────────────────────────────────────────────── */
const OtpBoxes = ({ value, onChange }) => {
  const refs = Array.from({ length: 6 }, () => useRef(null));
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, Math.max(0, i > 0 && value.length <= i ? i - 1 : i));
      onChange(next);
      if (i > 0 && value.length <= i) refs[i - 1].current?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = (value.slice(0, i) + e.key + value.slice(i + 1)).slice(0, 6);
      onChange(next);
      if (i < 5) refs[i + 1].current?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
      {digits.map((d, i) => (
        <input key={i} ref={refs[i]}
          type="text" inputMode="numeric" maxLength={1}
          value={d.trim()} readOnly
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={() => refs[Math.min(i, value.length)].current?.focus()}
          onClick={() => refs[Math.min(i, value.length)].current?.focus()}
          style={{
            width: 44, height: 54, textAlign: 'center',
            fontSize: 24, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: d.trim() ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
            border: `2px solid ${d.trim() ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'}`,
            borderRadius: 12, color: '#fff', outline: 'none',
            transition: 'all 0.15s',
            caretColor: 'transparent',
          }}
        />
      ))}
    </div>
  );
};

/* ─── Main LoginPage ─────────────────────────────────────────────── */
const LoginPage = ({ onLogin, onSignup }) => {
  const { setToken, setUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);
  const [view, setView] = useState('login');
  const [emailForReset, setEmailForReset] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    let t; if (resendCooldown > 0) t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    const saved = localStorage.getItem('geniebuilder_remembered_email');
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  const goTo = (v) => { setError(''); setMessage(''); setCardKey(k => k + 1); setView(v); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        rememberMe ? localStorage.setItem('geniebuilder_remembered_email', email)
                   : localStorage.removeItem('geniebuilder_remembered_email');
        setToken(data.access_token); setUser(data.user); onLogin(data.user);
      } else {
        setError(data.detail || 'Invalid email or password.');
      }
    } catch { setError('Cannot reach server. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailForReset }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('OTP sent! Check your inbox and spam folder.');
        setView('otp');
        setOtpValue('');
        setResendCooldown(60);
        setCardKey(k => k + 1);
      } else {
        // Show the real server error (e.g. SMTP not configured)
        setError(data.detail || `Request failed (${res.status}). Please contact support.`);
      }
    } catch { setError('Network error. Please check your connection.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailForReset, otp: otpValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { goTo('reset'); }
      else { setError(data.detail || 'Invalid OTP. Please try again.'); }
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailForReset, otp: otpValue, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('Password updated! Redirecting to login…');
        setTimeout(() => { goTo('login'); setMessage(''); }, 2000);
      } else {
        setError(data.detail || 'Failed to reset password.');
      }
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const steps = { forgot: 0, otp: 1, reset: 2 };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          min-height: 100vh; width: 100%;
          background: linear-gradient(135deg, #0f0c1d 0%, #1a1035 40%, #0d1b3e 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; font-family: 'Plus Jakarta Sans', sans-serif;
          position: relative; overflow: hidden;
        }

        /* Decorative blobs */
        .blob { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; }
        .blob-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%); top: -100px; left: -100px; }
        .blob-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%); bottom: -80px; right: -80px; }
        .blob-3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); }

        .lp-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 420px;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          padding: 40px 36px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
          animation: cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @media (max-width: 480px) { .lp-card { padding: 30px 22px; border-radius: 22px; } }
        @keyframes cardIn { from { opacity:0; transform: translateY(30px) scale(0.97); } to { opacity:1; transform: none; } }

        .lp-logo { text-align: center; margin-bottom: 20px; }
        .lp-logo img { width: 100px; filter: drop-shadow(0 0 20px rgba(139,92,246,0.6)); }

        .lp-title {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: #fff; text-align: center; margin-bottom: 6px; letter-spacing: -0.5px;
        }
        .lp-sub {
          text-align: center; font-size: 13px; color: rgba(255,255,255,0.45);
          margin-bottom: 28px; line-height: 1.6;
        }

        /* Step bar */
        .step-bar { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 24px; }
        .step-item { display: flex; align-items: center; gap: 0; }
        .step-circle {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; transition: all 0.3s;
        }
        .step-circle.done { background: #7c3aed; color: #fff; }
        .step-circle.active { background: rgba(124,58,237,0.3); color: #a78bfa; border: 2px solid #7c3aed; }
        .step-circle.pending { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); border: 1.5px solid rgba(255,255,255,0.1); }
        .step-label { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 4px; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; }
        .step-line { width: 32px; height: 2px; background: rgba(255,255,255,0.1); margin: 0 4px; border-radius: 2px; }
        .step-line.done { background: #7c3aed; }

        /* Alerts */
        .alert {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          font-size: 13px; line-height: 1.55; margin-bottom: 18px;
          animation: alertIn 0.25s ease;
        }
        @keyframes alertIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        .alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }
        .alert-success { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #86efac; }
        .alert-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }

        /* Primary button */
        .btn-primary {
          width: 100%; padding: 15px; border-radius: 50px;
          border: none; cursor: pointer;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #fff; font-weight: 700; font-size: 15px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.25s ease;
          box-shadow: 0 4px 20px rgba(124,58,237,0.4);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(124,58,237,0.55);
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Secondary / ghost button */
        .btn-ghost {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.5); font-size: 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 0; transition: color 0.2s; text-decoration: underline; text-underline-offset: 3px;
        }
        .btn-ghost:hover { color: rgba(255,255,255,0.9); }

        /* Remember + forgot row */
        .check-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 8px; }
        .check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.6); }
        .check-label input[type=checkbox] { accent-color: #7c3aed; width: 15px; height: 15px; }

        /* Divider */
        .divider-row { display: flex; align-items: center; gap: 12px; margin: 18px 0; }
        .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
        .divider-text { font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.08em; text-transform: uppercase; }

        /* Register row */
        .register-row { text-align: center; font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 20px; }
        .register-row button { background: none; border: none; color: #a78bfa; font-weight: 700; cursor: pointer; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; margin-left: 4px; transition: color 0.2s; }
        .register-row button:hover { color: #c4b5fd; text-decoration: underline; }

        /* Resend */
        .resend-row { text-align: center; margin-top: 12px; }
        .resend-btn { background: none; border: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; transition: all 0.2s; padding: 6px 14px; border-radius: 20px; }
        .resend-btn:not(:disabled) { color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
        .resend-btn:not(:disabled):hover { background: rgba(124,58,237,0.15); border-color: rgba(167,139,250,0.6); }
        .resend-btn:disabled { color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.08); cursor: not-allowed; }

        /* Spinner */
        .spin { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.65s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Back */
        .back-row { text-align: center; margin-top: 14px; }

        /* Password strength bar */
        .pw-strength { height: 3px; border-radius: 3px; margin-top: -10px; margin-bottom: 14px; transition: all 0.3s; }

        /* Admin config warning */
        .admin-hint { font-size: 11px; color: rgba(251,191,36,0.8); background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2); border-radius: 8px; padding: 10px 12px; margin-top: 12px; line-height: 1.6; }
      `}</style>

      <div className="lp-root">
        <ParticleCanvas />
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="lp-card" key={cardKey}>
          <div className="lp-logo">
            <img src="Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder" />
          </div>

          {/* ─── LOGIN ─────────────────────────────────────────── */}
          {view === 'login' && (
            <>
              <div className="lp-title">Welcome back</div>
              <div className="lp-sub">Sign in to continue your journey</div>
              {error && <div className="alert alert-error"><span className="alert-icon">⚠</span>{error}</div>}
              {message && <div className="alert alert-success"><span className="alert-icon">✓</span>{message}</div>}
              <form onSubmit={handleSubmit}>
                <FloatInput type="email" label="Email Address" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <FloatInput type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" eye showEye={showPw} onToggleEye={() => setShowPw(p => !p)} />
                <div className="check-row">
                  <label className="check-label">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                    Remember me
                  </label>
                  <button type="button" className="btn-ghost" onClick={() => { setEmailForReset(email); goTo('forgot'); }}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="spin" />Signing in…</> : 'Sign In →'}
                </button>
              </form>
              <div className="register-row">
                New here?<button type="button" onClick={onSignup}>Create account</button>
              </div>
            </>
          )}

          {/* ─── FORGOT PASSWORD ──────────────────────────────── */}
          {view === 'forgot' && (
            <>
              <StepBar current={0} />
              <div className="lp-title">Reset password</div>
              <div className="lp-sub">We'll send a 6-digit code to your email</div>
              {error && (
                <>
                  <div className="alert alert-error"><span className="alert-icon">⚠</span>{error}</div>
                  {(error.toLowerCase().includes('not configured') || error.toLowerCase().includes('smtp') || error.toLowerCase().includes('resend') || error.toLowerCase().includes('email') || error.includes('503')) ? (
                    <div className="admin-hint">
                      🔧 <strong>Email not set up on server.</strong><br/>
                      <strong>Quick fix (2 min):</strong><br/>
                      1. Sign up free at <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: '#fbbf24' }}>resend.com</a><br/>
                      2. Copy your API key (starts with <code>re_</code>)<br/>
                      3. In <strong>Render → your service → Environment</strong> add:<br/>
                      &nbsp;&nbsp;<code>RESEND_API_KEY</code> = <em>re_xxxxxxxxxxxx</em><br/>
                      4. Redeploy — OTPs will arrive instantly ✓
                    </div>
                  ) : null}
                </>
              )}
              <form onSubmit={handleForgotPassword}>
                <FloatInput type="email" label="Your Email Address" value={emailForReset} onChange={e => setEmailForReset(e.target.value)} required autoComplete="email" />
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="spin" />Sending code…</> : 'Send OTP →'}
                </button>
              </form>
              <div className="back-row">
                <button type="button" className="btn-ghost" onClick={() => goTo('login')}>← Back to login</button>
              </div>
            </>
          )}

          {/* ─── OTP ─────────────────────────────────────────── */}
          {view === 'otp' && (
            <>
              <StepBar current={1} />
              <div className="lp-title">Enter code</div>
              <div className="lp-sub">Sent to <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{emailForReset}</strong><br/>Check spam if not received</div>
              {error && <div className="alert alert-error"><span className="alert-icon">⚠</span>{error}</div>}
              {message && <div className="alert alert-success"><span className="alert-icon">✓</span>{message}</div>}
              <form onSubmit={handleVerifyOtp}>
                <OtpBoxes value={otpValue} onChange={setOtpValue} />
                <button type="submit" className="btn-primary" disabled={loading || otpValue.length < 6}>
                  {loading ? <><span className="spin" />Verifying…</> : 'Verify Code →'}
                </button>
              </form>
              <div className="resend-row">
                <button type="button" className="resend-btn" onClick={handleForgotPassword} disabled={loading || resendCooldown > 0}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : '↺ Resend OTP'}
                </button>
              </div>
              <div className="back-row">
                <button type="button" className="btn-ghost" onClick={() => goTo('forgot')}>← Change email</button>
              </div>
            </>
          )}

          {/* ─── RESET PASSWORD ──────────────────────────────── */}
          {view === 'reset' && (
            <>
              <StepBar current={2} />
              <div className="lp-title">New password</div>
              <div className="lp-sub">Make it strong and memorable</div>
              {error && <div className="alert alert-error"><span className="alert-icon">⚠</span>{error}</div>}
              {message && <div className="alert alert-success"><span className="alert-icon">✓</span>{message}</div>}
              <form onSubmit={handleResetPassword}>
                <FloatInput type="password" label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" eye showEye={showNewPw} onToggleEye={() => setShowNewPw(p => !p)} />
                <PwStrength pw={newPassword} />
                <FloatInput type="password" label="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" eye showEye={showConfPw} onToggleEye={() => setShowConfPw(p => !p)} />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <div style={{ fontSize: 12, color: '#fca5a5', marginTop: -10, marginBottom: 14 }}>✕ Passwords don't match</div>
                )}
                <button type="submit" className="btn-primary" disabled={loading || !newPassword || newPassword !== confirmPassword}>
                  {loading ? <><span className="spin" />Updating…</> : 'Update Password →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Step bar component ──────────────────────────────────────────── */
const StepBar = ({ current }) => {
  const steps = ['Email', 'Verify', 'Reset'];
  return (
    <div className="step-bar" style={{ marginBottom: 20 }}>
      {steps.map((s, i) => (
        <div className="step-item" key={s}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={`step-circle ${i < current ? 'done' : i === current ? 'active' : 'pending'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <div className="step-label">{s}</div>
          </div>
          {i < steps.length - 1 && <div className={`step-line ${i < current ? 'done' : ''}`} style={{ marginBottom: 18 }} />}
        </div>
      ))}
    </div>
  );
};

/* ─── Password strength indicator ─────────────────────────────────── */
const PwStrength = ({ pw }) => {
  if (!pw) return null;
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ marginTop: -10, marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[score - 1] || 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
        {score > 0 ? labels[score - 1] : ''}
      </div>
    </div>
  );
};

export default LoginPage;
