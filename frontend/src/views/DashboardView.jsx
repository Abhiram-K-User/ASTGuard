/**
 * DashboardView — Monaco editors + comparison highlighting + glassmorphic UI
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Play, Loader2, AlertTriangle, BarChart3, GitMerge, Hash, TrendingUp, Brain } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import StructuralDiff       from '../components/ast/StructuralDiff';
import CollisionMap         from '../components/ast/CollisionMap';
import SemanticVerdictPanel from '../components/SemanticVerdictPanel';
import ComplexityDashboard  from '../components/ComplexityDashboard';
import ScoreRing            from '../components/ScoreRing';
import { compareCode }      from '../services/api';
import { PLACEHOLDER_A, PLACEHOLDER_B } from '../constants';

/* ── Verdict palette ─────────────────────────────────────────────────── */
const VC = {
  Safe:       { color:'#22C55E', border:'rgba(34,197,94,0.4)',   bg:'rgba(34,197,94,0.07)',   glow:'rgba(34,197,94,0.15)',  label:'Structurally Distinct' },
  Suspicious: { color:'#F59E0B', border:'rgba(245,158,11,0.45)', bg:'rgba(245,158,11,0.07)',  glow:'rgba(245,158,11,0.15)', label:'Notable Structural Overlap' },
  Blatant:    { color:'#EF4444', border:'rgba(239,68,68,0.45)',  bg:'rgba(239,68,68,0.07)',   glow:'rgba(239,68,68,0.15)',  label:'Near-Identical Structure' },
};

const TABS = [
  { key:'verdict',    label:'AI Verdict',  icon:Brain    },
  { key:'diff',       label:'Struct Diff', icon:GitMerge },
  { key:'hash',       label:'Hash Map',    icon:Hash     },
  { key:'complexity', label:'Complexity',  icon:TrendingUp },
];

/* ── Monaco theme registration (once) ───────────────────────────────── */
let _themesReady = false;
function registerThemes(monaco) {
  if (_themesReady) return;
  _themesReady = true;

  monaco.editor.defineTheme('sg-dark', {
    base:'vs-dark', inherit:true,
    rules:[
      { token:'keyword',   foreground:'14B8A6', fontStyle:'bold' },
      { token:'keyword.control', foreground:'2DD4BF', fontStyle:'bold' },
      { token:'string',    foreground:'5EEAD4' },
      { token:'string.escape', foreground:'F59E0B' },
      { token:'comment',   foreground:'64748B', fontStyle:'italic' },
      { token:'number',    foreground:'F59E0B' },
      { token:'operator',  foreground:'9CA3AF' },
      { token:'type',      foreground:'60A5FA' },
      { token:'identifier',foreground:'F9FAFB' },
      { token:'delimiter', foreground:'94A3B8' },
      { token:'delimiter.parenthesis', foreground:'CBD5E1' },
    ],
    colors:{
      'editor.background':'#0D1117',
      'editor.foreground':'#F9FAFB',
      'editor.lineHighlightBackground':'#1E263180',
      'editor.selectionBackground':'#14B8A633',
      'editor.inactiveSelectionBackground':'#14B8A620',
      'editorLineNumber.foreground':'#2A3441',
      'editorLineNumber.activeForeground':'#2DD4BF',
      'editorCursor.foreground':'#14B8A6',
      'editorIndentGuide.background':'#1E2631',
      'editorIndentGuide.activeBackground':'#2A3441',
      'scrollbar.shadow':'#00000000',
      'scrollbarSlider.background':'#2A344180',
      'scrollbarSlider.hoverBackground':'#3D4F6380',
    }
  });

  monaco.editor.defineTheme('sg-light', {
    base:'vs', inherit:true,
    rules:[
      { token:'keyword',   foreground:'0F766E', fontStyle:'bold' },
      { token:'keyword.control', foreground:'14B8A6', fontStyle:'bold' },
      { token:'string',    foreground:'0E9F8D' },
      { token:'comment',   foreground:'9CA3AF', fontStyle:'italic' },
      { token:'number',    foreground:'B45309' },
      { token:'operator',  foreground:'6B7280' },
      { token:'type',      foreground:'1D4ED8' },
    ],
    colors:{
      'editor.background':'#F5F8F8',
      'editor.foreground':'#111827',
      'editor.lineHighlightBackground':'#E5F0F050',
      'editor.selectionBackground':'#0F766E22',
      'editor.inactiveSelectionBackground':'#0F766E12',
      'editorLineNumber.foreground':'#94A3B8',
      'editorLineNumber.activeForeground':'#0F766E',
      'editorCursor.foreground':'#0F766E',
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
function MonacoEditorPane({ label, value, onChange, accent, error, decorations, isDark, focusClass }) {
  const editorRef   = useRef(null);
  const monacoRef   = useRef(null);
  const decoIdsRef  = useRef([]);
  const [focused, setFocused] = useState(false);

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
          color: d.type === 'exact' ? '#EF4444' : d.type === 'renamed' ? '#3B82F6' : '#F59E0B',
          position: 1,
        },
      },
    }));
    decoIdsRef.current = editorRef.current.deltaDecorations(decoIdsRef.current, newDecs);
  }

  useEffect(() => { applyDecorations(); }, [decorations]);

  return (
    <div
      className="glass"
      style={{
        display:'flex', flexDirection:'column', flex:1,
        borderRadius:'var(--radius-lg)',
        border: focused ? `1px solid ${accent}` : '1px solid var(--card-border)',
        overflow:'hidden',
        transition:'border-color var(--t-mid), box-shadow var(--t-mid)',
        boxShadow: focused ? `0 0 0 2px ${accent}30, 0 0 18px ${accent}18` : 'none',
      }}
    >
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:'8px',
        padding:'8px 12px',
        background:'var(--card-header-bg)',
        backdropFilter:'var(--glass-blur)',
        borderBottom:'1px solid var(--card-border)',
      }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:accent, boxShadow:`0 0 7px ${accent}` }} />
        <span style={{ fontFamily:'var(--font-sans)', fontSize:'10px', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
          {label}
        </span>
        {decorations?.length > 0 && (
          <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-muted)' }}>
            {decorations.filter(d=>d.type==='exact').length} exact · {decorations.filter(d=>d.type==='renamed').length} renamed · {decorations.filter(d=>d.type==='structural').length} similar
          </span>
        )}
      </div>

      {/* Monaco */}
      <div style={{ flex:1, position:'relative' }}>
        <Editor
          height="280px"
          language="python"
          value={value}
          onChange={v => onChange(v || '')}
          theme={isDark ? 'sg-dark' : 'sg-light'}
          beforeMount={registerThemes}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            editor.onDidFocusEditorText(() => setFocused(true));
            editor.onDidBlurEditorText(()  => setFocused(false));
            applyDecorations();
          }}
          options={{
            fontSize:12, lineHeight:20,
            minimap:{ enabled:false },
            scrollBeyondLastLine:false,
            lineNumbers:'on',
            glyphMargin:false, folding:false,
            renderLineHighlight:'all',
            padding:{ top:8, bottom:8 },
            overviewRulerLanes:2,
            scrollbar:{ verticalScrollbarSize:5, horizontalScrollbarSize:5 },
            wordWrap:'off',
            contextmenu:false,
            fontFamily:"'Fira Code', 'JetBrains Mono', monospace",
            fontLigatures:true,
            cursorBlinking:'smooth',
            cursorSmoothCaretAnimation:'on',
          }}
        />
      </div>

      {error && (
        <div style={{ padding:'5px 12px', background:'rgba(239,68,68,0.08)', borderTop:'1px solid rgba(239,68,68,0.25)', fontSize:'10px', color:'#F87171', display:'flex', gap:'5px', alignItems:'center' }}>
          <AlertTriangle size={10} /> {error}
        </div>
      )}
    </div>
  );
}

/* ── StatChip ────────────────────────────────────────────────────────── */
function StatChip({ label, value, color }) {
  return (
    <div className="glass" style={{ padding:'9px 16px', borderRadius:'var(--radius-md)', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'15px', fontWeight:800, color: color || 'var(--accent)', letterSpacing:'-0.5px' }}>{value}</div>
      <div style={{ fontFamily:'var(--font-sans)', fontSize:'9px', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:'2px' }}>{label}</div>
    </div>
  );
}

/* ── Sequential typewriter ───────────────────────────────────────────── */
const LINE1 = 'Code Plagiarism Detection';
const LINE2 = 'Analyze structural and semantic similarity between code snippets';

function useTypewriter(text, speed, active) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]           = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    idxRef.current = 0;
    setDisplayed('');
    setDone(false);
    const id = setInterval(() => {
      idxRef.current += 1;
      setDisplayed(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);

  return { displayed, done };
}

/* ── Main Dashboard ──────────────────────────────────────────────────── */
export default function DashboardView() {
  const { isDark } = useTheme();

  const [codeA, setCodeA] = useState(PLACEHOLDER_A);
  const [codeB, setCodeB] = useState(PLACEHOLDER_B);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('verdict');
  const [decA, setDecA] = useState([]);
  const [decB, setDecB] = useState([]);

  // Sequential typewriter
  const { displayed: heading, done: headingDone } = useTypewriter(LINE1, 52, true);
  const [sub2Active, setSub2Active] = useState(false);
  useEffect(() => {
    if (headingDone) { const t = setTimeout(() => setSub2Active(true), 380); return () => clearTimeout(t); }
  }, [headingDone]);
  const { displayed: subtitle, done: subtitleDone } = useTypewriter(LINE2, 30, sub2Active);

  const handleAnalyze = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await compareCode(codeA, codeB);
      setResult(res);
      setActiveTab('verdict');
      const { decA: dA, decB: dB } = computeDecorations(codeA, codeB);
      setDecA(dA); setDecB(dB);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [codeA, codeB]);

  const vc = result ? (VC[result.verdict] || VC.Safe) : null;
  const tokensAStr = result?.tokens_a || [];
  const tokensBStr = result?.tokens_b || [];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* ── Heading: two-line sequential typewriter ──────────────────── */}
      <div style={{ marginBottom:'0.75rem' }}>
        <h1 style={{
          fontFamily:'var(--font-display)',
          fontSize:'clamp(2rem, 4vw, 3.1rem)',
          fontWeight:700, letterSpacing:'-1px', lineHeight:1.1,
          color:'var(--text-primary)', whiteSpace:'nowrap',
          display:'flex', alignItems:'baseline', gap:'2px',
          transition:'color var(--t-slow)',
        }}>
          {heading}
          {!headingDone && <span className="cursor-blink" style={{ fontWeight:300, color:'var(--accent)', marginLeft:'2px' }}>_</span>}
        </h1>

        <AnimatePresence>
          {sub2Active && (
            <motion.p
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              style={{
                fontFamily:'var(--font-mono)',
                fontSize:'clamp(0.78rem, 1.5vw, 0.95rem)',
                color:'var(--text-muted)',
                marginTop:'6px',
                display:'flex', alignItems:'center', gap:'2px',
                transition:'color var(--t-slow)',
              }}
            >
              {subtitle}
              {!subtitleDone && <span className="cursor-blink" style={{ color:'var(--accent)' }}>_</span>}
              {subtitleDone && <span className="cursor-blink" style={{ color:'var(--accent)' }}>_</span>}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Two Monaco editors ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.45, delay:0.1 }}
        style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', position:'relative' }}
      >
        {/* Scan animation overlay */}
        {loading && (
          <div style={{ position:'absolute', inset:0, zIndex:5, pointerEvents:'none', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
            <div className="scan-line" />
          </div>
        )}

        <MonacoEditorPane
          label="Code A — Original / Reference"
          value={codeA} onChange={setCodeA}
          accent="#8B5CF6" error={result?.error_a}
          decorations={decA} isDark={isDark}
        />
        <MonacoEditorPane
          label="Code B — Suspect Submission"
          value={codeB} onChange={setCodeB}
          accent="var(--accent)" error={result?.error_b}
          decorations={decB} isDark={isDark}
        />
      </motion.div>

      {/* Comparison legend */}
      {decA.length > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          style={{ display:'flex', gap:'14px', flexWrap:'wrap', fontSize:'11px', fontFamily:'var(--font-sans)' }}>
          {[
            { color:'#EF4444', bg:'rgba(239,68,68,0.12)', label:'Exact Match — identical line' },
            { color:'#3B82F6', bg:'rgba(59,130,246,0.12)', label:'Renamed — same structure, different identifiers' },
            { color:'#F59E0B', bg:'rgba(245,158,11,0.12)', label:'Structurally Similar — shared pattern' },
          ].map(({ color, bg, label }) => (
            <span key={label} style={{ display:'flex', alignItems:'center', gap:'5px', color:'var(--text-secondary)' }}>
              <span style={{ width:12, height:12, borderRadius:'2px', background:bg, border:`1.5px solid ${color}`, flexShrink:0 }} />
              {label}
            </span>
          ))}
        </motion.div>
      )}

      {/* ── Run Analysis button ──────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
        <motion.button
          whileTap={{ scale: loading ? 1 : 0.97 }}
          onClick={handleAnalyze}
          disabled={loading}
          className="btn-glow"
          style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'11px 40px', borderRadius:'var(--radius-md)',
            border:'1px solid var(--accent)',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'var(--card-header-bg)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : '#000',
            fontFamily:'var(--font-display)',
            fontSize:'13px', fontWeight:700, letterSpacing:'0.02em',
            transition:'all var(--t-mid)',
          }}
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</>
            : <><Play size={13} fill="currentColor" /> Run Analysis</>}
        </motion.button>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ display:'flex', gap:'8px', padding:'10px 16px', borderRadius:'var(--radius-md)',
                border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.07)',
                fontFamily:'var(--font-sans)', fontSize:'12px', color:'#F87171', maxWidth:'520px' }}>
              <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }} /> {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Analytics row (after result) ────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }} transition={{ duration:0.4 }}
            style={{ display:'flex', flexDirection:'column', gap:'14px' }}
          >
            {/* ── Glassmorphic verdict card — full verdict color ── */}
            <motion.div
              initial={{ scale:0.97 }} animate={{ scale:1 }}
              style={{
                display:'flex', alignItems:'center', gap:'20px', padding:'22px 26px',
                borderRadius:'var(--radius-lg)',
                background:`linear-gradient(135deg, ${vc.color}20 0%, ${vc.color}08 60%, ${vc.glow} 100%)`,
                backdropFilter:'blur(24px) saturate(180%)',
                WebkitBackdropFilter:'blur(24px) saturate(180%)',
                border:`1px solid ${vc.border}`,
                boxShadow:`0 8px 40px ${vc.color}22, inset 0 1px 0 ${vc.color}18`,
                transition:'all var(--t-slow)',
              }}
            >
              <ScoreRing score={result.similarity_score} verdict={result.verdict} />

              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, color:vc.color, letterSpacing:'-0.5px', marginBottom:'3px' }}>
                  {result.verdict}
                </div>
                <div style={{ fontFamily:'var(--font-sans)', fontSize:'13px', color:'var(--text-secondary)', marginBottom:'14px' }}>
                  {vc.label} — {result.similarity_score.toFixed(1)}% structural similarity
                </div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <StatChip label="LCS Bigrams" value={result.lcs_length}               color={vc.color} />
                  <StatChip label="DP Table"    value={result.dp_table_size}            color={vc.color} />
                  <StatChip label="N-gram"       value={`n = ${result.ngram_size}`}      color={vc.color} />
                  <StatChip label="Time"         value={`${result.time_ms?.toFixed(1)}ms`} color={vc.color} />
                </div>
              </div>
            </motion.div>

            {/* ── Analytics tab panel ── */}
            <div
              className="glass"
              style={{
                borderRadius:'var(--radius-lg)',
                overflow:'hidden',
                background:`linear-gradient(135deg, ${vc.color}18 0%, ${vc.color}08 55%, ${vc.glow} 100%)`,
                border:`1px solid ${vc.border}`,
                boxShadow:`0 18px 46px ${vc.color}25`,
              }}
            >
              {/* Tab bar */}
              <div style={{ display:'flex', borderBottom:'1px solid var(--card-border)', background:'var(--card-header-bg)', backdropFilter:'var(--glass-blur)' }}>
                {TABS.map(({ key, label, icon:Icon }) => {
                  const active = activeTab === key;
                  return (
                    <button key={key} onClick={() => setActiveTab(key)} style={{
                      flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                      padding:'11px 8px', border:'none',
                      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                      background:'transparent', cursor:'pointer',
                      fontFamily:'var(--font-sans)', fontSize:'11px', fontWeight:600,
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                      transition:'all var(--t-fast)', whiteSpace:'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color='var(--text-secondary)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color='var(--text-muted)'; }}
                    >
                      <Icon size={11}/>{label}
                    </button>
                  );
                })}
              </div>

              <div style={{ padding:'20px' }}>
                <AnimatePresence mode="wait">
                  {activeTab==='verdict'    && <motion.div key="v" initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.2}}><SemanticVerdictPanel result={result}/></motion.div>}
                  {activeTab==='diff'       && <motion.div key="d" initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.2}}><StructuralDiff tokensA={tokensAStr} tokensB={tokensBStr} commonTokens={result.common_tokens||[]} labelA="Code A" labelB="Code B"/></motion.div>}
                  {activeTab==='hash'       && <motion.div key="h" initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.2}}><CollisionMap tokensA={tokensAStr} tokensB={tokensBStr} windowSize={3}/></motion.div>}
                  {activeTab==='complexity' && <motion.div key="c" initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.2}}><ComplexityDashboard result={result}/></motion.div>}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder */}
      {!result && !loading && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="glass" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
            padding:'32px', borderRadius:'var(--radius-lg)',
            borderStyle:'dashed', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--text-muted)',
          }}>
          <BarChart3 size={18} strokeWidth={1} />
          Run analysis to see algorithmic insights
        </motion.div>
      )}
    </div>
  );
}
