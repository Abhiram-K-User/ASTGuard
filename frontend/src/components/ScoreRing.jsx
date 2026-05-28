import { useEffect, useRef, useState } from 'react';
import { VERDICTS } from '../constants';

const CIRCUMFERENCE = 2 * Math.PI * 68; // r = 68

/**
 * ScoreRing — Animated SVG radial progress ring.
 *
 * Props:
 *   score   : number   — 0‒100
 *   verdict : string   — 'Safe' | 'Suspicious' | 'Blatant'
 */
export default function ScoreRing({ score, verdict }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);

  const color = VERDICTS[verdict]?.color ?? '#6366f1';

  // Animate the counter number
  useEffect(() => {
    let start = null;
    const duration = 1200;
    const target = score;

    const step = (ts) => {
      if (!start) start = ts;
      const elapsed  = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    setDisplayed(0);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <div className="score-ring-container">
      {/* Pulse ring */}
      <div
        className="score-pulse"
        style={{ borderColor: color }}
      />

      {/* SVG Ring */}
      <svg
        className="score-ring-svg"
        viewBox="0 0 160 160"
        aria-hidden="true"
      >
        <circle className="score-ring-bg" cx="80" cy="80" r="68" />
        <circle
          className="score-ring-progress"
          cx="80"
          cy="80"
          r="68"
          stroke={color}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>

      {/* Center text */}
      <div className="score-ring-center">
        <span className="score-number" style={{ color }}>
          {displayed}
        </span>
        <span className="score-pct" style={{ color }}>%</span>
        <span className="score-sub">Similarity</span>
      </div>
    </div>
  );
}
