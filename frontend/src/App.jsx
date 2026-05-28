import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

import Background   from './components/Background';
import Header       from './components/Header';
import Hero         from './components/Hero';
import CodeEditor   from './components/CodeEditor';
import ResultsPanel from './components/ResultsPanel';
import { compareCode, fetchExamples } from './services/api';
import { PLACEHOLDER_A, PLACEHOLDER_B } from './constants';

export default function App() {
  // ── Editor state ────────────────────────────────────────────────────────
  const [codeA, setCodeA] = useState('');
  const [codeB, setCodeB] = useState('');

  // ── Examples from backend ────────────────────────────────────────────────
  const [examples, setExamples]     = useState([]);
  const [exLoading, setExLoading]   = useState(true);
  const [exError, setExError]       = useState(false);

  // ── Analysis state ───────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);

  // ── Ref for smooth scroll to results ─────────────────────────────────────
  const resultsRef = useRef(null);

  // ── Load examples on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetchExamples()
      .then(setExamples)
      .catch(() => setExError(true))
      .finally(() => setExLoading(false));
  }, []);

  // ── Load example pair ────────────────────────────────────────────────────
  const loadExample = useCallback((ex) => {
    setCodeA(ex.code_a);
    setCodeB(ex.code_b);
    setResult(null);
    setError(null);
  }, []);

  // ── Main analyze handler ─────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    const trimA = codeA.trim();
    const trimB = codeB.trim();

    if (!trimA && !trimB) {
      setError({ title: 'Empty Input', msg: 'Please enter Python code for both students.' });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await compareCode(
        trimA || '# empty',
        trimB || '# empty'
      );
      setResult(data);
      // Smooth-scroll to results after a short delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (e) {
      setError({ title: 'Analysis Failed', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, [codeA, codeB]);

  // ── Keyboard shortcut: Ctrl/Cmd + Enter ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading) handleAnalyze();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loading, handleAnalyze]);

  // ── Token counts from last result ─────────────────────────────────────
  const tokenCountA = result ? result.tokens_a.length : null;
  const tokenCountB = result ? result.tokens_b.length : null;
  const hasErrorA   = result ? !!result.error_a : false;
  const hasErrorB   = result ? !!result.error_b : false;

  return (
    <>
      <Background />

      <div className="app-shell">
        <Header />
        <Hero />

        {/* ── Controls Bar: Examples + Analyze CTA ─────────────────────── */}
        <div className="controls-bar">
          <div className="examples-col">
            <div className="section-label">Load Example Pair</div>
            <div className="examples-row">
              {exLoading && (
                <button className="btn-example" disabled>Loading examples…</button>
              )}
              {exError && !exLoading && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Start the backend: <code style={{ color: 'var(--brand-500)' }}>python main.py</code>
                </span>
              )}
              {examples.map((ex, i) => (
                <button
                  key={i}
                  id={`ex-btn-${i}`}
                  className="btn-example"
                  title={ex.description}
                  onClick={() => loadExample(ex)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <button
            id="analyze-btn"
            className="btn-analyze"
            onClick={handleAnalyze}
            disabled={loading}
            aria-label="Analyze code for structural plagiarism"
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <span>🔬</span>
            )}
            <span>{loading ? 'Analyzing…' : 'Analyze Structure'}</span>
            {!loading && (
              <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 400 }}>
                Ctrl+↵
              </span>
            )}
          </button>
        </div>

        {/* ── Code Editors ─────────────────────────────────────────────── */}
        <div className="editors-grid">
          <CodeEditor
            which="a"
            value={codeA}
            onChange={setCodeA}
            hasError={hasErrorA}
            tokenCount={tokenCountA}
          />
          <CodeEditor
            which="b"
            value={codeB}
            onChange={setCodeB}
            hasError={hasErrorB}
            tokenCount={tokenCountB}
          />
        </div>

        {/* ── Error Alert ───────────────────────────────────────────────── */}
        {error && (
          <div className="error-alert" role="alert">
            <span className="error-alert-icon">🚨</span>
            <div>
              <div className="error-alert-title">{error.title}</div>
              <div className="error-alert-msg">{error.msg}</div>
            </div>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        <div ref={resultsRef}>
          {result && <ResultsPanel result={result} />}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="footer">
          <p>
            <strong>ASTGuard</strong> — Powered by{' '}
            <code>Python ast</code> + <code>FastAPI</code> + Dynamic Programming
            <br />
            Algorithm: Longest Common Subsequence &nbsp;|&nbsp; Paradigm: Bottom-up DP
            &nbsp;|&nbsp; Complexity: Θ(m·n)
          </p>
        </footer>
      </div>
    </>
  );
}
