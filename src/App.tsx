import { useState, useEffect, createContext, useContext } from 'react';
import { AuthProvider, useAuth, type PageKey } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Overview } from './pages/Overview';
import { Poste } from './pages/Poste';
import { Finance } from './pages/Finance';
import { Contacts } from './pages/Contacts';
import { CalendarPage } from './pages/CalendarPage';
import { Taches } from './pages/Taches';
import LoginPage from './pages/LoginPage';

export const ThemeContext = createContext<{
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

const THEMES = {
  dark: {
    '--bg-main':      '#05050a',
    '--bg-surface':   '#0a0a15',
    '--bg-card':      '#0f0f1a',
    '--bg-input':     '#0a0a15',
    '--border':       '#22223a',
    '--border-hover': '#33335a',
    '--text-primary': '#e8e4d9',
    '--text-secondary':'#a0a0c0',
    '--text-muted':   '#5a587a',
    '--gold':         '#c9a84c',
    '--gold-soft':    '#e8c97a',
    '--sidebar-bg':   '#0a0a15',
    '--card-hover':   '#141428',
  },
  light: {
    '--bg-main':      '#f2f0eb',
    '--bg-surface':   '#ffffff',
    '--bg-card':      '#fafaf7',
    '--bg-input':     '#f5f3ee',
    '--border':       '#e2dfd7',
    '--border-hover': '#c8c5bc',
    '--text-primary': '#1a1826',
    '--text-secondary':'#4a4868',
    '--text-muted':   '#8a88aa',
    '--gold':         '#a07828',
    '--gold-soft':    '#7a5c1e',
    '--sidebar-bg':   '#1a1826',
    '--card-hover':   '#f0ede8',
  },
};

type DashboardPage = 'overview' | 'agenda' | 'tasks' | 'poste' | 'finance' | 'contacts';
const PAGE_ACCESS_MAP: Record<DashboardPage, PageKey> = {
  overview: 'overview',
  agenda: 'calendar',
  tasks: 'tasks',
  poste: 'emails',
  finance: 'finance',
  contacts: 'tools',
};

function AppContent() {
  const { user, canAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState<DashboardPage>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return (localStorage.getItem('ananda-theme') as 'dark' | 'light') || 'dark'; }
    catch { return 'dark'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(THEMES[theme]).forEach(([k, v]) => root.style.setProperty(k, v));
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('ananda-theme', theme); } catch { /* ignore storage write errors */ }
  }, [theme]);

  useEffect(() => {
    const onNavigate = (evt: Event) => {
      const custom = evt as CustomEvent<{ page?: string }>;
      if (custom.detail?.page && custom.detail.page in PAGE_ACCESS_MAP) {
        setCurrentPage(custom.detail.page as DashboardPage);
      }
    };
    window.addEventListener('dashboard:navigate', onNavigate as EventListener);
    return () => window.removeEventListener('dashboard:navigate', onNavigate as EventListener);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (!user) return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <LoginPage />
    </ThemeContext.Provider>
  );

  const safePage = canAccess(PAGE_ACCESS_MAP[currentPage]) ? currentPage : 'overview';

  const renderPage = () => {
    switch (safePage) {
      case 'overview': return <Overview />;
      case 'agenda':   return <CalendarPage />;
      case 'tasks':    return <Taches />;
      case 'poste':    return <Poste />;
      case 'finance':  return <Finance />;
      case 'contacts': return <Contacts />;
      default:         return <Overview />;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div style={{
        display: 'flex', height: '100vh',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        transition: 'background 0.3s, color 0.3s',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <Sidebar currentPage={safePage} onPageChange={setCurrentPage} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header />
          <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              {renderPage()}
            </div>
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
