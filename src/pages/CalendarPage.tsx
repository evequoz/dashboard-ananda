import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { Sparkles, RefreshCw, Plus, X, Calendar, Clock, MapPin } from 'lucide-react';

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
  if (t.includes('live') || t.includes('q&a')) return { color: C.green, bg: '#4caf7d15' };
  if (t.includes('kriya') || t.includes('méditation') || t.includes('pratique')) return { color: C.accent, bg: '#7b5ea715' };
  if (t.includes('formation') || t.includes('ehme') || t.includes('mm')) return { color: C.blue, bg: '#5588d015' };
  if (t.includes('doterra')) return { color: C.orange, bg: '#d9884415' };
  if (t.includes('vidéo') || t.includes('contenu') || t.includes('enregistrement')) return { color: C.gold, bg: '#c9a84c15' };
  if (t.includes('kundalini') || t.includes('éveil') || t.includes('transmission')) return { color: C.accent, bg: '#7b5ea715' };
  return { color: C.gold, bg: '#c9a84c15' };
};

const formatTime = (dateTime: string) =>
  new Date(dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatDate = (dateTime: string) =>
  new Date(dateTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// ── Modal détail événement ────────────────────────────────────
const EventModal = ({ event, onClose }: { event: any; onClose: () => void }) => {
  const style = getEventStyle(event.title);
  const start = event.start;
  const end = event.end;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 28, width: 420,
        border: `1px solid ${style.color}50`,
        boxShadow: `0 0 40px ${style.color}15`
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            background: style.bg, color: style.color, border: `1px solid ${style.color}40`
          }}>Événement</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif", color: C.goldSoft,
          fontSize: 20, marginBottom: 20, lineHeight: 1.3
        }}>{event.title}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={14} color={C.gold} />
            <span style={{ fontSize: 13, color: C.text }}>{formatDate(start)}</span>
          </div>
          {start && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={14} color={C.gold} />
              <span style={{ fontSize: 13, color: C.text }}>
                {formatTime(start)}{end ? ` → ${formatTime(end)}` : ''}
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
              fontSize: 13, color: C.muted, lineHeight: 1.6, marginTop: 4
            }}>{event.extendedProps.description}</div>
          )}
        </div>

        <button onClick={onClose} style={{
          width: '100%', marginTop: 24, padding: '10px 0', borderRadius: 8,
          border: `1px solid ${C.border}`, background: 'transparent',
          color: C.muted, cursor: 'pointer', fontSize: 13
        }}>Fermer</button>
      </div>
    </div>
  );
};

// ── Modal nouvel événement ────────────────────────────────────
const NewEventModal = ({ date, onClose, onSave }: { date: string; onClose: () => void; onSave: (e: any) => void }) => {
  const [form, setForm] = useState({
    title: '', date, startTime: '09:00', endTime: '10:00', description: '', location: ''
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%',
    fontFamily: "'Outfit', sans-serif"
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 28, width: 440,
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
          {[
            { label: 'Titre *', key: 'title', type: 'text' },
            { label: 'Date', key: 'date', type: 'date' },
            { label: 'Lieu', key: 'location', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>{label}</label>
              <input type={type} value={(form as any)[key]}
                onChange={e => set(key, e.target.value)}
                style={inputStyle} />
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Début', 'startTime'], ['Fin', 'endTime']].map(([label, key]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>{label}</label>
                <input type="time" value={(form as any)[key]}
                  onChange={e => set(key, e.target.value)}
                  style={inputStyle} />
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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
            onSave({
              id: `local-${Date.now()}`,
              title: form.title,
              start: `${form.date}T${form.startTime}:00`,
              end: `${form.date}T${form.endTime}:00`,
              backgroundColor: style.bg,
              borderColor: style.color,
              textColor: style.color,
              extendedProps: { description: form.description, location: form.location }
            });
            onClose();
          }} style={{
            flex: 2, padding: '10px 0', borderRadius: 8,
            border: 'none', background: C.gold,
            color: '#0a0808', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>✓ Créer</button>
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

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = data.map((item: any) => {
          const style = getEventStyle(item.summary || item.events || '');
          return {
            id: item.id || `evt-${Date.now()}-${Math.random()}`,
            title: item.summary || item.events || 'Événement',
            start: item.start?.dateTime || item.start?.date || item.start,
            end: item.end?.dateTime || item.end?.date || item.end,
            backgroundColor: style.bg,
            borderColor: style.color,
            textColor: style.color,
            extendedProps: {
              description: item.description || '',
              location: item.location || '',
              creator: item.creator?.email || '',
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

  const todayEvents = events.filter(e => {
    if (!e.start) return false;
    return new Date(e.start).toDateString() === new Date().toDateString();
  });

  const weekEvents = events.filter(e => {
    if (!e.start) return false;
    const d = new Date(e.start);
    const now = new Date();
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - now.getDay() + 1);
    const endWeek = new Date(startWeek); endWeek.setDate(startWeek.getDate() + 6);
    return d >= startWeek && d <= endWeek;
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      padding: '16px 20px', height: 'calc(100vh - 70px)',
      background: C.bg, fontFamily: "'Outfit', sans-serif"
    }}>

      {/* Header */}
      <div style={{
        background: C.surface, border: `1px solid ${C.gold}25`,
        padding: '10px 18px', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={16} color={C.gold} />
          <span style={{ fontFamily: "'Playfair Display', serif", color: C.goldSoft, fontSize: 17 }}>
            Cockpit de Planification
          </span>
          {loading && (
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>
              ↻ Synchronisation...
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastSync && (
            <span style={{ fontSize: 11, color: C.muted }}>
              Sync {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => setNewEventDate(new Date().toISOString().split('T')[0])} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', background: C.gold, border: 'none',
            borderRadius: 8, color: '#0a0808', cursor: 'pointer',
            fontSize: 12, fontWeight: 600
          }}>
            <Plus size={13} /> Événement
          </button>
          <button onClick={fetchEvents} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', background: 'transparent',
            border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.muted, cursor: 'pointer', fontSize: 12
          }}>
            <RefreshCw size={13} /> Sync
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: "Aujourd'hui", value: todayEvents.length, color: C.gold },
          { label: 'Cette semaine', value: weekEvents.length, color: C.blue },
          { label: 'Lives', value: events.filter(e => e.title?.toLowerCase().includes('live')).length, color: C.green },
          { label: 'Total', value: events.length, color: C.accent },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.card, borderRadius: 10, padding: '10px 14px',
            border: `1px solid ${C.border}`, textAlign: 'center'
          }}>
            <div style={{ fontSize: 22, fontFamily: "'Playfair Display'", color: s.color, fontWeight: 700 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendrier */}
      <div style={{
        flex: 1, background: '#fff', borderRadius: 14,
        padding: '14px 16px', overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
      }}>
        <FullCalendar
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
          }}
          dayMaxEvents={4}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '08:00', endTime: '20:00'
          }}
          eventTimeFormat={{
            hour: '2-digit', minute: '2-digit', hour12: false
          }}
        />
      </div>

      {/* Modales */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
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
        .fc-event:hover { opacity:0.85 !important; }
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
      `}</style>
    </div>
  );
};
