import React, { useState } from 'react';
import { 
  Calendar, 
  Users, 
  Mail, 
  Sparkles, 
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useN8nData } from './useData';

// --- INJECTION DES POLICES ---
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
  body { font-family: 'Outfit', sans-serif; background-color: #05050a; }
  .serif { font-family: 'Playfair Display', serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// --- COMPOSANTS DE STYLE ---

const Card = ({ title, icon: Icon, children }: any) => (
  <div className="bg-[#0f0f1a]/80 backdrop-blur-sm border border-[#22223a] rounded-2xl p-7 shadow-2xl">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#c9a84c]/10 rounded-xl border border-[#c9a84c]/20">
          <Icon size={18} className="text-[#c9a84c]" />
        </div>
        <h3 className="text-lg font-medium text-[#e8e4d9] serif tracking-wide">{title}</h3>
      </div>
      <ArrowRight size={14} className="text-[#5a587a] opacity-50" />
    </div>
    {children}
  </div>
);

const AgendaItem = ({ time, title, category, color }: any) => (
  <div className="group flex items-center gap-5 p-4 bg-[#141425]/40 hover:bg-[#141425] rounded-xl mb-3 border border-[#22223a] transition-all duration-300 cursor-pointer">
    <div className="flex flex-col items-center border-r border-[#22223a] pr-4">
      <span className="text-[#c9a84c] font-bold text-sm tracking-tighter">{time}</span>
      <span className="text-[9px] text-[#5a587a] uppercase tracking-widest">AM</span>
    </div>
    <div className="flex-1">
      <p className="text-[14px] font-light text-[#e8e4d9] group-hover:text-white transition-colors">{title}</p>
    </div>
    <span className="text-[9px] px-3 py-1 rounded-full border tracking-[0.1em] font-semibold uppercase" 
          style={{ borderColor: `${color}44`, color: color, backgroundColor: `${color}08` }}>
      {category}
    </span>
  </div>
);

// --- APPLICATION PRINCIPALE ---

function App() {
  // Connexion au cerveau n8n
  const { data: n8nStats, loading } = useN8nData('https://n8n.ananda-communaute.cloud/webhook/stats');
  
  const [activeTab, setActiveTab] = useState('Aperçu');
  const tabs = ['Aperçu', 'Planification', 'Clientèle', 'Finances'];

  // Valeurs dynamiques (utilise n8n ou les valeurs par défaut)
  const stats = {
    membres: n8nStats?.membres || 247,
    revenus: n8nStats?.revenus || "3 840€"
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e4d9] p-6 md:p-12 selection:bg-[#c9a84c]/30">
      <style>{fontStyles}</style>
      
      {/* Barre de navigation rapide */}
      <div className="flex gap-4 mb-12 overflow-x-auto pb-4 no-scrollbar">
        {[
          { name: 'Dify', url: 'https://dify.ananda-communaute.cloud' },
          { name: 'n8n', url: 'https://n8n.ananda-communaute.cloud' },
          { name: 'AFFiNE', url: 'https://affine.ananda-communaute.cloud' }
        ].map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noreferrer" 
             className="flex items-center gap-2 px-5 py-2 bg-[#0f0f1a] border border-[#22223a] rounded-full text-[11px] text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/40 transition-all tracking-widest uppercase">
            <ExternalLink size={12} /> {s.name}
          </a>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8 border-b border-[#22223a]/50 pb-12">
        <div>
          <h1 className="text-5xl serif text-[#c9a84c] mb-3 font-normal tracking-tight">Ananda Communauté</h1>
          <p className="text-[#5a587a] text-sm font-light tracking-[0.05em] italic opacity-80">Dashboard de pilotage sacré</p>
        </div>
        <div className="flex gap-12">
          <div className="text-right">
            <p className="text-[10px] text-[#5a587a] tracking-[0.2em] uppercase mb-2 font-semibold">Membres Actifs</p>
            <p className="text-3xl text-[#c9a84c] font-light tracking-tight">{stats.membres}</p>
          </div>
          <div className="text-right border-l border-[#22223a] pl-12">
            <p className="text-[10px] text-[#5a587a] tracking-[0.2em] uppercase mb-2 font-semibold">Revenu Mensuel</p>
            <p className="text-3xl text-[#4caf7d] font-light tracking-tight">{stats.revenus}</p>
          </div>
        </div>
      </header>

      {/* Navigation Onglets */}
      <nav className="flex gap-10 mb-12">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-[13px] tracking-[0.15em] uppercase transition-all relative font-medium ${
              activeTab === tab ? 'text-[#e8c97a]' : 'text-[#5a587a] hover:text-[#e8c97a]/50'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-[#c9a84c] shadow-[0_0_8px_#c9a84c]" />
            )}
          </button>
        ))}
      </nav>

      {/* Contenu */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'Aperçu' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            <div className="lg:col-span-7">
              <Card title="Agenda Sacré" icon={Calendar}>
                <AgendaItem time="09:00" title="Kriya Yoga & Méditation profonde" category="Pratique" color="#7b5ea7" />
                <AgendaItem time="11:00" title="Production de contenu — Philosophie" category="Studio" color="#c9a84c" />
                <AgendaItem time="14:30" title="Accompagnement EHME — Groupe" category="Transmission" color="#4caf7d" />
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-10">
              <Card title="Assistant IA" icon={Mail}>
                <div className="space-y-5">
                  <div className="p-4 bg-[#05050a] rounded-xl border border-[#c9a84c]/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                      <Sparkles size={14} className="text-[#c9a84c]" />
                    </div>
                    <p className="text-[13px] text-[#e8e4d9]/90 leading-relaxed italic font-light">
                      {loading ? "Synchronisation..." : "3 nouveaux messages analysés par Dify."}
                    </p>
                  </div>
                  <button className="w-full py-4 bg-[#c9a84c] text-black rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-[#e8c97a] hover:scale-[1.01] transition-all">
                    Préparer les réponses
                  </button>
                </div>
              </Card>

              <Card title="État du VPS" icon={CheckCircle2}>
                <div className="flex justify-between items-center text-[11px] tracking-widest uppercase text-[#5a587a]">
                  <span>Infrastructure</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4caf7d] animate-pulse" />
                    <span className="text-[#4caf7d]">Connecté</span>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        ) : (
          <div className="py-32 text-center text-[#5a587a]">
            <Clock className="mx-auto mb-6 opacity-10 animate-spin-slow" size={64} />
            <p className="serif italic text-lg tracking-wide">Interface {activeTab} en cours de liaison...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
