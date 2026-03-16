import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DashboardCard } from '../dashboard/DashboardCard';
import { User, TrendingUp, Star, MessageCircle } from 'lucide-react';
import { useMembers } from '../../hooks/useMembers';
import { AddMemberModal } from '../modals/AddMemberModal';

export const ClientTab = () => {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const { members, loading } = useMembers();

  const topEngagement = members
    .filter((m) => m.courses_completed > 0)
    .sort((a, b) => b.courses_completed - a.courses_completed)
    .slice(0, 3);

  const feedback = [
    { author: 'Sophie L.', rating: 5, comment: 'Les cours sont exceptionnels!', date: '16 Mars' },
    { author: 'Marc D.', rating: 5, comment: 'Transformation incroyable', date: '15 Mars' },
    { author: 'Julie P.', rating: 4, comment: 'Très bon contenu, merci', date: '14 Mars' },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <DashboardCard title="Nouveaux membres" icon="👥">
            <div className="space-y-3">
              {loading ? (
                <p className="text-center text-[#5a587a] py-4">Chargement...</p>
              ) : members.length === 0 ? (
                <p className="text-center text-[#5a587a] py-4">Aucun membre</p>
              ) : (
                members.slice(0, 4).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#c9a84c]/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#05050a]" />
                      </div>
                      <div>
                        <p className="text-[#e8e4d9] font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-[#5a587a]">{formatDate(member.join_date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-[#c9a84c]/20 border border-[#c9a84c]/40 rounded-full text-xs text-[#c9a84c] font-semibold">
                        {member.plan}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="w-full mt-4 py-2.5 bg-[#22223a] hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 rounded-lg text-[#c9a84c] text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Ajouter un membre
            </button>
          </DashboardCard>

        <DashboardCard title="Témoignages récents" icon="💬">
          <div className="space-y-4">
            {feedback.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-lg border border-[#22223a]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#e8c97a] font-semibold text-sm">{item.author}</span>
                  <div className="flex gap-0.5">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#c9a84c] text-[#c9a84c]" />
                    ))}
                  </div>
                </div>
                <p className="text-[#5a587a] text-sm italic mb-2">"{item.comment}"</p>
                <p className="text-xs text-[#5a587a]/70">{item.date}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="space-y-8">
        <DashboardCard title="Top engagement" icon="🏆">
          <div className="space-y-3">
            {topEngagement.length === 0 ? (
              <p className="text-center text-[#5a587a] py-4">Aucune donnée disponible</p>
            ) : (
              topEngagement.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0a0a15] to-[#0f0f1a] rounded-lg border border-[#22223a]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[#e8e4d9] font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-[#5a587a]">{member.courses_completed} cours complétés</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-[#4caf7d] font-semibold">{member.engagement_level}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Statistiques communauté" icon="📊">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a0a15] rounded-lg p-4 border border-[#22223a]">
              <p className="text-xs text-[#5a587a] mb-1">Membres actifs</p>
              <p className="text-2xl font-bold text-[#4caf7d]">{members.filter((m) => m.status === 'active').length}</p>
            </div>
            <div className="bg-[#0a0a15] rounded-lg p-4 border border-[#22223a]">
              <p className="text-xs text-[#5a587a] mb-1">Total membres</p>
              <p className="text-2xl font-bold text-[#c9a84c]">{members.length}</p>
            </div>
            <div className="bg-[#0a0a15] rounded-lg p-4 border border-[#22223a]">
              <p className="text-xs text-[#5a587a] mb-1">Cours complétés</p>
              <p className="text-2xl font-bold text-[#e8c97a]">{members.reduce((sum, m) => sum + m.courses_completed, 0)}</p>
            </div>
            <div className="bg-[#0a0a15] rounded-lg p-4 border border-[#22223a]">
              <p className="text-xs text-[#5a587a] mb-1">Premium</p>
              <p className="text-2xl font-bold text-[#7b5ea7]">{members.filter((m) => m.plan === 'Premium').length}</p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Support actif" icon="🎧">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#d95555]" />
                <span className="text-sm text-[#e8e4d9]">Tickets ouverts</span>
              </div>
              <span className="text-sm font-semibold text-[#d95555]">3</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#4caf7d]" />
                <span className="text-sm text-[#e8e4d9]">Résolus aujourd'hui</span>
              </div>
              <span className="text-sm font-semibold text-[#4caf7d]">12</span>
            </div>
          </div>
        </DashboardCard>
        </div>
      </div>

      <AddMemberModal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} />
    </>
  );
};
