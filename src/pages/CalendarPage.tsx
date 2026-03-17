import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { Sparkles, RefreshCw, Plus, X, Calendar, Clock, MapPin, Repeat, Edit2, Trash2, Tag } from 'lucide-react';

const C = {
  bg: '#080810', surface: '#0f0f1a', card: '#14141f',
  border: '#22223a', gold: '#c9a84c', goldSoft: '#e8c97a',
  goldDim: '#5a4820', goldGlow: 'rgba(201,168,76,0.12)',
  text: '#e8e4d9', muted: '#5a587a',
  accent: '#7b5ea7', green: '#4caf7d', red: '#d95555',
  blue: '#5588d0', orange: '#d98844',
};

// Types d'événements avec couleurs — modifiables
const DEFAULT_EVENT_TYPES = [
  { label: 'Live / Q&A', color: '#4caf7d', bg: '#4caf7d18' },
  { label: 'Formation', color: '#5588d0', bg: '#5588d018' },
  { label: 'Kriya / Méditation', color: '#7b5ea7', bg: '#7b5ea718' },
  { label: 'Doterra', color: '#d98844', bg: '#d9884418' },
  { label: 'Contenu / Vidéo', color: '#c9a84c', bg: '#c9a84c18' },
  { label: 'Réunion', color: '#5588d0', bg: '#5588d018' },
  { label: 'Perso', color: '#d95555', bg: '#d9555518' },
  { label: 'Voyage', color: '#888888', bg: '#88888818' },
  { label: 'Autre', color: '#c9a84c', bg: '#c9a84c18' },
];

const COLOR_PALETTE = [
  '#4caf7d', '#5588d0', '#7b5ea7', '#d98844', '#c9a84c',
  '#d95555', '#e8c97a', '#888888', '#e91e63', '#00bcd4',
  '#ff5722', '#009688', '#3f51b5', '#ff9800', '#607d8b',
];

const inputStyle: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%',
  fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box'
};

const formatTime = (dt: string) =>
  new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// ── Gestionnaire de types d'événements ───────────────────────
const EventTypesManager = ({ types, onUpdate, onClose }: {
  types: typeof DEFAULT_EVENT_TYPES;
  onUpdate: (types: typeof DEFAULT_EVENT_TYPES) => void;
  onClose: () => void;
}) => {
  const [localTypes, setLocalTypes] = useState(types);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#4caf7d');

  const addType = () => {
    if (!newLabel.trim()) return;
    setLocalTypes(prev => [...prev, {
      label: newLabel,
      color: newColor,
      bg: `${newColor}18`
    }]);
    setNewLabel('');
  };

  const removeType = (i: number) => setLocalTypes(prev => prev.filter((_, j) => j !== i));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 28, width: 460,
        border: `1px solid ${C.goldDim}`, maxHeight: '85vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", color: C.goldSoft, fontSize: 18 }}>
            Types d'événements
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Liste des types existants */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {localTypes.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: C.surface, borderRadius: 8,
              border: `1px solid ${C.border}`
            }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{t.label}</span>
              <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: 10,
                background: t.bg, color: t.color, border: `1px solid ${t.color}40`
              }}>aperçu</span>
              <button onClick={() => removeType(i)} style={{
                background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 2
              }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Ajouter un nouveau type */}
        <div style={{
          padding: '16px', background: C.surface, borderRadius: 10,
          border: `1px solid ${C.border}`, marginBottom: 20
        }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Ajouter un type</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Nom du type..." style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && addType()} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Couleur</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {COLOR_PALETTE.map(col => (
                <div key={col} onClick={() => setNewColor(col)} style={{
                  width: 24, height: 24, borderRadius: '50%', background: col,
                  cursor: 'pointer', border: `3px solid ${newColor === col ? C.text : 'transparent'}`,
                  transition: 'border .15s'
                }} />
              ))}
            </div>
          </div>
          <button onClick={addType} style={{
            width: '100%', padding: '8px 0', borderRadius: 8,
            border: `1px solid ${newColor}`, background: `${newColor}20`,
            color: newColor, cursor: 'pointer', fontSize: 13, fontWeight: 500
          }}>+ Ajouter "{newLabel || 'nouveau type'}"</button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px 0', borderRadius: 8,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.muted, cursor: 'pointer', fontSize: 13
          }}>Annuler</button>
          <button onClick={() => { onUpdate(localTypes); onClose(); }} style={{
            flex: 2, padding: '10px 0', borderRadius: 8,
            border: 'none', background: C.gold,
            color: '#0a0808', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>✓ Sauvegarder</button>
        </div>
      </div>
    </div>
  );
};

// ── Modal détail / édition ────────────────────────────────────
const EventModal = ({ event, onClose, onDelete, onUpdate, eventTypes }: {
  event: any;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  eventTypes: typeof DEFAULT_EVENT_TYPES;
}) => {
  const currentType = eventTypes.find(t => t.label === event.extendedProps?.eventType) || eventTypes[eventTypes.length - 1];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: event.title || '',
    allDay: event.allDay || false,
    startDate: event.start ? new Date(event.start).toISOString().split('T')[0] : '',
    endDate: event.end ? new Date(event.end).toISOString().split('T')[0] : '',
    startTime: event.start && !event.allDay ? formatTime(event.start) : '09:00',
    endTime: event.end && !event.allDay ? formatTime(event.end) : '10:00',
    description: event.extendedProps?.description || '',
    location: event.extendedProps?.location || '',
    status: event.extendedProps?.status || 'busy',
    eventType: event.extendedProps?.eventType || eventTypes[0].label,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const selectedType = eventTypes.find(t => t.label === form.eventType) || eventTypes[0];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 28, width: 440,
        border: `1px solid ${currentType.color}50`,
        boxShadow: `0 0 40px ${currentType.color}15`,
        maxHeight: '90vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11,
              background: currentType.bg, color: currentType.color,
              border: `1px solid ${currentType.color}40`,
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: currentType.color }} />
              {currentType.label}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11,
              background: event.extendedProps?.status === 'free' ? '#4caf7d18' : '#d9555518',
              color: event.extendedProps?.status === 'free' ? C.green : C.red,
              border: `1px solid ${event.extendedProps?.status === 'free' ? C.green : C.red}40`
            }}>
              {event.extendedProps?.status === 'free' ? '🟢 Libre' : '🔴 Occupé'}
            </span>
            {event.allDay && (
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11,
                background: '#5588d018', color: C.blue, border: `1px solid ${C.blue}40`
              }}>📅 Journée entière</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing(!editing)} style={{
              background: editing ? `${C.gold}20` : 'transparent',
              border: `1px solid ${editing ? C.gold : C.border}`,
              borderRadius: 8, color: editing ? C.gold : C.muted,
              cursor: 'pointer', padding: '5px 8px'
            }}><Edit2 size={13} /></button>
            <button onClick={() => { onDelete(event.id); onClose(); }} style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.red, cursor: 'pointer', padding: '5px 8px'
            }}><Trash2 size={13} /></button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: C.muted, cursor: 'pointer'
            }}><X size={16} /></button>
          </div>
        </div>

        {!editing ? (
          <>
            <h2 style={{
              fontFamily: "'Playfair Display',serif", color: C.goldSoft,
              fontSize: 20, marginBottom: 20, lineHeight: 1.3
            }}>{event.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={14} color={C.gold} />
                <span style={{ fontSize: 13, color: C.text }}>{formatDate(event.start)}</span>
              </div>
              {!event.allDay && (
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
              {event.extendedProps?.recurrence && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Repeat size={14} color={C.blue} />
                  <span style={{ fontSize: 13, color: C.muted }}>Événement récurrent</span>
                </div>
              )}
              {event.extendedProps?.description && (
                <div style={{
                  padding: '12px 14px', background: C.surface, borderRadius: 8,
                  fontSize: 13, color: C.muted, lineHeight: 1.6
                }}>{event.extendedProps.description}</div>
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
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Type d'événement</label>
                <select value={form.eventType} onChange={e => set('eventType', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {eventTypes.map(t => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
                {selectedType && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedType.color }} />
                    <span style={{ fontSize: 11, color: selectedType.color }}>{selectedType.label}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="allDayEdit" checked={form.allDay}
                  onChange={e => set('allDay', e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.gold }} />
                <label htmlFor="allDayEdit" style={{ fontSize: 13, color: C.text, cursor: 'pointer' }}>
                  📅 Journée entière
                </label>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Date</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={inputStyle} />
              </div>
              {!form.allDay && (
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
              )}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Statut</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
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
              <button onClick={() => { onUpdate(event.id, form); setEditing(false); onClose(); }} style={{
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
const NewEventModal = ({ date, onClose, onSave, eventTypes }: {
  date: string;
  onClose: () => void;
  onSave: (e: any) => void;
  eventTypes: typeof DEFAULT_EVENT_TYPES;
}) => {
  const [form, setForm] = useState({
    title: '', date, endDate: date,
    allDay: false,
    startTime: '09:00', endTime: '10:00',
    description: '', location: '',
    status: 'busy', recurrence: 'none',
    calendar: 'Calendrier',
    eventType: eventTypes[0]?.label || 'Autre',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const selectedType = eventTypes.find(t => t.label === form.eventType) || eventTypes[0];

  const RECURRENCE = [
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
        background: C.card, borderRadius: 16, padding: 28, width: 480,
        border: `1px solid ${selectedType?.color || C.goldDim}50`,
        maxHeight: '90vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", color: C.goldSoft, fontSize: 18 }}>
            Nouvel événement
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Titre */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ex: Live EHME, Formation Kriya..." style={inputStyle} />
          </div>

          {/* Type d'événement */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Type d'événement</label>
            <select value={form.eventType} onChange={e => set('eventType', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {eventTypes.map(t => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
            {selectedType && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedType.color }} />
                <span style={{ fontSize: 11, color: selectedType.color }}>{selectedType.label}</span>
              </div>
            )}
          </div>

          {/* Agenda */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Agenda</label>
            <select value={form.calendar} onChange={e => set('calendar', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Calendrier">📅 Calendrier (Serge)</option>
              <option value="Organisation lancement">🚀 Organisation lancement</option>
            </select>
          </div>

          {/* Journée entière */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', background: C.surface, borderRadius: 8,
            border: `1px solid ${form.allDay ? C.gold : C.border}`,
            cursor: 'pointer', transition: 'border .2s'
          }} onClick={() => set('allDay', !form.allDay)}>
            <input type="checkbox" checked={form.allDay} onChange={() => {}}
              style={{ width: 16, height: 16, accentColor: C.gold, cursor: 'pointer' }} />
            <div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>📅 Journée entière</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                Apparaît en haut du calendrier — utile pour les voyages, absences, jours bloqués
              </div>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: form.allDay ? '1fr 1fr' : '1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>
                {form.allDay ? 'Date début' : 'Date'}
              </label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
            </div>
            {form.allDay && (
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Date fin</label>
                <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>

          {/* Heures (si pas journée entière) */}
          {!form.allDay && (
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
          )}

          {/* Statut */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="busy">🔴 Occupé — bloque les disponibilités</option>
              <option value="free">🟢 Libre — visible mais disponible</option>
            </select>
          </div>

          {/* Récurrence */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Récurrence</label>
            <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {RECURRENCE.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Lieu */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Lieu</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="En ligne, ville, adresse..." style={inputStyle} />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Notes, lien Zoom, infos complémentaires..."
              style={{ ...inputStyle, resize: 'vertical' } as any} />
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
            const type = eventTypes.find(t => t.label === form.eventType) || eventTypes[0];
            const newEvent: any = {
              id: `local-${Date.now()}`,
              title: form.title,
              allDay: form.allDay,
              backgroundColor: type.bg,
              borderColor: type.color,
              textColor: type.color,
              extendedProps: {
                description: form.description,
                location: form.location,
                status: form.status,
                recurrence: form.recurrence !== 'none' ? form.recurrence : null,
                calendar: form.calendar,
                eventType: form.eventType,
              }
            };
            if (form.allDay) {
              newEvent.start = form.date;
              // Google Calendar : end date exclusive pour allDay
              const end = new Date(form.endDate);
              end.setDate(end.getDate() + 1);
              newEvent.end = end.toISOString().split('T')[0];
            } else {
              newEvent.start = `${form.date}T${form.startTime}:00`;
              newEvent.end = `${form.date}T${form.endTime}:00`;
            }
            onSave(newEvent);
            onClose();
          }} style={{
            flex: 2, padding: '10px 0', borderRadius: 8,
            border: 'none', background: selectedType?.color || C.gold,
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
  const [showTypesManager, setShowTypesManager] = useState(false);
  const [eventTypes, setEventTypes] = useState<typeof DEFAULT_EVENT_TYPES>(() => {
    try {
      const saved = localStorage.getItem('ananda-event-types');
      return saved ? JSON.parse(saved) : DEFAULT_EVENT_TYPES;
    } catch { return DEFAULT_EVENT_TYPES; }
  });

  const saveEventTypes = (types: typeof DEFAULT_EVENT_TYPES) => {
    setEventTypes(types);
    try { localStorage.setItem('ananda-event-types', JSON.stringify(types)); } catch {}
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = data.map((item: any) => {
          const isAllDay = !item.start?.dateTime;
          const isFree = item.transparency === 'transparent';
          const eventType = item.extendedProperties?.private?.eventType || '';
          const type = eventTypes.find(t => t.label === eventType) || eventTypes[eventTypes.length - 1];
          return {
            id: item.id || `evt-${Math.random()}`,
            title: item.summary || item.events || 'Événement',
            allDay: isAllDay,
            start: item.start?.dateTime || item.start?.date,
            end: item.end?.dateTime || item.end?.date,
            backgroundColor: isFree ? 'transparent' : type.bg,
            borderColor: type.color,
            textColor: type.color,
            borderStyle: isFree ? 'dashed' : 'solid',
            extendedProps: {
              description: item.description || '',
              location: item.location || '',
              status: isFree ? 'free' : 'busy',
              recurrence: item.recurrence || null,
              calendar: item.organizer?.displayName || '',
              eventType,
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
  }, [eventTypes]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleUpdate = (id: string, data: any) => {
    const type = eventTypes.find(t => t.label === data.eventType) || eventTypes[0];
    setEvents(prev => prev.map(e =>
      e.id === id ? {
        ...e,
        title: data.title,
        allDay: data.allDay,
        start: data.allDay ? data.startDate : `${data.startDate}T${data.startTime}:00`,
        end: data.allDay ? data.startDate : `${data.startDate}T${data.endTime}:00`,
        backgroundColor: type.bg,
        borderColor: type.color,
        textColor: type.color,
        extendedProps: { ...e.extendedProps, description: data.description, location: data.location, status: data.status, eventType: data.eventType }
      } : e
    ));
    fetch('https://n8n.ananda-communaute.cloud/webhook/update-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data })
    }).catch(console.error);
  };

  const handleDelete = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    fetch('https://n8n.ananda-communaute.cloud/webhook/delete-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
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
            <button onClick={() => setShowTypesManager(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', background: 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.muted, cursor: 'pointer', fontSize: 12
            }}>
              <Tag size={12} /> Types
            </button>
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
                  ? { ...e, start: info.event.startStr, end: info.event.endStr, allDay: info.event.allDay }
                  : e
              ));
              fetch('https://n8n.ananda-communaute.cloud/webhook/update-event', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
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
              <div style={{ padding: '2px 5px', overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {arg.event.extendedProps?.status === 'free' ? '🟢 ' : ''}
                  {arg.event.allDay ? '📅 ' : ''}
                  {arg.event.title}
                </div>
                {!arg.event.allDay && (
                  <div style={{ fontSize: 10, opacity: 0.8 }}>
                    {arg.timeText}
                    {arg.event.extendedProps?.recurrence && ' 🔁'}
                    {arg.event.extendedProps?.location && ' 📍'}
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Légende des types */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 4px' }}>
        {eventTypes.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
            <span style={{ fontSize: 10, color: C.muted }}>{t.label}</span>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          eventTypes={eventTypes}
        />
      )}
      {newEventDate && (
        <NewEventModal
          date={newEventDate}
          onClose={() => setNewEventDate(null)}
          onSave={(e) => {
            setEvents(prev => [...prev, e]);
            fetch('https://n8n.ananda-communaute.cloud/webhook/create-event', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(e)
            }).catch(console.error);
          }}
          eventTypes={eventTypes}
        />
      )}
      {showTypesManager && (
        <EventTypesManager
          types={eventTypes}
          onUpdate={saveEventTypes}
          onClose={() => setShowTypesManager(false)}
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
        .fc-daygrid-event { border-radius:6px !important; padding:2px 4px !important; }
        .fc-daygrid-block-event { border-width:2px !important; }
      `}</style>
    </div>
  );
};
