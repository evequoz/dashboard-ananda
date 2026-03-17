import React, { useState } from 'react';
import { LayoutDashboard, Calendar, Mail, GraduationCap, UserCheck, Briefcase, CheckCircle } from 'lucide-react';
import { Overview } from './components/Overview';
import { MailCenter } from './components/MailCenter';
import { useN8nData } from './useData';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const { data: n8nStats } = useN8nData('https://n8n.ananda-communaute.cloud/webhook/stats');

  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e4d9] p-4 md:p-8 font-sans">
      
      {/* HEADER : Infos Clés toujours visibles */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 border-b border-[#22223a] gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#c9a84c]">Ananda Dashboard</h1>
          <p className="text-sm text-[#5a587a] italic">Pilotage formation & étudiants</p>
        </div>
        
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#5a587a]">Membres</p>
            <p className="text-2xl text-[#c9a84c]">{n8nStats?.membres || "247"}</p>
          </div>
          <div className="text-right border-l border-[#22223a] pl-6">
            <p className="text-[10px] uppercase tracking-widest text-[#5a587a]">Revenus</p>
            <p className="text-2xl text-[#4caf7d]">{n8nStats?.revenus || "3 840€"}</p>
          </div>
          <div className="text-right border-l border-[#22223a] pl-6">
            <p className="text-[10px] uppercase tracking-widest text-[#5a587a]">Système</p>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-[#4caf7d] animate-pulse" />
              <p className="text-xs text-white">Online</p>
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION : Simple et claire */}
      <nav className="flex gap-2 mb-8 bg-[#0f0f1a] p-1 rounded-xl w-fit border border-[#22223a]">
        <button 
          onClick={() => setTab('dashboard')} 
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab === 'dashboard' ? 'bg-[#c9a84c] text-black shadow-lg' : 'text-[#5a587a] hover:text-[#e8e4d9]'}`}
        >
          <LayoutDashboard size={14} /> Vue d'ensemble
        </button>
        <button 
          onClick={() => setTab('mails')} 
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab === 'mails' ? 'bg-[#c9a84c] text-black shadow-lg' : 'text-[#5a587a] hover:text-[#e8e4d9]'}`}
        >
          <Mail size={14} /> Centre de Poste
        </button>
      </nav>

      {/* CONTENU : Switcher entre la vue globale et la vue détaillée */}
      <main className="animate-in fade-in duration-500">
        {tab === 'dashboard' ? (
          <div className="space-y-8">
            {/* On affiche l'Overview qui contient l'agenda et les alertes */}
            <Overview />
            
            {/* Petit aperçu rapide des mails directement sur l'accueil */}
            <div className="pt-4">
              <h2 className="text-[#c9a84c] serif text-xl mb-4 flex items-center gap-2">
                <Mail size={18} /> Flux de communication récent
              </h2>
              <MailCenter compact={true} />
            </div>
          </div>
        ) : (
          /* Vue détaillée de la poste uniquement */
          <MailCenter compact={false} />
        )}
      </main>

    </div>
  );
}
