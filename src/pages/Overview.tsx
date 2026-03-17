import { useState } from 'react';
import { Calendar, Clock, Sparkles, TrendingUp, Activity, CheckCircle, Users, DollarSign, Mail, Award } from 'lucide-react';
import { mockAgenda, mockObjectives, Objective, getStats } from '../data/mockData';

export const Overview = () => {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [objectives, setObjectives] = useState<Objective[]>(mockObjectives);
  const stats = getStats();

  const toggleObjective = (id: string) => {
    setObjectives(objectives.map(obj =>
      obj.id === id ? { ...obj, completed: !obj.completed } : obj
    ));
  };

  const statCards = [
    { label: 'Membres Actifs', value: stats.activeMembers, icon: Users, color: '#4caf7d' },
    { label: 'Revenus du Mois', value: `${stats.monthlyRevenue}€`, icon: DollarSign, color: '#c9a84c' },
    { label: 'Taux Premium', value: `${Math.round((stats.premiumMembers / stats.totalMembers) * 100)}%`, icon: Award, color: '#e8c97a' },
    { label: 'Mails Non Lus', value: stats.unreadEmails, icon: Mail, color: '#d95555' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-lg border border-[#22223a] p-4 flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`,
                  border: `1px solid ${stat.color}30`,
                }}
              >
                <Icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#5a587a] mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-[#e8e4d9]">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#05050a]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#e8e4d9]">Agenda</h2>
                <p className="text-xs text-[#5a587a]">
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  view === 'day'
                    ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a]'
                    : 'bg-[#0a0a15] text-[#5a587a] hover:text-[#e8e4d9] border border-[#22223a]'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  view === 'week'
                    ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a]'
                    : 'bg-[#0a0a15] text-[#5a587a] hover:text-[#e8e4d9] border border-[#22223a]'
                }`}
              >
                Semaine
              </button>
            </div>
          </div>

          {view === 'day' ? (
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
          ) : (
            <div className="space-y-3">
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map((day, index) => (
                <div key={day} className="p-4 bg-[#0a0a15] rounded-lg border border-[#22223a]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#c9a84c]">{day}</h3>
                    <span className="text-xs text-[#5a587a]">
                      {index === 0 ? '4 événements' : `${Math.floor(Math.random() * 3) + 1} événements`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-[#e8e4d9]">Objectifs du Jour</h2>
          </div>

          <div className="space-y-2">
            {objectives.map((objective) => (
              <div
                key={objective.id}
                className="flex items-center gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#4caf7d]/30 transition-all cursor-pointer"
                onClick={() => toggleObjective(objective.id)}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    objective.completed
                      ? 'bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] border-[#4caf7d]'
                      : 'border-[#5a587a]'
                  }`}
                >
                  {objective.completed && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <span
                  className={`text-sm transition-all ${
                    objective.completed
                      ? 'line-through text-[#5a587a]'
                      : 'text-[#e8e4d9]'
                  }`}
                >
                  {objective.text}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#22223a]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#5a587a]">Progression</span>
              <span className="text-[#4caf7d] font-semibold">
                {objectives.filter(o => o.completed).length} / {objectives.length}
              </span>
            </div>
            <div className="w-full bg-[#0a0a15] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#4caf7d] to-[#3d8f64] h-full rounded-full transition-all duration-300"
                style={{ width: `${(objectives.filter(o => o.completed).length / objectives.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#c9a84c]/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#05050a]" />
            </div>
            <h2 className="text-lg font-semibold text-[#e8c97a]">Insights IA</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0a0a15]/50 rounded-lg p-4 border border-[#c9a84c]/20">
              <p className="text-sm text-[#e8c97a] italic mb-3 leading-relaxed">
                "L'engagement communauté a augmenté de 23% cette semaine."
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
            <div className="w-10 h-10 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-[#e8e4d9]">Croissance</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#5a587a]">Nouveaux membres</span>
                <span className="text-2xl font-bold text-[#4caf7d]">+12</span>
              </div>
              <div className="text-xs text-[#5a587a]">Cette semaine</div>
            </div>
            <div className="pt-4 border-t border-[#22223a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#5a587a]">Revenus</span>
                <span className="text-2xl font-bold text-[#c9a84c]">+34%</span>
              </div>
              <div className="text-xs text-[#5a587a]">vs mois dernier</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7b5ea7] to-[#6b4e97] rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-[#e8e4d9]">Engagement</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5a587a]">Sessions aujourd'hui</span>
              <span className="text-2xl font-bold text-[#e8c97a]">47</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[#22223a]">
              <span className="text-xs text-[#5a587a]">Durée moyenne</span>
              <span className="text-2xl font-bold text-[#e8c97a]">23 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
