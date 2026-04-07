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
    e.preventDefault();
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
        alert('Password reset successful! Please log in.');
        setView('login');
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to reset password');
      }
    } catch (e) { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page-container">
      <style>{`
        .login-page-container {
            background-image: url('/ruru.png');
            background-repeat: no-repeat;
            height: 100vh;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            font-family: 'DM Sans', sans-serif;
            width: 100vw;
        }
        #logincontainer {
            border: 0px solid;
            position: relative;
            padding: 40px;
            height: auto;
            min-height: 400px;
            width: 380px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(15px);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: #fff;
            animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        h2 { text-align: center; font-size: 2rem; margin-bottom: 25px; font-weight: 700; letter-spacing: -1px; }
        
        .input-group { position: relative; margin-bottom: 18px; }
        .input-group input {
            width: 100%;
            padding: 12px 15px;
            border: none;
            border-radius: 12px;
            outline: none;
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
            font-size: 15px;
            transition: all 0.3s ease;
        }
        .input-group input:focus { background: rgba(255, 255, 255, 0.3); box-shadow: 0 0 10px rgba(255, 255, 255, 0.1); }
        
        .error-msg {
            background: rgba(211, 47, 47, 0.4);
            border-left: 4px solid #ff4d4d;
            padding: 8px 12px;
            font-size: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        .success-msg {
            background: rgba(46, 125, 50, 0.4);
            border-left: 4px solid #4caf50;
            padding: 8px 12px;
            font-size: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
        }

        #check { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 25px; align-items: center; }
        #check a { color: #fff; text-decoration: none; opacity: 0.8; transition: opacity 0.3s; cursor: pointer; }
        #check a:hover { opacity: 1; text-decoration: underline; }
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
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); background: #f8f8f8; }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .back-link { display: block; text-align: center; margin-top: 15px; font-size: 13px; color: #fff; text-decoration: none; cursor: pointer; opacity: 0.8; }
        .back-link:hover { opacity: 1; text-decoration: underline; }

        #Register { margin-top: 25px; text-align: center; font-size: 14px; color: rgba(255, 255, 255, 0.8); }
        #Register a { color: #fff; font-weight: 700; text-decoration: none; margin-left: 5px; cursor: pointer; }
        #Register a:hover { text-decoration: underline; }

        .form-logo {
            text-align: center;
            margin-bottom: 10px;
            animation: logoFadeIn 1s ease-out forwards;
            opacity: 0;
        }
        .form-logo img {
            width: 140px;
            filter: drop-shadow(0 0 10px rgba(189, 166, 206, 0.5));
        }
        @keyframes logoFadeIn {
            from { opacity: 0; transform: translateY(20px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div id="logincontainer" style={{ minHeight: view === 'login' ? 400 : 350 }}>
        <div className="form-logo">
          <img src="Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder Logo" />

        </div>
        
        {view === 'login' && (
          <>
            <h2>Login</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div id="check">
                <label>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember Me
                </label>
                <a onClick={() => setView('forgot')}>Forgot password?</a>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <div id="Register">
                Don't have an account? <a onClick={onSignup}>Sign Up</a>
              </div>
            </form>
          </>
        )}

        {view === 'forgot' && (
          <>
            <h2>Reset Password</h2>
            {error && <div className="error-msg">{error}</div>}
            {message && <div className="success-msg">{message}</div>}
            <p style={{ fontSize: 13, textAlign: 'center', marginBottom: 20, opacity: 0.9 }}>
              Enter your email address and we'll send you a 6-digit OTP to reset your password.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="input-group">
                <input type="email" placeholder="Email Address" value={emailForReset} onChange={(e) => setEmailForReset(e.target.value)} required />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
              <a className="back-link" onClick={() => setView('login')}>Back to Login</a>
            </form>
          </>
        )}

        {view === 'otp' && (
          <>
            <h2>Verify OTP</h2>
            {error && <div className="error-msg">{error}</div>}
            {message && <div className="success-msg">{message}</div>}
            <p style={{ fontSize: 13, textAlign: 'center', marginBottom: 20, opacity: 0.9 }}>
              An OTP has been sent to <strong>{emailForReset}</strong>.
            </p>
            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <input type="text" placeholder="6-digit OTP" maxLength="6" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} required />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <button 
                  type="button" 
                  onClick={handleForgotPassword} 
                  disabled={loading || resendCooldown > 0} 
                  style={{ background: 'transparent', border: 'none', color: resendCooldown > 0 ? 'rgba(255,255,255,0.5)' : '#fff', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
              <a className="back-link" onClick={() => setView('forgot')}>Change Email</a>
            </form>
          </>
        )}

        {view === 'reset' && (
          <>
            <h2>New Password</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
