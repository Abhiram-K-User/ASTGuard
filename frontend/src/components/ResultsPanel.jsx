import ScoreRing from './ScoreRing';
import TokenStream from './TokenStream';
import { VERDICTS } from '../constants';

const COMPLEXITY_ROWS = [
  { icon: '⏱', key: 'Time Complexity',   val: 'Θ(m · n)' },
  { icon: '💾', key: 'Space Complexity',  val: 'Θ(m · n)' },
  { icon: '🧮', key: 'Recurrence',        val: 'dp[i][j] = dp[i-1][j-1]+1 | max(…)' },
  { icon: '📐', key: 'Similarity Metric', val: 'Sørensen–Dice: 2·LCS/(m+n)' },
];

/**
 * ResultsPanel — Full analysis result display.
 *
 * Props:
 *   result : CompareResponse object from the API
 */
export default function ResultsPanel({ result }) {
  if (!result) return null;

  const {
    similarity_score, verdict, lcs_length,
    tokens_a, tokens_b, common_tokens,
    dp_table_size, time_ms, error_a, error_b,
  } = result;

  const vInfo   = VERDICTS[verdict] ?? VERDICTS['Safe'];
  const lcsSet  = new Set(common_tokens);

  const coverage =
    tokens_a.length + tokens_b.length > 0
      ? ((2 * lcs_length) / (tokens_a.length + tokens_b.length) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="results-panel">

      {/* ── Score Header Card ─────────────────────────────────────────── */}
      <div className="section-label">Analysis Results</div>
      <div className="glass-card score-header">

        {/* Radial Ring */}
        <ScoreRing score={similarity_score} verdict={verdict} />

        {/* Verdict + Description */}
        <div className="verdict-section">
          <div className={`verdict-badge ${vInfo.cls}`}>
            <span>{vInfo.icon}</span>
            <span>{verdict} — {similarity_score}%</span>
          </div>
          <p className="verdict-description">{vInfo.description}</p>

          {(error_a || error_b) && (
            <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '0.65rem' }}>
              {error_a && <div>⚠ Student A: {error_a}</div>}
              {error_b && <div>⚠ Student B: {error_b}</div>}
            </div>
          )}

          <div className="result-pills">
            <span className="pill pill-purple">LCS: {lcs_length} nodes</span>
            <span className="pill pill-blue">Table: {dp_table_size}</span>
            <span className="pill pill-green">⏱ {time_ms} ms</span>
          </div>
        </div>

        {/* DP Mini Stats */}
        <div className="dp-mini-stats">
          <div className="dp-mini-card">
            <div className="dp-mini-val">{dp_table_size}</div>
            <div className="dp-mini-label">DP Table Size</div>
          </div>
          <div className="dp-mini-card">
            <div className="dp-mini-val">{time_ms} ms</div>
            <div className="dp-mini-label">Compute Time</div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="stats-grid">
        {[
          { label: 'LCS Length',    val: lcs_length },
          { label: 'Tokens — A',    val: tokens_a.length },
          { label: 'Tokens — B',    val: tokens_b.length },
          { label: 'LCS Coverage',  val: `${coverage}%` },
        ].map(({ label, val }) => (
          <div key={label} className="stat-card">
            <div className="stat-value">{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Token Streams ─────────────────────────────────────────────── */}
      <div className="section-label">Normalised AST Token Streams</div>
      <div className="tokens-grid">
        <TokenStream
          tokens={tokens_a}
          lcsSet={lcsSet}
          label="Student A"
          accentDot="dot-a"
        />
        <TokenStream
          tokens={tokens_b}
          lcsSet={lcsSet}
          label="Student B"
          accentDot="dot-b"
        />
      </div>

      {/* ── LCS Sequence ──────────────────────────────────────────────── */}
      <div className="section-label">Longest Common Subsequence (LCS)</div>
      <div className="lcs-panel">
        <div className="lcs-panel-header">
          <span>🔗</span>
          <span>Common Structural Pattern — <strong>{lcs_length}</strong> tokens</span>
        </div>
        <div className="lcs-scroll">
          {common_tokens.length === 0 ? (
            <span className="tokens-empty">No common structural pattern found</span>
          ) : (
            common_tokens.map((tok, i) => (
              <span key={i} className="lcs-chip">{tok}</span>
            ))
          )}
        </div>
      </div>

      {/* ── Complexity Reference ───────────────────────────────────────── */}
      <div className="section-label">Algorithm Analysis</div>
      <div className="complexity-panel">
        <div className="complexity-panel-header">DAA Complexity Reference — LCS on AST Token Streams</div>
        <div className="complexity-body">
          {COMPLEXITY_ROWS.map(({ icon, key, val }) => (
            <div key={key} className="complexity-row">
              <div className="complexity-icon">{icon}</div>
              <div>
                <div className="complexity-key">{key}</div>
                <div className="complexity-val">{val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
