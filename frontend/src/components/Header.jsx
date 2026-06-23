import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ activeTab, onTabChange }) {
     const { toggle, isDark } = useTheme();

     const renderTab = (key, label) => {
          const isActive = activeTab === key;
          return (
               <button
                    onClick={() => onTabChange(key)}
                    style={{
                         background: 'transparent',
                         border: 'none',
                         fontSize: '0.95rem',
                         fontWeight: isActive ? 600 : 400,
                         color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                         cursor: 'pointer',
                         padding: '8px 16px',
                         borderRadius: 'var(--radius-md)',
                         transition: 'all var(--t-fast)',
                         position: 'relative',
                    }}
                    onMouseEnter={e => {
                         if (!isActive) {
                              e.currentTarget.style.color = 'var(--text-primary)';
                              e.currentTarget.style.background = 'var(--card-header-bg)';
                         }
                    }}
                    onMouseLeave={e => {
                         if (!isActive) {
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.background = 'transparent';
                         }
                    }}
               >
                    {label}
                    {isActive && (
                         <div style={{
                              position: 'absolute',
                              bottom: -4,
                              left: '10%',
                              width: '80%',
                              height: '2px',
                              background: 'var(--accent-blue)',
                              borderRadius: '2px'
                         }} />
                    )}
               </button>
          );
     };

     return (
          <header style={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'space-between',
               padding: '16px 0',
               borderBottom: '1px solid var(--card-border)',
               marginBottom: '32px',
          }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
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

               <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', flex: 1 }}>
                    {renderTab('analyze', 'Analyze')}
                    {renderTab('visualize', 'Visualize AST')}
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', flex: 1 }}>
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
