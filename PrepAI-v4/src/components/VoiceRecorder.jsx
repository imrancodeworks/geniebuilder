import { useRef, useState } from 'react';
import { Waveform, S } from './shared';
import { detectFillerWords } from '../utils/analysis';

export default function VoiceRecorder({ onTranscript }) {
  const [recording, setRecording] = useState(false);
  const [liveFillers, setLiveFillers] = useState([]);
  const recRef = useRef(null);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported. Please use Chrome.'); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map(x => x[0].transcript).join(' ');
      onTranscript(transcript);
      const { found } = detectFillerWords(transcript);
      const detected = Object.entries(found).filter(([,c]) => c > 0).map(([w]) => w);
      setLiveFillers(detected);
    };
    r.onend = () => setRecording(false);
    r.start();
    recRef.current = r;
    setRecording(true);
    setLiveFillers([]);
  };

  const stop = () => {
    if (recRef.current) recRef.current.stop();
    setRecording(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Waveform active={recording} />
      {recording ? (
        <button onClick={stop} style={{
          background: 'var(--danger-dim)', border: '1px solid var(--danger)',
          color: 'var(--danger)', borderRadius: 8, padding: '6px 14px',
          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-body)',
        }}>
          <span style={{ animation: 'pulse 1s infinite', fontSize: 10 }}>●</span> Stop
        </button>
      ) : (
        <button onClick={start} style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', borderRadius: 8, padding: '6px 14px',
          fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          🎤 Voice
        </button>
      )}
      {recording && liveFillers.length > 0 && (
        <div style={{
          display: 'flex', gap: 4, alignItems: 'center',
          background: 'var(--warning-dim)', borderRadius: 8,
          padding: '4px 10px', border: '1px solid var(--warning)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>⚠ fillers:</span>
          {liveFillers.slice(0, 3).map(w => (
            <span key={w} style={{ fontSize: 10, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>"{w}"</span>
          ))}
        </div>
      )}
    </div>
  );
}
