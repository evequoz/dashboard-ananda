import { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle, Mail, Plus, ExternalLink,
  BookOpen, Lightbulb, FileText, Flag, Server, X
} from 'lucide-react';
import { getStatsBaserow, getTachesAujourdhui, updateTacheStatut } from '../data/baserowApi';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const API_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_TACHES = 536;
const HEADERS = { Authorization: `Token ${API_TOKEN}`, 'Content-Type': 'application/json' };

interface Tache {
  id: string; text: string; completed: boolean;
  priorite: string; projet: string; dateEcheance: string | null;
}

const PROJET_COLORS: Record<string, { color: string; bg: string }> = {
  'Formation': { color: '#5588d0', bg: '#5588d018' },
  'Admin':     { color: '#c9a84c', bg: '#c9a84c18' },
  'Doterra':   { color: '#d98844', bg: '#d9884418' },
  'Contenu':   { color: '#7b5ea7', bg: '#7b5ea718' },
  'Perso':     { color: '#4caf7d', bg: '#4caf7d18' },
};
const pc = (p: string) => PROJET_COLORS[p] || { color: '#5a587a', bg: '#5a587a18' };

const QUICK_LINKS = [
  { label: 'AFFiNE — Notes & idées',    url: 'https://affine.ananda-communaute.cloud',  icon: BookOpen,  color: '#c9a84c' },
  { label: 'Open WebUI — Assistant IA', url: 'https://cloud.ananda-communaute.cloud',   icon: Lightbulb, color: '#7b5ea7' },
  { label: 'Baserow — Base de données', url: 'https://baserow.ananda-communaute.cloud', icon: FileText,  color: '#5588d0' },
  { label: 'Coolify — Serveur VPS',     url: 'https://coolify.ananda-communaute.cloud', icon: Server,    color: '#4caf7d' },
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dayLabel = (d: Date) => {
  const t = new Date(); const tm = new Date(t); tm.setDate(t.getDate() + 1);
  if (isSameDay(d, t)) return "Aujourd'hui";
  if (isSameDay(d, tm)) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
};

export const Overview = () => {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tout');
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getStatsBaserow().then(s => setUnread(s.unreadEmails)).catch(() => {});
    const t = setInterval(() => getStatsBaserow().then(s => setUnread(s.unreadEmails)).catch(() => {}), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getTachesAujourdhui().then(t => { setTaches(t); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await res.json();
        if (Array.isArray(data)) {
          const now = new Date(); const in7 = new Date(now); in7.setDate(now.getDate() + 7);
          setEvents(data.filter(i => {
            const end = new Date(i.end?.dateTime || i.end?.date);
            const start = new Date(i.start?.dateTime || i.start?.date);
            return end > now && start <= in7;
          }).sort((a, b) =>
            new Date(a.start?.dateTime || a.start?.date).getTime() -
            new Date(b.start?.dateTime || b.start?.date).getTime()
          ));
        }
      } catch {}
    };
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, []);

  const toggleTache = async (id: string) => {
    setTaches(p => p.filter(t => t.id !== id));
    await updateTacheStatut(id, true);
  };

  const ajouterTache = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_TACHES}/?user_field_names=true`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ Titre: newTask.trim(), Statut: 'À faire', Priorité: 'Normale', 'Date échéance': new Date().toISOString().split('T')[0] }),
      });
      const row = await res.json();
      setTaches(p => [...p, { id: row.id.toString(), text: newTask.trim(), completed: false, priorite: 'Normale', projet: '', dateEcheance: null }]);
      setNewTask(''); setAdding(false);
    } catch {}
  };

  const today = new Date();
  const projets = ['Tout', ...Array.from(new Set(taches.map(t => t.projet).filter(Boolean)))];
  const tachesFiltrees = taches.filter(t => filtre === 'Tout' || t.projet === filtre);
  const urgentes = taches.filter(t => t.priorite === 'Haute').length;
  const todayEvents = events.filter(e => isSameDay(new Date(e.start?.dateTime || e.start?.date), today));

  const eventsByDay: Record<string, any[]> = {};
  events.forEach(e => {
    const k = new Date(e.start?.dateTime || e.start?.date).toDateString();
    if (!eventsByDay[k]) eventsByDay[k] = [];
    eventsByDay[k].push(e);
  });

  return (
    <div style={{ fontFamily: "'DM Sans', 'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
        .ov-card { background: linear-gradient(145deg, #0d0d1a 0%, #0a0a14 100%); border: 1px solid #1e1e32; border-radius: 16px; }
        .ov-card:hover { border-color: #2a2a45; }
        .ov-event:hover { background: #0f0f20 !important; border-color: #2a2a45 !important; }
        .ov-task:hover { background: #0f0f20 !important; border-color: #2a2a45 !important; transform: translateX(2px); }
        .ov-link:hover .ov-link-label { color: #e8e4d9 !important; }
        .ov-link:hover { background: #0f0f20 !important; }
        .ov-add:hover { border-color: rgba(201,168,76,0.4) !important; color: #c9a84c !important; }
        .ov-scroll::-webkit-scrollbar { width: 3px; }
        .ov-scroll::-webkit-scrollbar-track { background: transparent; }
        .ov-scroll::-webkit-scrollbar-thumb { background: #2a2a45; border-radius: 99px; }
        .ov-filtre { transition: all 0.15s; }
        .ov-filtre:hover { opacity: 0.9; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5a587a', textTransform: 'uppercase', marginBottom: 4 }}>
            {today.toLocaleDateString('fr-FR', { weekday: 'long' })}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 600, color: '#e8e4d9', lineHeight: 1, margin: 0 }}>
            {today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
        </div>

        {/* Pills de contexte */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {urgentes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(217,85,85,0.12)', border: '1px solid rgba(217,85,85,0.3)', borderRadius: 99, fontSize: 11, fontWeight: 600, color: '#d95555' }}>
              <Flag size={11} /> {urgentes} urgente{urgentes > 1 ? 's' : ''}
            </div>
          )}
          {unread > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(217,85,85,0.12)', border: '1px solid rgba(217,85,85,0.3)', borderRadius: 99, fontSize: 11, fontWeight: 600, color: '#d95555' }}>
              <Mail size={11} /> {unread} email{unread > 1 ? 's' : ''} en attente
            </div>
          )}
          {urgentes === 0 && unread === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(76,175,125,0.12)', border: '1px solid rgba(76,175,125,0.3)', borderRadius: 99, fontSize: 11, fontWeight: 600, color: '#4caf7d' }}>
              <CheckCircle size={11} /> Tout est à jour
            </div>
          )}
          {todayEvents.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 99, fontSize: 11, fontWeight: 600, color: '#c9a84c' }}>
              <Calendar size={11} /> {todayEvents.length} aujourd'hui
            </div>
          )}
        </div>
      </div>

      {/* ── GRILLE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ══ AGENDA ══ */}
        <div className="ov-card" style={{ padding: 20 }}>
          {/* Titre */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={15} color="#0a0808" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e4d9' }}>Agenda</div>
                <div style={{ fontSize: 10, color: '#5a587a' }}>{events.length} événement{events.length !== 1 ? 's' : ''} · 7 jours</div>
              </div>
            </div>
          </div>

          {/* Scrollable */}
          <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>
            {Object.keys(eventsByDay).length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed #1e1e32', borderRadius: 10 }}>
                <Calendar size={20} color="#2a2a45" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#5a587a', margin: 0 }}>Aucun événement cette semaine</p>
              </div>
            ) : Object.entries(eventsByDay).map(([dayKey, items]) => {
              const dayDate = new Date(dayKey);
              const isToday = isSameDay(dayDate, today);
              return (
                <div key={dayKey}>
                  {/* Label jour */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isToday ? '#c9a84c' : '#3a3860', whiteSpace: 'nowrap' }}>
                      {dayLabel(dayDate)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: isToday ? 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' : '#1a1a2e' }} />
                  </div>

                  {/* Events */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map((item, i) => {
                      const start = new Date(item.start?.dateTime || item.start?.date);
                      const end = new Date(item.end?.dateTime || item.end?.date);
                      const isAllDay = !item.start?.dateTime;
                      const isNow = !isAllDay && start <= today && end > today;
                      const timeStr = isAllDay
                        ? 'Journée entière'
                        : start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' → ' + end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div key={i} className="ov-event" style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10,
                          background: isNow ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isNow ? 'rgba(201,168,76,0.3)' : '#1e1e32'}`,
                          transition: 'all 0.15s',
                        }}>
                          <div style={{ width: 3, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0, minHeight: 28, background: isNow ? '#c9a84c' : isToday ? '#5588d0' : '#2a2a45' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#e8e4d9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.summary || 'Événement'}
                              </p>
                              {isNow && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#c9a84c', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 99, padding: '2px 6px', flexShrink: 0 }}>
                                  EN COURS
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <Clock size={10} color="#5a587a" />
                              <span style={{ fontSize: 10, color: '#5a587a' }}>{timeStr}</span>
                              {item.location && <span style={{ fontSize: 10, color: '#3a3860' }}>· 📍 {item.location}</span>}
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
          <div className="ov-card" style={{ padding: 20, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4caf7d, #3d8f64)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={15} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e4d9' }}>Tâches à faire</div>
                  <div style={{ fontSize: 10, color: '#5a587a' }}>{tachesFiltrees.length} tâche{tachesFiltrees.length !== 1 ? 's' : ''} en attente</div>
                </div>
              </div>
            </div>

            {/* Filtres projet */}
            {projets.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {projets.map(p => {
                  const col = p === 'Tout' ? { color: '#e8e4d9', bg: '#1e1e32' } : pc(p);
                  const isActive = filtre === p;
                  return (
                    <button key={p} onClick={() => setFiltre(p)} className="ov-filtre" style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${isActive ? col.color + '60' : '#1e1e32'}`,
                      background: isActive ? col.bg : 'transparent',
                      color: isActive ? col.color : '#5a587a',
                    }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Liste tâches */}
            <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 220, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {loading ? (
                <p style={{ fontSize: 11, color: '#5a587a', textAlign: 'center', padding: '20px 0' }}>Chargement...</p>
              ) : tachesFiltrees.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', border: '1px dashed #1e1e32', borderRadius: 10 }}>
                  <CheckCircle size={18} color="#4caf7d" style={{ margin: '0 auto 6px' }} />
                  <p style={{ fontSize: 11, color: '#4caf7d', margin: 0, fontWeight: 600 }}>Tout est fait ✓</p>
                </div>
              ) : tachesFiltrees.map(t => (
                <div key={t.id} onClick={() => toggleTache(t.id)} className="ov-task" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e32',
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {/* Checkbox custom */}
                  <div style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid #3a3860', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} />
                  <span style={{ fontSize: 12, color: '#c8c4b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {t.priorite === 'Haute' && <Flag size={11} color="#d95555" />}
                    {t.projet && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, border: `1px solid ${pc(t.projet).color}40`, background: pc(t.projet).bg, color: pc(t.projet).color, letterSpacing: '0.04em' }}>
                        {t.projet}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Ajout rapide */}
            {adding ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') ajouterTache(); if (e.key === 'Escape') { setAdding(false); setNewTask(''); } }}
                  placeholder="Titre de la tâche... (Entrée / Échap)"
                  style={{ flex: 1, background: '#0a0a14', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e8e4d9', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => { setAdding(false); setNewTask(''); }} style={{ padding: '8px', background: 'transparent', border: '1px solid #1e1e32', borderRadius: 8, color: '#5a587a', cursor: 'pointer' }}>
                  <X size={13} />
                </button>
                <button onClick={ajouterTache} style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #4caf7d, #3d8f64)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
                  ✓
                </button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="ov-add" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'transparent', border: '1px dashed #1e1e32', borderRadius: 10, fontSize: 12, color: '#3a3860', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                <Plus size={13} /> Ajouter une tâche rapide
              </button>
            )}
          </div>

          {/* EMAILS + LIENS RAPIDES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>

            {/* Emails */}
            <div className="ov-card" style={{ padding: 16, borderColor: unread > 0 ? 'rgba(217,85,85,0.3)' : '#1e1e32' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: unread > 0 ? 'rgba(217,85,85,0.15)' : 'rgba(76,175,125,0.15)', flexShrink: 0 }}>
                  <Mail size={13} color={unread > 0 ? '#d95555' : '#4caf7d'} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e4d9' }}>Emails</div>
                  <div style={{ fontSize: 10, color: '#5a587a' }}>3 boîtes</div>
                </div>
              </div>
              {unread > 0 ? (
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: '#d95555', lineHeight: 1 }}>{unread}</div>
                  <div style={{ fontSize: 10, color: '#d95555', marginTop: 4, fontWeight: 500 }}>non traités</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#4caf7d' }}>✓</div>
                  <div style={{ fontSize: 11, color: '#4caf7d', marginTop: 2, fontWeight: 600 }}>Tout traité</div>
                </div>
              )}
              {/* Indicateurs boîtes */}
              <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                {[{ c: '#c9a84c', l: 'SE' }, { c: '#4caf7d', l: 'AD' }, { c: '#7b5ea7', l: 'SM' }].map((b, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: b.c, opacity: 0.6 }} />
                ))}
              </div>
            </div>

            {/* Liens rapides */}
            <div className="ov-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a3860', marginBottom: 12 }}>Accès rapides</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {QUICK_LINKS.map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="ov-link" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, textDecoration: 'none', transition: 'all 0.15s', background: 'transparent' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${link.color}15`, border: `1px solid ${link.color}25`, flexShrink: 0 }}>
                        <Icon size={11} color={link.color} />
                      </div>
                      <span className="ov-link-label" style={{ fontSize: 11, color: '#5a587a', flex: 1, transition: 'color 0.15s' }}>{link.label}</span>
                      <ExternalLink size={9} color="#2a2a45" />
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
