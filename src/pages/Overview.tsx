import { useState, useEffect, useRef } from 'react';
import {
  Calendar, Clock, CheckCircle, Mail, Plus, ExternalLink,
  BookOpen, Lightbulb, FileText, ChevronRight, Flag, Server
} from 'lucide-react';
import { getStatsBaserow, getTachesAujourdhui, updateTacheStatut } from '../data/baserowApi';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const API_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_TACHES = 536;
const HEADERS = {
  Authorization: `Token ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

interface Tache {
  id: string;
  text: string;
  completed: boolean;
  priorite: string;
  projet: string;
  dateEcheance: string | null;
}

const PROJET_COLORS: Record<string, string> = {
  'Formation': '#5588d0',
  'Admin':     '#c9a84c',
  'Doterra':   '#d98844',
  'Contenu':   '#7b5ea7',
  'Perso':     '#4caf7d',
  '':          '#5a587a',
};
const getProjetColor = (p: string) => PROJET_COLORS[p] || '#5a587a';

const QUICK_LINKS = [
  { label: 'AFFiNE',     url: 'https://affine.ananda-communaute.cloud',  icon: BookOpen,  color: '#c9a84c' },
  { label: 'Open WebUI', url: 'https://cloud.ananda-communaute.cloud',   icon: Lightbulb, color: '#7b5ea7' },
  { label: 'Baserow',    url: 'https://baserow.ananda-communaute.cloud', icon: FileText,  color: '#5588d0' },
  { label: 'Coolify',    url: 'https://coolify.ananda-communaute.cloud', icon: Server,    color: '#4caf7d' },
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDayLabel = (date: Date) => {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, tomorrow)) return 'Demain';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
};

export const Overview = () => {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtreProjet, setFiltreProjet] = useState('Tout');
  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // ── Emails ──
  useEffect(() => {
    const load = async () => {
      try { const s = await getStatsBaserow(); setUnreadEmails(s.unreadEmails); } catch {}
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── Tâches ──
  useEffect(() => { loadTaches(); }, []);

  const loadTaches = async () => {
    try { const t = await getTachesAujourdhui(); setTaches(t); }
    catch {} finally { setLoading(false); }
  };

  // ── Agenda 7 jours ──
  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await res.json();
        if (Array.isArray(data)) {
          const now = new Date();
          const in7 = new Date(now); in7.setDate(now.getDate() + 7);
          setLiveEvents(
            data
              .filter(item => {
                const end = new Date(item.end?.dateTime || item.end?.date);
                const start = new Date(item.start?.dateTime || item.start?.date);
                return end > now && start <= in7;
              })
              .sort((a, b) =>
                new Date(a.start?.dateTime || a.start?.date).getTime() -
                new Date(b.start?.dateTime || b.start?.date).getTime()
              )
          );
        }
      } catch {}
    };
    fetchAgenda();
    const t = setInterval(fetchAgenda, 60000);
    return () => clearInterval(t);
  }, []);

  // ── Toggle tâche (disparaît quand cochée) ──
  const toggleTache = async (id: string) => {
    setTaches(prev => prev.filter(t => t.id !== id));
    await updateTacheStatut(id, true);
  };

  // ── Ajout rapide ──
  const ajouterTache = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_TACHES}/?user_field_names=true`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          Titre: newTask.trim(), Statut: 'À faire', Priorité: 'Normale',
          'Date échéance': new Date().toISOString().split('T')[0],
        }),
      });
      const row = await res.json();
      setTaches(prev => [...prev, {
        id: row.id.toString(), text: newTask.trim(),
        completed: false, priorite: 'Normale', projet: '', dateEcheance: null,
      }]);
      setNewTask(''); setAddingTask(false);
    } catch (e) { console.error(e); }
  };

  // ── Données dérivées ──
  const today = new Date();
  const projets = ['Tout', ...Array.from(new Set(taches.map(t => t.projet).filter(Boolean)))];
  const tachesFiltrees = taches.filter(t => filtreProjet === 'Tout' || t.projet === filtreProjet);
  const hautesPriorites = taches.filter(t => t.priorite === 'Haute').length;

  // Grouper par jour
  const eventsByDay: Record<string, any[]> = {};
  liveEvents.forEach(item => {
    const key = new Date(item.start?.dateTime || item.start?.date).toDateString();
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(item);
  });

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e8e4d9] capitalize">
            {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            {hautesPriorites > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#d95555]">
                <Flag className="w-3 h-3" /> {hautesPriorites} haute{hautesPriorites > 1 ? 's' : ''} priorité
              </span>
            )}
            {unreadEmails > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#d95555]">
                <Mail className="w-3 h-3" /> {unreadEmails} email{unreadEmails > 1 ? 's' : ''} en attente
              </span>
            )}
            {hautesPriorites === 0 && unreadEmails === 0 && (
              <span className="flex items-center gap-1 text-xs text-[#4caf7d]">
                <CheckCircle className="w-3 h-3" /> Tout est à jour ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-2 gap-4">

        {/* ══ AGENDA ══ */}
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-5 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#05050a]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e8e4d9]">Agenda — 7 jours</h2>
              <p className="text-[10px] text-[#5a587a]">{liveEvents.length} événements</p>
            </div>
          </div>

          <div className="overflow-y-auto space-y-4 pr-1" style={{ maxHeight: '440px' }}>
            {Object.keys(eventsByDay).length === 0 ? (
              <div className="p-4 text-center border border-dashed border-[#22223a] rounded-lg">
                <span className="text-xs text-[#5a587a]">Aucun événement cette semaine</span>
              </div>
            ) : Object.entries(eventsByDay).map(([dayKey, items]) => {
              const dayDate = new Date(dayKey);
              const isToday = isSameDay(dayDate, today);
              return (
                <div key={dayKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold capitalize shrink-0 ${isToday ? 'text-[#c9a84c]' : 'text-[#5a587a]'}`}>
                      {formatDayLabel(dayDate)}
                    </span>
                    <div className="flex-1 h-px bg-[#22223a]" />
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item, i) => {
                      const start = new Date(item.start?.dateTime || item.start?.date);
                      const end = new Date(item.end?.dateTime || item.end?.date);
                      const isAllDay = !item.start?.dateTime;
                      const isNow = !isAllDay && start <= today && end > today;
                      const timeStr = isAllDay
                        ? 'Journée entière'
                        : start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
                          ' → ' + end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                          isNow ? 'bg-[#c9a84c]/10 border-[#c9a84c]/40' : 'bg-[#05050a] border-[#22223a]'
                        }`}>
                          <div className={`w-0.5 rounded-full self-stretch flex-shrink-0 ${
                            isNow ? 'bg-[#c9a84c]' : isToday ? 'bg-[#5588d0]' : 'bg-[#22223a]'
                          }`} style={{ minHeight: '28px' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-[#e8e4d9] truncate">{item.summary || 'Événement'}</p>
                              {isNow && (
                                <span className="text-[9px] font-bold text-[#c9a84c] bg-[#c9a84c]/15 px-1.5 py-0.5 rounded-full border border-[#c9a84c]/30 flex-shrink-0">
                                  EN COURS
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-[#5a587a]" />
                              <span className="text-[10px] text-[#5a587a]">{timeStr}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ COLONNE DROITE ══ */}
        <div className="flex flex-col gap-4">

          {/* TÂCHES */}
          <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#e8e4d9]">Tâches à faire</h2>
                  <p className="text-[10px] text-[#5a587a]">{tachesFiltrees.length} tâche{tachesFiltrees.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Filtres */}
            {projets.length > 1 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {projets.map(p => (
                  <button key={p} onClick={() => setFiltreProjet(p)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
                    style={{
                      background: filtreProjet === p ? `${getProjetColor(p)}20` : 'transparent',
                      borderColor: filtreProjet === p ? `${getProjetColor(p)}60` : '#22223a',
                      color: filtreProjet === p ? getProjetColor(p) : '#5a587a',
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Liste */}
            <div className="space-y-1.5 mb-3 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {loading ? (
                <p className="text-xs text-[#5a587a] text-center py-4">Chargement...</p>
              ) : tachesFiltrees.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-[#22223a] rounded-lg">
                  <p className="text-xs text-[#5a587a]">Aucune tâche en cours ✓</p>
                </div>
              ) : tachesFiltrees.map(tache => (
                <div key={tache.id} onClick={() => toggleTache(tache.id)}
                  className="flex items-center gap-2.5 p-2.5 bg-[#05050a] rounded-lg border border-[#22223a] hover:border-[#4caf7d]/30 cursor-pointer transition-all group">
                  <div className="w-4 h-4 rounded border-2 border-[#5a587a] flex-shrink-0 group-hover:border-[#4caf7d] transition-colors" />
                  <span className="text-xs text-[#e8e4d9] flex-1 truncate">{tache.text}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {tache.priorite === 'Haute' && <Flag className="w-3 h-3 text-[#d95555]" />}
                    {tache.projet && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full border"
                        style={{ color: getProjetColor(tache.projet), borderColor: `${getProjetColor(tache.projet)}40`, background: `${getProjetColor(tache.projet)}10` }}>
                        {tache.projet}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Ajout rapide */}
            {addingTask ? (
              <div className="flex gap-2">
                <input value={newTask} onChange={e => setNewTask(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') ajouterTache(); if (e.key === 'Escape') { setAddingTask(false); setNewTask(''); } }}
                  placeholder="Titre... (Entrée pour valider, Échap pour annuler)"
                  className="flex-1 bg-[#05050a] border border-[#4caf7d]/40 rounded-lg px-3 py-2 text-xs text-[#e8e4d9] placeholder-[#5a587a] focus:outline-none focus:border-[#4caf7d]" />
                <button onClick={ajouterTache} className="px-3 py-2 bg-[#4caf7d] rounded-lg text-xs font-bold text-[#05050a] hover:bg-[#3d8f64] transition-colors">✓</button>
              </div>
            ) : (
              <button onClick={() => setAddingTask(true)}
                className="flex items-center gap-2 w-full p-2 rounded-lg border border-dashed border-[#22223a] text-xs text-[#5a587a] hover:text-[#4caf7d] hover:border-[#4caf7d]/40 transition-all">
                <Plus className="w-3.5 h-3.5" /> Ajouter une tâche
              </button>
            )}
          </div>

          {/* EMAILS + LIENS */}
          <div className="grid grid-cols-2 gap-3">

            {/* Emails */}
            <div className={`rounded-xl border p-4 ${unreadEmails > 0 ? 'bg-[#d95555]/08 border-[#d95555]/30' : 'bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] border-[#22223a]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${unreadEmails > 0 ? 'bg-[#d95555]/20' : 'bg-[#4caf7d]/20'}`}>
                  <Mail className={`w-3.5 h-3.5 ${unreadEmails > 0 ? 'text-[#d95555]' : 'text-[#4caf7d]'}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#e8e4d9]">Emails</p>
                  <p className="text-[10px] text-[#5a587a]">3 boîtes</p>
                </div>
              </div>
              {unreadEmails > 0 ? (
                <div>
                  <p className="text-2xl font-bold text-[#d95555]">{unreadEmails}</p>
                  <p className="text-[10px] text-[#d95555]">non traités</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-[#4caf7d] font-semibold">Tout traité ✓</p>
                </div>
              )}
            </div>

            {/* Liens */}
            <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-4">
              <p className="text-xs font-bold text-[#e8e4d9] mb-3">Accès rapides</p>
              <div className="space-y-2">
                {QUICK_LINKS.map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 group transition-all">
                      <Icon className="w-3 h-3 flex-shrink-0" style={{ color: link.color }} />
                      <span className="text-[11px] text-[#5a587a] group-hover:text-[#e8e4d9] transition-colors truncate flex-1">{link.label}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-[#22223a] group-hover:text-[#5a587a] flex-shrink-0 transition-colors" />
                    </a>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
