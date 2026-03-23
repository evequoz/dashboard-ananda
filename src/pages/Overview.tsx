import { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle, Mail, Plus, ExternalLink,
  BookOpen, Lightbulb, FileText, Flag, Server, X, Trash2, AlertCircle
} from 'lucide-react';
import { getStatsBaserow, getTachesAujourdhui, updateTacheStatut } from '../data/baserowApi';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const API_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_TACHES = 536;
const TABLE_EMAILS = 534;
const HEADERS = { Authorization: `Token ${API_TOKEN}`, 'Content-Type': 'application/json' };

interface Tache {
  id: string; text: string; completed: boolean;
  priorite: string; projet: string; dateEcheance: string | null;
}

interface EmailItem {
  id: number;
  Sujet: string;
  'Expéditeur': string;
  'Résumé IA': string;
  'Date réception': string | null;
  Traité: boolean;
  Compte: string;
}

const PROJET_COLORS: Record<string, { color: string; bg: string }> = {
  'Formation': { color: '#5588d0', bg: '#5588d018' },
  'Admin':     { color: '#c9a84c', bg: '#c9a84c18' },
  'Doterra':   { color: '#d98844', bg: '#d9884418' },
  'Contenu':   { color: '#7b5ea7', bg: '#7b5ea718' },
  'Perso':     { color: '#4caf7d', bg: '#4caf7d18' },
};
const pc = (p: string) => PROJET_COLORS[p] || { color: '#5a587a', bg: '#5a587a18' };

const ACCOUNT_COLORS: Record<string, string> = {
  'serge@eh-me.com': '#c9a84c',
  'admin@eh-me.com': '#4caf7d',
  'serge@seme.ch':   '#7b5ea7',
};

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

const getInitials = (from: string) => {
  if (!from) return '?';
  const name = from.replace(/<.*>/, '').replace(/"/g, '').trim();
  const parts = name.split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const formatDate = (d: string | null) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
};

export const Overview = () => {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tout');
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);

  // ── Emails ──
  const loadEmails = async () => {
    try {
      const res = await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/?user_field_names=true&size=50`,
        { headers: HEADERS }
      );
      const data = await res.json();
      const nonTraites = (data.results || []).filter((e: any) => !e.Traité).reverse();
      setEmails(nonTraites);
    } catch {}
  };

  useEffect(() => {
    loadEmails();
    const t = setInterval(loadEmails, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── Tâches ──
  useEffect(() => {
    getTachesAujourdhui().then(t => { setTaches(t); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // ── Agenda 7 jours ──
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

  // ── Toggle tâche ──
  const toggleTache = async (id: string) => {
    setTaches(p => p.filter(t => t.id !== id));
    await updateTacheStatut(id, true);
  };

  // ── Marquer email traité ──
  const marquerTraite = async (id: number) => {
    setEmails(p => p.filter(e => e.id !== id));
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${id}/?user_field_names=true`, {
        method: 'PATCH', headers: HEADERS, body: JSON.stringify({ Traité: true }),
      });
    } catch {}
  };

  // ── Supprimer email ──
  const supprimerEmail = async (id: number) => {
    setEmails(p => p.filter(e => e.id !== id));
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${id}/`, {
        method: 'DELETE', headers: HEADERS,
      });
    } catch {}
  };

  // ── Ajout tâche rapide ──
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

  // ── Données dérivées ──
  const today = new Date();
  const projets = ['Tout', ...Array.from(new Set(taches.map(t => t.projet).filter(Boolean)))];
  const tachesFiltrees = taches.filter(t => filtre === 'Tout' || t.projet === filtre);
  const urgentes = taches.filter(t => t.priorite === 'Haute').length;
  const todayEvents = events.filter(e => isSameDay(new Date(e.start?.dateTime || e.start?.date), today));
  const unread = emails.length;

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
        .ov-card { background: linear-gradient(145deg, #0d0d1a 0%, #0a0a14 100%); border: 1px solid #1e1e32; border-radius: 16px; transition: border-color 0.15s; }
        .ov-card:hover { border-color: #2a2a45; }
        .ov-event:hover { background: #0f0f20 !important; border-color: #2a2a45 !important; }
        .ov-task:hover { background: #0f0f20 !important; border-color: #2a2a45 !important; transform: translateX(2px); }
        .ov-email-row { transition: all 0.15s; }
        .ov-email-row:hover { background: #0f0f20 !important; border-color: #2a2a45 !important; }
        .ov-email-row:hover .ov-email-actions { opacity: 1 !important; }
        .ov-link:hover .ov-link-label { color: #e8e4d9 !important; }
        .ov-link:hover { background: #0f0f20 !important; }
        .ov-add:hover { border-color: rgba(201,168,76,0.4) !important; color: #c9a84c !important; }
        .ov-scroll::-webkit-scrollbar { width: 3px; }
        .ov-scroll::-webkit-scrollbar-track { background: transparent; }
        .ov-scroll::-webkit-scrollbar-thumb { background: #2a2a45; border-radius: 99px; }
        .ov-filtre { transition: all 0.15s; }
        .ov-btn-del:hover { color: #d95555 !important; background: rgba(217,85,85,0.15) !important; }
        .ov-btn-ok:hover { color: #4caf7d !important; background: rgba(76,175,125,0.15) !important; }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={15} color="#0a0808" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e4d9' }}>Agenda</div>
              <div style={{ fontSize: 10, color: '#5a587a' }}>{events.length} événement{events.length !== 1 ? 's' : ''} · 7 jours</div>
            </div>
          </div>

          <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>
            {Object.keys(eventsByDay).length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed #1e1e32', borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: '#5a587a', margin: 0 }}>Aucun événement cette semaine</p>
              </div>
            ) : Object.entries(eventsByDay).map(([dayKey, items]) => {
              const dayDate = new Date(dayKey);
              const isToday = isSameDay(dayDate, today);
              return (
                <div key={dayKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isToday ? '#c9a84c' : '#3a3860', whiteSpace: 'nowrap' }}>
                      {dayLabel(dayDate)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: isToday ? 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' : '#1a1a2e' }} />
                  </div>
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
                        <div key={i} className="ov-event" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: isNow ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isNow ? 'rgba(201,168,76,0.3)' : '#1e1e32'}`, transition: 'all 0.15s' }}>
                          <div style={{ width: 3, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0, minHeight: 28, background: isNow ? '#c9a84c' : isToday ? '#5588d0' : '#2a2a45' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#e8e4d9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary || 'Événement'}</p>
                              {isNow && <span style={{ fontSize: 9, fontWeight: 700, color: '#c9a84c', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 99, padding: '2px 6px', flexShrink: 0 }}>EN COURS</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <Clock size={10} color="#5a587a" />
                              <span style={{ fontSize: 10, color: '#5a587a' }}>{timeStr}</span>
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
          <div className="ov-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4caf7d, #3d8f64)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={15} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e4d9' }}>Tâches à faire</div>
                <div style={{ fontSize: 10, color: '#5a587a' }}>{tachesFiltrees.length} tâche{tachesFiltrees.length !== 1 ? 's' : ''} en attente</div>
              </div>
            </div>

            {projets.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {projets.map(p => {
                  const col = p === 'Tout' ? { color: '#e8e4d9', bg: '#1e1e32' } : pc(p);
                  const isActive = filtre === p;
                  return (
                    <button key={p} onClick={() => setFiltre(p)} className="ov-filtre" style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: `1px solid ${isActive ? col.color + '60' : '#1e1e32'}`, background: isActive ? col.bg : 'transparent', color: isActive ? col.color : '#5a587a' }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {loading ? (
                <p style={{ fontSize: 11, color: '#5a587a', textAlign: 'center', padding: '20px 0' }}>Chargement...</p>
              ) : tachesFiltrees.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', border: '1px dashed #1e1e32', borderRadius: 10 }}>
                  <CheckCircle size={18} color="#4caf7d" style={{ margin: '0 auto 6px' }} />
                  <p style={{ fontSize: 11, color: '#4caf7d', margin: 0, fontWeight: 600 }}>Tout est fait ✓</p>
                </div>
              ) : tachesFiltrees.map(t => (
                <div key={t.id} onClick={() => toggleTache(t.id)} className="ov-task" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e32', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid #3a3860', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#c8c4b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {t.priorite === 'Haute' && <Flag size={11} color="#d95555" />}
                    {t.projet && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, border: `1px solid ${pc(t.projet).color}40`, background: pc(t.projet).bg, color: pc(t.projet).color }}>{t.projet}</span>}
                  </div>
                </div>
              ))}
            </div>

            {adding ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') ajouterTache(); if (e.key === 'Escape') { setAdding(false); setNewTask(''); } }}
                  placeholder="Titre... (Entrée / Échap)"
                  style={{ flex: 1, background: '#0a0a14', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e8e4d9', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => { setAdding(false); setNewTask(''); }} style={{ padding: '8px', background: 'transparent', border: '1px solid #1e1e32', borderRadius: 8, color: '#5a587a', cursor: 'pointer' }}><X size={13} /></button>
                <button onClick={ajouterTache} style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #4caf7d, #3d8f64)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}>✓</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="ov-add" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'transparent', border: '1px dashed #1e1e32', borderRadius: 10, fontSize: 12, color: '#3a3860', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                <Plus size={13} /> Ajouter une tâche rapide
              </button>
            )}
          </div>

          {/* ══ EMAILS ══ */}
          <div className="ov-card" style={{ padding: 20, borderColor: unread > 0 ? 'rgba(217,85,85,0.25)' : '#1e1e32' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: unread > 0 ? 'rgba(217,85,85,0.2)' : 'rgba(76,175,125,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={15} color={unread > 0 ? '#d95555' : '#4caf7d'} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e4d9' }}>Emails</div>
                  <div style={{ fontSize: 10, color: '#5a587a' }}>
                    {unread > 0 ? `${unread} non traité${unread > 1 ? 's' : ''}` : 'Tout traité ✓'}
                  </div>
                </div>
              </div>
              {/* Indicateurs boîtes */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[{ c: '#c9a84c', l: 'SE' }, { c: '#4caf7d', l: 'AD' }, { c: '#7b5ea7', l: 'SM' }].map((b, i) => (
                  <div key={i} title={['serge@eh-me.com', 'admin@eh-me.com', 'serge@seme.ch'][i]} style={{ fontSize: 9, fontWeight: 700, padding: '3px 6px', borderRadius: 6, background: `${b.c}18`, border: `1px solid ${b.c}30`, color: b.c }}>
                    {b.l}
                  </div>
                ))}
              </div>
            </div>

            {/* Liste emails */}
            <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unread === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', border: '1px dashed #1e1e32', borderRadius: 10 }}>
                  <CheckCircle size={18} color="#4caf7d" style={{ margin: '0 auto 6px' }} />
                  <p style={{ fontSize: 11, color: '#4caf7d', margin: 0, fontWeight: 600 }}>Boîtes vides ✓</p>
                </div>
              ) : emails.slice(0, 8).map(email => {
                const acctColor = ACCOUNT_COLORS[email.Compte] || '#5a587a';
                const senderName = (email['Expéditeur'] || '').replace(/<.*>/, '').replace(/"/g, '').trim();
                return (
                  <div key={email.id} className="ov-email-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e32', borderRadius: 10, transition: 'all 0.15s' }}>
                    {/* Avatar */}
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${acctColor}20`, border: `1px solid ${acctColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: acctColor, flexShrink: 0 }}>
                      {getInitials(email['Expéditeur'] || '')}
                    </div>
                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e4d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.Sujet || 'Sans sujet'}
                      </div>
                      <div style={{ fontSize: 10, color: '#5a587a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {senderName || email['Expéditeur']}
                        {email['Résumé IA'] && <span style={{ color: '#3a3860' }}> · {email['Résumé IA'].slice(0, 40)}...</span>}
                      </div>
                    </div>
                    {/* Date + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, color: '#3a3860' }}>{formatDate(email['Date réception'])}</span>
                      <div className="ov-email-actions" style={{ display: 'flex', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button onClick={() => marquerTraite(email.id)} className="ov-btn-ok" title="Marquer traité"
                          style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #1e1e32', background: 'transparent', color: '#3a3860', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                          <CheckCircle size={11} />
                        </button>
                        <button onClick={() => supprimerEmail(email.id)} className="ov-btn-del" title="Supprimer"
                          style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #1e1e32', background: 'transparent', color: '#3a3860', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {unread > 8 && (
                <div style={{ textAlign: 'center', fontSize: 10, color: '#5a587a', padding: '6px 0' }}>
                  + {unread - 8} autres emails → aller dans Mails
                </div>
              )}
            </div>
          </div>

          {/* LIENS RAPIDES */}
          <div className="ov-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a3860', marginBottom: 10 }}>Accès rapides</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="ov-link"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, textDecoration: 'none', background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e32', transition: 'all 0.15s' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${link.color}15`, border: `1px solid ${link.color}25`, flexShrink: 0 }}>
                      <Icon size={12} color={link.color} />
                    </div>
                    <span className="ov-link-label" style={{ fontSize: 11, color: '#5a587a', flex: 1, transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.label.split(' — ')[0]}
                    </span>
                    <ExternalLink size={9} color="#2a2a45" />
                  </a>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
