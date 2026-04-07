import React, { useState } from 'react';
import API_BASE_URL from '../config';

const SignupPage = ({ onSignupComplete, onLoginRedirect }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (response.ok) {
        onSignupComplete();
      } else {
        setError(data.detail || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page-container">
      <style>{`
        .signup-page-container {
            background-image: url('https://i.pinimg.com/1200x/d9/b9/c6/d9b9c6935ce4a5025e4fd5ac37b5c3bc.jpg');
            background-repeat: no-repeat;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            height: 100vh;
            width: 100vw;
            font-family: 'DM Sans', sans-serif;
        }
        #page {
            position: relative;
            padding: 40px;
            height: auto;
            min-height: 520px;
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
        
        h2 { text-align: center; font-size: 2rem; margin-bottom: 25px; font-weight: 700; }
        .input-group { position: relative; margin-bottom: 15px; }
        .input-group input {
            width: 100%;
            padding: 12px 45px 12px 15px;
            border: none;
            border-radius: 12px;
            outline: none;
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .input-group input:focus { background: rgba(255, 255, 255, 0.3); box-shadow: 0 0 10px rgba(255, 255, 255, 0.2); }
        .input-group i { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: rgba(255, 255, 255, 0.8); font-size: 18px; }
        
        .error-msg {
            background: rgba(255, 0, 0, 0.2);
            border-left: 4px solid #ff4d4d;
            padding: 8px 12px;
            font-size: 13px;
            margin-bottom: 15px;
            border-radius: 4px;
            animation: shake 0.3s ease;
        }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

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
            margin-top: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        #final { margin-top: 25px; text-align: center; font-size: 14px; color: rgba(255, 255, 255, 0.8); }
        #final a { color: #fff; font-weight: 700; text-decoration: none; margin-left: 5px; cursor: pointer; }
        #final a:hover { text-decoration: underline; }

        .form-logo {
            text-align: center;
            margin-bottom: 10px;
            animation: logoFadeIn 1s ease-out forwards;
            opacity: 0;
        }
        .form-logo img {
            width: 150px;
            filter: drop-shadow(0 0 20px rgba(189, 166, 206, 0.8));
        }
        @keyframes logoFadeIn {
            from { opacity: 0; transform: translateY(30px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div id="page">
        <div className="form-logo">
          <img src="Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder Logo" />

        </div>
        <h2>Sign up</h2>
        
        {error && <div className="error-msg">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
            <i className="fa-solid fa-circle-user"></i>
          </div>
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <i className="fa-regular fa-envelope"></i>
          </div>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <i className="fa-solid fa-lock"></i>
          </div>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
            <i className="fa-solid fa-key"></i>
          </div>
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : 'SUBMIT'}
          </button>
          
          <div id="final">
            Already have an account? 
            <a onClick={onLoginRedirect}>Signin</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
