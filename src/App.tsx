import React, { useState } from 'react';
import { 
  Mail, 
  Sparkles, 
  ExternalLink,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { useN8nData } from './useData';

// --- STYLES ET POLICES ---
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
  body { font-family: 'Outfit', sans-serif; background-color: #05050a; color: #e8e4d9; }
  .serif { font-family: 'Playfair Display', serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
`;

// --- COMPOSANT COLONNE DE MAIL ---
const EmailInBox = ({ title, email, icon: Icon, color, messages }: any) => (
  <div className="flex-1 min-w-[320px] bg-[#0f0f1a]/60 border border-[#22223a] rounded-2xl overflow-hidden flex flex-col shadow-xl">
    {/* Header de la boîte */}
    <div className="p-5 border-b border-[#22223a] flex items-center justify-between" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center gap-3">
        <Icon size={18} style={{ color: color }} />
        <div>
          <h3 className="text-sm font-semibold serif tracking-wide">{title}</h3>
          <p className="text-[10px] text-[#5a587a] font-light">{email}</p>
        </div>
      </div>
      <span className="bg-[#141425] text-[10px] px-2 py-1 rounded-md border border-[#22223a] text-[#c9a84c]">
        {messages.length} Nouveau(x)
      </span>
    </div>

    {/* Liste des messages */}
    <div className="p-4 space-y-4 overflow-y-auto max-h-[500px] no-scrollbar">
      {messages.map((m: any, i: number) => (
        <div key={i} className="bg-[#141425]/40 border border-[#22223a] rounded-xl p-4 hover:border-[#c9a84c]/30 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-[#e8c97a]">{m.from}</span>
            <span className="text-[9px] text-[#5a587a]">{m.time}</span>
          </div>
          <p className="text-[12px] text-[#5a587a] leading-relaxed italic mb-4 line-clamp-2 group-hover:line-clamp-none transition-all">
            "{m.summary}"
          </p>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-lg text-[10px] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black transition-all font-bold tracking-widest uppercase">
              <Sparkles size={12} /> Brouillon IA
            </button>
            <button className="p-2 bg-[#22223a] rounded-lg text-[#5a587a] hover:text-white transition-all">
              <Send size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- APPLICATION PRINCIPALE ---

function App() {
  const { data: n8nData, loading } = useN8nData('https://n8n.ananda-communaute.cloud/webhook/stats');
  
  // Simulation de tes boîtes mails (sera remplacé par n8n)
  const mailBoxes = {
    formation: [
      { from: "Inscriptions 2026", time: "10 min", summary: "Demande de financement OPCO pour la formation Kriya." },
      { from: "Paiement Stripe", time: "2h", summary: "Confirmation de réception du solde pour l'étudiant #442." }
    ],
    etudiants: [
      { from: "Marc L.", time: "Juste maintenant", summary: "Question sur la posture de la leçon 3 du module Méditation." },
      { from: "Julie D.", time: "1h", summary: "Problème d'accès à l'espace membre EH-ME." }
    ],
    gestion: [
      { from: "Comptable", time: "Hier", summary: "Rappel pour les justificatifs de TVA du premier trimestre." }
    ]
  };

  return (
    <div className="min-h-screen p-6 md:p-10 selection:bg-[#c9a84c]/30">
      <style>{fontStyles}</style>
      
      {/* Services Links */}
      <div className="flex gap-4 mb-10 overflow-x-auto pb-2 no-scrollbar">
        {['Dify', 'n8n', 'AFFiNE'].map((s) => (
          <button key={s} className="flex items-center gap-2 px-4 py-1.5 bg-[#0f0f1a] border border-[#22223a] rounded-full text-[10px] text-[#5a587a] hover:text-[#c9a84c] transition-all tracking-widest uppercase font-light">
            <ExternalLink size={10} /> {s}
          </button>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8 border-b border-[#22223a]/50 pb-10">
        <div>
          <h1 className="text-5xl serif text-[#c9a84c] mb-2 font-normal tracking-tight">Bureau de Poste Intelligent</h1>
          <p className="text-[#5a587a] text-sm font-light italic opacity-70">"Trier, Analyser, Transmettre avec sérénité"</p>
        </div>
        <div className="flex gap-8 text-right">
            <div>
              <p className="text-[10px] text-[#5a587a] tracking-[0.2em] uppercase mb-1">État IA</p>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4caf7d] animate-pulse" />
                <p className="text-xs text-[#e8c97a]">Dify Opérationnel</p>
              </div>
            </div>
        </div>
      </header>

      {/* Colonnes de Tri */}
      <main className="flex flex-col xl:flex-row gap-8">
        <EmailInBox 
          title="Admin Formation" 
          email="serge@eh-me.com" 
          icon={GraduationCap} 
          color="#c9a84c" 
          messages={mailBoxes.formation}
        />
        <EmailInBox 
          title="Espace Étudiants" 
          email="info@eh-me.com" 
          icon={UserCheck} 
          color="#4a90e2" 
          messages={mailBoxes.etudiants}
        />
        <EmailInBox 
          title="Gestion & Archives" 
          email="serge@seme.ch" 
          icon={Briefcase} 
          color="#94a3b8" 
          messages={mailBoxes.gestion}
        />
      </main>

      {/* Footer Info */}
      <footer className="mt-12 flex items-center gap-4 text-[#5a587a] text-[11px] font-light italic">
        <Clock size={12} />
        <p>Dernière synchronisation des boîtes mail il y a 2 minutes.</p>
      </footer>
    </div>
  );
}

export default App;
