import { useRef, useEffect, useCallback } from 'react';

/**
 * CodeEditor — A styled textarea with live line numbers and Tab support.
 *
 * Props:
 *   which       : 'a' | 'b'    — which student this editor represents
 *   value       : string       — controlled textarea value
 *   onChange    : fn(value)    — called on every edit
 *   hasError    : boolean      — show syntax-error hint in footer
 *   tokenCount  : number       — how many AST tokens were extracted
 */
export default function CodeEditor({ which, value, onChange, hasError, tokenCount }) {
  const textareaRef = useRef(null);
  const lineNumRef  = useRef(null);

  // ── Compute line numbers string ────────────────────────────────────────
  const lineCount = value.split('\n').length;
  const lineNums  = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  // ── Keep line numbers scrolled in sync with the textarea ────────────
  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener('scroll', syncScroll);
    return () => ta.removeEventListener('scroll', syncScroll);
  }, [syncScroll]);

  // ── Tab key → 4 spaces ─────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta    = textareaRef.current;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const next  = value.substring(0, start) + '    ' + value.substring(end);
      onChange(next);
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
  };

  const label    = which === 'a' ? 'Student A' : 'Student B';
  const dotClass = `editor-dot ${which === 'a' ? 'dot-a' : 'dot-b'}`;

  const placeholder =
    which === 'a'
      ? '# Paste Student A\'s Python code here…\n\ndef example():\n    pass'
      : '# Paste Student B\'s Python code here…\n\ndef example():\n    pass';

  const clearEditor = () => onChange('');

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch {
      // User will paste manually if permission is denied
    }
  };

  return (
    <div className="editor-wrapper" id={`editor-${which}`}>
      {/* ── Header ── */}
      <div className="editor-header">
        <div className="editor-label-group">
          <div className={dotClass} />
          <span className="editor-label-text">{label}</span>
        </div>
        <div className="editor-header-actions">
          <button
            className="btn-icon"
            title="Clear editor"
            onClick={clearEditor}
            aria-label={`Clear ${label} editor`}
          >
            ✕
          </button>
          <button
            className="btn-icon"
            title="Paste from clipboard"
            onClick={pasteFromClipboard}
            aria-label={`Paste into ${label} editor`}
          >
            📋
          </button>
        </div>
      </div>

      {/* ── Body: Line Numbers + Textarea ── */}
      <div className="editor-body">
        <div className="line-numbers" ref={lineNumRef} aria-hidden="true">
          {lineNums}
        </div>
        <textarea
          id={`code-${which}`}
          ref={textareaRef}
          className="code-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          aria-label={`${label} Python code input`}
        />
      </div>

      {/* ── Footer ── */}
      <div className="editor-footer">
        <span className="token-count-badge">
          {tokenCount !== null ? `${tokenCount} AST tokens` : `${lineCount} line${lineCount !== 1 ? 's' : ''}`}
        </span>
        {hasError && (
          <span className="syntax-error-hint">⚠ Syntax Error</span>
        )}
      </div>
    </div>
  );
}
