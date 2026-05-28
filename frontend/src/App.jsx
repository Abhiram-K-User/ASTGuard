import { motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import Header        from './components/Header';
import DashboardView from './views/DashboardView';
import './index.css';

/** Teal radial atmosphere + dot grid noise */
function Background() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      {/* Teal top-right glow */}
      <div style={{
        position:'absolute', width:700, height:500,
        top:'-120px', right:'-80px',
        background:'radial-gradient(ellipse, rgba(20,184,166,0.18) 0%, transparent 70%)',
        filter:'blur(40px)',
      }}/>
      {/* Teal bottom-left glow */}
      <div style={{
        position:'absolute', width:500, height:400,
        bottom:'-80px', left:'-60px',
        background:'radial-gradient(ellipse, rgba(45,212,191,0.12) 0%, transparent 70%)',
        filter:'blur(30px)',
      }}/>
      {/* Subtle teal mid glow */}
      <div style={{
        position:'absolute', width:300, height:300,
        top:'40%', left:'50%', transform:'translate(-50%,-50%)',
        background:'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)',
        filter:'blur(20px)',
      }}/>
      {/* Micro radial texture + teal noise */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:
          'radial-gradient(circle at 12% 18%, rgba(20,184,166,0.18) 0%, transparent 38%),' +
          'radial-gradient(circle at 80% 22%, rgba(45,212,191,0.16) 0%, transparent 42%),' +
          'radial-gradient(circle at 40% 78%, rgba(20,184,166,0.14) 0%, transparent 40%),' +
          'radial-gradient(circle, rgba(20,184,166,0.14) 0.6px, transparent 0.7px)',
        backgroundSize: 'auto, auto, auto, 8px 8px',
        opacity: 0.45,
      }} />
      {/* Dot grid */}
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0, opacity:0.35 }}>
        <defs>
          <pattern id="dots" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="rgba(20,184,166,0.26)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Background />
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }}
        transition={{ duration:0.55 }}
        style={{ position:'relative', zIndex:1, maxWidth:'1360px', margin:'0 auto', padding:'0 1.5rem 5rem' }}
      >
        <Header />
        <DashboardView />
      </motion.div>
    </ThemeProvider>
  );
}
