import { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle, Mail, Plus,
  BookOpen, Lightbulb, FileText, Flag, Server, X, Trash2, ExternalLink
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
  id: number; Sujet: string; 'Expéditeur': string;
  'Résumé IA': string; 'Date réception': string | null;
  Traité: boolean; Compte: string;
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
  { label: 'AFFiNE',    url: 'https://affine.ananda-communaute.cloud',  icon: BookOpen,  color: '#d4b060' },
  { label: 'Open WebUI',url: 'https://cloud.ananda-communaute.cloud',   icon: Lightbulb, color: '#9b7ec8' },
  { label: 'Baserow',   url: 'https://baserow.ananda-communaute.cloud', icon: FileText,  color: '#6699e0' },
  { label: 'Coolify',   url: 'https://coolify.ananda-communaute.cloud', icon: Server,    color: '#5dc98d' },
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

export const Overview = () => {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tout');
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);

  const loadEmails = async () => {
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/?user_field_names=true&size=50`, { headers: HEADERS });
      const data = await res.json();
      setEmails((data.results || []).filter((e: any) => !e.Traité).reverse());
    } catch {}
  };

  useEffect(() => { loadEmails(); const t = setInterval(loadEmails, 3 * 60 * 1000); return () => clearInterval(t); }, []);
  useEffect(() => { getTachesAujourdhui().then(t => { setTaches(t); setLoading(false); }).catch(() => setLoading(false)); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await res.json();
        if (Array.isArray(data)) {
          const now = new Date(); const in7 = new Date(now); in7.setDate(now.getDate() + 7);
          setEvents(data.filter(i => new Date(i.end?.dateTime || i.end?.date) > now && new Date(i.start?.dateTime || i.start?.date) <= in7)
            .sort((a, b) => new Date(a.start?.dateTime || a.start?.date).getTime() - new Date(b.start?.dateTime || b.start?.date).getTime()));
        }
      } catch {}
    };
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, []);

  const toggleTache = async (id: string) => { setTaches(p => p.filter(t => t.id !== id)); await updateTacheStatut(id, true); };
  const marquerTraite = async (id: number) => { setEmails(p => p.filter(e => e.id !== id)); try { await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${id}/?user_field_names=true`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ Traité: true }) }); } catch {} };
  const supprimerEmail = async (id: number) => { setEmails(p => p.filter(e => e.id !== id)); try { await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${id}/`, { method: 'DELETE', headers: HEADERS }); } catch {} };
  const ajouterTache = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_TACHES}/?user_field_names=true`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ Titre: newTask.trim(), Statut: 'À faire', Priorité: 'Normale', 'Date échéance': new Date().toISOString().split('T')[0] }) });
      const row = await res.json();
      setTaches(p => [...p, { id: row.id.toString(), text: newTask.trim(), completed: false, priorite: 'Normale', projet: '', dateEcheance: null }]);
      setNewTask(''); setAdding(false);
    } catch {}
  };

  const today = new Date();
  const projets = ['Tout', ...Array.from(new Set(taches.map(t => t.projet).filter(Boolean)))];
  const tachesFiltrees = taches.filter(t => filtre === 'Tout' || t.projet === filtre);
  const urgentes = taches.filter(t => t.priorite === 'Haute').length;
  const unread = emails.length;
  const todayEvents = events.filter(e => isSameDay(new Date(e.start?.dateTime || e.start?.date), today));

  const eventsByDay: Record<string, any[]> = {};
  events.forEach(e => { const k = new Date(e.start?.dateTime || e.start?.date).toDateString(); if (!eventsByDay[k]) eventsByDay[k] = []; eventsByDay[k].push(e); });

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600&display=swap');
        .ov-card { background: #0e0e1c; border: 1px solid #252540; border-radius: 14px; }
        .ov-event:hover { background: #13132a !important; border-color: #353560 !important; }
        .ov-task:hover { background: #13132a !important; border-color: #353560 !important; transform: translateX(3px); }
        .ov-email:hover { background: #13132a !important; border-color: #353560 !important; }
        .ov-email:hover .ov-actions { opacity: 1 !important; }
        .ov-link:hover { background: #13132a !important; border-color: #353560 !important; }
        .ov-link:hover span { color: #e8e4d9 !important; }
        .ov-add:hover { border-color: rgba(212,176,96,0.5) !important; color: #d4b060 !important; }
        .ov-scroll::-webkit-scrollbar { width: 3px; }
        .ov-scroll::-webkit-scrollbar-thumb { background: #353560; border-radius: 99px; }
        .ov-del:hover { color: #e06060 !important; background: rgba(224,96,96,0.15) !important; }
        .ov-ok:hover { color: #5dc98d !important; background: rgba(93,201,141,0.15) !important; }
        .ov-filtre { transition: all 0.15s; cursor: pointer; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', color: '#6060a0', textTransform: 'uppercase', marginBottom: 6 }}>
            {today.toLocaleDateString('fr-FR', { weekday: 'long' })}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 600, color: '#f0eee8', lineHeight: 1, margin: 0 }}>
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

      {/* ── GRILLE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ══ AGENDA ══ */}
        <div className="ov-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={17} color="#0a0808" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0eee8' }}>Agenda</div>
              <div style={{ fontSize: 12, color: '#7070a0', marginTop: 1 }}>{events.length} événement{events.length !== 1 ? 's' : ''} · 7 jours</div>
            </div>
          </div>

          <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 430, display: 'flex', flexDirection: 'column', gap: 18, paddingRight: 4 }}>
            {Object.keys(eventsByDay).length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed #252540', borderRadius: 10 }}>
                <p style={{ fontSize: 13, color: '#6060a0', margin: 0 }}>Aucun événement cette semaine</p>
              </div>
            ) : Object.entries(eventsByDay).map(([dayKey, items]) => {
              const dayDate = new Date(dayKey);
              const isToday = isSameDay(dayDate, today);
              return (
                <div key={dayKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isToday ? '#d4b060' : '#4a4a80', whiteSpace: 'nowrap' }}>
                      {getDayLabel(dayDate)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: isToday ? 'linear-gradient(90deg, rgba(212,176,96,0.4), transparent)' : '#1c1c38' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {items.map((item, i) => {
                      const start = new Date(item.start?.dateTime || item.start?.date);
                      const end = new Date(item.end?.dateTime || item.end?.date);
                      const isAllDay = !item.start?.dateTime;
                      const isNow = !isAllDay && start <= today && end > today;
                      const timeStr = isAllDay ? 'Journée entière' : start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' → ' + end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={i} className="ov-event" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: isNow ? 'rgba(212,176,96,0.08)' : '#0b0b18', border: `1px solid ${isNow ? 'rgba(212,176,96,0.35)' : '#252540'}`, transition: 'all 0.15s', cursor: 'default' }}>
                          <div style={{ width: 3, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0, minHeight: 30, background: isNow ? '#d4b060' : isToday ? '#6699e0' : '#353560' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#e8e4d9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary || 'Événement'}</p>
                              {isNow && <span style={{ fontSize: 10, fontWeight: 700, color: '#d4b060', background: 'rgba(212,176,96,0.15)', border: '1px solid rgba(212,176,96,0.35)', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>EN COURS</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                              <Clock size={11} color="#6060a0" />
                              <span style={{ fontSize: 12, color: '#8080b0' }}>{timeStr}</span>
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
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f0eee8' }}>Tâches à faire</div>
                <div style={{ fontSize: 12, color: '#7070a0', marginTop: 1 }}>{tachesFiltrees.length} tâche{tachesFiltrees.length !== 1 ? 's' : ''} en attente</div>
              </div>
            </div>

            {projets.length > 1 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                {projets.map(p => {
                  const col = p === 'Tout' ? { color: '#c0c0e0', bg: '#252540' } : pc(p);
                  const isActive = filtre === p;
                  return (
                    <button key={p} onClick={() => setFiltre(p)} className="ov-filtre" style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, border: `1px solid ${isActive ? col.color + '80' : '#252540'}`, background: isActive ? col.bg : 'transparent', color: isActive ? col.color : '#6060a0' }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="ov-scroll" style={{ overflowY: 'auto', maxHeight: 210, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
              {loading ? (
                <p style={{ fontSize: 13, color: '#6060a0', textAlign: 'center', padding: '20px 0' }}>Chargement...</p>
              ) : tachesFiltrees.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #252540', borderRadius: 10 }}>
                  <CheckCircle size={20} color="#4caf7d" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#5dc98d', margin: 0, fontWeight: 600 }}>Tout est fait ✓</p>
                </div>
              ) : tachesFiltrees.map(t => (
                <div key={t.id} onClick={() => toggleTache(t.id)} className="ov-task" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0b0b18', border: '1px solid #252540', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 17, height: 17, borderRadius: 5, border: '2px solid #404070', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#d0cce0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    {t.priorite === 'Haute' && <Flag size={13} color="#e07070" />}
                    {t.projet && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: `1px solid ${pc(t.projet).color}50`, background: pc(t.projet).bg, color: pc(t.projet).color }}>{t.projet}</span>}
                  </div>
                </div>
              ))}
            </div>

            {adding ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') ajouterTache(); if (e.key === 'Escape') { setAdding(false); setNewTask(''); } }}
                  placeholder="Titre... (Entrée pour valider)"
                  style={{ flex: 1, background: '#0b0b18', border: '1px solid rgba(212,176,96,0.4)', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#e8e4d9', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => { setAdding(false); setNewTask(''); }} style={{ padding: '9px', background: 'transparent', border: '1px solid #252540', borderRadius: 8, color: '#6060a0', cursor: 'pointer' }}><X size={14} /></button>
                <button onClick={ajouterTache} style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #4caf7d, #3d8f64)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>✓</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="ov-add" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'transparent', border: '1px dashed #252540', borderRadius: 10, fontSize: 13, color: '#4a4a80', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                <Plus size={14} /> Ajouter une tâche rapide
              </button>
            )}
          </div>

          {/* EMAILS */}
          <div className="ov-card" style={{ padding: 22, borderColor: unread > 0 ? 'rgba(220,80,80,0.3)' : '#252540' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: unread > 0 ? 'rgba(220,80,80,0.2)' : 'rgba(93,201,141,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={17} color={unread > 0 ? '#e07070' : '#5dc98d'} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f0eee8' }}>Emails</div>
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
                <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #252540', borderRadius: 10 }}>
                  <CheckCircle size={20} color="#5dc98d" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#5dc98d', margin: 0, fontWeight: 600 }}>Boîtes vides ✓</p>
                </div>
              ) : emails.slice(0, 8).map(email => {
                const acctColor = ACCOUNT_COLORS[email.Compte] || '#8080b0';
                const senderName = (email['Expéditeur'] || '').replace(/<.*>/, '').replace(/"/g, '').trim();
                return (
                  <div key={email.id} className="ov-email" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: '#0b0b18', border: '1px solid #252540', borderRadius: 10, transition: 'all 0.15s' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${acctColor}20`, border: `1px solid ${acctColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: acctColor, flexShrink: 0 }}>
                      {getInitials(email['Expéditeur'] || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e0ddf0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.Sujet || 'Sans sujet'}
                      </div>
                      <div style={{ fontSize: 11, color: '#7070a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {senderName || '—'}
                        {email['Résumé IA'] && <span style={{ color: '#4a4a78' }}> · {email['Résumé IA'].slice(0, 45)}…</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <div className="ov-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button onClick={() => marquerTraite(email.id)} className="ov-ok" title="Traité" style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #252540', background: 'transparent', color: '#4a4a78', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                          <CheckCircle size={13} />
                        </button>
                        <button onClick={() => supprimerEmail(email.id)} className="ov-del" title="Supprimer" style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #252540', background: 'transparent', color: '#4a4a78', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {unread > 8 && <p style={{ fontSize: 11, color: '#6060a0', textAlign: 'center', padding: '4px 0' }}>+ {unread - 8} autres → aller dans Mails</p>}
            </div>
          </div>

          {/* LIENS RAPIDES */}
          <div className="ov-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a4a80', marginBottom: 12 }}>Accès rapides</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="ov-link"
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: '#0b0b18', border: '1px solid #252540', transition: 'all 0.15s' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${link.color}18`, border: `1px solid ${link.color}30`, flexShrink: 0 }}>
                      <Icon size={13} color={link.color} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#9090c0', flex: 1, transition: 'color 0.15s' }}>{link.label}</span>
                    <ExternalLink size={10} color="#353560" />
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
