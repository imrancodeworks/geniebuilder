import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import API_BASE_URL from '../config';

const LoginPage = ({ onLogin, onSignup }) => {
  const { setToken, setUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password Flow State
  const [view, setView] = useState('login'); // login, forgot, otp, reset
  const [emailForReset, setEmailForReset] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('geniebuilder_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const resetStates = () => {
    setError('');
    setMessage('');
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (rememberMe) {
          localStorage.setItem('geniebuilder_remembered_email', email);
        } else {
          localStorage.removeItem('geniebuilder_remembered_email');
        }
        setToken(data.access_token);
        setUser(data.user);
        onLogin(data.user);
      } else {
        setError(data.detail || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('System unreachable. Please check if the backend API is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    resetStates();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailForReset })
      });
      if (res.ok) {
        setMessage('If registered, an OTP has been sent to your email.');
        setView('otp');
        setResendCooldown(60);
      } else {
        setError('Failed to process request.');
      }
    } catch (e) { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    resetStates();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailForReset, otp: otpValue })
      });
      if (res.ok) {
        setView('reset');
      } else {
        const data = await res.json();
        setError(data.detail || 'Invalid OTP');
      }
    } catch (e) { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');
    resetStates();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailForReset, 
          otp: otpValue, 
          new_password: newPassword 
        })
      });
      if (res.ok) {
        setMessage('Password reset successful! Please log in.');
        setTimeout(() => {
          setView('login');
          setMessage('');
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to reset password');
      }
    } catch (e) { setError('Network error'); }
    finally { setLoading(false); }
  };

  const EyeIcon = ({ show }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {show ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      )}
    </svg>
  );

  return (
    <div className="login-page-container">
      <style>{`
        .login-page-container {
            background-image: url('/ruru.png');
            background-repeat: no-repeat;
            min-height: 100vh;
            background-size: cover;
            background-position: center;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
            font-family: 'DM Sans', sans-serif;
            width: 100%;
        }
        #logincontainer {
            position: relative;
            padding: 36px 32px;
            width: 100%;
            max-width: 400px;
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.22);
            color: #fff;
            animation: fadeIn 0.5s ease;
            box-sizing: border-box;
        }
        @media (max-width: 480px) {
            #logincontainer { padding: 28px 20px; border-radius: 18px; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .login-title { text-align: center; font-size: 1.8rem; margin-bottom: 22px; font-weight: 700; letter-spacing: -0.5px; }
        
        .input-group { position: relative; margin-bottom: 16px; }
        .input-group input {
            width: 100%;
            padding: 13px 16px;
            border: none;
            border-radius: 12px;
            outline: none;
            background: rgba(255, 255, 255, 0.18);
            color: #fff;
            font-size: 15px;
            transition: all 0.3s ease;
            box-sizing: border-box;
            font-family: 'DM Sans', sans-serif;
        }
        .input-group input::placeholder { color: rgba(255,255,255,0.55); }
        .input-group input:focus { background: rgba(255, 255, 255, 0.28); box-shadow: 0 0 0 2px rgba(255,255,255,0.25); }
        .input-group.has-eye input { padding-right: 46px; }
        .eye-toggle {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: rgba(255,255,255,0.65);
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
            transition: color 0.2s;
        }
        .eye-toggle:hover { color: #fff; }

        .error-msg {
            background: rgba(211, 47, 47, 0.35);
            border-left: 4px solid #ff5252;
            padding: 10px 14px;
            font-size: 13px;
            margin-bottom: 16px;
            border-radius: 6px;
            line-height: 1.5;
        }
        .success-msg {
            background: rgba(46, 125, 50, 0.35);
            border-left: 4px solid #4caf50;
            padding: 10px 14px;
            font-size: 13px;
            margin-bottom: 16px;
            border-radius: 6px;
            line-height: 1.5;
        }

        #check { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 22px; align-items: center; flex-wrap: wrap; gap: 8px; }
        #check .forgot-link { color: #fff; text-decoration: none; opacity: 0.8; transition: opacity 0.3s; cursor: pointer; background: none; border: none; font-size: 13px; font-family: 'DM Sans', sans-serif; padding: 0; }
        #check .forgot-link:hover { opacity: 1; text-decoration: underline; }
        #check label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        
        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 50px;
          border: none;
          background: #fff;
          color: #2A1F3D;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: 'DM Sans', sans-serif;
          margin-top: 4px;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); background: #f0ecff; }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(42,31,61,0.3);
          border-top-color: #2A1F3D;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .back-link { display: block; text-align: center; margin-top: 14px; font-size: 13px; color: rgba(255,255,255,0.75); text-decoration: none; cursor: pointer; transition: color 0.2s; background: none; border: none; font-family: 'DM Sans', sans-serif; width: 100%; }
        .back-link:hover { color: #fff; text-decoration: underline; }

        #Register { margin-top: 22px; text-align: center; font-size: 14px; color: rgba(255, 255, 255, 0.75); }
        #Register button { color: #fff; font-weight: 700; text-decoration: none; margin-left: 5px; cursor: pointer; background: none; border: none; font-size: 14px; font-family: 'DM Sans', sans-serif; }
        #Register button:hover { text-decoration: underline; }

        .form-logo {
            text-align: center;
            margin-bottom: 8px;
            animation: logoFadeIn 1s ease-out forwards;
            opacity: 0;
        }
        .form-logo img {
            width: 120px;
            filter: drop-shadow(0 0 12px rgba(189, 166, 206, 0.6));
        }
        @keyframes logoFadeIn {
            from { opacity: 0; transform: translateY(16px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .otp-input-row { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
        .divider { display: flex; align-items: center; gap: 10px; margin: 10px 0 16px; }
        .divider::before, .divider::after { content:''; flex:1; height:1px; background: rgba(255,255,255,0.2); }
        .divider span { font-size: 11px; color: rgba(255,255,255,0.45); letter-spacing: 1px; }

        .step-indicator { display: flex; justify-content: center; gap: 6px; margin-bottom: 20px; }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); transition: background 0.3s; }
        .step-dot.active { background: #fff; }
        .step-dot.done { background: rgba(76,175,80,0.8); }
      `}</style>

      <div id="logincontainer">
        <div className="form-logo">
          <img src="Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder Logo" />
        </div>

        {/* Step indicator for forgot password flow */}
        {view !== 'login' && (
          <div className="step-indicator">
            {['forgot','otp','reset'].map((s, i) => (
              <div key={s} className={`step-dot ${view === s ? 'active' : ['forgot','otp','reset'].indexOf(view) > i ? 'done' : ''}`} />
            ))}
          </div>
        )}
        
        {view === 'login' && (
          <>
            <h2 className="login-title">Welcome Back</h2>
            {error && <div className="error-msg">⚠️ {error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="input-group has-eye">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  autoComplete="current-password"
                />
                <button type="button" className="eye-toggle" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <EyeIcon show={showPassword} />
                </button>
              </div>
              <div id="check">
                <label>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember Me
                </label>
                <button type="button" className="forgot-link" onClick={() => { resetStates(); setEmailForReset(email); setView('forgot'); }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><span className="spinner"/>'Logging in...'</> : 'Login'}
              </button>
              <div id="Register">
                Don't have an account? <button type="button" onClick={onSignup}>Sign Up</button>
              </div>
            </form>
          </>
        )}

        {view === 'forgot' && (
          <>
            <h2 className="login-title">Reset Password</h2>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {message && <div className="success-msg">✓ {message}</div>}
            <p style={{ fontSize: 13, textAlign: 'center', marginBottom: 20, opacity: 0.85, lineHeight: 1.6 }}>
              Enter your registered email and we'll send you a 6-digit OTP.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="input-group">
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={emailForReset} 
                  onChange={(e) => setEmailForReset(e.target.value)} 
                  required 
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><span className="spinner"/>Sending OTP...</> : 'Send OTP'}
              </button>
              <button type="button" className="back-link" onClick={() => { resetStates(); setView('login'); }}>← Back to Login</button>
            </form>
          </>
        )}

        {view === 'otp' && (
          <>
            <h2 className="login-title">Verify OTP</h2>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {message && <div className="success-msg">✓ {message}</div>}
            <p style={{ fontSize: 13, textAlign: 'center', marginBottom: 20, opacity: 0.85, lineHeight: 1.6 }}>
              A 6-digit code was sent to<br/><strong>{emailForReset}</strong>
            </p>
            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Enter 6-digit OTP" 
                  maxLength="6" 
                  value={otpValue} 
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g,''))} 
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '20px' }}
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading || otpValue.length < 6}>
                {loading ? <><span className="spinner"/>Verifying...</> : 'Verify OTP'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  disabled={loading || resendCooldown > 0} 
                  style={{ 
                    background: 'transparent', border: 'none', 
                    color: resendCooldown > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)', 
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', 
                    fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                    textDecoration: resendCooldown > 0 ? 'none' : 'underline'
                  }}
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
              <button type="button" className="back-link" onClick={() => { resetStates(); setView('forgot'); }}>← Change Email</button>
            </form>
          </>
        )}

        {view === 'reset' && (
          <>
            <h2 className="login-title">New Password</h2>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {message && <div className="success-msg">✓ {message}</div>}
            <form onSubmit={handleResetPassword}>
              <div className="input-group has-eye">
                <input 
                  type={showNewPassword ? 'text' : 'password'} 
                  placeholder="New Password (min. 6 chars)" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  autoComplete="new-password"
                />
                <button type="button" className="eye-toggle" onClick={() => setShowNewPassword(p => !p)} aria-label="Toggle password">
                  <EyeIcon show={showNewPassword} />
                </button>
              </div>
              <div className="input-group has-eye">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  placeholder="Confirm New Password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  autoComplete="new-password"
                />
                <button type="button" className="eye-toggle" onClick={() => setShowConfirmPassword(p => !p)} aria-label="Toggle password">
                  <EyeIcon show={showConfirmPassword} />
                </button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div style={{ fontSize: 12, color: '#ff8a80', marginTop: -10, marginBottom: 10 }}>Passwords 
