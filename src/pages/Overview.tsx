import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, DollarSign, Mail, TrendingUp, TrendingDown } from 'lucide-react';
import { getStatsBaserow, getTachesAujourdhui, updateTacheStatut } from '../data/baserowApi';

interface Objective {
  id: string;
  text: string;
  completed: boolean;
}

export const Overview = () => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    balance: 0,
    unreadEmails: 0,
  });
  const [loading, setLoading] = useState(true);

  // ── Chargement des stats Baserow ──────────────────────────
  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await getStatsBaserow();
        setStats(s);
      } catch (e) {
        console.error('Erreur stats:', e);
      }
    };
    loadStats();
    const interval = setInterval(loadStats, 5 * 60 * 1000); // refresh toutes les 5 min
    return () => clearInterval(interval);
  }, []);

  // ── Chargement des tâches Baserow ─────────────────────────
  useEffect(() => {
    const loadTaches = async () => {
      try {
        const taches = await getTachesAujourdhui();
        setObjectives(taches.length > 0 ? taches : [
          { id: 'empty', text: 'Aucune tâche pour aujourd\'hui', completed: false }
        ]);
      } catch (e) {
        console.error('Erreur tâches:', e);
      } finally {
        setLoading(false);
      }
    };
    loadTaches();
  }, []);

  // ── Agenda Google Calendar via N8N ────────────────────────
  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await res.json();
        if (Array.isArray(data)) {
          const now = new Date();
          const upcoming = data
            .filter(item => {
              if (item.end?.dateTime) return new Date(item.end.dateTime) > now;
              if (item.end?.date) return new Date(item.end.date) > now;
              return false;
            })
            .sort((a, b) => {
              const tA = new Date(a.start?.dateTime || a.start?.date).getTime();
              const tB = new Date(b.start?.dateTime || b.start?.date).getTime();
              return tA - tB;
            })
            .slice(0, 7);
          setLiveEvents(upcoming);
        }
      } catch (e) {
        console.error("Erreur agenda:", e);
      }
    };
    fetchAgenda();
    const id = setInterval(fetchAgenda, 60000);
    return () => clearInterval(id);
  }, []);

  // ── Toggle tâche ──────────────────────────────────────────
  const toggleObjective = async (id: string) => {
    if (id === 'empty') return;
    const updated = objectives.map(o =>
      o.id === id ? { ...o, completed: !o.completed } : o
    );
    setObjectives(updated);
    const obj = objectives.find(o => o.id === id);
    if (obj) await updateTacheStatut(id, !obj.completed);
  };

  const statCards = [
    {
      label: 'Revenus du Mois',
      value: `${stats.monthlyRevenue}€`,
      icon: DollarSign,
      color: '#4caf7d',
      sub: stats.balance >= 0 ? `+${stats.balance}€ balance` : `${stats.balance}€ balance`,
      trend: stats.balance >= 0,
    },
    {
      label: 'Dépenses du Mois',
      value: `${stats.monthlyExpenses}€`,
      icon: TrendingDown,
      color: '#c9a84c',
      sub: 'Ce mois-ci',
      trend: null,
    },
    {
      label: 'Balance',
      value: `${stats.balance}€`,
      icon: TrendingUp,
      color: stats.balance >= 0 ? '#4caf7d' : '#d95555',
      sub: stats.balance >= 0 ? 'Positif ✓' : 'Attention',
      trend: stats.balance >= 0,
    },
    {
      label: 'Mails Non Traités',
      value: stats.unreadEmails,
      icon: Mail,
      color: stats.unreadEmails > 5 ? '#d95555' : '#4caf7d',
      sub: stats.unreadEmails === 0 ? 'Tout traité ✓' : 'À traiter',
      trend: stats.unreadEmails === 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
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
                <p className="text-xs mt-1" style={{ color: stat.color }}>{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Agenda + Tâches ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Agenda */}
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#05050a]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#e8e4d9]">Prochains RDV</h2>
              <p className="text-xs text-[#5a587a]">Connecté à Google Agenda</p>
            </div>
          </div>
          <div className="space-y-2">
            {liveEvents.length > 0 ? (
              liveEvents.map((item, index) => {
                const startTime = new Date(item.start?.dateTime || item.start?.date);
                const dateStr = startTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const timeStr = item.start?.dateTime
                  ? startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : 'Jour entier';
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#c9a84c]/30 transition-all">
                    <div className="w-1 h-10 rounded-full bg-[#c9a84c]" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                        <span className="text-xs font-semibold text-[#c9a84c]">{dateStr} • {timeStr}</span>
                      </div>
                      <h3 className="text-sm text-[#e8e4d9] font-medium">{item.summary || 'Rendez-vous'}</h3>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center border border-dashed border-[#22223a] rounded-lg">
                <span className="text-xs text-[#5a587a]">Synchronisation en cours...</span>
              </div>
            )}
          </div>
        </div>

        {/* Tâches du jour */}
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#e8e4d9]">Tâches du Jour</h2>
              <p className="text-xs text-[#5a587a]">Connecté à Baserow</p>
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-center">
              <span className="text-xs text-[#5a587a]">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  className="flex items-center gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#4caf7d]/30 transition-all cursor-pointer"
                  onClick={() => toggleObjective(obj.id)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    obj.completed ? 'bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] border-[#4caf7d]' : 'border-[#5a587a]'
                  }`}>
                    {obj.completed && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-sm transition-all ${obj.completed ? 'line-through text-[#5a587a]' : 'text-[#e8e4d9]'}`}>
                    {obj.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[#22223a]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#5a587a]">Progression</span>
              <span className="text-[#4caf7d] font-semibold">
                {objectives.filter(o => o.completed).length} / {objectives.filter(o => o.id !== 'empty').length}
              </span>
            </div>
            <div className="w-full bg-[#0a0a15] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#4caf7d] to-[#3d8f64] h-full rounded-full transition-all duration-300"
                style={{
                  width: objectives.filter(o => o.id !== 'empty').length > 0
                    ? `${(objectives.filter(o => o.completed).length / objectives.filter(o => o.id !== 'empty').length) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
