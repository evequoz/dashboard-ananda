import { Calendar, Clock, Sparkles, TrendingUp, Users, Activity } from 'lucide-react';
import { mockAgenda, mockMembers } from '../data/mockData';

export const Overview = () => {
  const recentActivity = [
    { type: 'member', text: 'Sophie Martin a complété le Module 5', time: 'Il y a 15 min' },
    { type: 'revenue', text: 'Nouveau paiement Premium : 97€', time: 'Il y a 1h' },
    { type: 'engagement', text: '12 membres actifs en ce moment', time: 'Il y a 2h' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#05050a]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#e8e4d9]">Agenda du Jour</h2>
                <p className="text-xs text-[#5a587a]">
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {mockAgenda.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#c9a84c]/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-[#c9a84c]" />
                      <span className="text-sm font-semibold text-[#c9a84c]">{item.time}</span>
                    </div>
                    <h3 className="text-[#e8e4d9] font-medium">{item.title}</h3>
                    <p className="text-xs text-[#5a587a] mt-1">{item.duration}</p>
                  </div>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${item.color}20`,
                    color: item.color,
                    border: `1px solid ${item.color}40`,
                  }}
                >
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#c9a84c]/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#05050a]" />
              </div>
              <h2 className="text-lg font-semibold text-[#e8c97a]">Insights IA</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0a0a15]/50 rounded-lg p-4 border border-[#c9a84c]/20">
                <p className="text-sm text-[#e8c97a] italic mb-3">
                  "L'engagement communauté a augmenté de 23% cette semaine. Opportunité : Lancer une offre Premium+"
                </p>
                <button className="w-full py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] rounded-lg font-semibold text-sm hover:scale-105 transition-transform">
                  Analyser en détail
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5a587a]">Taux de complétion</span>
                  <span className="text-[#4caf7d] font-semibold">87%</span>
                </div>
                <div className="w-full bg-[#0a0a15] rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#4caf7d] to-[#3d8f64] h-full rounded-full" style={{ width: '87%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7b5ea7] to-[#6a4d96] rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-[#e8e4d9]">Activité Récente</h2>
            </div>

            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b border-[#22223a] last:border-0">
                  <div className="w-2 h-2 bg-[#c9a84c] rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-[#e8e4d9]">{activity.text}</p>
                    <p className="text-xs text-[#5a587a] mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-[#4caf7d]" />
            <h3 className="font-semibold text-[#e8e4d9]">Top Performers</h3>
          </div>
          <div className="space-y-3">
            {mockMembers
              .sort((a, b) => b.coursesCompleted - a.coursesCompleted)
              .slice(0, 3)
              .map((member, index) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#c9a84c]">#{index + 1}</span>
                    <span className="text-sm text-[#e8e4d9]">{member.name}</span>
                  </div>
                  <span className="text-xs text-[#4caf7d] font-semibold">
                    {member.coursesCompleted} cours
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-[#c9a84c]" />
            <h3 className="font-semibold text-[#e8e4d9]">Croissance</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#5a587a]">Nouveaux membres</span>
                <span className="text-sm font-bold text-[#4caf7d]">+12</span>
              </div>
              <div className="text-xs text-[#5a587a]">Cette semaine</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#5a587a]">Revenus</span>
                <span className="text-sm font-bold text-[#c9a84c]">+34%</span>
              </div>
              <div className="text-xs text-[#5a587a]">vs mois dernier</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-[#7b5ea7]" />
            <h3 className="font-semibold text-[#e8e4d9]">Engagement</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5a587a]">Sessions aujourd'hui</span>
              <span className="text-sm font-bold text-[#e8c97a]">47</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5a587a]">Durée moyenne</span>
              <span className="text-sm font-bold text-[#e8c97a]">23 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
