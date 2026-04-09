import { useEffect, useRef, useState } from 'react';

export default function OpeningPage({ onComplete }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0); // 0=words, 1=logo, 2=exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 4200);
    const t2 = setTimeout(() => setPhase(2), 5800);
    const t3 = setTimeout(() => onComplete(), 6600);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onComplete]);

  /* ── Canvas: morphing particle sphere ────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const N   = 180;
    const cx  = () => W / 2;
    const cy  = () => H / 2;
    const R   = () => Math.min(W, H) * 0.28;
    let t     = 0;

    const pts = Array.from({ length: N }, (_, i) => {
      const phi   = Math.acos(1 - (2 * (i + 0.5)) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        baseX: Math.sin(phi) * Math.cos(theta),
        baseY: Math.sin(phi) * Math.sin(theta),
        baseZ: Math.cos(phi),
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        size:  1.2 + Math.random() * 1.4,
      };
    });

    let raf;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);

      // Radial gradient background glow
      const g = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), R() * 1.8);
      g.addColorStop(0, 'rgba(124,58,237,0.12)');
      g.addColorStop(0.5, 'rgba(79,70,229,0.06)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const sorted = pts.map(p => {
        const wobble = 0.12 * Math.sin(t * p.speed + p.phase);
        const rx = Math.cos(t * 0.3) * p.baseX - Math.sin(t * 0.3) * p.baseZ;
        const rz = Math.sin(t * 0.3) * p.baseX + Math.cos(t * 0.3) * p.baseZ;
        const ry = Math.cos(t * 0.18) * p.baseY - Math.sin(t * 0.18) * rz;
        const rz2 = Math.sin(t * 0.18) * p.baseY + Math.cos(t * 0.18) * rz;
        const r2  = R() * (1 + wobble);
        const px  = cx() + rx * r2;
        const py  = cy() + ry * r2;
        const pz  = rz2;
        return { px, py, pz, size: p.size };
      });

      sorted.sort((a, b) => a.pz - b.pz);

      sorted.forEach(({ px, py, pz, size }) => {
        const depth = (pz + 1) / 2;
        const alpha = 0.15 + depth * 0.75;
        const s     = size * (0.5 + depth * 0.9);
        const hue   = 240 + depth * 60; // blue→purple
        ctx.beginPath();
        ctx.arc(px, py, s, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},80%,70%,${alpha})`;
        ctx.fill();

        // Connect nearby dots
        sorted.forEach(other => {
          const dx = px - other.px, dy = py - other.py;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 55 && d > 0) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(other.px, other.py);
            ctx.strokeStyle = `rgba(167,139,250,${0.06 * (1 - d/55) * depth})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const words = ['THINK', 'PREPARE', 'CONQUER'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden',
      background: 'linear-gradient(135deg, #060412 0%, #0d0820 50%, #080d24 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 2 ? 0 : 1, transition: 'opacity 0.8s ease',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
        .op-word {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          font-family: 'Syne', sans-serif;
          font-size: clamp(3rem, 14vw, 9rem);
          font-weight: 800; letter-spacing: -0.04em;
          background: linear-gradient(135deg, #a78bfa 0%, #e0d7ff 50%, #818cf8 100%);
          background-clip: text; -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 40px rgba(167,139,250,0.5));
          white-space: nowrap;
        }
        .op-word-1 { animation: wordCycle 1.4s cubic-bezier(0.23,1,0.32,1) 0.2s both; }
        .op-word-2 { animation: wordCycle 1.4s cubic-bezier(0.23,1,0.32,1) 1.5s both; }
        .op-word-3 { animation: wordCycle 1.4s cubic-bezier(0.23,1,0.32,1) 2.8s both; }
        @keyframes wordCycle {
          0%   { opacity:0; transform:translate(-50%,30px); filter:blur(12px) drop-shadow(0 0 40px rgba(167,139,250,.5)); }
          20%,70% { opacity:1; transform:translate(-50%,-50%); filter:blur(0) drop-shadow(0 0 40px rgba(167,139,250,.5)); }
          100% { opacity:0; transform:translate(-50%,-130px); filter:blur(6px); }
        }
        .op-logo {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: min(340px, 72vw);
          filter: drop-shadow(0 0 60px rgba(167,139,250,.7));
          animation: logoReveal 1.2s cubic-bezier(0.34,1.56,0.64,1) 4.3s both;
        }
        @keyframes logoReveal {
          0%   { opacity:0; transform:translate(-50%,-50%) scale(0.7); filter:brightness(0) blur(20px) drop-shadow(0 0 60px rgba(167,139,250,.7)); }
          60%  { filter:brightness(1.3) blur(0) drop-shadow(0 0 60px rgba(167,139,250,.9)); }
          100% { opacity:1; transform:translate(-50%,-50%) scale(1); filter:brightness(1) blur(0) drop-shadow(0 0 60px rgba(167,139,250,.7)); }
        }
        .op-tagline {
          position: absolute; left: 50%; top: calc(50% + min(160px,22vw));
          transform: translateX(-50%);
          font-family: 'Syne', sans-serif; font-size: clamp(11px,2vw,15px);
          color: rgba(167,139,250,0.7); letter-spacing: 0.35em;
          text-transform: uppercase; white-space: nowrap;
          animation: tagFade 1s ease 5.2s both;
        }
        @keyframes tagFade { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        /* Scan-line ring */
        .op-ring {
          position: absolute; left: 50%; top: 50%;
          width: min(480px,90vw); height: min(480px,90vw);
          margin-left: calc(-1 * min(240px,45vw));
          margin-top:  calc(-1 * min(240px,45vw));
          border: 1px solid rgba(167,139,250,0.15);
          border-radius: 50%;
          animation: ringPulse 3s ease-in-out infinite;
        }
        .op-ring-2 {
          width: min(600px,110vw); height: min(600px,110vw);
          margin-left: calc(-1 * min(300px,55vw));
          margin-top:  calc(-1 * min(300px,55vw));
          border-color: rgba(167,139,250,0.07);
          animation: ringPulse 3s ease-in-out 1.5s infinite;
        }
        @keyframes ringPulse {
          0%,100%{transform:scale(1);opacity:.6}
          50%{transform:scale(1.04);opacity:1}
        }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      <div className="op-ring" style={{ zIndex: 1 }} />
      <div className="op-ring op-ring-2" style={{ zIndex: 1 }} />

      {phase === 0 && words.map((w, i) => (
        <div key={w} className={`op-word op-word-${i+1}`} style={{ zIndex: 2 }}>{w}</div>
      ))}

      {phase >= 1 && (
        <>
          <img className="op-logo" src="/Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder" style={{ zIndex: 2 }} />
          <div className="op-tagline" style={{ zIndex: 2 }}>AI-Powered Interview Coach</div>
        </>
      )}
    </div>
  );
}
