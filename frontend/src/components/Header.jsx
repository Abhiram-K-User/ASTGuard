import { Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
     const { toggle, isDark } = useTheme();

     return (
          <header style={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'space-between',
               padding: '22px 0',
               borderBottom: '1px solid var(--card-border)',
               marginBottom: '20px',
          }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    
                    <div>
                         <div style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '1.35rem',
                              fontWeight: 700,
                              letterSpacing: '-0.6px',
                         }}>
                              SyntaxShield
                         </div>
                         <div style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.66rem',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: 'var(--text-muted)',
                         }}>
                              Structural Integrity Suite
                         </div>
                    </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                         fontFamily: 'var(--font-mono)',
                         fontSize: '0.7rem',
                         padding: '6px 14px',
                         borderRadius: 999,
                         border: '1px solid var(--card-border)',
                         background: 'rgba(20, 184, 166, 0.08)',
                         color: 'var(--text-secondary)',
                    }}>
                         LCS + TED
                    </span>
                    <button
                         type="button"
                         onClick={toggle}
                         style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 12px',
                              borderRadius: 999,
                              border: '1px solid var(--card-border)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all var(--t-fast)',
                              fontFamily: 'var(--font-sans)',
                              fontSize: '0.72rem',
                         }}
                         onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                         onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                         <Sparkles size={12} />
                         {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
               </div>
          </header>
     );
}
