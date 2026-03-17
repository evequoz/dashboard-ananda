import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { Sparkles, RefreshCw, Plus, X, Calendar, Clock, MapPin, Repeat, Edit2, Trash2 } from 'lucide-react';

const C = {
  bg: '#080810', surface: '#0f0f1a', card: '#14141f',
  border: '#22223a', gold: '#c9a84c', goldSoft: '#e8c97a',
  goldDim: '#5a4820', goldGlow: 'rgba(201,168,76,0.12)',
  text: '#e8e4d9', muted: '#5a587a',
  accent: '#7b5ea7', green: '#4caf7d', red: '#d95555',
  blue: '#5588d0', orange: '#d98844',
};

const getEventStyle = (summary: string = '') => {
  const t = summary.toLowerCase();
  if (t.includes('live') || t.includes('q&a')) return { color: C.green, bg: '#4caf7d18' };
  if (t.includes('kriya') || t.includes('méditation') || t.includes('pratique')) return { color: C.accent, bg: '#7b5ea718' };
  if (t.includes('formation') || t.includes('ehme') || t.includes('mm')) return { color: C.blue, bg: '#5588d018' };
  if (t.includes('doterra')) return { color: C.orange, bg: '#d9884418' };
  if (t.includes('vidéo') || t.includes('contenu') || t.includes('enregistrement')) return { color: C.gold, bg: '#c9a84c18' };
  if (t.includes('kundalini') || t.includes('éveil') || t.includes('transmission')) return { color: C.accent, bg: '#7b5ea718' };
  return { color: C.gold, bg: '#c9a84c18' };
};

const formatTime = (dt: string) =>
  new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const inputStyle: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%',
  fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box'
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer'
};

// ── Modal détail / édition ────────────────────────────────────
const EventModal = ({
  event, onClose, onDelete, onUpdate
}: {
  event: any;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
}) => {
  const style = getEventStyle(event.title);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: event.title || '',
    startDate: event.start ? new Date(event.start).toISOString().split('T')[0] : '',
    startTime: event.start ? formatTime(event.start) : '',
    endTime: event.end ? formatTime(event.end) : '',
    description: event.extendedProps?.description || '',
    location: event.extendedProps?.location || '',
    status: event.extendedProps?.status || 'busy',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 28, width: 440,
        border: `1px solid ${style.color}50`,
        boxShadow: `0 0 40px ${style.color}15`,
        maxHeight: '90vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11,
              background: style.bg, color: style.color, border: `1px solid ${style.color}40`
            }}>
              {event.extendedProps?.status === 'free' ? '🟢 Libre' : '🔴 Occupé'}
            </span>
            {event.extendedProps?.recurrence && (
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11,
                background: '#5588d018', color: C.blue, border: `1px solid ${C.blue}40`,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <Repeat size={10} /> Récurrent
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(!editing)} style={{
              background: editing ? `${C.gold}20` : 'transparent',
              border: `1px solid ${editing ? C.gold : C.border}`,
              borderRadius: 8, color: editing ? C.gold : C.muted,
              cursor: 'pointer', padding: '5px 8px'
            }}>
              <Edit2 size={14} />
            </button>
            <button onClick={() => { onDelete(event.id); onClose(); }} style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.red, cursor: 'pointer', padding: '5px 8px'
            }}>
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: C.muted, cursor: 'pointer'
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenu */}
        {!editing ? (
          <>
            <h2 style={{
              fontFamily: "'Playfair Display', serif", color: C.goldSoft,
              fontSize: 20, marginBottom: 20, lineHeight: 1.3
            }}>{event.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={14} color={C.gold} />
                <span style={{ fontSize: 13, color: C.text }}>{formatDate(event.start)}</span>
              </div>
              {event.start && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={14} color={C.gold} />
                  <span style={{ fontSize: 13, color: C.text }}>
                    {formatTime(event.start)}{event.end ? ` → ${formatTime(event.end)}` : ''}
                  </span>
                </div>
              )}
              {event.extendedProps?.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={14} color={C.gold} />
                  <span style={{ fontSize: 13, color: C.text }}>{event.extendedProps.location}</span>
                </div>
              )}
              {event.extendedProps?.description && (
                <div style={{
                  padding: '12px 14px', background: C.surface, borderRadius: 8,
                  fontSize: 13, color: C.muted, lineHeight: 1.6
                }}>{event.extendedProps.description}</div>
              )}
              {event.extendedProps?.calendar && (
                <div style={{ fontSize: 12, color: C.muted }}>
                  📅 Agenda : {event.extendedProps.calendar}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              width: '100%', marginTop: 24, padding: '10px 0', borderRadius: 8,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.muted, cursor: 'pointer', fontSize: 13
            }}>Fermer</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Titre</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Date</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Début</label>
                  <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Fin</label>
                  <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Statut</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
                  <option value="busy">🔴 Occupé</option>
                  <option value="free">🟢 Libre</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Lieu</label>
                <input value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'vertical' } as any} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.muted, cursor: 'pointer', fontSize: 13
              }}>Annuler</button>
              <button onClick={() => {
                onUpdate(event.id, form);
                setEditing(false);
                onClose();
              }} style={{
                flex: 2, padding: '10px 0', borderRadius: 8,
                border: 'none', background: C.gold,
                color: '#0a0808', cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>✓ Sauvegarder</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Modal nouvel événement ────────────────────────────────────
const NewEventModal = ({
  date, onClose, onSave
}: {
  date: string;
  onClose: () => void;
  onSave: (e: any) => void;
}) => {
  const [form, setForm] = useState({
    title: '', date, startTime: '09:00', endTime: '10:00',
    description: '', location: '', status: 'busy',
    recurrence: 'none', calendar: 'Calendrier'
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const RECURRENCE_OPTIONS = [
    { value: 'none', label: 'Pas de récurrence' },
    { value: 'daily', label: 'Tous les jours' },
    { value: 'weekly', label: 'Toutes les semaines' },
    { value: 'biweekly', label: 'Toutes les 2 semaines' },
    { value: 'monthly', label: 'Tous les mois' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 28, width: 460,
        border: `1px solid ${C.goldDim}`, maxHeight: '90vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.goldSoft, fontSize: 18 }}>
            Nouvel événement
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ex: Live EHME, Formation Kriya..." style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Agenda</label>
            <select value={form.calendar} onChange={e => set('calendar', e.target.value)} style={selectStyle}>
              <option value="Calendrier">📅 Calendrier (Serge)</option>
              <option value="Organisation lancement">🚀 Organisation lancement</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Début</label>
              <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Fin</label>
              <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
              <option value="busy">🔴 Occupé</option>
              <option value="free">🟢 Libre</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Récurrence</label>
            <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} style={selectStyle}>
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Lieu</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="En ligne, adresse..." style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Notes, lien Zoom..." style={{ ...inputStyle, resize: 'vertical' } as any} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px 0', borderRadius: 8,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.muted, cursor: 'pointer', fontSize: 13
          }}>Annuler</button>
          <button onClick={() => {
            if (!form.title.trim()) return;
            const style = getEventStyle(form.title);
            const newEvent = {
              id: `local-${Date.now()}`,
              title: form.title,
              start: `${form.date}T${form.startTime}:00`,
              end: `${form.date}T${form.endTime}:00`,
              backgroundColor: style.bg,
              borderColor: style.color,
              textColor: style.color,
              extendedProps: {
                description: form.description,
                location: form.location,
                status: form.status,
                recurrence: form.recurrence !== 'none' ? form.recurrence : null,
                calendar: form.calendar,
              }
            };
            onSave(newEvent);
            onClose();
          }} style={{
            flex: 2, padding: '10px 0', borderRadius: 8,
            border: 'none', background: C.gold,
            color: '#0a0808', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>✓ Créer l'événement</button>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────
export const CalendarPage = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [newEventDate, setNewEventDate] = useState<string | null>(null);
  const calendarRef = useRef<any>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = data.map((item: any) => {
          const s = getEventStyle(item.summary || item.events || '');
          const isFree = item.transparency === 'transparent';
          return {
            id: item.id || `evt-${Math.random()}`,
            title: item.summary || item.events || 'Événement',
            start: item.start?.dateTime || item.start?.date,
            end: item.end?.dateTime || item.end?.date,
            backgroundColor: isFree ? 'transparent' : s.bg,
            borderColor: s.color,
            textColor: s.color,
            borderStyle: isFree ? 'dashed' : 'solid',
            extendedProps: {
              description: item.description || '',
              location: item.location || '',
              status: isFree ? 'free' : 'busy',
              recurrence: item.recurrence || null,
              calendar: item.organizer?.displayName || item.calendar || '',
            }
          };
        });
        setEvents(formatted);
        setLastSync(new Date());
      }
    } catch (e) {
      console.error('Erreur calendrier:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleUpdate = (id: string, data: any) => {
    setEvents(prev => prev.map(e =>
      e.id === id ? {
        ...e,
        title: data.title,
        start: `${data.startDate}T${data.startTime}:00`,
        end: `${data.startDate}T${data.endTime}:00`,
        extendedProps: {
          ...e.extendedProps,
          description: data.description,
          location: data.location,
          status: data.status,
        }
      } : e
    ));
    fetch('https://n8n.ananda-communaute.cloud/webhook/update-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data })
    }).catch(console.error);
  };

  const handleDelete = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    fetch('https://n8n.ananda-communaute.cloud/webhook/delete-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch(console.error);
  };

  const todayEvents = events.filter(e =>
    e.start && new Date(e.start).toDateString() === new Date().toDateString()
  );

  const weekEvents = events.filter(e => {
    if (!e.start) return false;
    const d = new Date(e.start);
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return d >= start && d <= end;
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      padding: '12px 16px', height: 'calc(100vh - 70px)',
      background: C.bg, fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${C.border}`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', background: C.surface,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={15} color={C.gold} />
            <span style={{ fontFamily: "'Playfair Display',serif", color: C.goldSoft, fontSize: 15 }}>
              Cockpit de Planification
            </span>
            {loading && <span style={{ fontSize: 11, color: C.muted }}>↻</span>}
            {lastSync && !loading && (
              <span style={{ fontSize: 10, color: C.muted }}>
                {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {[
              { label: "Auj.", value: todayEvents.length, color: C.gold },
              { label: 'Semaine', value: weekEvents.length, color: C.blue },
              { label: 'Lives', value: events.filter(e => e.title?.toLowerCase().includes('live')).length, color: C.green },
              { label: 'Total', value: events.length, color: C.accent },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontFamily: "'Playfair Display'", color: s.color, fontWeight: 700, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setNewEventDate(new Date().toISOString().split('T')[0])} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', background: C.gold, border: 'none',
              borderRadius: 8, color: '#0a0808', cursor: 'pointer',
              fontSize: 12, fontWeight: 600
            }}>
              <Plus size={12} /> Événement
            </button>
            <button onClick={fetchEvents} style={{
              display: 'flex', alignItems: 'center',
              padding: '6px 10px', background: 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.muted, cursor: 'pointer'
            }}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Calendrier */}
        <div style={{ flex: 1, background: '#fff', padding: '10px 12px', overflow: 'hidden' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locales={[frLocale]}
            locale="fr"
            events={events}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            height="100%"
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            nowIndicator={true}
            selectable={true}
            editable={true}
            select={(info) => setNewEventDate(info.startStr.split('T')[0])}
            eventClick={(info) => setSelectedEvent(info.event)}
            eventDrop={(info) => {
              setEvents(prev => prev.map(e =>
                e.id === info.event.id
                  ? { ...e, start: info.event.startStr, end: info.event.endStr }
                  : e
              ));
              fetch('https://n8n.ananda-communaute.cloud/webhook/update-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: info.event.id, start: info.event.startStr, end: info.event.endStr })
              }).catch(console.error);
            }}
            eventResize={(info) => {
              setEvents(prev => prev.map(e =>
                e.id === info.event.id
                  ? { ...e, start: info.event.startStr, end: info.event.endStr }
                  : e
              ));
            }}
            dayMaxEvents={4}
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '20:00' }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventContent={(arg) => (
              <div style={{ padding: '2px 4px', overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {arg.event.extendedProps?.status === 'free' ? '🟢 ' : ''}{arg.event.title}
                </div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>
                  {arg.timeText}
                  {arg.event.extendedProps?.recurrence && ' 🔁'}
                  {arg.event.extendedProps?.location && ' 📍'}
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
      {newEventDate && (
        <NewEventModal
          date={newEventDate}
          onClose={() => setNewEventDate(null)}
          onSave={(e) => {
            setEvents(prev => [...prev, e]);
            fetch('https://n8n.ananda-communaute.cloud/webhook/create-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(e)
            }).catch(console.error);
          }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Outfit:wght@300;400;500&display=swap');
        .fc { font-family: 'Outfit', sans-serif !important; }
        .fc-button-primary { background:#0f0f1a !important; border-color:#22223a !important; color:#e8e4d9 !important; font-size:12px !important; padding:5px 12px !important; text-transform:capitalize !important; border-radius:8px !important; }
        .fc-button-primary:hover { background:#c9a84c15 !important; border-color:#c9a84c !important; color:#c9a84c !important; }
        .fc-button-primary:not(:disabled).fc-button-active { background:#c9a84c !important; border-color:#c9a84c !important; color:#0a0808 !important; }
        .fc-toolbar-title { font-family:'Playfair Display',serif !important; font-size:15px !important; color:#1a1a2a !important; font-weight:600 !important; }
        .fc-v-event { border-radius:6px !important; border-width:2px !important; cursor:pointer !important; }
        .fc-event:hover { opacity:0.85 !important; transform:translateY(-1px); transition:all .15s; }
        .fc-timegrid-now-indicator-line { border-color:#c9a84c !important; border-width:2px !important; }
        .fc-timegrid-now-indicator-arrow { border-top-color:#c9a84c !important; }
        .fc-day-today { background:rgba(201,168,76,0.05) !important; }
        .fc-col-header-cell-cushion { color:#333 !important; font-weight:500 !important; font-size:12px !important; text-decoration:none !important; }
        .fc-timegrid-slot-label { font-size:11px !important; color:#999 !important; }
        .fc-daygrid-day-number { color:#333 !important; text-decoration:none !important; }
        .fc-highlight { background:rgba(201,168,76,0.12) !important; }
        .fc-more-link { color:#c9a84c !important; font-size:11px !important; }
        .fc-event-title { font-size:12px !important; font-weight:500 !important; }
        .fc-event-time { font-size:11px !important; }
        .fc-daygrid-event { border-radius:6px !important; padding:2px 4px !important; }
      `}</style>
    </div>
  );
};
