import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Header        from './components/Header';
import DashboardView from './views/DashboardView';
import './index.css';

export default function App() {
  const [globalTab, setGlobalTab] = useState('analyze');

  return (
    <ThemeProvider>
      <div
        style={{ 
          position: 'relative', 
          zIndex: 1, 
          maxWidth: '1360px', 
          margin: '0 auto', 
          padding: '0 1.5rem', 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Header activeTab={globalTab} onTabChange={setGlobalTab} />
        <DashboardView globalTab={globalTab} />
      </div>
    </ThemeProvider>
  );
}
