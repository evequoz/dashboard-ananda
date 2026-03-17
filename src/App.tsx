import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Overview } from './pages/Overview';
import { Poste } from './pages/Poste';
import { Members } from './pages/Members';
import { Finance } from './pages/Finance';
import { Tools } from './pages/Tools';

function App() {
  const [currentPage, setCurrentPage] = useState('overview');

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview />;
      case 'poste':
        return <Poste />;
      case 'members':
        return <Members />;
      case 'finance':
        return <Finance />;
      case 'tools':
        return <Tools />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#0f0f1a] text-[#e8e4d9]">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

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

export default App;
