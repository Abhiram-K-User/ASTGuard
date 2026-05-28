/**
 * StructuralDiff — Token classification panel
 * Match (≡): token is in the LCS common sequence
 * Novel (∅): token appears in only one sequence
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Equal, Plus, GitMerge } from 'lucide-react';

const CLS = {
  match: { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.35)', color: '#4ade80', label: '≡ Match' },
  novel: { bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', color: '#f87171', label: '∅ Novel' },
};

function classifyTokens(tokensA, tokensB, commonTokens) {
  const commonSet = new Set(commonTokens);
  const classify = t => commonSet.has(t) ? 'match' : 'novel';
  return {
    classified_a: tokensA.map(t => ({ token: t, cls: classify(t) })),
    classified_b: tokensB.map(t => ({ token: t, cls: classify(t) })),
  };
}

function TokenChip({ token, cls, delay = 0 }) {
  const s = CLS[cls] || CLS.novel;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, delay }}
      title={s.label}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px', fontWeight: 600,
        padding: '2px 7px', borderRadius: '4px',
        border: `1px solid ${s.border}`,
        background: s.bg, color: s.color,
        cursor: 'default', margin: '2px', whiteSpace: 'nowrap',
      }}
    >
      {token}
    </motion.span>
  );
}

function Column({ label, tokens, dotColor }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '9px 13px',
        borderBottom: '1px solid var(--card-border)',
        background: 'var(--card-header-bg)',
        transition: 'background var(--t-slow), border-color var(--t-slow)',
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor, boxShadow: `0 0 6px ${dotColor}`,
        }} />
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
          transition: 'color var(--t-slow)',
        }}>
          {label}
        </span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'var(--text-dim)', transition: 'color var(--t-slow)',
        }}>
          {tokens.length}
        </span>
      </div>
      <div style={{
        padding: '10px', maxHeight: '200px', overflowY: 'auto',
        display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start',
      }}>
        {tokens.map(({ token, cls }, i) => (
          <TokenChip key={i} token={token} cls={cls} delay={i * 0.006} />
        ))}
      </div>
    </div>
  );
}

export default function StructuralDiff({ tokensA = [], tokensB = [], commonTokens = [], labelA = 'Code A', labelB = 'Code B' }) {
  const { classified_a, classified_b } = useMemo(
    () => classifyTokens(tokensA, tokensB, commonTokens),
    [tokensA, tokensB, commonTokens],
  );
  const matchCount = classified_a.filter(t => t.cls === 'match').length;

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
      }}>
        <GitMerge size={13} color="#8b5cf6" />
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
          transition: 'color var(--t-slow)',
        }}>
          Structural Diff — Token Classification
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#4ade80' }}>
            <Equal size={10} /> {matchCount}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#f87171' }}>
            <Plus size={10} /> {classified_a.length - matchCount}
          </span>
        </div>
      </div>

      {/* Two columns */}
      <div
        className="glass"
        style={{
          display: 'flex',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          transition: 'background var(--t-slow), border-color var(--t-slow)',
        }}
      >
        <Column label={labelA} tokens={classified_a} dotColor="#8b5cf6" />
        <div style={{ width: 1, background: 'var(--card-border)', flexShrink: 0, transition: 'background var(--t-slow)' }} />
        <Column label={labelB} tokens={classified_b} dotColor="#06b6d4" />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
        {Object.entries(CLS).map(([k, v]) => (
          <span key={k} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '10px', color: v.color, fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '2px', background: v.bg, border: `1px solid ${v.border}` }} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}
