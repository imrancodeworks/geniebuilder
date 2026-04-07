import { useState } from 'react';
import { ScoreRing, Badge, S } from './shared';
import { getColor } from '../utils/analysis';

export default function FeedbackCard({ feedback, idx, total, onNext, isAI = true }) {
  const [showModel, setShowModel] = useState(false);
  const filler = feedback.filler_words || { found: {}, total: 0, penalty: 0 };
  const fillerEntries = Object.entries(filler.found || {}).filter(([, c]) => c > 0);

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1.5px solid ${getColor(feedback.score)}40`,
      borderRadius: 16, padding: '26px', animation: 'fadeUp .5s ease',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><div style={S.label}>{isAI ? 'AI Evaluation' : 'Smart Evaluation'}</div><span style={{ fontSize: 9, background: isAI ? 'var(--accent-b-dim)' : 'var(--success-dim)', color: isAI ? 'var(--accent-b)' : 'var(--success)', border: `1px solid ${isAI ? 'var(--accent-b)' : 'var(--success)'}30`, borderRadius: 10, padding: '1px 7px', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>{isAI ? '🤖 AI' : '⚡ Smart'}</span></div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: getColor(feedback.score),
            fontFamily: 'var(--font-display)',
          }}>{feedback.verdict}</div>
        </div>
        <ScoreRing score={feedback.score} size={100} />
      </div>

      {/* Filler word alert */}
      {filler.total > 0 && (
        <div style={{
          background: 'var(--warning-dim)', border: '1px solid var(--warning)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>🗣️</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>
              Filler Words Detected — -{filler.penalty} score penalty
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {fillerEntries.map(([w, c]) => (
                <span key={w} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--warning)',
                  borderRadius: 4, padding: '1px 8px', fontSize: 11, color: 'var(--warning)',
                  fontFamily: 'var(--font-mono)',
                }}>"{w}" ×{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{
          background: 'var(--success-dim)', borderRadius: 10, padding: '14px',
          border: '1px solid var(--success)30',
        }}>
          <div style={{ fontSize: 10, color: 'var(--success)', letterSpacing: 2, marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            ✓ STRENGTHS
          </div>
          {feedback.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.55 }}>• {s}</div>
          ))}
        </div>
        <div style={{
          background: 'var(--warning-dim)', borderRadius: 10, padding: '14px',
          border: '1px solid var(--warning)30',
        }}>
          <div style={{ fontSize: 10, color: 'var(--warning)', letterSpacing: 2, marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            ↑ IMPROVE
          </div>
          {feedback.improvements.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.55 }}>• {s}</div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div style={{
        background: 'var(--accent-c-dim)', borderRadius: 10, padding: '14px', marginBottom: 14,
        border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 10, color: 'var(--accent-a)', letterSpacing: 2, fontFamily: 'var(--font-mono)' }}>💡 TIP: </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{feedback.tip}</span>
      </div>

      {/* Model Answer */}
      {feedback.model_answer && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setShowModel(v => !v)} style={{
            background: 'var(--accent-a-dim)', border: '1px solid var(--accent-a)',
            color: 'var(--accent-a)', borderRadius: 8, padding: '7px 16px',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all .2s',
          }}>
            {showModel ? '▲ Hide Model Answer' : '▼ Show Model Answer'}
          </button>
          {showModel && (
            <div style={{
              marginTop: 12, background: 'var(--bg-surface)',
              borderRadius: 10, padding: '16px', animation: 'fadeIn .3s ease',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--accent-a)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                MODEL ANSWER
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {feedback.model_answer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      {feedback.keywords_found?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...S.label, marginBottom: 8 }}>Keywords Detected</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {feedback.keywords_found.map(k => <Badge key={k} text={k} color="var(--accent-b)" />)}
          </div>
        </div>
      )}

      {/* Score bars */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[['Communication', feedback.communication_score, 'var(--accent-c)'], ['Technical Depth', feedback.technical_score, 'var(--accent-b)']].map(([l, v, c]) => (
          <div key={l} style={{ flex: 1 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>{l}</div>
            <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${v}%`, background: c, borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{v}/100</div>
          </div>
        ))}
      </div>

      {idx < total - 1 && (
        <div style={{ textAlign: 'right' }}>
          <button onClick={onNext} style={{
            background: 'var(--accent-a)', color: 'var(--bg-card)',
            border: 'none', borderRadius: 9, padding: '11px 24px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Next Question →
          </button>
        </div>
      )}
      {idx >= total - 1 && (
        <div style={{
          textAlign: 'center', color: 'var(--success)',
          fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 2, padding: '8px 0',
        }}>
          ✓ SESSION COMPLETE — CALCULATING RESULTS…
        </div>
      )}
    </div>
  );
}
