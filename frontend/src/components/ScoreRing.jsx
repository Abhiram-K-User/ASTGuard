/**
 * ScoreRing — Animated SVG Sørensen-Dice similarity meter
 */

import { motion } from 'framer-motion';

const R    = 68;
const CIRC = 2 * Math.PI * R;

function verdictColor(score) {
  if (score >= 78) return '#DC2626'; // Red-600
  if (score >= 30) return '#D97706'; // Amber-600
  return '#059669'; // Emerald-600
}

export default function ScoreRing({ score = 0 }) {
  const color  = verdictColor(score);
  const offset = CIRC * (1 - score / 100);

  return (
    <div style={{ position: 'relative', width: 148, height: 148, flexShrink: 0 }}>
      <svg width="148" height="148" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="74" cy="74" r={R}
          fill="none"
          stroke="var(--card-border)"
          strokeWidth="8"
        />
        <motion.circle
          cx="74" cy="74" r={R}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
        />
      </svg>

      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.75rem', fontWeight: 600,
            color, letterSpacing: '-1px', lineHeight: 1,
          }}
        >
          {Math.round(score)}<span style={{ fontSize: '1rem', fontWeight: 500 }}>%</span>
        </motion.div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.65rem', fontWeight: 600,
          color: 'var(--text-muted)',
          marginTop: '4px',
          transition: 'color var(--t-slow)',
        }}>
          Similarity
        </div>
      </div>
    </div>
  );
}
