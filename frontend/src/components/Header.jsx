import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
     const { toggle, isDark } = useTheme();

     return (
          <header style={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'space-between',
               padding: '16px 0',
               borderBottom: '1px solid var(--card-border)',
               marginBottom: '32px',
          }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                         fontFamily: 'var(--font-display)',
                         fontSize: '1.25rem',
                         fontWeight: 600,
                         color: 'var(--text-primary)',
                         letterSpacing: '-0.02em',
                    }}>
                         SyntaxShield
                    </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                         type="button"
                         onClick={toggle}
                         style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--card-border)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all var(--t-fast)',
                         }}
                         onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-header-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                         onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                         {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
               </div>
          </header>
     );
}
