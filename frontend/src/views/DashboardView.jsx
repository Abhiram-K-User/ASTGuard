/**
 * DashboardView — Monaco editors + comparison highlighting
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Play, Loader2, AlertTriangle, BarChart3, GitMerge, Hash, TrendingUp, BarChart2, GitBranch, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import StructuralDiff       from '../components/ast/StructuralDiff';
import CollisionMap         from '../components/ast/CollisionMap';
import SemanticVerdictPanel from '../components/SemanticVerdictPanel';
import ComplexityDashboard  from '../components/ComplexityDashboard';
import ScoreRing            from '../components/ScoreRing';
import ASTVisualizer        from '../components/ast/ASTVisualizer';
import { compareCode }      from '../services/api';
import { PLACEHOLDER_A, PLACEHOLDER_B, TEMPLATES } from '../constants';

/* ── Verdict palette ─────────────────────────────────────────────────── */
const VC = {
  Safe:       { color:'#059669', label:'Structurally Distinct' },
  Suspicious: { color:'#D97706', label:'Notable Structural Overlap' },
  Blatant:    { color:'#DC2626', label:'Near-Identical Structure' },
};

const TABS = [
  { key:'verdict',    label:'Verdict Report',  icon:BarChart2  },
  { key:'diff',       label:'Struct Diff', icon:GitMerge },
  { key:'hash',       label:'Hash Map',    icon:Hash     },
  { key:'complexity', label:'Complexity',  icon:TrendingUp },
];

const EDITOR_FONT_FAMILY = "'Fira Code', Consolas, 'Courier New', monospace";

/* ── Monaco theme registration (once) ───────────────────────────────── */
let _themesReady = false;
function registerThemes(monaco) {
  if (_themesReady) return;
  _themesReady = true;

  monaco.editor.defineTheme('sg-dark', {
    base:'vs-dark', inherit:true,
    rules:[
      { token:'keyword',   foreground:'D4D4D4', fontStyle:'bold' },
      { token:'keyword.control', foreground:'FFFFFF', fontStyle:'bold' },
      { token:'string',    foreground:'A3A3A3' },
      { token:'comment',   foreground:'737373', fontStyle:'italic' },
      { token:'number',    foreground:'A3A3A3' },
      { token:'operator',  foreground:'737373' },
      { token:'type',      foreground:'D4D4D4' },
      { token:'identifier',foreground:'F5F5F5' },
    ],
    colors:{
      'editor.background':'#0A0A0A',
      'editor.foreground':'#F5F5F5',
      'editor.lineHighlightBackground':'#111111',
      'editor.selectionBackground':'#262626',
      'editor.inactiveSelectionBackground':'#262626',
      'editorLineNumber.foreground':'#525252',
      'editorLineNumber.activeForeground':'#A3A3A3',
      'editorCursor.foreground':'#FFFFFF',
      'editorIndentGuide.background':'#111111',
      'editorIndentGuide.activeBackground':'#262626',
      'scrollbar.shadow':'#00000000',
    }
  });

  monaco.editor.defineTheme('sg-light', {
    base:'vs', inherit:true,
    rules:[
      { token:'keyword',   foreground:'374151', fontStyle:'bold' },
      { token:'keyword.control', foreground:'111827', fontStyle:'bold' },
      { token:'string',    foreground:'6B7280' },
      { token:'comment',   foreground:'9CA3AF', fontStyle:'italic' },
      { token:'number',    foreground:'6B7280' },
      { token:'operator',  foreground:'9CA3AF' },
      { token:'type',      foreground:'374151' },
    ],
    colors:{
      'editor.background':'#FFFFFF',
      'editor.foreground':'#111827',
      'editor.lineHighlightBackground':'#F9FAFB',
      'editor.selectionBackground':'#E5E7EB',
      'editor.inactiveSelectionBackground':'#E5E7EB',
      'editorLineNumber.foreground':'#9CA3AF',
      'editorLineNumber.activeForeground':'#4B5563',
      'editorCursor.foreground':'#111827',
    }
  });
}

/* ── Line comparison logic ───────────────────────────────────────────── */
function normalizeStructure(line) {
  return line.trim()
    .replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, 'X')
    .replace(/\d+(\.\d+)?/g, 'N')
    .replace(/["'`][^"'`]*["'`]/g, 'S')
    .replace(/\s+/g, ' ');
}

function computeDecorations(codeA, codeB) {
  const linesA = codeA.split('\n');
  const linesB = codeB.split('\n');
  const decA = [], decB = [];
  const usedA = new Set(), usedB = new Set();

  linesA.forEach((la, ia) => {
    const ta = la.trim();
    if (!ta) return;
    linesB.forEach((lb, ib) => {
      const tb = lb.trim();
      if (!tb || usedA.has(ia) || usedB.has(ib)) return;
      if (ta === tb) {
        decA.push({ line: ia + 1, type: 'exact' });
        decB.push({ line: ib + 1, type: 'exact' });
        usedA.add(ia); usedB.add(ib);
      } else {
        const sa = normalizeStructure(ta), sb = normalizeStructure(tb);
        if (sa === sb && sa.length > 4) {
          // Same structure, different names → renamed
          decA.push({ line: ia + 1, type: 'renamed' });
          decB.push({ line: ib + 1, type: 'renamed' });
          usedA.add(ia); usedB.add(ib);
        }
      }
    });
  });

  // Token-based structural match from lines not yet matched
  linesA.forEach((la, ia) => {
    if (usedA.has(ia) || !la.trim()) return;
    const sa = normalizeStructure(la);
    linesB.forEach((lb, ib) => {
      if (usedB.has(ib) || !lb.trim() || usedA.has(ia)) return;
      const sb = normalizeStructure(lb);
      if (sa.length > 6 && sa.slice(0, Math.floor(sa.length * 0.7)) === sb.slice(0, Math.floor(sb.length * 0.7))) {
        decA.push({ line: ia + 1, type: 'structural' });
        decB.push({ line: ib + 1, type: 'structural' });
        usedA.add(ia); usedB.add(ib);
      }
    });
  });

  return { decA, decB };
}

/* ── Monaco Editor Pane ──────────────────────────────────────────────── */
function MonacoEditorPane({ label, value, onChange, error, decorations, isDark, language }) {
  const editorRef   = useRef(null);
  const monacoRef   = useRef(null);
  const decoIdsRef  = useRef([]);

  function syncEditorMetrics() {
    if (!editorRef.current || !monacoRef.current) return;
    monacoRef.current.editor.remeasureFonts();
    editorRef.current.layout();
  }

  function applyDecorations() {
    if (!editorRef.current || !monacoRef.current || !decorations?.length) {
      if (editorRef.current) decoIdsRef.current = editorRef.current.deltaDecorations(decoIdsRef.current, []);
      return;
    }
    const M = monacoRef.current;
    const newDecs = decorations.map(d => ({
      range: new M.Range(d.line, 1, d.line, 999),
      options: {
        isWholeLine: true,
        className: `line-${d.type}`,
        overviewRuler: {
          color: d.type === 'exact' ? '#DC2626' : d.type === 'renamed' ? '#2563EB' : '#D97706',
          position: 1,
        },
      },
    }));
    decoIdsRef.current = editorRef.current.deltaDecorations(decoIdsRef.current, newDecs);
  }

  useEffect(() => { applyDecorations(); }, [decorations]);

  useEffect(() => {
    syncEditorMetrics();
  }, [isDark]);

  useEffect(() => {
    const onResize = () => syncEditorMetrics();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      style={{
        display:'flex', flexDirection:'column', flex:1,
        borderRadius:'var(--radius-lg)',
        border: '1px solid var(--card-border)',
        overflow:'hidden',
        background: 'var(--card-bg)'
      }}
    >
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:'8px',
        padding:'10px 16px',
        background:'var(--card-header-bg)',
        borderBottom:'1px solid var(--card-border)',
      }}>
        <span style={{ fontFamily:'var(--font-sans)', fontSize:'12px', fontWeight:600, color:'var(--text-secondary)' }}>
          {label}
        </span>
        {decorations?.length > 0 && (
          <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-muted)' }}>
            {decorations.filter(d=>d.type==='exact').length} exact · {decorations.filter(d=>d.type==='renamed').length} renamed · {decorations.filter(d=>d.type==='structural').length} similar
          </span>
        )}
      </div>

      {/* Monaco */}
      <div style={{ flex:1, position:'relative' }}>
        <Editor
          height="320px"
          language={language}
          value={value}
          onChange={v => onChange(v || '')}
          theme={isDark ? 'sg-dark' : 'sg-light'}
          beforeMount={registerThemes}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            syncEditorMetrics();

            if (document.fonts?.ready) {
              document.fonts.ready.then(() => {
                syncEditorMetrics();
              });
            }

            applyDecorations();
          }}
          options={{
            fontSize:13, lineHeight:22,
            minimap:{ enabled:false },
            scrollBeyondLastLine:false,
            lineNumbers:'on',
            glyphMargin:false, folding:false,
            renderLineHighlight:'all',
            padding:{ top:16, bottom:16 },
            overviewRulerLanes:2,
            scrollbar:{ verticalScrollbarSize:8, horizontalScrollbarSize:8 },
            wordWrap:'off',
            contextmenu:false,
            fontFamily:EDITOR_FONT_FAMILY,
            fontWeight:'400',
            fontLigatures:false,
          }}
        />
      </div>

      {error && (
        <div style={{ padding:'8px 16px', background:'#FEF2F2', borderTop:'1px solid #FEE2E2', fontSize:'12px', color:'#DC2626', display:'flex', gap:'6px', alignItems:'center' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}
    </div>
  );
}

/* ── StatList ────────────────────────────────────────────────────────── */
function StatList({ stats }) {
  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px' }}>
      {stats.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--text-muted)' }}>{label}</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:500, color:'var(--text-primary)' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────── */
export default function DashboardView({ globalTab = 'analyze' }) {
  const { isDark } = useTheme();

  const [language, setLanguage] = useState('python');
  const [codeA, setCodeA] = useState(PLACEHOLDER_A);
  const [codeB, setCodeB] = useState(PLACEHOLDER_B);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('verdict');
  const [decA, setDecA] = useState([]);
  const [decB, setDecB] = useState([]);
  const [visualizeTarget, setVisualizeTarget] = useState('A');

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setResult(null);
    setDecA([]);
    setDecB([]);
    const template = TEMPLATES[lang];
    if (template) {
      setCodeA(template.code_a);
      setCodeB(template.code_b);
    }
  };

  const handleAnalyze = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await compareCode(codeA, codeB, language);
      setResult(res);
      setActiveTab('verdict');
      const { decA: dA, decB: dB } = computeDecorations(codeA, codeB);
      setDecA(dA); setDecB(dB);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [codeA, codeB, language]);

  const vc = result ? (VC[result.verdict] || VC.Safe) : null;
  const tokensAStr = result?.tokens_a || [];
  const tokensBStr = result?.tokens_b || [];

  if (globalTab === 'visualize') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', flex: 1, paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            AST Visualization
          </h2>
          <div style={{ display: 'flex', background: 'var(--card-bg)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
            <button
              onClick={() => setVisualizeTarget('A')}
              style={{
                padding: '6px 16px',
                border: 'none',
                background: visualizeTarget === 'A' ? 'var(--accent)' : 'transparent',
                color: visualizeTarget === 'A' ? 'var(--app-bg)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: visualizeTarget === 'A' ? 600 : 500,
                transition: 'all var(--t-fast)'
              }}
            >
              Code A
            </button>
            <button
              onClick={() => setVisualizeTarget('B')}
              style={{
                padding: '6px 16px',
                border: 'none',
                background: visualizeTarget === 'B' ? 'var(--accent)' : 'transparent',
                color: visualizeTarget === 'B' ? 'var(--app-bg)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: visualizeTarget === 'B' ? 600 : 500,
                transition: 'all var(--t-fast)'
              }}
            >
              Code B
            </button>
          </div>
        </div>

        {result ? (
          <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 180px)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-elevated)' }}>
            <ASTVisualizer
              tokens={visualizeTarget === 'A' ? (result.tokens_a_detail || []) : (result.tokens_b_detail || [])}
              label={`Code ${visualizeTarget}`}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 180px)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--card-border)', fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
            <GitBranch size={20} strokeWidth={1.5} style={{ marginRight: '12px' }} />
            Run analysis in the Analyze tab to visualize AST
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>

      {/* ── Heading ──────────────────── */}
      <div>
        <h1 style={{
          fontFamily:'var(--font-display)',
          fontSize:'2rem',
          fontWeight:600, letterSpacing:'-0.02em',
          color:'var(--text-primary)',
          margin: 0
        }}>
          Code Plagiarism Detection
        </h1>
        <p style={{
          fontFamily:'var(--font-sans)',
          fontSize:'1rem',
          color:'var(--text-secondary)',
          marginTop:'8px',
          margin: 0
        }}>
          Analyze structural and semantic similarity between code snippets
        </p>
      </div>

      {/* ── Two Monaco editors ───────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', position:'relative' }}>
        <MonacoEditorPane
          label="Code A — Reference"
          value={codeA} onChange={setCodeA}
          error={result?.error_a}
          decorations={decA} isDark={isDark}
          language={language}
        />
        <MonacoEditorPane
          label="Code B — Submission"
          value={codeB} onChange={setCodeB}
          error={result?.error_b}
          decorations={decB} isDark={isDark}
          language={language}
        />
      </div>

      {/* Comparison legend */}
      {decA.length > 0 && (
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', fontSize:'12px', fontFamily:'var(--font-sans)' }}>
          {[
            { color:'#DC2626', label:'Exact Match' },
            { color:'#2563EB', label:'Renamed' },
            { color:'#D97706', label:'Structurally Similar' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display:'flex', alignItems:'center', gap:'6px', color:'var(--text-secondary)' }}>
              <span style={{ width:10, height:10, borderRadius:'2px', background:color, flexShrink:0 }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* ── Run Analysis button & Language dropdown ─────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'10px 20px', borderRadius:'var(--radius-md)',
            border:'1px solid var(--accent)',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'var(--card-header-bg)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : 'var(--app-bg)',
            fontFamily:'var(--font-sans)',
            fontSize:'14px', fontWeight:500,
            transition:'all var(--t-fast)',
          }}
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
            : <><Play size={16} fill="currentColor" /> Run Analysis</>}
        </button>

        <select
          value={language}
          onChange={e => handleLanguageChange(e.target.value)}
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            outline: 'none',
            transition: 'all var(--t-fast)',
          }}
        >
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="c">C</option>
        </select>

        {error && (
          <div style={{ display:'flex', gap:'8px', padding:'10px 16px', borderRadius:'var(--radius-md)',
            border:'1px solid #FEE2E2', background:'#FEF2F2',
            fontFamily:'var(--font-sans)', fontSize:'13px', color:'#DC2626' }}>
            <AlertTriangle size={16} style={{ flexShrink:0 }} /> {error}
          </div>
        )}
      </div>

      {/* ── Analytics row (after result) ────────────────────────────── */}
      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
          
          {/* ── Verdict card ── */}
          <div style={{
              display:'flex', alignItems:'flex-start', gap:'24px', padding:'24px',
              borderRadius:'var(--radius-lg)',
              background:'var(--card-bg)',
              border:'1px solid var(--card-border)',
          }}>
            <ScoreRing score={result.similarity_score} verdict={result.verdict} />

            <div style={{ flex:1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:600, color:vc.color }}>
                  {result.verdict}
                </div>
                <div style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {result.similarity_score.toFixed(1)}% similarity
                </div>
              </div>
              <div style={{ fontFamily:'var(--font-sans)', fontSize:'14px', color:'var(--text-secondary)', marginTop: '4px' }}>
                {vc.label}
              </div>
              
              <StatList stats={[
                { label: 'LCS Bigrams', value: result.lcs_length },
                { label: 'DP Table Size', value: result.dp_table_size },
                { label: 'N-gram Size', value: result.ngram_size },
                { label: 'Time Elapsed', value: `${result.time_ms?.toFixed(1)}ms` }
              ]} />
            </div>
          </div>

          {/* ── Analytics tab panel ── */}
          <div style={{
            borderRadius:'var(--radius-lg)',
            overflow:'hidden',
            background:'var(--card-bg)',
            border:'1px solid var(--card-border)',
          }}>
            {/* Tab bar */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--card-border)', background:'var(--card-header-bg)' }}>
              {TABS.map(({ key, label, icon:Icon }) => {
                const active = activeTab === key;
                return (
                  <button key={key} onClick={() => setActiveTab(key)} style={{
                    flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    padding:'12px 16px', border:'none',
                    borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                    background:'transparent', cursor:'pointer',
                    fontFamily:'var(--font-sans)', fontSize:'13px', fontWeight:500,
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition:'all var(--t-fast)', whiteSpace:'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color='var(--text-secondary)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color='var(--text-muted)'; }}
                  >
                    <Icon size={14}/>{label}
                  </button>
                );
              })}
            </div>

            <div style={{ padding:'24px' }}>
                {activeTab==='verdict'    && <SemanticVerdictPanel result={result}/>}
                {activeTab==='diff'       && <StructuralDiff tokensA={tokensAStr} tokensB={tokensBStr} commonTokens={result.common_tokens||[]} labelA="Code A" labelB="Code B"/>}
                {activeTab==='hash'       && <CollisionMap tokensA={tokensAStr} tokensB={tokensBStr} windowSize={3}/>}
                {activeTab==='complexity' && <ComplexityDashboard result={result}/>}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder */}
      {!result && !loading && (
        <div style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:'12px',
            padding:'48px', borderRadius:'var(--radius-lg)',
            border:'1px dashed var(--card-border)', fontFamily:'var(--font-sans)', fontSize:'14px', color:'var(--text-muted)',
            background: 'var(--card-bg)'
          }}>
          <BarChart3 size={20} strokeWidth={1.5} />
          Run analysis to see algorithmic insights
        </div>
      )}
    </div>
  );
}
