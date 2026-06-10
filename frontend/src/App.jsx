import { ThemeProvider } from './context/ThemeContext';
import Header        from './components/Header';
import DashboardView from './views/DashboardView';
import './index.css';

export default function App() {
  return (
    <ThemeProvider>
      <div
        style={{ position:'relative', zIndex:1, maxWidth:'1360px', margin:'0 auto', padding:'0 1.5rem 5rem' }}
      >
        <Header />
        <DashboardView />
      </div>
    </ThemeProvider>
  );
}
