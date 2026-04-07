import { Badge, S } from './shared';
import { ROLES, ALL_ROLES } from '../utils/questions';

export default function QuestionCard({ question, idx, total, role }) {
  const meta = ALL_ROLES[role] || ROLES[role];
  const diffColor = question.diff === 'Hard' ? 'var(--danger)' : question.diff === 'Medium' ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '28px', animation: 'fadeUp .4s ease',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <Badge text={question.cat} color="var(--accent-a)" />
        <Badge text={question.diff} color={diffColor} />
        <Badge text={`Q${idx + 1} of ${total}`} />
      </div>
      <p style={{
        fontSize: 'clamp(15px, 2.2vw, 18px)', lineHeight: 1.75,
        color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 400,
      }}>
        {question.q}
      </p>
    </div>
  );
}
