import { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle, Mail, Plus, ExternalLink,
  BookOpen, Lightbulb, FileText, RefreshCw, AlertCircle
} from 'lucide-react';
import { getStatsBaserow, getTachesAujourdhui, updateTacheStatut } from '../data/baserowApi';

interface Objective {
  id: string;
  text: string;
  completed: boolean;
}

const AFFINE_LINKS = [
  { label: 'AFFiNE — Espace de travail', url: 'https://affine.ananda-communaute.cloud', icon: BookOpen, color: '#c9a84c' },
  { label: 'Open WebUI — Assistant IA', url: 'https://cloud.ananda-communaute.cloud', icon: Lightbulb, color: '#7b5ea7' },
  { label: 'Baserow — Base de données', url: 'https://baserow.ananda-communaute.cloud', icon: FileText, color: '#5588d0' },
];

export const Overview = () => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ unreadEmails: 0, recentEmails: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // ── Stats emails ──
  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await getStatsBaserow();
        setStats(prev => ({ ...prev, unreadEmails: s.unreadEmails }));
        setLastSync(new Date());
      } catch (e) { console.error('Erreur stats:', e); }
    };
    loadStats();
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Tâches ──
  useEffect(() => {
    const loadTaches = async () => {
      try {
        const taches = await getTachesAujourdhui();
        setObjectives(taches.length > 0 ? taches : [
          { id: 'empty', text: 'Aucune tâche pour aujourd\'hui', completed: false }
        ]);
      } catch (e) { console.error('Erreur tâches:', e); }
      finally { setLoading(false); }
    };
    loadTaches();
  }, []);

  // ── Agenda ──
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
            .slice(0, 6);
          setLiveEvents(upcoming);
        }
      } catch (e) { console.error('Erreur agenda:', e); }
    };
    fetchAgenda();
    const id = setInterval(fetchAgenda, 60000);
    return () => clearInterval(id);
  }, []);

  const toggleObjective = async (id: string) => {
    if (id === 'empty') return;
    const updated = objectives.map(o => o.id === id ? { ...o, completed: !o.completed } : o);
    setObjectives(updated);
    const obj = objectives.find(o => o.id === id);
    if (obj) await updateTacheStatut(id, !obj.completed);
  };

  const completedCount = objectives.filter(o => o.completed).length;
  const totalCount = objectives.filter(o => o.id !== 'empty').length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Groupe les événements par jour
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isTomorrow = (d: Date) => d.toDateString() === tomorrow.toDateString();

  return (
    <div className="space-y-5">

      {/* ── Header résumé ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e4d9]">
            {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h1>
          <p className="text-sm text-[#5a587a] mt-0.5">
            {totalCount > 0
              ? `${completedCount}/${totalCount} tâches · ${liveEvents.filter(e => isToday(new Date(e.start?.dateTime || e.start?.date))).length} événements aujourd'hui`
              : `${liveEvents.filter(e => isToday(new Date(e.start?.dateTime || e.start?.date))).length} événements aujourd'hui`
            }
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5a587a]">
          <RefreshCw className="w-3 h-3" />
          {lastSync ? `Synchro ${lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Synchronisation...'}
        </div>
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* ── AGENDA ── */}
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#05050a]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#e8e4d9]">Agenda</h2>
                <p className="text-[10px] text-[#5a587a]">Prochains événements</p>
              </div>
            </div>
            <span className="text-xs text-[#5a587a] bg-[#0a0a15] border border-[#22223a] px-2 py-0.5 rounded-full">
              {liveEvents.length} à venir
            </span>
          </div>

          <div className="space-y-2">
            {liveEvents.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-[#22223a] rounded-lg">
                <span className="text-xs text-[#5a587a]">Aucun événement à venir</span>
              </div>
            ) : liveEvents.map((item, index) => {
              const startDate = new Date(item.start?.dateTime || item.start?.date);
              const isAllDay = !item.start?.dateTime;
              const dayLabel = isToday(startDate) ? 'Aujourd\'hui' : isTomorrow(startDate) ? 'Demain' : startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              const timeStr = isAllDay ? 'Journée' : startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const isNow = !isAllDay && startDate <= today && new Date(item.end?.dateTime) > today;

              return (
                <div key={index} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  isNow ? 'bg-[#c9a84c]/10 border-[#c9a84c]/30' : 'bg-[#0a0a15] border-[#22223a]'
                }`}>
                  <div className={`w-1 h-8 rounded-full flex-shrink-0 ${isNow ? 'bg-[#c9a84c]' : 'bg-[#22223a]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#e8e4d9] truncate">{item.summary || 'Événement'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-[#5a587a]" />
                      <span className="text-[10px] text-[#5a587a]">{dayLabel} · {timeStr}</span>
                      {isNow && <span className="text-[10px] text-[#c9a84c] font-bold">EN COURS</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── EMAILS ── */}
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.unreadEmails > 0
                  ? 'bg-gradient-to-br from-[#d95555] to-[#b84444]'
                  : 'bg-gradient-to-br from-[#4caf7d] to-[#3d8f64]'
              }`}>
                <Mail className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#e8e4d9]">Emails</h2>
                <p className="text-[10px] text-[#5a587a]">3 boîtes surveillées</p>
              </div>
            </div>
            {stats.unreadEmails > 0 ? (
              <span className="text-xs font-bold text-white bg-[#d95555] px-2.5 py-0.5 rounded-full">
                {stats.unreadEmails} non traités
              </span>
            ) : (
              <span className="text-xs text-[#4caf7d] bg-[#4caf7d]/10 border border-[#4caf7d]/30 px-2.5 py-0.5 rounded-full">
                Tout traité ✓
              </span>
            )}
          </div>

          {/* Résumé par boîte */}
          <div className="space-y-2 mb-4">
            {[
              { email: 'serge@eh-me.com', label: 'EH-ME', color: '#c9a84c' },
              { email: 'admin@eh-me.com', label: 'Admin', color: '#4caf7d' },
              { email: 'serge@seme.ch',   label: 'SEME',  color: '#7b5ea7' },
            ].map(account => (
              <div key={account.email} className="flex items-center justify-between p-2.5 bg-[#0a0a15] rounded-lg border border-[#22223a]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: account.color }} />
                  <span className="text-xs font-semibold text-[#e8e4d9]">{account.label}</span>
                  <span className="text-[10px] text-[#5a587a]">{account.email}</span>
                </div>
                <div className="w-2 h-2 bg-[#4caf7d] rounded-full animate-pulse" />
              </div>
            ))}
          </div>

          {stats.unreadEmails > 0 && (
            <div className="p-3 bg-[#d95555]/10 border border-[#d95555]/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#d95555] flex-shrink-0" />
              <p className="text-xs text-[#d95555]">
                {stats.unreadEmails} email{stats.unreadEmails > 1 ? 's' : ''} en attente de traitement
              </p>
            </div>
          )}
        </div>

        {/* ── TÂCHES ── */}
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#e8e4d9]">Tâches du jour</h2>
                <p className="text-[10px] text-[#5a587a]">Connecté à Baserow</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#4caf7d]">
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Barre de progression */}
          {totalCount > 0 && (
            <div className="mb-3">
              <div className="w-full bg-[#0a0a15] rounded-full h-1.5 overflow-hidden border border-[#22223a]">
                <div
                  className="bg-gradient-to-r from-[#4caf7d] to-[#3d8f64] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-4 text-center">
              <span className="text-xs text-[#5a587a]">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => toggleObjective(obj.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                    obj.id === 'empty'
                      ? 'border-dashed border-[#22223a] cursor-default'
                      : 'bg-[#0a0a15] border-[#22223a] hover:border-[#4caf7d]/30 cursor-pointer'
                  }`}
                >
                  {obj.id !== 'empty' && (
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      obj.completed ? 'bg-[#4caf7d] border-[#4caf7d]' : 'border-[#5a587a]'
                    }`}>
                      {obj.completed && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                  )}
                  <span className={`text-xs transition-all ${
                    obj.completed ? 'line-through text-[#5a587a]' :
                    obj.id === 'empty' ? 'text-[#5a587a] italic' : 'text-[#e8e4d9]'
                  }`}>
                    {obj.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── LIENS RAPIDES ── */}
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-[#7b5ea7] to-[#5a4480] rounded-lg flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e8e4d9]">Accès rapides</h2>
              <p className="text-[10px] text-[#5a587a]">Outils connectés</p>
            </div>
          </div>

          <div className="space-y-2">
            {AFFINE_LINKS.map((link, i) => {
              const Icon = link.icon;
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-opacity-60 transition-all group"
                  style={{ borderColor: `${link.color}20` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${link.color}60`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${link.color}20`)}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${link.color}15`, border: `1px solid ${link.color}30` }}>
                    <Icon className="w-4 h-4" style={{ color: link.color }} />
                  </div>
                  <span className="text-sm text-[#c8c4b8] group-hover:text-[#e8e4d9] transition-colors flex-1">
                    {link.label}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#5a587a] group-hover:text-[#c8c4b8] transition-colors" />
                </a>
              );
            })}

            {/* Lien Coolify */}
            <a
              href="https://coolify.ananda-communaute.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#4caf7d]/40 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#4caf7d]/10 border border-[#4caf7d]/20">
                <div className="w-2 h-2 bg-[#4caf7d] rounded-full animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="text-sm text-[#c8c4b8] group-hover:text-[#e8e4d9] transition-colors">
                  Coolify — Serveur VPS
                </span>
                <p className="text-[10px] text-[#5a587a]">72.61.94.209 · En ligne</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#5a587a] group-hover:text-[#c8c4b8] transition-colors" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
