import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { Sparkles, RefreshCw, Plus, X, Calendar, Clock, Tag } from 'lucide-react';

const C = {
  bg: '#080810', surface: '#0f0f1a', card: '#14141f',
  border: '#22223a', gold: '#c9a84c', goldSoft: '#e8c97a',
  goldGlow: 'rgba(201,168,76,0.12)', text: '#e8e4d9', muted: '#5a587a',
  accent: '#7b5ea7', green: '#4caf7d', red: '#d95555', blue: '#5588d0', orange: '#d98844',
};

const CATEGORIES = [
  { label: 'Pratique', color: C.accent, bg: '#7b5ea720' },
  { label: 'Contenu', color: C.gold, bg: '#c9a84c20' },
  { label: 'Live', color: C.green, bg: '#4caf7d20' },
  { label: 'Admin', color: C.muted, bg: '#5a587a20' },
  { label: 'Formation', color: C.blue, bg: '#5588d020' },
  { label: 'Doterra', color: C.orange, bg: '#d9884420' },
];

const getCategoryColor = (title: string) => {
  const t = title?.toLowerCase() || '';
  if (t.includes('live') || t.includes('q&a')) return { color: C.green, bg: '#4caf7d20' };
  if (t.includes('kriya') || t.includes('méditation') || t.includes('pratique')) return { color: C.accent, bg: '#7b5ea720' };
  if (t.includes('formation') || t.includes('cours') || t.includes('ehme')) return { color: C.blue, bg: '#5588d020' };
  if (t.includes('doterra')) return { color: C.orange, bg: '#d9884420' };
  if (t.includes('vidéo') || t.includes('contenu') || t.includes('post')) return { color: C.gold, bg: '#c9a84c20' };
  return { color: C.gold, bg: '#c9a84c20' };
};

interface EventModalProps {
  event: any;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const EventModal = ({ event, onClose, onDelete }: EventModalProps) => {
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  const cat = getCategoryColor(event.title);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 24, width: 400,
        border: `1px solid ${cat.color}40`, boxShadow: `0 0 40px ${cat.color}20`
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11,
            background: cat.bg, color: cat.color, border: `1px solid ${cat.color}40`
          }}>{event.extendedProps?.category || 'Événement'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.goldSoft, fontSize: 20, marginBottom: 16 }}>
          {event.title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
            <Calendar size={14} color={C.gold} />
            <span>{start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
            <Clock size={14} color={C.gold} />
            <span>
              {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {end && ` → ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
          {event.extendedProps?.description && (
            <div style={{ padding: '10px 14px', background: C.surface, borderRadius: 8, fontSize: 13, color: C.text }}>
              {event.extendedProps.description}
            </div>
          )}
          {event.extendedProps?.location && (
            <div style={{ fontSize: 12, color: C.muted }}>📍 {event.extendedProps.location}</div>
          )}
          {event.extendedProps?.calendar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
              <Tag size={12} />
              <span>{event.extendedProps.calendar}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13
          }}>Fermer</button>
          <button onClick={() => onDelete(event.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#d9555520', color: C.red, cursor: 'pointer', fontSize: 13
          }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
};

interface NewEventModalProps {
  date: string;
  onClose: () => void;
  onSave: (event: any) => void;
}

const NewEventModal = ({ date, onClose, onSave }: NewEventModalProps) => {
  const [form, setForm] = useState({
    title: '', date: date, startTime: '09:00', endTime: '10:00',
    category: 'Formation', description: '', location: '', calendar: 'Serge'
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    const cat = CATEGORIES.find(c => c.label === form.category);
    onSave({
      id: Date.now().toString(),
      title: form.title,
      start: `${form.date}T${form.startTime}`,
      end: `${form.date}T${form.endTime}`,
      backgroundColor: cat?.bg || C.goldGlow,
      borderColor: cat?.color || C.gold,
      textColor: cat?.color || C.gold,
      extendedProps: {
        category: form.category,
        description: form.description,
        location: form.location,
        calendar: form.calendar,
      }
    });
    onClose();
  };

  const inp = (label: string, key: string, type = 'text', options?: string[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: C.muted }}>{label}</label>
      {options ? (
        <select value={(form as any)[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: '6px 10px', fontSize: 13 }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={(form as any)[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: '6px 10px', fontSize: 13, outline: 'none' }} />
      )}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 24, width: 420,
        border: `1px solid ${C.goldDim}`, maxHeight: '90vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.goldSoft, fontSize: 18 }}>
            Nouvel événement
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {inp('Titre *', 'title')}
          {inp('Date', 'date', 'date')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {inp('Début', 'startTime', 'time')}
            {inp('Fin', 'endTime', 'time')}
          </div>
          {inp('Catégorie', 'category', 'text', CATEGORIES.map(c => c.label))}
          {inp('Agenda', 'calendar', 'text', ['Serge', 'Ananda', 'Doterra', 'Perso'])}
          {inp('Lieu', 'location')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, color: C.muted }}>Description</label>
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: '6px 10px', fontSize: 13, outline: 'none', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13
          }}>Annuler</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
            background: C.gold, color: '#0a0808', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>✓ Créer l'événement</button>
        </div>
      </div>
    </div>
  );
};

export const CalendarPage = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [newEventDate, setNewEventDate] = useState<string | null>(null);
  const [activeCalendars, setActiveCalendars] = useState(['Serge', 'Ananda', 'Doterra', 'Perso']);
  const [view, setView] = useState('timeGridWeek');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
      const data = await response.json();
      if (Array.isArray(data)) {
        const formatted = data.map((item: any) => {
          const cat = getCategoryColor(item.summary || '');
          return {
            id: item.id || Date.now().toString(),
            title: item.summary || 'Rendez-vous',
            start: item.start?.dateTime || item.start?.date,
            end: item.end?.dateTime || item.end?.date,
            backgroundColor: cat.bg,
            borderColor: cat.color,
            textColor: cat.color,
            extendedProps: {
              description: item.description || '',
              location: item.location || '',
              calendar: item.organizer?.displayName || 'Serge',
              category: item.extendedProperties?.private?.category || '',
            }
          };
        });
        setEvents(formatted);
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Erreur synchro calendrier:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
  };

  const handleDateSelect = (info: any) => {
    setNewEventDate(info.startStr.split('T')[0]);
  };

  const handleNewEvent = (event: any) => {
    setEvents(prev => [...prev, event]);
    // Envoyer à N8N pour sync Google Calendar
    fetch('https://n8n.ananda-communaute.cloud/webhook/create-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(console.error);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEvent(null);
    fetch('https://n8n.ananda-communaute.cloud/webhook/delete-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch(console.error);
  };

  const filteredEvents = events.filter(e =>
    activeCalendars.includes(e.extendedProps?.calendar || 'Serge')
  );

  const todayEvents = events.filter(e => {
    const today = new Date().toDateString();
    return new Date(e.start).toDateString() === today;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, height: 'calc(100vh - 80px)', background: C.bg }}>

      {/* Header */}
      <div style={{
        background: C.surface, border: `1px solid ${C.gold}30`, padding: '12px 18px',
        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color={C.gold} />
          <span style={{ fontFamily: "'Playfair Display', serif", color: C.goldSoft, fontSize: 18 }}>
            Cockpit de Planification
          </span>
          {loading && <span style={{ fontSize: 11, color: C.muted }}>Synchronisation...</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastSync && (
            <span style={{ fontSize: 11, color: C.muted }}>
              ↻ {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => setNewEventDate(new Date().toISOString().split('T')[0])} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            background: C.gold, border: 'none', borderRadius: 8, color: '#0a0808',
            cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>
            <Plus size={14} /> Événement
          </button>
          <button onClick={fetchEvents} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.muted, cursor: 'pointer', fontSize: 12
          }}>
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </div>

      {/* Stats du jour */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: "Aujourd'hui", value: todayEvents.length, color: C.gold },
          { label: 'Cette semaine', value: events.filter(e => {
            const d = new Date(e.start);
            const now = new Date();
            const start = new Date(now.setDate(now.getDate() - now.getDay()));
            const end = new Date(now.setDate(now.getDate() + 6));
            return d >= start && d <= end;
          }).length, color: C.blue },
          { label: 'Lives planifiés', value: events.filter(e => e.title?.toLowerCase().includes('live')).length, color: C.green },
          { label: 'Formations', value: events.filter(e => e.title?.toLowerCase().includes('formation') || e.title?.toLowerCase().includes('ehme')).length, color: C.accent },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.card, borderRadius: 10, padding: '12px 16px',
            border: `1px solid ${C.border}`, textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontFamily: "'Playfair Display'", color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres calendriers */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.muted }}>Agendas :</span>
        {['Serge', 'Ananda', 'Doterra', 'Perso'].map(cal => (
          <button key={cal} onClick={() => setActiveCalendars(prev =>
            prev.includes(cal) ? prev.filter(c => c !== cal) : [...prev, cal]
          )} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
            background: activeCalendars.includes(cal) ? `${C.gold}20` : 'transparent',
            border: `1px solid ${activeCalendars.includes(cal) ? C.gold : C.border}`,
            color: activeCalendars.includes(cal) ? C.gold : C.muted,
            transition: 'all .2s'
          }}>{cal}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
              <span style={{ fontSize: 10, color: C.muted }}>{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendrier */}
      <div style={{ flex: 1, background: '#ffffff', borderRadius: 14, padding: 12, overflow: 'hidden', boxShadow: `0 0 30px rgba(0,0,0,0.5)` }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locales={[frLocale]}
          locale="fr"
          events={filteredEvents}
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
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={(info) => {
            setEvents(prev => prev.map(e =>
              e.id === info.event.id
                ? { ...e, start: info.event.startStr, end: info.event.endStr }
                : e
            ));
          }}
          dayMaxEvents={3}
          eventDisplay="block"
          businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '20:00' }}
        />
      </div>

      {/* Modales */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}
      {newEventDate && (
        <NewEventModal
          date={newEventDate}
          onClose={() => setNewEventDate(null)}
          onSave={handleNewEvent}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap');
        .fc-button-primary { background-color: #0f0f1a !important; border-color: #22223a !important; color: #e8e4d9 !important; text-transform: capitalize; font-size: 12px !important; padding: 5px 12px !important; }
        .fc-button-primary:hover { background-color: #c9a84c20 !important; border-color: #c9a84c !important; color: #c9a84c !important; }
        .fc-button-active, .fc-button-primary:not(:disabled).fc-button-active { background-color: #c9a84c !important; border-color: #c9a84c !important; color: #0a0808 !important; }
        .fc-toolbar-title { font-family: 'Playfair Display', serif !important; font-size: 16px !important; color: #1a1a2a !important; }
        .fc-v-event { cursor: pointer; border-width: 2px !important; border-radius: 6px !important; }
        .fc-event:hover { opacity: 0.85; transform: translateY(-1px); transition: all .15s; }
        .fc-timegrid-now-indicator-line { border-color: #c9a84c !important; border-width: 2px !important; }
        .fc-timegrid-now-indicator-arrow { border-top-color: #c9a84c !important; }
        .fc-day-today { background: rgba(201,168,76,0.04) !important; }
        .fc-col-header-cell-cushion { color: #1a1a2a !important; font-weight: 500 !important; font-size: 13px !important; }
        .fc-timegrid-slot-label { font-size: 11px !important; color: #888 !important; }
        .fc-more-link { color: #c9a84c !important; font-size: 11px !important; }
        .fc-daygrid-day-number { color: #1a1a2a !important; }
        .fc-highlight { background: rgba(201,168,76,0.15) !important; }
      `}</style>
    </div>
  );
};
