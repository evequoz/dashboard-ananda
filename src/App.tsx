import React from 'react';
import { Calendar, Mail, GraduationCap, UserCheck, Briefcase, Sparkles, Activity } from 'lucide-react';

// COMPOSANTS INTERNES (Inclus pour éviter les erreurs de fichiers manquants)
const Card = ({ title, icon: Icon, children, color = "#c9a84c" }: any) => (
  <div className="bg-[#0f0f1a] border border-[#22223a] rounded-2xl p-6 shadow-xl h-full">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-[#05050a] border border-[#22223a]">
        <Icon size={20} style={{ color }} />
      </div>
      <h3 className="text-lg font-serif text-[#e8e4d9]">{title}</h3>
    </div>
    {children}
  </div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e4d9] p-4 md:p-10 font-sans">
      
      {/* HEADER : Tes stats clés */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-8 border-b border-[#22223a] gap-6">
        <div>
          <h1 className="text-4xl font-serif text-[#c9a84c] mb-2">Ananda Dashboard</h1>
          <p className="text-sm text-[#5a587a] italic">Pilotage Intégré • Serge Évéquoz</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-[#0f0f1a] px-6 py-3 rounded-xl border border-[#22223a] text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#5a587a] mb-1">Membres</p>
            <p className="text-2xl text-[#c9a84c]">247</p>
          </div>
          <div className="bg-[#0f0f1a] px-6 py-3 rounded-xl border border-[#22223a] text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#5a587a] mb-1">Revenus</p>
            <p className="text-2xl text-[#4caf7d]">3 840€</p>
          </div>
        </div>
      </header>

      {/* GRILLE : Tout sur un seul écran */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* AGENDA & IA (Colonne de gauche) */}
        <div className="lg:col-span-5 space-y-8">
          <Card title="Agenda du jour" icon={Calendar}>
            <div className="space-y-4">
              <div className="p-4 bg-[#141425]/40 border-l-2 border-[#c9a84c] rounded-r-xl">
                <p className="text-[11px] text-[#c9a84c] font-bold">09:00</p>
                <p className="text-sm">Kriya Yoga & Méditation</p>
              </div>
              <div className="p-4 bg-[#141425]/40 border-l-2 border-[#4a90e2] rounded-r-xl opacity-50">
                <p className="text-[11px] text-[#4a90e2] font-bold">14:30</p>
                <p className="text-sm">Accompagnement EHME</p>
              </div>
            </div>
          </Card>

          <div className="bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-[#c9a84c] mb-3">
              <Sparkles size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Analyse IA (Dify)</h3>
            </div>
            <p className="text-sm text-[#e8e4d9]/80 italic">"Priorité : 3 questions sur le module Méditation."</p>
          </div>
        </div>

        {/* POSTE (Colonne de droite) */}
        <div className="lg:col-span-7">
          <Card title="Flux de Communication (3 Adresses)" icon={Mail}>
            <div className="space-y-4">
              {[
                { label: 'Formation', email: 'serge@eh-me.com', icon: GraduationCap, color: '#c9a84c' },
                { label: 'Étudiants', email: 'info@eh-me.com', icon: UserCheck, color: '#4a90e2' },
                { label: 'Gestion', email: 'serge@seme.ch', icon: Briefcase, color: '#94a3b8' }
              ].map((box) => (
                <div key={box.email} className="flex items-center justify-between p-4 bg-[#05050a] border border-[#22223a] rounded-xl">
                  <div className="flex items-center gap-4">
                    <box.icon size={18} style={{ color: box.color }} />
                    <div>
                      <p className="text-xs font-bold">{box.label}</p>
                      <p className="text-[10px] text-[#5a587a]">{box.email}</p>
                    </div>
                  </div>
                  <button className="text-[9px] font-bold uppercase tracking-tighter border border-[#22223a] px-4 py-2 rounded-lg hover:border-[#c9a84c] transition-all">
                    Ouvrir
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </main>

      {/* FOOTER : État du serveur */}
      <footer className="mt-12 flex items-center justify-between text-[#5a587a] text-[10px] uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4caf7d]" />
            <span>VPS Online</span>
          </div>
          <div className="w-px h-3 bg-[#22223a]" />
          <span>Dernière synchro : Juste maintenant</span>
        </div>
        <div className="flex gap-4">
          <a href="https://n8n.ananda-communaute.cloud" target="_blank" className="hover:text-[#c9a84c]">n8n</a>
          <a href="https://dify.ananda-communaute.cloud" target="_blank" className="hover:text-[#c9a84c]">Dify</a>
        </div>
      </footer>
    </div>
  );
}
