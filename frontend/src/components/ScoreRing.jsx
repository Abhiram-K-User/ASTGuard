/**
 * ScoreRing — Animated SVG Sørensen-Dice similarity meter
 */

import { motion } from 'framer-motion';

const R    = 68;
const CIRC = 2 * Math.PI * R;

function verdictColor(score) {
  if (score >= 78) return '#ef4444';
  if (score >= 30) return '#f59e0b';
  return '#22c55e';
}

export default function ScoreRing({ score = 0 }) {
  const color  = verdictColor(score);
  const offset = CIRC * (1 - score / 100);

  return (
    <div style={{ position: 'relative', width: 148, height: 148, flexShrink: 0 }}>
      {/* Glow pulse */}
      <motion.div
        animate={{ scale: [1, 1.07, 1], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: -5,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          opacity: 0.25,
        }}
      />

      <svg width="148" height="148" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="74" cy="74" r={R}
          fill="none"
          stroke="var(--card-border)"
          strokeWidth="9"
        />
        <motion.circle
          cx="74" cy="74" r={R}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.3, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>

      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.9rem', fontWeight: 900,
            color, letterSpacing: '-2px', lineHeight: 1,
          }}
        >
          {Math.round(score)}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}>%</span>
        </motion.div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.58rem', fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginTop: '2px',
          transition: 'color var(--t-slow)',
        }}>
          Similarity
        </div>
      </div>
    </div>
  );
}
