/**
 * TokenStream — Renders an array of AST node-type tokens as chips.
 * Tokens that appear in the LCS are highlighted; others are dimmed.
 *
 * Props:
 *   tokens    : string[]  — full structural token list for one student
 *   lcsSet    : Set       — set of tokens that appear in the LCS
 *   label     : string    — panel header label
 *   accentDot : string    — CSS class for the colored dot ('dot-a' | 'dot-b')
 */
export default function TokenStream({ tokens, lcsSet, label, accentDot }) {
  if (!tokens) return null;

  return (
    <div className="tokens-panel">
      <div className="tokens-panel-header">
        <span>
          {label} — <strong>{tokens.length}</strong> tokens
        </span>
        <div className={`editor-dot ${accentDot}`} />
      </div>

      <div className="tokens-scroll">
        {tokens.length === 0 ? (
          <span className="tokens-empty">No structural tokens extracted</span>
        ) : (
          tokens.map((tok, i) => {
            const isMatch = lcsSet.has(tok);
            return (
              <span
                key={i}
                className={`token-chip ${isMatch ? 'match' : 'no-match'}`}
                title={isMatch ? 'Part of LCS' : tok}
              >
                {tok}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
