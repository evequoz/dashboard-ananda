import { useState } from 'react';
import { TabName } from './types/dashboard';
import { THEME } from './constants/theme';
import { ServiceLinks } from './components/dashboard/ServiceLinks';
import { StatsDisplay } from './components/dashboard/StatsDisplay';
import { TabNavigation } from './components/dashboard/TabNavigation';
import { OverviewTab } from './components/views/OverviewTab';
import { PlanningTab } from './components/views/PlanningTab';
import { ClientTab } from './components/views/ClientTab';
import { FinanceTab } from './components/views/FinanceTab';

function App() {
  const [activeTab, setActiveTab] = useState<TabName>('Aperçu');
  const tabs: TabName[] = ['Aperçu', 'Planification', 'Clientèle', 'Finances'];

  const stats = [
    { label: 'MEMBRES ACTIFS', value: '247', color: '#c9a84c' },
    { label: 'REVENU MARS', value: '3 840€', color: '#4caf7d' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Aperçu':
        return <OverviewTab />;
      case 'Planification':
        return <PlanningTab />;
      case 'Clientèle':
        return <ClientTab />;
      case 'Finances':
        return <FinanceTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="bg-[#05050a] text-[#e8e4d9] min-h-screen p-6 font-['Outfit',sans-serif]">
      <div className="max-w-[1400px] mx-auto">
        <ServiceLinks services={THEME.services} />

        <div className="h-px bg-gradient-to-r from-transparent via-[#22223a] to-transparent my-8" />

        <header className="flex justify-between items-end mb-8 flex-wrap gap-6">
          <div>
            <h1 className="font-['Playfair_Display',serif] text-[#c9a84c] text-4xl m-0 mb-2 drop-shadow-lg">
              Ananda Communauté
            </h1>
            <p className="text-sm text-[#5a587a] tracking-wide">Mardi 17 Mars 2026</p>
          </div>

          <StatsDisplay stats={stats} />
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-[#22223a] to-transparent mb-8" />

        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="animate-fadeIn">{renderTabContent()}</div>
      </div>
    </div>
  );
}

export default App;
