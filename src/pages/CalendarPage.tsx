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

// ── Gestionnaire de types ─────────────────────────────────────
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
    setLocalTypes(prev => [...prev, { label: newLabel, color: newColor, bg: `${newColor}18` }]);
    setNewLabel('');
  };

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
              <button onClick={() => setLocalTypes(prev => prev.filter((_, j) => j !== i))} style={{
                background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 2
              }}><X size={13} /></button>
            </div>
          ))}
        </div>

        <div style={{
          padding: 16, background: C.surface, borderRadius: 10,
          border: `1px solid ${C.border}`, marginBottom: 20
        }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Ajouter un type</div>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            placeholder="Nom du type..." style={{ ...inputStyle, marginBottom: 12 }}
            onKeyDown={e => e.key === 'Enter' && addType()} />
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Couleur</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {COLOR_PALETTE.map(col => (
              <div key={col} onClick={() => setNewColor(col)} style={{
                width: 24, height: 24, borderRadius: '50%', background: col, cursor: 'pointer',
                border: `3px solid ${newColor === col ? C.text : 'transparent'}`, transition: 'border .15s'
              }} />
            ))}
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

  const getEndDate = () => {
    if (!event.end) return event.start ? new Date(event.start).toISOString().split('T')[0] : '';
    const end = new Date(event.end);
    if (event.allDay) end.setDate(end.getDate() - 1);
    return end.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    title: event.title || '',
    allDay: event.allDay || false,
    startDate: event.start ? new Date(event.start).toISOString().split('T')[0] : '',
    endDate: getEndDate(),
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
              }}>📅 Journée(s) entière(s)</span>
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
                <span style={{ fontSize: 13, color: C.text }}>
                  {formatDate(event.start)}
                  {event.allDay && event.end && new Date(event.end).getDate() - new Date(event.start).getDate() > 1
                    ? ` → ${formatDate(new Date(new Date(event.end).setDate(new Date(event.end).getDate() - 1)).toISOString())}`
                    : ''}
                </span>
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
              width: '100%', marginTop: 24
