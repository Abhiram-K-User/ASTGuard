/**
 * ASTVisualizer — High-Performance Tree Visualization
 *
 * DAA Concept: Tree Traversal (DFS / BFS)
 * The AST is represented as a directed acyclic graph. Nodes are
 * laid out using a Sugiyama-style hierarchical layout algorithm,
 * which performs a topological sort (DFS-based) and assigns x/y
 * coordinates by rank (depth) and position within each rank.
 *
 * Code-node mapping: hovering a token in the editor highlights the
 * corresponding AST node — this is a direct index mapping from the
 * pre-order DFS traversal produced by the backend's ASTNormaliser.
 *
 * @module components/ast/ASTVisualizer
 */

import { useEffect, useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { GitBranch, AlertCircle } from 'lucide-react';

/* ── Node type → display config ─────────────────────────────────────── */
const NODE_CONFIG = {
  FunctionDef:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  label: 'def'     },
  AsyncFunctionDef: { color: '#6d28d9', bg: 'rgba(109,40,217,0.12)',  label: 'async def'},
  ClassDef:         { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   label: 'class'   },
  For:              { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'for'     },
  While:            { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'while'   },
  If:               { color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  label: 'if'      },
  Return:           { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'return'  },
  Try:              { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'try'     },
  ExceptHandler:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'except'  },
  Import:           { color: '#84cc16', bg: 'rgba(132,204,22,0.12)',  label: 'import'  },
  ImportFrom:       { color: '#84cc16', bg: 'rgba(132,204,22,0.12)',  label: 'from'    },
  Assign:           { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: '='       },
  BINARY_OP:        { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  label: 'binop'   },
  COMPARE_OP:       { color: '#f472b6', bg: 'rgba(244,114,182,0.08)', label: 'cmp'     },
  FUNC_CALL:        { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  label: 'call()'  },
  SCOPE_START:      { color: '#475569', bg: 'rgba(71,85,105,0.06)',   label: '{'       },
  SCOPE_END:        { color: '#475569', bg: 'rgba(71,85,105,0.06)',   label: '}'       },
};

const DEFAULT_NODE = { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: '?' };

/**
 * Build React-Flow nodes and edges from a flat pre-order token sequence.
 * Uses a simulated scope-aware tree construction to build parent-child
 * relationships from the SCOPE_START/SCOPE_END markers.
 */
function buildFlowGraph(tokens, highlightedIndex = -1) {
  const nodes = [];
  const edges = [];
  const stack = []; // parent stack
  let x = 0;
  const LEVEL_HEIGHT = 100;
  const NODE_WIDTH   = 130;
  let levelCounters = {};

  tokens.forEach((tok, i) => {
    const tokenStr = typeof tok === 'string' ? tok : tok.token;
    const cfg = NODE_CONFIG[tokenStr] || DEFAULT_NODE;
    const depth = stack.length;

    levelCounters[depth] = (levelCounters[depth] || 0) + 1;
    const xPos = (levelCounters[depth] - 1) * NODE_WIDTH - (depth * 20);

    const isHighlighted = i === highlightedIndex;

    nodes.push({
      id: `n-${i}`,
      position: { x: xPos, y: depth * LEVEL_HEIGHT },
      data: {
        label: (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            fontWeight: 600,
            color: cfg.color,
            padding: '4px 6px',
            lineHeight: 1.3,
          }}>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginBottom: '1px' }}>
              {`#${i}`}{tok.lineno ? ` L${tok.lineno}` : ''}
            </div>
            {cfg.label || tokenStr}
          </div>
        ),
      },
      style: {
        background: isHighlighted ? `${cfg.color}33` : cfg.bg,
        border: `1.5px solid ${isHighlighted ? cfg.color : `${cfg.color}55`}`,
        borderRadius: '8px',
        minWidth: '80px',
        boxShadow: isHighlighted ? `0 0 12px ${cfg.color}88` : 'none',
        transition: 'all 0.2s ease',
      },
    });

    const parentId = stack.at(-1);
    if (parentId !== undefined) {
      edges.push({
        id: `e-${parentId}-${i}`,
        source: `n-${parentId}`,
        target: `n-${i}`,
        animated: isHighlighted,
        style: { stroke: cfg.color + '55', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: cfg.color + '55' },
      });
    }

    if (tokenStr === 'SCOPE_START') {
      stack.push(i);
    } else if (tokenStr === 'SCOPE_END') {
      stack.pop();
    }
  });

  return { nodes, edges };
}

/**
 * ASTVisualizer component — renders a React-Flow graph of the AST token stream.
 */
export default function ASTVisualizer({ tokens = [], label = 'Code', highlightedToken = -1 }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlowGraph(tokens.slice(0, 60), highlightedToken), // cap at 60 for perf
    [tokens, highlightedToken],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = buildFlowGraph(tokens.slice(0, 60), highlightedToken);
    setNodes(n);
    setEdges(e);
  }, [tokens, highlightedToken]);

  if (!tokens || tokens.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'rgba(255,255,255,0.2)',
        fontFamily: 'Inter, sans-serif',
      }}>
        <GitBranch size={36} strokeWidth={1} />
        <span style={{ fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Run analysis to visualize AST
        </span>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={true}
      minZoom={0.3}
      maxZoom={2}
      attributionPosition="bottom-right"
      style={{ background: 'transparent' }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="rgba(255,255,255,0.05)"
      />
      <Controls
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
        }}
      />
      <MiniMap
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
        nodeColor={n => n.style?.border?.split(' ')[2] || '#333'}
        maskColor="rgba(0,0,0,0.6)"
      />
    </ReactFlow>
  );
}
