import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Euro, 
  Mail, 
  Sparkles, 
  ExternalLink,
  CheckCircle2,
  Clock
} from 'lucide-react';

// --- COMPOSANTS DE STYLE ---

const Card = ({ title, icon: Icon, children }: any) => (
  <div className="bg-[#0f0f1a] border border-[#22223a] rounded-xl p-6 shadow-xl">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-[#c9a84c]/10 rounded-lg">
        <Icon size={20} className="text-[#c9a84c]" />
      </div>
      <h3 className="text-lg font-semibold text-[#e8e4d9] font-serif">{title}</h3>
    </div>
    {children}
  </div>
);

const AgendaItem = ({ time, title, category, color }: any) => (
  <div className="flex items-center gap-4 p-3 bg-[#141425] rounded-lg mb-3 border-l-4" style={{ borderColor: color }}>
    <span className="text-[#c9a84c] font-bold text-sm w-12">{time}</span>
    <div className="flex-1">
      <p className="text-sm font-medium text-[#e8e4d9]">{title}</p>
    </div>
    <span className="text-[10px] px-2 py-1 rounded-full bg-opacity-20 uppercase font-bold" style={{ backgroundColor: color, color: color }}>
      {category}
    </span>
  </div>
);

// --- APPLICATION PRINCIPALE ---

function App() {
  const [activeTab, setActiveTab] = useState('Aperçu');
  const tabs = ['Aperçu', 'Planification', 'Clientèle', 'Finances'];

  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e4d9] p-4 md:p-8 font-sans">
      
      {/* Barre de navigation rapide */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {['Dify', 'n8n', 'AFFiNE'].map((service) => (
          <button key={service} className="flex items-center gap-2 px-4 py-2 bg-[#0f0f1a] border border-[#22223a] rounded-full text-xs text-[#5a587a] hover:text-[#c9a84c] transition-colors">
            <ExternalLink size={14} /> {service}
          </button>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-serif text-[#c9a84c] mb-2">Ananda Communauté</h1>
          <p className="text-[#5a587a] text-sm italic">"L'espace de gestion sereine pour ton enseignement"</p>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] text-[#5a587a] tracking-widest uppercase mb-1">Membres</p>
            <p className="text-2xl text-[#c9a84c] font-semibold">247</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#5a587a] tracking-widest uppercase mb-1">Revenu Mars</p>
            <p className="text-2xl text-[#4caf7d] font-semibold">3 840€</p>
          </div>
        </div>
      </header>

      {/* Navigation Onglets */}
      <nav className="flex gap-8 border-bottom border-[#22223a] mb-8 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm transition-all ${
              activeTab === tab ? 'border-b-2 border-[#c9a84c] text-[#e8c97a]' : 'text-[#5a587a]'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Contenu */}
      <main className="max-w-6xl">
        {activeTab === 'Aperçu' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="Agenda du jour" icon={Calendar}>
              <AgendaItem time="09:00" title="Méditation & Kriya" category="Pratique" color="#7b5ea7" />
              <AgendaItem time="11:00" title="Enregistrement Vidéo" category="Contenu" color="#c9a84c" />
              <AgendaItem time="14:30" title="Live Q&A EHME" category="Live" color="#4caf7d" />
            </Card>

            <div className="space-y-8">
              <Card title="Intelligence Mails" icon={Mail}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-[#141425] rounded-lg border border-[#c9a84c]/20">
                    <div>
                      <p className="text-sm font-medium">Julie M. - Inscription</p>
                      <p className="text-xs text-[#5a587a]">Résumé : Demande tarifs stage été</p>
                    </div>
                    <Sparkles size={16} className="text-[#c9a84c]" />
                  </div>
                  <button className="w-full py-2 bg-[#c9a84c] text-black rounded-lg font-bold text-sm hover:bg-[#e8c97a] transition-all">
                    Générer réponses via Dify
                  </button>
                </div>
              </Card>

              <Card title="Statut Système" icon={CheckCircle2}>
                <div className="flex justify-between text-xs text-[#5a587a]">
                  <span>VPS Cloud</span>
                  <span className="text-[#4caf7d]">Opérationnel</span>
                </div>
              </header>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-[#5a587a]">
            <Clock className="mx-auto mb-4 opacity-20" size={48} />
            <p>Synchronisation avec n8n en attente...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
