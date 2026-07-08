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
import { useTheme } from '../../context/ThemeContext';


/* ── Node type → display config ─────────────────────────────────────── */
const NODE_CONFIG = {
  // Statements
  FunctionDef:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  label: 'def'       },
  AsyncFunctionDef: { color: '#6d28d9', bg: 'rgba(109,40,217,0.12)',  label: 'async def' },
  ClassDef:         { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   label: 'class'     },
  For:              { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'for'       },
  AsyncFor:         { color: '#d97706', bg: 'rgba(217,119,6,0.12)',   label: 'async for' },
  While:            { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'while'     },
  If:               { color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  label: 'if'        },
  With:             { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'with'      },
  AsyncWith:        { color: '#4f46e5', bg: 'rgba(79,70,229,0.12)',   label: 'async with'},
  Match:            { color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  label: 'match'     },
  Try:              { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'try'       },
  TryStar:          { color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   label: 'try*'      },
  ExceptHandler:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'except'    },
  Return:           { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'return'    },
  Raise:            { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'raise'     },
  Delete:           { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',  label: 'del'       },
  Assign:           { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: '='         },
  AugAssign:        { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: 'op='       },
  AnnAssign:        { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: 'type ='    },
  Import:           { color: '#84cc16', bg: 'rgba(132,204,22,0.12)',  label: 'import'    },
  ImportFrom:       { color: '#84cc16', bg: 'rgba(132,204,22,0.12)',  label: 'from'      },
  Global:           { color: '#4b5563', bg: 'rgba(75,85,99,0.08)',    label: 'global'    },
  Nonlocal:         { color: '#4b5563', bg: 'rgba(75,85,99,0.08)',    label: 'nonlocal'  },
  Pass:             { color: '#9ca3af', bg: 'rgba(156,163,175,0.06)',  label: 'pass'      },
  Break:            { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   label: 'break'     },
  Continue:         { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)',  label: 'continue'  },

  // Expressions & Operators
  BoolOp:           { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  label: 'boolop'    },
  BinOp:            { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  label: 'binop'     },
  UnaryOp:          { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  label: 'unaryop'   },
  Compare:          { color: '#f472b6', bg: 'rgba(244,114,182,0.08)', label: 'cmp'       },
  Call:             { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  label: 'call()'    },
  Lambda:           { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'lambda'    },
  IfExp:            { color: '#ec4899', bg: 'rgba(236,72,153,0.08)',  label: 'inline-if' },
  
  // Data Structures & Comprehensions
  Dict:             { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'dict'      },
  Set:              { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'set'       },
  List:             { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'list'      },
  Tuple:            { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'tuple'     },
  ListComp:         { color: '#059669', bg: 'rgba(5,150,105,0.12)',   label: 'list-comp' },
  SetComp:          { color: '#059669', bg: 'rgba(5,150,105,0.12)',   label: 'set-comp'  },
  DictComp:         { color: '#059669', bg: 'rgba(5,150,105,0.12)',   label: 'dict-comp' },
  GeneratorExp:     { color: '#059669', bg: 'rgba(5,150,105,0.12)',   label: 'gen-exp'   },
  
  // Other Nodes
  Attribute:        { color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', label: '.attr'     },
  Subscript:        { color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', label: '[sub]'     },
  Starred:          { color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', label: '*'        },
  JoinedStr:        { color: '#a3a3a3', bg: 'rgba(163,163,163,0.08)', label: 'f-str'     },
};

const DEFAULT_NODE = { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: null };

/**
 * Build React-Flow nodes and edges from a flat pre-order token sequence.
 * Uses a heuristic block-nesting parser and centered tree-layout algorithm
 * to construct a readable vertical graph representation of the program AST.
 */
function buildFlowGraph(tokens, highlightedIndex = -1) {
  if (!tokens || tokens.length === 0) return { nodes: [], edges: [] };

  const BLOCK_STARTS = new Set([
    'FunctionDef', 'AsyncFunctionDef', 'ClassDef',
    'For', 'AsyncFor', 'While', 'If', 'With', 'AsyncWith',
    'Try', 'TryStar', 'ExceptHandler', 'Match'
  ]);

  const TERMINATORS = new Set([
    'Return', 'Break', 'Continue', 'Pass', 'Raise'
  ]);

  // Create tree node objects from flat token stream
  const treeNodes = tokens.map((tok, i) => {
    const type = typeof tok === 'string' ? tok : tok.token;
    const lineno = typeof tok === 'object' ? tok.lineno : null;
    return {
      id: i,
      type,
      lineno,
      children: [],
      parent: null,
      x: 0,
      y: 0
    };
  });

  // Reconstruct tree structure using stack-based nesting heuristic
  const stack = [];
  treeNodes.forEach((node) => {
    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      node.parent = parent;
      parent.children.push(node);
    }

    const baseType = node.type.split('(')[0];
    if (BLOCK_STARTS.has(baseType)) {
      stack.push(node);
    } else if (TERMINATORS.has(baseType)) {
      stack.pop();
    }
  });

  // Centered tree-layout coordinates generator
  const LEVEL_HEIGHT = 80;
  const NODE_SPACING = 110;

  function layoutTree(node, depth = 0, leftBoundary = 0) {
    node.y = depth * LEVEL_HEIGHT;

    if (node.children.length === 0) {
      node.x = leftBoundary;
      return leftBoundary + NODE_SPACING;
    }

    let currentLeft = leftBoundary;
    const childXPositions = [];

    node.children.forEach(child => {
      currentLeft = layoutTree(child, depth + 1, currentLeft);
      childXPositions.push(child.x);
    });

    const minChildX = childXPositions[0];
    const maxChildX = childXPositions[childXPositions.length - 1];
    node.x = (minChildX + maxChildX) / 2;

    return Math.max(currentLeft, node.x + NODE_SPACING);
  }

  // Compute layout coordinates for all subtrees (top-level statements with no parent)
  let currentLeft = 0;
  treeNodes.forEach(node => {
    if (!node.parent) {
      currentLeft = layoutTree(node, 0, currentLeft);
    }
  });

  // Convert structured tree into React Flow nodes and edges
  const nodes = [];
  const edges = [];

  treeNodes.forEach((node) => {
    const isHighlighted = node.id === highlightedIndex;
    const baseType = node.type.split('(')[0];
    const cfg = NODE_CONFIG[baseType] || DEFAULT_NODE;

    // Parse operator details if present (e.g., "Compare(<)" -> "cmp(<)")
    const matches = node.type.match(/\(([^)]+)\)/);
    const opVal = matches ? matches[1] : null;
    const labelText = cfg.label ? (opVal ? `${cfg.label}(${opVal})` : cfg.label) : node.type;

    nodes.push({
      id: `n-${node.id}`,
      position: { x: node.x, y: node.y },
      data: {
        label: (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            fontWeight: 600,
            color: cfg.color,
            padding: '3px 5px',
            lineHeight: 1.2,
          }}>
            <div style={{ fontSize: '7px', color: 'var(--text-muted)', marginBottom: '1px' }}>
              {`#${node.id}`}{node.lineno ? ` L${node.lineno}` : ''}
            </div>
            {labelText}
          </div>
        ),
      },
      style: {
        background: isHighlighted ? `${cfg.color}25` : cfg.bg,
        border: `1px solid ${isHighlighted ? cfg.color : `${cfg.color}40`}`,
        borderRadius: '6px',
        width: '90px',
        boxShadow: isHighlighted ? `0 0 10px ${cfg.color}60` : 'none',
        transition: 'all 0.18s ease',
      },
    });

    if (node.parent) {
      edges.push({
        id: `e-${node.parent.id}-${node.id}`,
        source: `n-${node.parent.id}`,
        target: `n-${node.id}`,
        animated: isHighlighted,
        style: { stroke: cfg.color + '40', strokeWidth: 1.2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: cfg.color + '40', size: 10 },
      });
    }
  });

  return { nodes, edges };
}

/**
 * ASTVisualizer component — renders a React-Flow graph of the AST token stream.
 */
export default function ASTVisualizer({ tokens = [], label = 'Code', highlightedToken = -1 }) {
  const { isDark } = useTheme();
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
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'var(--text-muted)',
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
    <div style={{ flex: 1, width: '100%', position: 'relative' }}>
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
          color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
        />
        <Controls
          style={{
            background: isDark ? '#111' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: '8px',
          }}
        />
        <MiniMap
          style={{
            background: isDark ? '#0a0a0a' : '#fafafa',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          }}
          nodeColor={n => n.style?.border?.split(' ')[2] || '#333'}
          maskColor={isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)"}
        />
      </ReactFlow>
    </div>
  );
}
