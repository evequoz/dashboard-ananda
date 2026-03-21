import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Overview } from './pages/Overview';
import { Poste } from './pages/Poste';
import { Members } from './pages/Members';
import { Finance } from './pages/Finance';
import { Tools } from './pages/Tools';
import { CalendarPage } from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';

// ─────────────────────────────────────────────
// Contenu principal (affiché après login)
// ─────────────────────────────────────────────
function AppContent() {
  const { user, canAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState('overview');

  // Non connecté → page de login
  if (!user) {
    return <LoginPage />;
  }

  // Si la page demandée n'est pas accessible → overview
  const safePage = canAccess(currentPage as any) ? currentPage : 'overview';

  const renderPage = () => {
    switch (safePage) {
      case 'overview':
        return <Overview />;
      case 'agenda':
        return <CalendarPage />;
      case 'poste':
        return canAccess('posts') ? <Poste /> : <Overview />;
      case 'members':
        return <Members />;
      case 'finance':
        return canAccess('finance') ? <Finance /> : <Overview />;
      case 'tools':
        return <Tools />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#0f0f1a] text-[#e8e4d9]">
      <Sidebar currentPage={safePage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root — AuthProvider englobe tout
// ─────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
