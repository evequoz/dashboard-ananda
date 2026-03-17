import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Maximize2, Minimize2, Sparkles, Calendar, Plus, Filter, CheckCircle2 } from 'lucide-react';

export const CalendarPage = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef(null);

  // RÉCUPÉRATION DES DONNÉES
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
      const data = await response.json();
      if (data && data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Erreur de synchro:", error);
    } finally {
      setLoading(false);
    }
  };

  // ACTIONS INTERACTIVES
  const handleDateSelect = (selectInfo) => {
    const title = prompt('Titre du nouveau RDV :');
    let calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    if (title) {
      calendarApi.addEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        backgroundColor: '#c9a84c',
        borderColor: '#c9a84c'
      });
      // Optionnel : Envoyer ici une requête POST à n8n pour sauvegarder dans Google
    }
  };

  const handleEventClick = (clickInfo) => {
    if (window.confirm(`Supprimer l'événement '${clickInfo.event.title}' ?`)) {
      clickInfo.event.remove();
    }
  };

  return (
    <div className={`flex h-screen bg-[#05050a] text-[#e8e4d9] overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      
      {/* BARRE LATÉRALE PRO */}
      <div className="w-64 bg-[#0f0f1a] border-r border-[#c9a84c]/20 p-6 flex flex-col gap-8 hidden md:flex">
        <div className="flex items-center gap-3 text-[#c9a84c]">
          <Sparkles size={24} />
          <span className="font-serif text-lg tracking-wide">Ananda OS</span>
        </div>

        <button 
          onClick={() => {}} 
          className="w-full bg-[#c9a84c] text-[#05050a] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus size={18} /> Nouveau RDV
        </button>

        <div className="flex flex-col gap-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Mes Calendriers</p>
          <div className="flex items-center justify-between text-sm group cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#c9a84c]"></div>
              <span>Google Perso</span>
            </div>
            <CheckCircle2 size={14} className="text-[#c9a84c]" />
          </div>
          <div className="flex items-center justify-between text-sm group cursor-pointer opacity-50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Travail</span>
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 bg-[#1a1a2e] rounded-2xl border border-[#c9a84c]/10">
          <p className="text-[10px] text-gray-400 mb-2">STATUT SYNC</p>
          <div className="flex items-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            {loading ? 'Mise à jour...' : 'Connecté à n8n'}
          </div>
        </div>
      </div>

      {/* ZONE PRINCIPALE */}
      <div className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-[#c9a84c]">Cockpit de Planification</h1>
            <p className="text-gray-500 text-sm">Gestion unifiée de vos énergies et de votre temps</p>
          </div>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-3 bg-[#0f0f1a] border border-[#c9a84c]/30 rounded-full text-[#c9a84c] hover:bg-[#c9a84c] hover:text-[#05050a] transition-all">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>

        {/* CALENDRIER */}
        <div className="flex-1 bg-[#0f0f1a] border border-[#c9a84c]/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            locale="fr"
            headerToolbar={{
              left: 'today prev,next',
              center: 'title',
              right: 'timeGridDay,timeGridWeek,dayGridMonth'
            }}
            buttonText={{ today: "Aujourd'hui", month: 'Mois', week: 'Semaine', day: 'Jour' }}
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            nowIndicator={true}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            height="100%"
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
            eventClassNames="custom-event"
          />
        </div>
      </div>

      <style jsx global>{`
        /* STYLE FULLCALENDAR PRO */
        .fc { --fc-border-color: rgba(201, 168, 76, 0.1); --fc-button-bg-color: #1a1a2e; --fc-button-border-color: #c9a84c; --fc-button-text-color: #c9a84c; --fc-today-bg-color: rgba(201, 168, 76, 0.05); }
        .fc .fc-toolbar-title { font-family: serif; color: #e8e4d9; font-size: 1.5rem !important; }
        .fc .fc-button:hover { background: #c9a84c !important; color: #05050a !important; }
        .fc .fc-button-active { background: #c9a84c !important; color: #05050a !important; border: none !important; }
        .fc-timegrid-slot { height: 70px !important; }
        .fc-col-header-cell { padding: 12px 0 !important; background: rgba(201, 168, 76, 0.02); }
        .fc-event { 
          background: rgba(201, 168, 76, 0.15) !important; 
          border: none !important; 
          border-left: 4px solid #c9a84c !important;
          padding: 5px !important;
          border-radius: 8px !important;
          transition: all 0.2s;
        }
        .fc-event:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .fc-v-event .fc-event-main { color: #e8e4d9 !important; font-size: 11px; font-weight: 600; }
        .fc-timegrid-now-indicator-line { border-color: #ff4d4d !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 10px; }
      `}</style>
    </div>
  );
};
