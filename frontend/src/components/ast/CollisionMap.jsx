/**
 * CollisionMap — Rabin-Karp hash collision visualization
 * Bar chart showing structural fingerprint matches between two code submissions.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import { Hash } from 'lucide-react';
import { rollingHashes, buildCollisionMap } from '../../lib/daa/rabinKarpHash';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px',
      fontFamily: 'var(--font-mono)', fontSize: '11px',
      transition: 'background var(--t-slow)',
    }}>
      <div style={{ color: '#8b5cf6', fontWeight: 700, marginBottom: '4px' }}>
        Hash: {d?.label}
      </div>
      <div style={{ color: 'var(--text-secondary)', transition: 'color var(--t-slow)' }}>
        Code A: {d?.groupA?.length ?? 0} windows<br />
        Code B: {d?.groupB?.length ?? 0} windows<br />
        Total: {d?.size ?? 0}
      </div>
    </div>
  );
};

export default function CollisionMap({ tokensA = [], tokensB = [], windowSize = 3 }) {
  const collisions = useMemo(() => {
    if (tokensA.length < windowSize || tokensB.length < windowSize) return [];
    const hA = rollingHashes(tokensA, windowSize);
    const hB = rollingHashes(tokensB, windowSize);
    return buildCollisionMap(hA, hB).slice(0, 20);
  }, [tokensA, tokensB, windowSize]);

  const chartData = collisions.map(c => ({
    ...c, codeA: c.groupA.length, codeB: c.groupB.length,
  }));

  const axTick = {
    fill: 'var(--text-muted)', fontSize: 9,
    fontFamily: 'var(--font-mono, monospace)',
  };

  if (collisions.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '160px', gap: '10px',
        color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', fontSize: '12px',
        transition: 'color var(--t-slow)',
      }}>
        <Hash size={28} strokeWidth={1} />
        No hash collisions detected — sequences too short or fully unique.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
        <Hash size={12} color="#8b5cf6" />
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
          transition: 'color var(--t-slow)',
        }}>
          Rolling Hash Collision Map — Window size {windowSize}
        </span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8b5cf6',
        }}>
          {collisions.length} collision{collisions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barGap={4} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
          <XAxis dataKey="label" tick={axTick} axisLine={false} tickLine={false}
            angle={-30} textAnchor="end" height={40} />
          <YAxis tick={axTick} axisLine={false} tickLine={false} width={26} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--card-border)' }} />
          <Bar dataKey="codeA" radius={[3,3,0,0]} maxBarSize={26}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={`rgba(139,92,246,${0.5 + (i / chartData.length) * 0.4})`} />
            ))}
          </Bar>
          <Bar dataKey="codeB" radius={[3,3,0,0]} maxBarSize={26}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={`rgba(6,182,212,${0.4 + (i / chartData.length) * 0.4})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '4px' }}>
        {[
          { color: 'rgba(139,92,246,0.7)', label: 'Code A windows', text: '#a78bfa' },
          { color: 'rgba(6,182,212,0.7)',  label: 'Code B windows', text: '#22d3ee' },
        ].map(({ color, label, text }) => (
          <span key={label} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '10px', color: text, fontFamily: 'var(--font-sans)',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
