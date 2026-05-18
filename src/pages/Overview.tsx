import { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle, Mail, Plus,
  BookOpen, Lightbulb, Flag, Server, X, Trash2, ExternalLink, Users, PauseCircle, TrendingUp
} from 'lucide-react';
import {
  getTachesAujourdhui,
  updateTacheStatut,
  listInboxEmails,
  updateInboxEmail,
  deleteInboxEmail,
  notifyInboxDeletionSync,
  createTaskLegacy,
  refreshUntreatedEmailCount,
} from '../data/supabaseApi';
import { parseJsonResponseBody } from '../lib/parseJsonResponseBody';

interface Tache {
  id: string; text: string; completed: boolean;
  priorite: string; projet: string; dateEcheance: string | null;
}
interface EmailItem {
  id: number; Sujet: string; 'Expéditeur': string;
  'Résumé IA': string; 'Date réception': string | null;
  Traité: boolean; Compte: string;
}
interface CalendarEventItem {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const PROJET_COLORS: Record<string, { color: string; bg: string }> = {
  'Formation': { color: '#6699e0', bg: '#6699e018' },
  'Admin':     { color: '#d4b060', bg: '#d4b06018' },
  'Doterra':   { color: '#e09855', bg: '#e0985518' },
  'Contenu':   { color: '#9b7ec8', bg: '#9b7ec818' },
  'Perso':     { color: '#5dc98d', bg: '#5dc98d18' },
};
const pc = (p: string) => PROJET_COLORS[p] || { color: '#8080a0', bg: '#8080a018' };

const ACCOUNT_COLORS: Record<string, string> = {
  'serge@eh-me.com': '#d4b060',
  'admin@eh-me.com': '#5dc98d',
  'serge@seme.ch':   '#9b7ec8',
};

const QUICK_LINKS = [
  { label: 'AFFiNE',     url: 'https://affine.ananda-communaute.cloud',  icon: BookOpen,  color: '#d4b060' },
  { label: 'Open WebUI', url: 'https://cloud.ananda-communaute.cloud',   icon: Lightbulb, color: '#9b7ec8' },
  { label: 'Coolify',    url: 'https://coolify.ananda-communaute.cloud', icon: Server,    color: '#5dc98d' },
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getDayLabel = (d: Date) => {
  const t = new Date(); const tm = new Date(t); tm.setDate(t.getDate() + 1);
  if (isSameDay(d, t)) return "Aujourd'hui";
  if (isSameDay(d, tm)) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
};

const getInitials = (from: string) => {
  const name = from.replace(/<.*>/, '').replace(/"/g, '').trim();
  const parts = name.split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const MOCK_PARAMPARA_STATS = {
  nouveauxAbonnes7j: 12,
  abonnementsSuspendus: 3,
  activiteSemaine: '+8%',
};

export const Overview = () => {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tout');
  const [focusFilter, setFocusFilter] = useState<'all' | 'urgent' | 'today' | 'waiting'>('all');
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);

  const loadEmails = async () => {
    try {
      const data = await listInboxEmails(50);
      setEmails((data || []).filter((e) => !e.Traité).reverse() as EmailItem[]);
    } catch {
      // Ignore transient inbox fetch errors on dashboard.
    }
  };

  useEffect(() => { loadEmails(); const t = setInterval(loadEmails, 3 * 60 * 1000); return () => clearInterval(t); }, []);
  useEffect(() => { getTachesAujourdhui().then(t => { setTaches(t); setLoading(false); }).catch(() => setLoading(false)); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await parseJsonResponseBody(res);
        if (Array.isArray(data)) {
          const now = new Date(); const in7 = new Date(now); in7.setDate(now.getDate() + 7);
          setEvents(data.filter(i => new Date(i.end?.dateTime || i.end?.date) > now && new Date(i.start?.dateTime || i.start?.date) <= in7)
            .sort((a, b) => new Date(a.start?.dateTime || a.start?.date).getTime() - new Date(b.start?.dateTime || b.start?.date).getTime()));
        }
      } catch {
        // Ignore transient calendar webhook failures on dashboard.
      }
    };
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, []);

  const toggleTache = async (id: string) => { setTaches(p => p.filter(t => t.id !== id)); await updateTacheStatut(id, true); };
  const openTaskInTasksPage = (id: string) => {
    localStorage.setItem('dashboard-open-task-id', id);
    window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: { page: 'tasks' } }));
  };
  const marquerTraite = async (id: number) => {
    setEmails(p => p.filter(e => e.id !== id));
    try {
      await updateInboxEmail(id, { Traité: true });
      await refreshUntreatedEmailCount();
    } catch {
      /* optimistic UI */
    }
  };
  const supprimerEmail = async (id: number) => {
    setEmails(p => p.filter(e => e.id !== id));
    try {
      const email = emails.find(e => e.id === id);
      await notifyInboxDeletionSync([{ id, accountEmail: email?.Compte }], 'hard_delete');
      await deleteInboxEmail(id);
    } catch {
      // Keep optimistic deletion in UI if backend call fails.
    }
  };
  const ajouterTache = async () => {
    if (!newTask.trim()) return;
    try {
      const row = await createTaskLegacy({ Titre: newTask.trim(), Statut: 'À faire', Priorité: 'Normale', 'Date échéance': new Date().toISOString().split('T')[0] });
      setTaches(p => [...p, { id: row.id.toString(), text: newTask.trim(), completed: false, priorite: 'Normale', projet: '', dateEcheance: null }]);
      setNewTask(''); setAdding(false);
    } catch {
      // Keep quick-add UI fluid; task list refresh will reconcile later.
    }
  };

  const today = new Date();
  const projets = ['Tout', ...Array.from(new Set(taches.map(t => t.projet).filter(Boolean)))];
  const tachesFiltrees = taches.filter(t => filtre === 'Tout' || t.projet === filtre);
  const urgentes = taches.filter(t => t.priorite === 'Haute').length;
  const unread = emails.length;
  const eventStartValue = (e: CalendarEventItem) => e.start?.dateTime || e.start?.date || '';
  const todayEvents = events.filter(e => {
    const start = eventStartValue(e);
    return start ? isSameDay(new Date(start), today) : false;
  });
  const todayIso = new Date().toISOString().split('T')[0];
  const urgentTasks = tachesFiltrees.filter(t => !t.completed && t.priorite === 'Haute');
  const dueTodayTasks = tachesFiltrees.filter(t => !t.completed && !!t.dateEcheance && t.dateEcheance.split('T')[0] === todayIso);
  const waitingTasks = tachesFiltrees.filter(t => !t.completed && t.priorite !== 'Haute' && (!t.dateEcheance || t.dateEcheance.split('T')[0] > todayIso));
  const tachesAffichees = (() => {
    if (focusFilter === 'urgent') return urgentTasks;
    if (focusFilter === 'today') return dueTodayTasks;
    if (focusFilter === 'waiting') return waitingTasks;
    return tachesFiltrees;
  })();
  const tachesApercu = tachesAffichees.slice(0, 6);

  const eventsByDay: Record<string, CalendarEventItem[]> = {};
  events.forEach(e => {
    const start = eventStartValue(e);
    if (!start) return;
    const k = new Date(start).toDateString();
    if (!eventsByDay[k]) eventsByDay[k] = [];
    eventsByDay[k].push(e);
  });
  const agendaPanelHeight = events.length <= 2 ? '48vh' : '62vh';

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600&display=swap');
        .ov-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; }
        .ov-event:hover { background: var(--card-hover) !important; border-color: var(--border-hover) !important; }
        .ov-task:hover { background: var(--card-hover) !important; border-color: var(--border-hover) !important; transform: translateX(3px); }
        .ov-email:hover { background: var(--card-hover) !important; border-color: var(--border-hover) !important; }
        .ov-email:hover .ov-actions { opacity: 1 !important; }
        .ov-link:hover { background: var(--card-hover) !important; border-color: var(--border-hover) !important; }
        .ov-link:hover span { color: var(--text-primary) !important; }
        .ov-add:hover { border-color: rgba(212,176,96,0.5) !important; color: #d4b060 !important; }
        .ov-scroll::-webkit-scrollbar { width: 3px; }
        .ov-scroll::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 99px; }
        .ov-del:hover { color: #e06060 !important; background: rgba(224,96,96,0.15) !important; }
        .ov-ok:hover { color: #5dc98d !important; background: rgba(93,201,141,0.15) !important; }
        .ov-filtre { transition: all 0.15s; cursor: pointer; }
        .ov-quicklink:hover { background: var(--card-hover) !important; border-color: var(--border-hover) !important; color: var(--text-primary) !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            {today.toLocaleDateString('fr-FR', { weekday: 'long' })}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1, margin: 0 }}>
            {today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {urgentes > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(220,80,80,0.15)', border: '1px solid rgba(220,80,80,0.4)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#e07070' }}><Flag size={12} /> {urgentes} urgente{urgentes > 1 ? 's' : ''}</div>}
          {unread > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(220,80,80,0.15)', border: '1px solid rgba(220,80,80,0.4)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#e07070' }}><Mail size={12} /> {unread} email{unread > 1 ? 's' : ''} en attente</div>}
          {urgentes === 0 && unread === 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(93,201,141,0.12)', border: '1px solid rgba(93,201,141,0.3)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#5dc98d' }}><CheckCircle size={12} /> Tout est à jour</div>}
          {todayEvents.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(212,176,96,0.12)', border: '1px solid rgba(212,176,96,0.3)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#d4b060' }}><Calendar size={12} /> {todayEvents.length} aujourd'hui</div>}
        </div>
      </div>

      {/* ── KPI PARAMPARA (fictif en attendant branchement) ── */}
      <div className="ov-card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
          Donnees fictives pour le layout (a brancher a Parampara ensuite)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--text-muted)', fontSize: 11 }}>
              <Users size={12} /> Nouveaux abonnes (7j)
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#5dc98d' }}>{MOCK_PARAMPARA_STATS.nouveauxAbonnes7j}</div>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--text-muted)', fontSize: 11 }}>
              <PauseCircle size={12} /> Abonnements suspendus
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e07070' }}>{MOCK_PARAMPARA_STATS.abonnementsSuspendus}</div>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--text-muted)', fontSize: 11 }}>
              <TrendingUp size={12} /> Activite Parampara
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#d4b060' }}>{MOCK_PARAMPARA_STATS.activiteSemaine}</div>
          </div>
        </div>
      </div>

      {/* ── GRILLE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>

        {/* ══ AGENDA ══ */}
        <div className="ov-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={17} color="#0a0808" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Agenda</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{events.length} événement{events.length !== 1 ? 's' : ''} · 7 jours</div>
            </div>
          </div>

          <div className="ov-scroll" style={{ overflowY: 'auto', height: agendaPanelHeight, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
            {Object.keys(eventsByDay).length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Aucun événement cette semaine</p>
              </div>
            ) : Object.entries(eventsByDay).map(([dayKey, items]) => {
              const dayDate = new Date(dayKey);
              const isToday = isSameDay(dayDate, today);
              return (
                <div key={dayKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isToday ? '#d4b060' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {getDayLabel(dayDate)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: isToday ? 'linear-gradient(90deg, rgba(212,176,96,0.4), transparent)' : 'var(--border)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {items.map((item, i) => {
                      const startRaw = item.start?.dateTime || item.start?.date || '';
                      const endRaw = item.end?.dateTime || item.end?.date || startRaw;
                      const start = startRaw ? new Date(startRaw) : new Date();
                      const end = endRaw ? new Date(endRaw) : start;
                      const isAllDay = !item.start?.dateTime;
                      const isNow = !isAllDay && start <= today && end > today;
                      const timeStr = isAllDay ? 'Journée entière' : start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' → ' + end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={i} className="ov-event" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: isNow ? 'rgba(212,176,96,0.08)' : 'var(--bg-card)', border: `1px solid ${isNow ? 'rgba(212,176,96,0.35)' : 'var(--border)'}`, transition: 'all 0.15s', cursor: 'default' }}>
                          <div style={{ width: 3, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0, minHeight: 30, background: isNow ? '#d4b060' : isToday ? '#6699e0' : 'var(--border-hover)' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary || 'Événement'}</p>
                              {isNow && <span style={{ fontSize: 10, fontWeight: 700, color: '#d4b060', background: 'rgba(212,176,96,0.15)', border: '1px solid rgba(212,176,96,0.35)', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>EN COURS</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                              <Clock size={11} color="var(--text-muted)" />
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{timeStr}</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* TÂCHES */}
          <div className="ov-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4caf7d, #3d8f64)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={17} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Tâches à faire</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  {tachesAffichees.length} tâche{tachesAffichees.length !== 1 ? 's' : ''} en attente
                </div>
              </div>
            </div>

            {projets.length > 1 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                {projets.map(p => {
                  const isActive = filtre === p;
                  return (
                    <button key={p} onClick={() => setFiltre(p)} className="ov-filtre" style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, border: `1px solid ${isActive ? (p === 'Tout' ? 'var(--border-hover)' : pc(p).color + '80') : 'var(--border)'}`, background: isActive ? (p === 'Tout' ? 'var(--border)' : pc(p).bg) : 'transparent', color: isActive ? (p === 'Tout' ? 'var(--text-secondary)' : pc(p).color) : 'var(--text-muted)' }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'urgent', label: 'Urgent' },
                { id: 'today', label: "Aujourd'hui" },
                { id: 'waiting', label: 'En attente' },
              ].map(item => {
                const active = focusFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setFocusFilter(item.id as 'all' | 'urgent' | 'today' | 'waiting')}
                    className="ov-filtre"
                    style={{
                      padding: '5px 12px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1px solid ${active ? 'rgba(212,176,96,0.55)' : 'var(--border)'}`,
                      background: active ? 'rgba(212,176,96,0.12)' : 'transparent',
                      color: active ? '#d4b060' : 'var(--text-muted)',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
              {loading ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Chargement...</p>
              ) : tachesAffichees.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }}>
                  <CheckCircle size={20} color="#4caf7d" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#5dc98d', margin: 0, fontWeight: 600 }}>Tout est fait ✓</p>
                </div>
              ) : tachesApercu.map(t => (
                <div key={t.id} onClick={() => openTaskInTasksPage(t.id)} className="ov-task" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTache(t.id); }}
                    title="Marquer terminée"
                    style={{ width: 17, height: 17, borderRadius: 5, border: '2px solid var(--border-hover)', flexShrink: 0, background: 'transparent', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    {t.priorite === 'Haute' && <Flag size={13} color="#e07070" />}
                    {t.projet && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: `1px solid ${pc(t.projet).color}50`, background: pc(t.projet).bg, color: pc(t.projet).color }}>{t.projet}</span>}
                  </div>
                </div>
              ))}
              {!loading && tachesAffichees.length > 6 && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: { page: 'tasks' } }))}
                  style={{ marginTop: 4, border: '1px dashed var(--border)', background: 'transparent', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Voir {tachesAffichees.length - 6} tâche(s) de plus
                </button>
              )}
            </div>

            {adding ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') ajouterTache(); if (e.key === 'Escape') { setAdding(false); setNewTask(''); } }}
                  placeholder="Titre... (Entrée pour valider)"
                  style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid rgba(212,176,96,0.4)', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => { setAdding(false); setNewTask(''); }} style={{ padding: '9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
                <button onClick={ajouterTache} style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #4caf7d, #3d8f64)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>✓</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="ov-add" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                <Plus size={14} /> Ajouter une tâche rapide
              </button>
            )}
          </div>

          {/* EMAILS */}
          <div className="ov-card" style={{ padding: 22, borderColor: unread > 0 ? 'rgba(220,80,80,0.3)' : 'var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: unread > 0 ? 'rgba(220,80,80,0.2)' : 'rgba(93,201,141,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={17} color={unread > 0 ? '#e07070' : '#5dc98d'} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Emails</div>
                  <div style={{ fontSize: 12, color: unread > 0 ? '#e07070' : '#5dc98d', marginTop: 1, fontWeight: 500 }}>
                    {unread > 0 ? `${unread} non traité${unread > 1 ? 's' : ''}` : 'Tout traité ✓'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[{ c: '#d4b060', l: 'SE' }, { c: '#5dc98d', l: 'AD' }, { c: '#9b7ec8', l: 'SM' }].map((b, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: `${b.c}18`, border: `1px solid ${b.c}35`, color: b.c }}>
                    {b.l}
                  </div>
                ))}
              </div>
            </div>

            <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unread === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }}>
                  <CheckCircle size={20} color="#5dc98d" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#5dc98d', margin: 0, fontWeight: 600 }}>Boîtes vides ✓</p>
                </div>
              ) : emails.slice(0, 8).map(email => {
                const acctColor = ACCOUNT_COLORS[email.Compte] || '#8080b0';
                const senderName = (email['Expéditeur'] || '').replace(/<.*>/, '').replace(/"/g, '').trim();
                return (
                  <div key={email.id} className="ov-email" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, transition: 'all 0.15s' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${acctColor}20`, border: `1px solid ${acctColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: acctColor, flexShrink: 0 }}>
                      {getInitials(email['Expéditeur'] || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.Sujet || 'Sans sujet'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {senderName || '—'}
                        {email['Résumé IA'] && <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}> · {email['Résumé IA'].slice(0, 45)}…</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <div className="ov-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button onClick={() => marquerTraite(email.id)} className="ov-ok" title="Traité" style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                          <CheckCircle size={13} />
                        </button>
                        <button onClick={() => supprimerEmail(email.id)} className="ov-del" title="Supprimer" style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {unread > 8 && <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>+ {unread - 8} autres → aller dans Mails</p>}
            </div>
          </div>

          {/* LIENS RAPIDES — ligne compacte */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '4px 2px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: 4 }}>Accès :</span>
            {QUICK_LINKS.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="ov-quicklink"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
                {link.label}
                <ExternalLink size={9} color="var(--text-muted)" />
              </a>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
