import React, { useState } from 'react';
import { Calendar, Mail, GraduationCap, UserCheck, Briefcase, Sparkles, Activity, Clock, ExternalLink, Database, MessageSquare } from 'lucide-react';

export default function App() {
  const [activeMail, setActiveMail] = useState('formation');

  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e4d9] p-4 md:p-10 font-sans selection:bg-[#c9a84c]/30">
      
      {/* HEADER : Tes chiffres et tes accès directs */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 pb-8 border-b border-[#22223a] gap-8">
        <div>
          <h1 className="text-4xl font-serif text-[#c9a84c] mb-3 tracking-tight">Ananda Dashboard</h1>
          <div className="flex gap-3">
            <a href="https://n8n.ananda-communaute.cloud" target="_blank" className="flex items-center gap-2 px-4 py-1.5 bg-[#141425] border border-[#22223a] rounded-xl text-[10px] text-[#5a587a] hover:text-[#c9a84c] transition-all font-bold uppercase tracking-widest"><Database size={12}/> n8n</a>
            <a href="https://dify.ananda-communaute.cloud" target="_blank" className="flex items-center gap-2 px-4 py-1.5 bg-[#141425] border border-[#22223a] rounded-xl text-[10px] text-[#5a587a] hover:text-[#c9a84c] transition-all font-bold uppercase tracking-widest"><Sparkles size={12}/> Dify</a>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-[#0f0f1a] px-6 py-3 rounded-2xl border border-[#22223a] text-right min-w-[140px]">
            <p className="text-[10px] uppercase tracking-widest text-[#5a587a] mb-1">Membres</p>
            <p className="text-2xl text-[#c9a84c] font-light">247</p>
          </div>
          <div className="bg-[#0f0f1a] px-6 py-3 rounded-2xl border border-[#22223a] text-right min-w-[140px]">
            <p className="text-[10px] uppercase tracking-widest text-[#5a587a] mb-1">Revenus</p>
            <p className="text-2xl text-[#4caf7d] font-light">3 840€</p>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* GAUCHE : Agenda & Intelligence Artificielle */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-[#0f0f1a] border border-[#22223a] rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-serif text-[#c9a84c] mb-6 flex items-center gap-3">
              <Calendar size={20} /> Agenda
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-[#05050a] border-l-2 border-[#c9a84c] rounded-lg">
                <p className="text-[10px] text-[#c9a84c] font-bold">09:00</p>
                <p className="text-sm italic">Kriya Yoga & Méditation</p>
              </div>
              <div className="p-4 bg-[#05050a] border-l-2 border-[#4a90e2] rounded-lg opacity-60">
                <p className="text-[10px] text-[#4a90e2] font-bold">14:30</p>
                <p className="text-sm italic">Accompagnement EHME</p>
              </div>
            </div>
          </section>

          <section className="bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-2xl p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#c9a84c] mb-2 flex items-center gap-2">
              <Sparkles size={14} /> Analyse IA
            </h3>
            <p className="text-xs text-[#e8e4d9]/80 leading-relaxed italic">
              "Analyse des 3 boîtes : Priorité aux inscriptions sur eh-me.com."
            </p>
          </section>
        </div>

        {/* DROITE : Centre de Poste Intelligent */}
        <div className="lg:col-span-8">
          <div className="bg-[#0f0f1a] border border-[#22223a] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
            
            {/* Onglets pour les 3 adresses */}
            <div className="flex bg-[#05050a] border-b border-[#22223a]">
              {[
                { id: 'formation', label: 'serge@eh-me.com', icon: GraduationCap, color: '#c9a84c' },
                { id: 'etudiants', label: 'info@eh-me.com', icon: UserCheck, color: '#4a90e2' },
                { id: 'gestion', label: 'serge@seme.ch', icon: Briefcase, color: '#94a3b8' }
              ].map((m) => (
                <button 
                  key={m.id}
                  onClick={() => setActiveMail(m.id)}
                  className={`flex-1 flex flex-col items-center gap-2 py-5 transition-all border-r border-[#22223a] last:border-r-0 ${activeMail === m.id ? 'bg-[#0f0f1a]' : 'opacity-30 hover:opacity-60'}`}
                >
                  <m.icon size={18} style={{ color: activeMail === m.id ? m.color : '#5a587a' }} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Zone de contenu des mails */}
            <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center text-[#5a587a] italic">
              <Mail size={32} className="mb-4 opacity-10" />
              <p className="text-xs tracking-widest uppercase">En attente de flux IMAP...</p>
            </div>

            <div className="p-4 bg-[#05050a] border-t border-[#22223a] flex justify-between items-center text-[9px] font-bold uppercase tracking-[0.2em] text-[#5a587a]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4caf7d] animate-pulse" />
                <span>Système Connecté</span>
              </div>
              <Clock size={12} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
