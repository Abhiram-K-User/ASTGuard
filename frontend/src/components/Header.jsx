export default function Header() {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">🛡️</div>
        <div>
          <span className="logo-name">ASTGuard</span>
          <span className="logo-sub">Code Integrity Platform</span>
        </div>
      </div>
      <div className="header-right">
        <span className="algo-badge">DP · LCS · AST</span>
        <a
          className="docs-link"
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noreferrer"
        >
          API Docs ↗
        </a>
      </div>
    </header>
  );
}
