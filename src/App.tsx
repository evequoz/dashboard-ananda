import React, { useState } from 'react';
import { Calendar, Mail, GraduationCap, UserCheck, Briefcase, Sparkles, Activity, ExternalLink, Clock } from 'lucide-react';

export default function App() {
  // Données de démonstration (elles seront remplacées par n8n plus tard)
  const stats = { membres: 247, revenus: "3 840€" };

  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e4d9] p-4 md:p-10 font-sans selection:bg-[#c9a84c]/30">
      
      {/* HEADER : Identité et Chiffres clés */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-8 border-b border-[#22223a] gap-6">
        <div>
          <h1 className="text-4xl font-serif text-[#c9a84c] mb-2 tracking-tight">Ananda Dashboard</h1>
          <p className="text-sm text-[#5a587a] italic tracking-wide">Gestion Sacrée & Pilotage Formation</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-[#0f0f1a] px-6 py-3 rounded-2xl border border-[#22223a] text-right shadow-lg">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a587a] mb-1 font-bold">Membres Actifs</p>
            <p className="text-3xl text-[#c9a84c] font-light">{stats.membres}</p>
          </div>
          <div className="bg-[#0f0f1a] px-6 py-3 rounded-2xl border border-[#22223a] text-right shadow-lg">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a587a] mb-1 font-bold">Revenu Mensuel</p>
            <p className="text-3xl text-[#4caf7d] font-light">{stats.revenus}</p>
          </div>
        </div>
      </header>

      {/* GRILLE PRINCIPALE : Tout en un coup d'oeil */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLONNE GAUCHE (7/12) : Agenda et Intelligence */}
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-[#0f0f1a]/80 backdrop-blur-md border border-[#22223a] rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-serif text-[#e8e4d9] flex items-center gap-3">
                <Calendar className="text-[#c9a84c]" size={24} /> Agenda du jour
              </h2>
              <div className="text-[10px] text-[#5a587a] uppercase tracking-[0.3em] font-bold bg-[#05050a] px-4 py-1 rounded-full border border-[#22223a]">
                17 Mars 2026
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="group flex items-center gap-6 p-5 bg-[#141425]/40 border border-[#22223a] rounded-2xl hover:bg-[#141425] transition-all cursor-pointer">
                <div className="text-[#c9a84c] font-bold text-sm border-r border-[#22223a] pr-6">09:00</div>
                <div className="flex-1 text-[#e8e4d9] font-light italic">Kriya Yoga & Méditation profonde</div>
                <div className="text-[9px] px-3 py-1 rounded-full border border-[#c9a84c]/30 text-[#c9a84c] uppercase tracking-widest font-bold">Pratique</div>
              </div>
              <div className="group flex items-center gap-6 p-5 bg-[#141425]/40 border border-[#22223a] rounded-2xl hover:bg-[#141425] transition-all cursor-pointer">
                <div className="text-[#4a90e2] font-bold text-sm border-r border-[#22223a] pr-6">14:30</div>
                <div className="flex-1 text-[#e8e4d9] font-light italic">Accompagnement EHME — Session Groupe</div>
                <div className="text-[9px] px-3 py-1 rounded-full border border-[#4a90e2]/30 text-[#4a90e2] uppercase tracking-widest font-bold">Enseignement</div>
              </div>
            </div>
          </section>

          <section className="bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-3xl p-6 flex items-start gap-4 shadow-inner">
            <div className="p-3 bg-[#c9a84c]/10 rounded-xl border border-[#c9a84c]/20">
              <Sparkles size={20} className="text-[#c9a84c]" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#c9a84c] mb-2">Assistant de Pilotage</h3>
              <p className="text-[13px] text-[#e8e4d9]/80 italic leading-relaxed font-light">
                "Analyse en cours : Les étudiants posent beaucoup de questions sur le module 3. Je suggère de préparer une réponse commune pour info@eh-me.com."
              </p>
            </div>
          </section>
        </div>

        {/* COLONNE DROITE (5/12) : Tes 3 flux de Poste */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-2xl font-serif text-[#e8e4d9] flex items-center gap-3 mb-4">
            <Mail className="text-[#c9a84c]" size={24} /> Bureau de Poste
          </h2>
          
          <div className="space-y-4">
            {[
              { title: 'Formation', email: 'serge@eh-me.com', icon: GraduationCap, color: '#c9a84c', desc: 'Admin & Formations' },
              { title: 'Étudiants', email: 'info@eh-me.com', icon: UserCheck, color: '#4a90e2', desc: 'Questions & Support' },
              { title: 'Gestion', email: 'serge@seme.ch', icon: Briefcase, color: '#94a3b8', desc: 'Archives & Admin' }
            ].map((m) => (
              <div key={m.email} className="group flex items-center justify-between p-5 bg-[#0f0f1a] border border-[#22223a] rounded-2xl hover:border-white/10 transition-all">
                <div className="flex items-center gap-5">
                  <div className="p-3 rounded-xl bg-[#05050a] border border-[#22223a] group-hover:scale-110 transition-transform">
                    <m.icon size={22} style={{ color: m.color }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#e8e4d9]">{m.title}</h4>
                    <p className="text-[10px] text-[#5a587a] font-mono tracking-tight">{m.email}</p>
                  </div>
                </div>
                <button className="text-[9px] font-bold uppercase tracking-widest bg-[#22223a] px-4 py-2 rounded-lg hover:bg-[#c9a84c] hover:text-black transition-all">
                  Ouvrir
                </button>
              </div>
            ))}
          </div>

          {/* ÉTAT SYSTÈME */}
          <div className="mt-8 p-6 bg-[#0f0f1a] border border-[#22223a] rounded-2xl">
             <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-[#5a587a] mb-6">
                <span className="flex items-center gap-2"><Activity size={12}/> État Infrastructure</span>
                <span className="text-[#4caf7d] flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4caf7d] animate-pulse" />
                  Connecté
                </span>
             </div>
             <div className="flex gap-3">
                <a href="https://n8n.ananda-communaute.cloud" target="_blank" rel="noreferrer" className="flex-1 py-3 bg-[#05050a] border border-[#22223a] rounded-xl text-center text-[10px] uppercase font-bold tracking-[0.2em] text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/40 transition-all">n8n</a>
                <a href="https://dify.ananda-communaute.cloud" target="_blank" rel="noreferrer" className="flex-1 py-3 bg-[#05050a] border border-[#22223a] rounded-xl text-center text-[10px] uppercase font-bold tracking-[0.2em] text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/40 transition-all">Dify</a>
             </div>
          </div>
        </div>

      </main>

      {/* FOOTER : Horloge de pilotage */}
      <footer className="mt-12 flex items-center gap-4 text-[#5a587a] text-[11px] font-light italic border-t border-[#22223a] pt-6">
        <Clock size={12} />
        <p>Dashboard opérationnel. Dernière mise à jour effectuée à l'instant.</p>
      </footer>
    </div>
  );
}
