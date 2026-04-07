import { useEffect } from 'react';

const OpeningPage = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 6500); // Reduced to 6.5s
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="opening-container">
      <style>{`
        :root {
            --lavender: #BDA6CE;
            --dark-bg: #091413;
            --lavender-light: #dcd0ff; 
        }

        .opening-container {
            height: 100vh;
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
            background-color: var(--dark-bg);
            position: relative;
        }

        /* Starfield Effect */
        .stars-container {
            position: absolute;
            inset: 0;
            z-index: 0;
            overflow: hidden;
        }
        .star {
            position: absolute;
            background: white;
            border-radius: 50%;
            opacity: 0.3;
            animation: moveStar linear infinite;
        }
        @keyframes moveStar {
            from { transform: translateY(0); }
            to { transform: translateY(-100vh); }
        }

        .glass-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(189, 166, 206, 0.15) 0%, var(--dark-bg) 100%);
            z-index: 1;
        }

        .glass-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(9, 20, 19, 0.2); 
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
            z-index: 2;
        }

        .content-wrapper {
            position: relative;
            z-index: 3;
            text-align: center;
            width: 100%;
        }

        .text-step {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: clamp(2.5rem, 12vw, 8rem);
            font-weight: 900;
            opacity: 0;
            white-space: nowrap;
            letter-spacing: -0.05em;
            
            color: var(--lavender);
            background: linear-gradient(135deg, var(--lavender) 20%, var(--lavender-light) 50%, var(--lavender) 80%);
            background-size: 200% auto;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            
            filter: drop-shadow(0 0 20px rgba(189, 166, 206, 0.6));
        }

        .logo-container {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            opacity: 0;
            width: 480px;
            filter: drop-shadow(0 0 60px rgba(189, 166, 206, 0.6));
        }

        .logo-container img {
            max-width: 100%;
            height: auto;
        }

        @keyframes slideUpIn {
            0% {
                opacity: 0;
                transform: translate(-50%, 40px) scale(0.95);
                filter: blur(10px);
            }
            15%, 85% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
                filter: blur(0px);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -140px) scale(1.05);
                filter: blur(5px);
            }
        }

        @keyframes scaleLogoReveal {
            0% { 
                opacity: 0; 
                transform: translate(-50%, -10%) scale(0.8);
                filter: brightness(0) blur(20px);
            }
            100% { 
                opacity: 1; 
                transform: translate(-50%, -50%) scale(1);
                filter: brightness(1) blur(0px);
            }
        }

        /* Faster Timings (Total ~6.5s) */
        .step-1 { animation: slideUpIn 2s cubic-bezier(0.23, 1, 0.32, 1) 0s forwards; }
        .step-2 { animation: slideUpIn 2s cubic-bezier(0.23, 1, 0.32, 1) 1.5s forwards; }
        .step-3 { animation: slideUpIn 2s cubic-bezier(0.23, 1, 0.32, 1) 3s forwards; }
        .step-4 { animation: scaleLogoReveal 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) 5s forwards; }

      `}</style>

      {/* Generated Stars */}
      <div className="stars-container">
          {[...Array(50)].map((_, i) => (
              <div key={i} className="star" style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 3}px`,
                  height: `${Math.random() * 3}px`,
                  animationDuration: `${Math.random() * 3 + 2}s`,
                  animationDelay: `${Math.random() * 5}s`
              }} />
          ))}
      </div>

      <div className="glass-background"></div>
      <div className="glass-overlay"></div>

      <div className="content-wrapper">
          <div className="text-step step-1">NOW</div>
          <div className="text-step step-2">YOU ARE IN</div>
          <div className="text-step step-3">SAFE HANDS</div>

          <div className="logo-container step-4">
               <img src="/Gemini_Generated_Image_cky579cky579cky5-Photoroom.png" alt="GenieBuilder Logo" />
          </div>
      </div>
    </div>
  );
};

export default OpeningPage;
