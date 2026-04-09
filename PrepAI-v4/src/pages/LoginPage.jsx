import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import API_BASE_URL from '../config';

/* ─── Particle canvas ───────────────────────────────────────────────── */
const ParticleCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random()*w, y: Math.random()*h,
      r: Math.random()*1.8+0.4, vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3, a: Math.random()*.5+.2,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,w,h);
      dots.forEach(d => {
        d.x+=d.vx; d.y+=d.vy;
        if(d.x<0||d.x>w)d.vx*=-1; if(d.y<0||d.y>h)d.vy*=-1;
        ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${d.a})`; ctx.fill();
      });
      dots.forEach((d,i) => { for(let j=i+1;j<dots.length;j++){
        const dx=d.x-dots[j].x,dy=d.y-dots[j].y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<100){ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(dots[j].x,dots[j].y);
        ctx.strokeStyle=`rgba(255,255,255,${.08*(1-dist/100)})`;ctx.lineWidth=.6;ctx.stroke();}
      }});
      raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize',resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none'}}/>;
};

/* ─── Eye icon ─────────────────────────────────────────────────────── */
const Eye = ({ open }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open?(<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>)
    :(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>)}
  </svg>
);

/* ─── Floating label input ──────────────────────────────────────────── */
const FloatInput = ({ type, label, value, onChange, required, autoComplete, maxLength, inputMode, style={}, eye, showEye, onToggleEye }) => {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div style={{ position:'relative', marginBottom:18 }}>
      <input
        type={eye?(showEye?'text':'password'):type} value={value} onChange={onChange}
        required={required} autoComplete={autoComplete} maxLength={maxLength} inputMode={inputMode}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ width:'100%', boxSizing:'border-box', padding:'22px 44px 8px 16px',
          background:focused?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.1)',
          border:`1.5px solid ${focused?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.18)'}`,
          borderRadius:14, outline:'none', color:'#fff', fontSize:15,
          fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.2s', ...style }}
      />
      <label style={{ position:'absolute', left:16, top:lifted?8:'50%',
        transform:lifted?'none':'translateY(-50%)', fontSize:lifted?10:15,
        color:lifted?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.45)',
        pointerEvents:'none', transition:'all 0.2s', fontFamily:"'Plus Jakarta Sans',sans-serif",
        letterSpacing:lifted?'0.08em':0, textTransform:lifted?'uppercase':'none' }}>{label}</label>
      {eye&&<button type="button" onClick={onToggleEye} style={{
        position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
        background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:4, display:'flex',
      }}><Eye open={showEye}/></button>}
    </div>
  );
};

/* ─── OTP boxes ─────────────────────────────────────────────────────── */
const OtpBoxes = ({ value, onChange }) => {
  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];
  const digits = value.padEnd(6,' ').split('').slice(0,6);
  const handleKey = (i, e) => {
    if(e.key==='Backspace'){
      const next=value.slice(0,Math.max(0,i>0&&value.length<=i?i-1:i));
      onChange(next); if(i>0&&value.length<=i)refs[i-1].current?.focus();
    } else if(/^\d$/.test(e.key)){
      const next=(value.slice(0,i)+e.key+value.slice(i+1)).slice(0,6);
      onChange(next); if(i<5)refs[i+1].current?.focus();
    }
  };
  return (
    <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:20}}>
      {digits.map((d,i)=>(
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={d.trim()} readOnly onKeyDown={e=>handleKey(i,e)}
          onFocus={()=>refs[Math.min(i,value.length)].current?.focus()}
          onClick={()=>refs[Math.min(i,value.length)].current?.focus()}
          style={{ width:44, height:54, textAlign:'center', fontSize:24, fontWeight:700,
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            background:d.trim()?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.08)',
            border:`2px solid ${d.trim()?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.18)'}`,
            borderRadius:12, color:'#fff', outline:'none', transition:'all .15s', caretColor:'transparent' }}/>
      ))}
    </div>
  );
};

/* ─── Step bar ──────────────────────────────────────────────────────── */
const StepBar = ({ current }) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
    {['Email','Verify','Reset'].map((s,i)=>(
      <div key={s} style={{display:'flex',alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:11, fontWeight:700, transition:'all 0.3s',
            background:i<current?'#7c3aed':i===current?'rgba(124,58,237,0.3)':'rgba(255,255,255,0.06)',
            color:i<current?'#fff':i===current?'#a78bfa':'rgba(255,255,255,0.3)',
            border:i===current?'2px solid #7c3aed':i<current?'none':'1.5px solid rgba(255,255,255,0.1)',
          }}>{i<current?'✓':i+1}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:4,letterSpacing:'0.05em',textTransform:'uppercase'}}>{s}</div>
        </div>
        {i<2&&<div style={{width:32,height:2,margin:'0 4px 18px',borderRadius:2,
          background:i<current?'#7c3aed':'rgba(255,255,255,0.1)',transition:'background 0.3s'}}/>}
      </div>
    ))}
  </div>
);

/* ─── Password strength ─────────────────────────────────────────────── */
const PwStrength = ({ pw }) => {
  if(!pw)return null;
  const score=[pw.length>=8,/[A-Z]/.test(pw),/[0-9]/.test(pw),/[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const colors=['#ef4444','#f97316','#eab308','#22c55e'];
  const labels=['Weak','Fair','Good','Strong'];
  return(
    <div style={{marginTop:-10,marginBottom:14}}>
      <div style={{display:'flex',gap:4,marginBottom:4}}>
        {[0,1,2,3].map(i=><div key={i} style={{flex:1,height:3,borderRadius:3,
          background:i<score?colors[score-1]:'rgba(255,255,255,0.1)',transition:'all 0.3s'}}/>)}
      </div>
      <div style={{fontSize:11,color:colors[score-1]||'rgba(255,255,255,0.3)',textAlign:'right'}}>
        {score>0?labels[score-1]:''}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   EMAILJS CONFIG — Fill these in from your EmailJS dashboard
   1. Go to https://emailjs.com (free, 200 emails/month)
   2. Create account → Add Email Service (Gmail) → Create Template
   3. Template must have variables: {{to_email}}, {{otp}}, {{to_name}}
   4. Paste your IDs below
   ══════════════════════════════════════════════════════════════════════ */
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '';

async function sendOtpViaEmailJS(toEmail, otp) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    return { ok: false, reason: 'emailjs_not_configured' };
  }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: toEmail,
          to_name:  toEmail.split('@')[0],
          otp:      otp,
          otp_1: otp[0], otp_2: otp[1], otp_3: otp[2],
          otp_4: otp[3], otp_5: otp[4], otp_6: otp[5],
        },
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/* ─── Main component ─────────────────────────────────────────────────── */
const LoginPage = ({ onLogin, onSignup }) => {
  const { setToken, setUser } = useApp();
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [rememberMe,     setRememberMe]     = useState(false);
  const [error,          setError]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [message,        setMessage]        = useState('');
  const [showPw,         setShowPw]         = useState(false);
  const [showNewPw,      setShowNewPw]      = useState(false);
  const [showConfPw,     setShowConfPw]     = useState(false);
  const [view,           setView]           = useState('login');
  const [emailForReset,  setEmailForReset]  = useState('');
  const [otpValue,       setOtpValue]       = useState('');
  const [newPassword,    setNewPassword]    = useState('');
  const [confirmPassword,setConfirmPassword]= useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [cardKey,        setCardKey]        = useState(0);
  // Stores OTP received from backend (used when EmailJS not configured)
  const [backendOtp,     setBackendOtp]     = useState('');
  const [showOtpFallback,setShowOtpFallback]= useState(false);

  useEffect(()=>{
    let t; if(resendCooldown>0)t=setInterval(()=>setResendCooldown(c=>c-1),1000);
    return()=>clearInterval(t);
  },[resendCooldown]);

  useEffect(()=>{
    const saved=localStorage.getItem('geniebuilder_remembered_email');
    if(saved){setEmail(saved);setRememberMe(true);}
  },[]);

  const goTo = (v) => { setError(''); setMessage(''); setCardKey(k=>k+1); setView(v); };

  /* ── Login ──────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password}),
      });
      const data = await res.json();
      if(res.ok){
        rememberMe?localStorage.setItem('geniebuilder_remembered_email',email)
                  :localStorage.removeItem('geniebuilder_remembered_email');
        setToken(data.access_token); setUser(data.user); onLogin(data.user);
      } else { setError(data.detail||'Invalid email or password.'); }
    } catch { setError('Cannot reach server. Please try again.'); }
    finally { setLoading(false); }
  };

  /* ── Forgot password — get OTP from backend, email via EmailJS ── */
  const handleForgotPassword = async (e) => {
    if(e?.preventDefault)e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    setShowOtpFallback(false); setBackendOtp('');

    // Add a hard 12-second timeout so it never hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:emailForReset}),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(()=>({}));

      if(!res.ok) {
        setError(data.detail||`Server error (${res.status}). Please try again.`);
        return;
      }

      if(!data.email_found) {
        // Email not registered — show a neutral message (don't reveal email exists)
        setMessage('If this email is registered, you will receive a code.');
        setView('otp');
        setResendCooldown(60);
        setCardKey(k=>k+1);
        return;
      }

      const otp = data.otp;
      setBackendOtp(otp);

      // Try to send via EmailJS first
      const ejsResult = await sendOtpViaEmailJS(emailForReset, otp);

      if(ejsResult.ok) {
        setMessage('Code sent! Check your inbox and spam folder.');
        setView('otp');
        setOtpValue('');
        setResendCooldown(60);
        setCardKey(k=>k+1);
      } else if(ejsResult.reason === 'emailjs_not_configured') {
        // EmailJS not set up — show OTP directly on screen
        setShowOtpFallback(true);
        setView('otp');
        setOtpValue('');
        setResendCooldown(60);
        setCardKey(k=>k+1);
        setMessage('');
      } else {
        // EmailJS failed — still show OTP on screen as fallback
        setShowOtpFallback(true);
        setView('otp');
        setOtpValue('');
        setResendCooldown(60);
        setCardKey(k=>k+1);
      }

    } catch(err) {
      clearTimeout(timeout);
      if(err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Verify OTP ─────────────────────────────────────────────────── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:emailForReset, otp:otpValue}),
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok){ goTo('reset'); }
      else { setError(data.detail||'Invalid code. Please try again.'); }
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  /* ── Reset password ─────────────────────────────────────────────── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if(newPassword!==confirmPassword)return setError('Passwords do not match.');
    if(newPassword.length<6)return setError('Password must be at least 6 characters.');
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:emailForReset, otp:otpValue, new_password:newPassword}),
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok){
        setMessage('Password updated! Redirecting to login…');
        setTimeout(()=>{ goTo('login'); setMessage(''); },2000);
      } else { setError(data.detail||'Failed to reset password.'); }
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .lp-root{min-height:100vh;width:100%;background:linear-gradient(135deg,#0f0c1d 0%,#1a1035 40%,#0d1b3e 100%);
          display:flex;align-items:center;justify-content:center;padding:20px;
          font-family:'Plus Jakarta Sans',sans-serif;position:relative;overflow:hidden;}
        .blob{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;}
        .blob-1{width:500px;height:500px;background:radial-gradient(circle,rgba(139,92,246,.18) 0%,transparent 70%);top:-100px;left:-100px;}
        .blob-2{width:400px;height:400px;background:radial-gradient(circle,rgba(59,130,246,.15) 0%,transparent 70%);bottom:-80px;right:-80px;}
        .lp-card{position:relative;z-index:10;width:100%;max-width:420px;
          background:rgba(255,255,255,.06);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
          border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:40px 36px;
          box-shadow:0 32px 64px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.05) inset;
          animation:cardIn .5s cubic-bezier(0.34,1.56,0.64,1) both;}
        @media(max-width:480px){.lp-card{padding:28px 20px;border-radius:22px;}}
        @keyframes cardIn{from{opacity:0;transform:translateY(30px) scale(0.97)}to{opacity:1;transform:none}}
        .lp-logo{text-align:center;margin-bottom:20px;animation:logoFadeIn 1s ease-out forwards;opacity:0;}
        .lp-logo img{width:100px;filter:drop-shadow(0 0 20px rgba(139,92,246,.6));}
        @keyframes logoFadeIn{from{opacity:0;transform:translateY(16px) scale(0.9)}to{opacity:1;transform:scale(1)}}
        .lp-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#fff;
          text-align:center;margin-bottom:6px;letter-spacing:-.5px;}
        .lp-sub{text-align:center;font-size:13px;color:rgba(255,255,255,.45);margin-bottom:28px;line-height:1.6;}
        .alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:12px;
          font-size:13px;line-height:1.55;margin-bottom:18px;animation:alertIn .25s ease;}
        @keyframes alertIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        .alert-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;}
        .alert-success{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);color:#86efac;}
        .alert-info{background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.4);color:#c4b5fd;}
        .otp-reveal{background:rgba(124,58,237,.2);border:2px dashed rgba(167,139,250,.5);
          border-radius:16px;padding:20px;text-align:center;margin-bottom:20px;animation:alertIn .3s ease;}
        .otp-reveal-code{font-size:38px;font-weight:800;letter-spacing:12px;color:#fff;
          font-family:'Courier New',monospace;filter:drop-shadow(0 0 10px rgba(167,139,250,.8));}
        .btn-primary{width:100%;padding:15px;border-radius:50px;border:none;cursor:pointer;
          background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:700;font-size:15px;
          font-family:'Plus Jakarta Sans',sans-serif;transition:all .25s ease;
          box-shadow:0 4px 20px rgba(124,58,237,.4);display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px;}
        .btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(124,58,237,.55);}
        .btn-primary:disabled{opacity:.55;cursor:not-allowed;}
        .btn-ghost{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.5);font-size:13px;
          font-family:'Plus Jakarta Sans',sans-serif;padding:0;transition:color .2s;
          text-decoration:underline;text-underline-offset:3px;}
        .btn-ghost:hover{color:rgba(255,255,255,.9);}
        .check-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;flex-wrap:wrap;gap:8px;}
        .check-label{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:rgba(255,255,255,.6);}
        .check-label input[type=checkbox]{accent-color:#7c3aed;width:15px;height:15px;}
        .register-row{text-align:center;font-size:13px;color:rgba(255,255,255,.45);margin-top:20px;}
        .register-row button{background:none;border:none;color:#a78bfa;font-weight:700;cursor:pointer;
          font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;margin-left:4px;}
        .register-row button:hover{color:#c4b5fd;text-decoration:underline;}
        .resend-row{text-align:center;margin-top:12px;}
        .resend-btn{background:none;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;
          font-size:13px;padding:6px 14px;border-radius:20px;transition:all .2s;}
        .resend-btn:not(:disabled){color:#a78bfa;border:1px solid rgba(167,139,250,.3);}
        .resend-btn:not(:disabled):hover{background:rgba(124,58,237,.15);border-color:rgba(167,139,250,.6);}
        .resend-btn:disabled{color:rgba(255,255,255,.3);border:1px solid rgba(255,255,255,.08);cursor:not-allowed;}
        .back-row{text-align:center;margin-top:14px;}
        .spin{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;
          border-radius:50%;animation:spin .65s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="lp-root">
        <ParticleCanvas />
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        <div className="lp-card" key={cardKey}>
          <div className="lp-logo">
            <img src="Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder" />
          </div>

          {view !== 'login' && <StepBar current={['forgot','otp','reset'].indexOf(view)} />}

          {/* ── LOGIN ─────────────────────────────────────────────── */}
          {view === 'login' && (
            <>
              <div className="lp-title">Welcome back</div>
              <div className="lp-sub">Sign in to continue your journey</div>
              {error&&<div className="alert alert-error"><span>⚠</span>{error}</div>}
              {message&&<div className="alert alert-success"><span>✓</span>{message}</div>}
              <form onSubmit={handleSubmit}>
                <FloatInput type="email" label="Email Address" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/>
                <FloatInput type="password" label="Password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" eye showEye={showPw} onToggleEye={()=>setShowPw(p=>!p)}/>
                <div className="check-row">
                  <label className="check-label">
                    <input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/> Remember me
                  </label>
                  <button type="button" className="btn-ghost" onClick={()=>{setEmailForReset(email);goTo('forgot');}}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading?<><span className="spin"/>Signing in…</>:'Sign In →'}
                </button>
              </form>
              <div className="register-row">New here?<button type="button" onClick={onSignup}>Create account</button></div>
            </>
          )}

          {/* ── FORGOT PASSWORD ───────────────────────────────────── */}
          {view === 'forgot' && (
            <>
              <div className="lp-title">Reset password</div>
              <div className="lp-sub">We'll send a 6-digit code to your email</div>
              {error&&<div className="alert alert-error"><span>⚠</span>{error}</div>}
              <form onSubmit={handleForgotPassword}>
                <FloatInput type="email" label="Your Email Address" value={emailForReset} onChange={e=>setEmailForReset(e.target.value)} required autoComplete="email"/>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading?<><span className="spin"/>Sending code…</>:'Send Code →'}
                </button>
              </form>
              <div className="back-row">
                <button type="button" className="btn-ghost" onClick={()=>goTo('login')}>← Back to login</button>
              </div>
            </>
          )}

          {/* ── OTP VERIFY ────────────────────────────────────────── */}
          {view === 'otp' && (
            <>
              <div className="lp-title">Enter code</div>
              <div className="lp-sub">
                Sent to <strong style={{color:'rgba(255,255,255,.75)'}}>{emailForReset}</strong>
              </div>

              {error&&<div className="alert alert-error"><span>⚠</span>{error}</div>}
              {message&&<div className="alert alert-success"><span>✓</span>{message}</div>}

              {/* OTP Fallback — shown when email service not configured */}
              {showOtpFallback && backendOtp && (
                <div className="otp-reveal">
                  <div style={{fontSize:11,color:'rgba(167,139,250,.8)',letterSpacing:'0.15em',
                    textTransform:'uppercase',marginBottom:10,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    📋 Your Reset Code
                  </div>
                  <div className="otp-reveal-code">{backendOtp}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:10,lineHeight:1.5}}>
                    Copy this code and enter it below · expires in 10 min
                  </div>
                  <button type="button" onClick={()=>setOtpValue(backendOtp)} style={{
                    marginTop:10,background:'rgba(124,58,237,.3)',border:'1px solid rgba(167,139,250,.4)',
                    color:'#c4b5fd',borderRadius:8,padding:'6px 16px',fontSize:12,cursor:'pointer',
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                  }}>Auto-fill ↓</button>
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <OtpBoxes value={otpValue} onChange={setOtpValue}/>
                <button type="submit" className="btn-primary" disabled={loading||otpValue.length<6}>
                  {loading?<><span className="spin"/>Verifying…</>:'Verify Code →'}
                </button>
              </form>
              <div className="resend-row">
                <button type="button" className="resend-btn" onClick={handleForgotPassword} disabled={loading||resendCooldown>0}>
                  {resendCooldown>0?`Resend in ${resendCooldown}s`:'↺ Resend Code'}
                </button>
              </div>
              <div className="back-row">
                <button type="button" className="btn-ghost" onClick={()=>goTo('forgot')}>← Change email</button>
              </div>
            </>
          )}

          {/* ── RESET PASSWORD ────────────────────────────────────── */}
          {view === 'reset' && (
            <>
              <div className="lp-title">New password</div>
              <div className="lp-sub">Make it strong and memorable</div>
              {error&&<div className="alert alert-error"><span>⚠</span>{error}</div>}
              {message&&<div className="alert alert-success"><span>✓</span>{message}</div>}
              <form onSubmit={handleResetPassword}>
                <FloatInput type="password" label="New Password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required autoComplete="new-password" eye showEye={showNewPw} onToggleEye={()=>setShowNewPw(p=>!p)}/>
                <PwStrength pw={newPassword}/>
                <FloatInput type="password" label="Confirm Password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required autoComplete="new-password" eye showEye={showConfPw} onToggleEye={()=>setShowConfPw(p=>!p)}/>
                {newPassword&&confirmPassword&&newPassword!==confirmPassword&&(
                  <div style={{fontSize:12,color:'#fca5a5',marginTop:-10,marginBottom:14}}>✕ Passwords don't match</div>
                )}
                <button type="submit" className="btn-primary" disabled={loading||!newPassword||newPassword!==confirmPassword}>
                  {loading?<><span className="spin"/>Updating…</>:'Update Password →'}
                </button>
              </form>
              <div className="back-row">
                <button type="button" className="btn-ghost" onClick={()=>goTo('login')}>← Back to login</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginPage;
