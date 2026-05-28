export default function Hero() {
  return (
    <section className="hero">
      <h1 className="hero-title">
        Structural Code<br />Plagiarism Detector
      </h1>
      <p className="hero-sub">
        Parse Python programs into normalised Abstract Syntax Trees, then apply
        Dynamic Programming (LCS) to measure structural similarity —{' '}
        <strong style={{ color: '#a5b4fc' }}>immune to variable renaming</strong> and
        literal substitution.
      </p>
      <div className="pill-row">
        <span className="pill pill-purple">🧬 AST Normalisation</span>
        <span className="pill pill-blue">⚡ LCS · O(m·n) DP</span>
        <span className="pill pill-green">🔍 Rename-Proof Detection</span>
      </div>
    </section>
  );
}
