/**
 * AlgorithmicVerdictPanel — Structural Verdict Report (FSM state machine)
 * States: idle → thinking → streaming → done
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Cpu, RefreshCw } from 'lucide-react';
import { streamSemanticVerdict } from '../lib/verdict/semanticVerdict';
import { computeTED } from '../lib/daa/treeEditDistance';
import { rollingHashes, buildCollisionMap } from '../lib/daa/rabinKarpHash';

const VC = {
  Safe:       { color: '#22c55e', border: 'rgba(34,197,94,0.2)',  bg: 'rgba(34,197,94,0.06)'  },
  Suspicious: { color: '#f59e0b', border: 'rgba(245,158,11,0.2)', bg: 'rgba(245,158,11,0.06)' },
  Blatant:    { color: '#ef4444', border: 'rgba(239,68,68,0.2)',  bg: 'rgba(239,68,68,0.06)'  },
};

export default function SemanticVerdictPanel({ result }) {
  const [state, setState] = useState('idle');
  const [text, setText]   = useState('');
  const cleanupRef  = useRef(null);
  const containerRef = useRef(null);

  const vc = VC[result?.verdict] || VC['Safe'];

  const { distance: tedDistance } = result
    ? computeTED(result.tokens_a || [], result.tokens_b || [])
    : { distance: 0 };

  const collisionStats = result ? (() => {
    const hA = rollingHashes(result.tokens_a || [], 3);
    const hB = rollingHashes(result.tokens_b || [], 3);
    const collisions = buildCollisionMap(hA, hB);
    const matchCount = collisions.reduce((sum, c) => sum + c.size, 0);
    return { collisions, matchCount };
  })() : { collisions: [], matchCount: 0 };

  function startStream() {
    if (!result) return;
    cleanupRef.current?.();
    setText('');
    setState('thinking');

    const cleanup = streamSemanticVerdict(
      {
        score:       result.similarity_score,
        verdict:     result.verdict,
        lcsLength:   result.lcs_length,
        dpTableSize: result.dp_table_size,
        tedDistance,
        collisions:  collisionStats.matchCount,
        commonTokens: result.common_tokens || [],
      },
      (chunk) => {
        setState('streaming');
        setText(prev => prev + chunk);
        if (containerRef.current)
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
      },
      () => setState('done'),
    );
    cleanupRef.current = cleanup;
  }

  useEffect(() => {
    if (result) startStream();
    return () => cleanupRef.current?.();
  }, [result]);

  if (!result) return null;

  const metrics = [
    { label: 'TED Distance',   value: `${tedDistance} ops` },
    { label: 'Hash Matches', value: collisionStats.matchCount },
    { label: 'LCS Bigrams',    value: result.lcs_length },
    { label: 'DP Table',       value: result.dp_table_size },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 'var(--radius-sm)',
          background: vc.bg, border: `1px solid ${vc.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BarChart2 size={13} color={vc.color} />
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700,
            color: 'var(--text-primary)', transition: 'color var(--t-slow)',
          }}>
            Algorithmic Verdict Report
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px',
            color: 'var(--text-muted)', marginTop: '1px',
            transition: 'color var(--t-slow)',
          }}>
            LCS Bigrams · Tree Edit Distance · Rabin-Karp Hashing
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AnimatePresence mode="wait">
            {state === 'thinking' && (
              <motion.span key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={10} className="animate-spin" /> Computing…
              </motion.span>
            )}
            {state === 'done' && (
              <motion.span key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                style={{
                  fontSize: '10px', color: vc.color, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  border: `1px solid ${vc.border}`, background: vc.bg,
                }}>
                Complete
              </motion.span>
            )}
          </AnimatePresence>
          <button onClick={startStream} title="Re-run" style={{
            width: 26, height: 26, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--card-border)',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', transition: 'all var(--t-fast)',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Metric chips */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px',
      }}>
        {metrics.map(({ label, value }) => (
          <div
            key={label}
            className="glass"
            style={{
              padding: '9px 10px', textAlign: 'center',
              borderRadius: 'var(--radius-md)',
              transition: 'background var(--t-slow), border-color var(--t-slow)',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700,
              color: vc.color,
            }}>
              {value}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: '9px',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginTop: '2px',
              transition: 'color var(--t-slow)',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Streaming text box */}
      <div
        ref={containerRef}
        className="glass"
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${vc.border}`,
          background: vc.bg,
          minHeight: '90px',
          maxHeight: '220px',
          overflowY: 'auto',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          lineHeight: 1.75,
          color: 'var(--text-primary)',
          transition: 'color var(--t-slow)',
        }}
      >
        {state === 'thinking' && !text && (
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: vc.color }}
              />
            ))}
          </div>
        )}
        {text}
        {state === 'streaming' && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{
              display: 'inline-block', width: '2px', height: '14px',
              background: vc.color, marginLeft: '2px', verticalAlign: 'middle',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
