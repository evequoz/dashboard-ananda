import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DashboardCard } from '../dashboard/DashboardCard';
import { AgendaItem } from '../dashboard/AgendaItem';
import { EmailItem } from '../dashboard/EmailItem';
import { EMAIL_DATA } from '../../constants/theme';
import { useAgenda } from '../../hooks/useAgenda';
import { AddAgendaModal } from '../modals/AddAgendaModal';
import { useToast } from '../../contexts/ToastContext';

export const OverviewTab = () => {
  const [isAddAgendaOpen, setIsAddAgendaOpen] = useState(false);
  const { items: agendaItems, loading } = useAgenda(new Date().toISOString().split('T')[0]);
  const { showToast } = useToast();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <DashboardCard title="Agenda du jour" icon="🕊️" className="lg:col-span-1">
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-[#5a587a] py-4">Chargement...</p>
            ) : agendaItems.length === 0 ? (
              <p className="text-center text-[#5a587a] py-4">Aucun événement aujourd'hui</p>
            ) : (
              agendaItems.map((item) => <AgendaItem key={item.id} {...item} />)
            )}
          </div>
          <button
            onClick={() => setIsAddAgendaOpen(true)}
            className="w-full mt-4 py-2.5 bg-[#22223a] hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 rounded-lg text-[#c9a84c] text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Ajouter un événement
          </button>
        </DashboardCard>

      <DashboardCard title="Emails importants" icon="📬" className="lg:col-span-1">
        <div className="space-y-1">
          {EMAIL_DATA.map((item, index) => (
            <EmailItem key={index} {...item} />
          ))}
        </div>
      </DashboardCard>

      <div className="lg:col-span-1 space-y-8">
        <DashboardCard title="Actions IA" icon="🪄">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-6 rounded-xl border border-[#c9a84c]/30 backdrop-blur-sm">
            <p className="text-[#e8c97a] text-sm italic mb-5 leading-relaxed">
              "Rédige le récapitulatif du cours d'hier..."
            </p>
            <button
              onClick={() => showToast('info', 'Automatisation lancée ! L\'IA travaille sur votre demande.')}
              className="w-full py-3.5 bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] border-0 rounded-lg font-semibold cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-[#c9a84c]/40 active:scale-95"
            >
              Lancer l'automatisation
            </button>
          </div>
          <p className="text-xs text-[#5a587a] mt-4 text-center font-light">
            Dernière analyse effectuée il y a 12 min.
          </p>
        </DashboardCard>

        <DashboardCard title="Statut Système" icon="⚙️">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <span className="text-sm text-[#e8e4d9]">VPS Cloud</span>
              <span className="text-[#4caf7d] flex items-center gap-2 text-sm font-medium">
                <span className="w-2.5 h-2.5 bg-[#4caf7d] rounded-full animate-pulse shadow-lg shadow-[#4caf7d]/50" />
                En ligne
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <span className="text-sm text-[#e8e4d9]">Dernière synchro</span>
              <span className="text-sm text-[#5a587a]">Il y a 2 min</span>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>

    <AddAgendaModal isOpen={isAddAgendaOpen} onClose={() => setIsAddAgendaOpen(false)} />
  </>
  );
};
