import React from 'react';
import { Calendar, Mail, GraduationCap, UserCheck, Briefcase, Sparkles, Activity, Clock, ExternalLink } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e4d9] p-6 md:p-12 font-sans selection:bg-[#c9a84c]/30">
      
      {/* HEADER : IDENTITÉ & CHIFFRES CLÉS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 pb-10 border-b border-[#22223a] gap-8">
        <div>
          <h1 className="text-5xl font-serif text-[#c9a84c] mb-3 tracking-tight">Ananda Dashboard</h1>
          <p className="text-[#5a587a] text-sm font-light italic tracking-[0.05em]">Pilotage Sacré • Serge Évéquoz</p>
        </div>
        <div className="flex gap-6 w-full md:w-auto">
          <div className="bg-[#0f0f1a] px-8 py-4 rounded-2xl border border-[#22223a] text-right shadow-2xl flex-1 md:flex-none">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a587a] mb-1 font-bold">Membres</p>
            <p className="text-4xl text-[#c9a84c] font-light">247</p>
          </div>
          <div className="bg-[#0f0f1a] px-8 py-4 rounded-2xl border border-[#22223a] text-right shadow-2xl flex-1 md:flex-none">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a587a] mb-1 font-bold">Revenus</p>
            <p className="text-4xl text-[#4caf7d] font-light">3 840€</p>
          </div>
        </div>
      </header>

      {/* GRILLE : TOUT SUR UN SEUL ÉCRAN POUR L'EFFICIENCE */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* COLONNE GAUCHE (7/12) : AGENDA & IA */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* SECTION AGENDA */}
          <section className="bg-[#0f0f1a]/80 backdrop-blur-md border border-[#22223a] rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-serif text-[#e8e4d9] flex items-center gap-3">
                <Calendar className="text-[#c9a84c]" size={24} /> Agenda du jour
              </h2>
              <div className="text-[10px] text-[#5a587a] uppercase tracking-[0.3em] font-bold bg-[#05050a] px-4 py-1.5 rounded-full border border-[#22223a]">
                17 Mars 2026
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="group flex items-center gap-6 p-6 bg-[#141425]/40 border border-[#22223a] rounded-2xl hover:bg-[#141425] transition-all cursor-pointer">
                <div className="text-[#c9a84c] font-bold text-lg border-r border-[#22223a] pr-6">09:00</div>
                <div className="flex-1 text-[#e8e4d9] font-light italic">Kriya Yoga & Méditation profonde</div>
                <div className="text-[9px] px-3 py-1 rounded-full border border-[#c9a84c]/30 text-[#c9a84c] uppercase tracking-widest font-bold">Pratique</div>
              </div>
              <div className="group flex items-center gap-6 p-6 bg-[#141425]/40 border border-[#22223a] rounded-2xl hover:bg-[#141425] transition-all cursor-pointer">
                <div className="text-[#4a90e2] font-bold text-lg border-r border-[#22223a] pr-6">14:30</div>
                <div className="flex-1 text-[#e8e4d9] font-light italic">Accompagnement EHME — Session Groupe</div>
                <div className="text-[9px] px-3 py-1 rounded-full border border-[#4a90e2]/30 text-[#4a90e2] uppercase tracking-widest font-bold">Enseignement</div>
              </div>
            </div>
          </section>

          {/* SECTION IA */}
          <section className="bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-3xl p-8 flex items-start gap-6 shadow-inner">
            <div className="p-4 bg-[#c9a84c]/10 rounded-2xl border border-[#c9a84c]/20">
              <Sparkles size={24} className="text-[#c9a84c]" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#c9a84c] mb-3">Intelligence Opérationnelle</h3>
              <p className="text-base text-[#e8e4d9]/90 italic leading-relaxed font-light">
                "Analyse terminée : 3 emails de serge@eh-me.com concernent des inscriptions urgentes. Le workflow Dify est prêt pour vos réponses."
              </p>
            </div>
          </section>
        </div>

        {/* COLONNE DROITE (5/12) : BUREAU DE POSTE (3 ADRESSES) */}
        <div className="lg:col-span-5 space-y-8">
          <h2 className="text-2xl font-serif text-[#e8e4d9] flex items-center gap-3 mb-4">
            <Mail className="text-[#c9a84c]" size={24} /> Bureau de Poste
          </h2>
          
          <div className="space-y-4">
            {[
              { title: 'Formation', email: 'serge@eh-me.com', icon: GraduationCap, color: '#c9a84c' },
              { title: 'Étudiants', email: 'info@eh-me.com', icon: UserCheck, color: '#4a90e2' },
              { title: 'Gestion', email: 'serge@seme.ch', icon: Briefcase, color: '#94a3b8' }
            ].map((m) => (
              <div key={m.email} className="group flex items-center justify-between p-6 bg-[#0f0f1a] border border-[#22223a] rounded-2xl hover:border-[#c9a84c]/40 transition-all">
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-xl bg-[#05050a] border border-[#22223a] group-hover:scale-105 transition-transform">
                    <m.icon size={24} style={{ color: m.color }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#e8e4d9] uppercase tracking-widest">{m.title}</h4>
                    <p className="text-[11px] text-[#5a587a] font-mono mt-1">{m.email}</p>
                  </div>
                </div>
                <button className="text-[10px] font-bold uppercase tracking-[0.2em] bg-[#22223a] px-6 py-3 rounded-xl hover:bg-[#c9a84c] hover:text-black transition-all shadow-lg">
                  Ouvrir
                </button>
              </div>
            ))}
          </div>

          {/* LIENS DIRECTS INFRASTRUCTURE */}
          <div className="mt-12 p-8 bg-[#0f0f1a] border border-[#22223a] rounded-3xl">
             <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-[#5a587a] mb-8">
                <span className="flex items-center gap-2"><Activity size={14}/> Statut Infrastructure</span>
                <span className="text-[#4caf7d] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4caf7d] animate-pulse" />
                  Système Connecté
                </span>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <a href="https://n8n.ananda-communaute.cloud" target="_blank" rel="noreferrer" className="py-4 bg-[#05050a] border border-[#22223a] rounded-2xl text-center text-[11px] uppercase font-bold tracking-[0.2em] text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/40 transition-all flex items-center justify-center gap-2">
                  <ExternalLink size={12}/> n8n
                </a>
                <a href="https://dify.ananda-communaute.cloud" target="_blank" rel="noreferrer" className="py-4 bg-[#05050a] border border-[#22223a] rounded-2xl text-center text-[11px] uppercase font-bold tracking-[0.2em] text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/40 transition-all flex items-center justify-center gap-2">
                  <ExternalLink size={12}/> Dify
                </a>
             </div>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-16 flex items-center gap-4 text-[#5a587a] text-[12px] font-light italic border-t border-[#22223a] pt-8">
        <Clock size={14} />
        <p>Interface de pilotage synchronisée. Prêt pour l'action.</p>
      </footer>
    </div>
  );
}
