import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import { Sparkles, Plus, Calendar as CalendarIcon, CheckCircle2, RefreshCw } from 'lucide-react';

export const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
      const data = await response.json();
      
      // Nettoyage et formatage strict pour FullCalendar
      if (data && data.events) {
        const formatted = data.events.map(e => ({
          title: e.title || e.summary || "Sans titre",
          start: e.start,
          end: e.end,
          backgroundColor: 'rgba(201, 168, 76, 0.15)',
          borderColor: '#c9a84c',
          textColor: '#e8e4d9',
          className: 'pro-event'
        }));
        setEvents(formatted);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  return (
    <div className="flex h-screen bg-[#05050a] text-[#e8e4d9]">
      
      {/* SIDEBAR GAUCHE - DESIGN AFFINÉ */}
      <div className="w-72 bg-[#0a0a14] border-r border-[#c9a84c]/10 flex flex-col p-6 gap-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#c9a84c]/10 rounded-lg">
            <Sparkles className="text-[#c9a84c] w-6 h-6" />
          </div>
          <span className="font-serif text-xl tracking-wider">ANANDA</span>
        </div>

        <button className="w-full bg-[#c9a84c] hover:bg-[#b3933d] text-[#05050a] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#c9a84c]/10">
          <Plus size={20} /> Nouveau RDV
        </button>

        <nav className="flex flex-col gap-6">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-4">Calendriers</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-2 bg-[#c9a84c]/5 rounded-xl border border-[#c9a84c]/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                  <span className="text-sm">Google Perso</span>
                </div>
                <CheckCircle2 size={14} className="text-[#c9a84c]" />
              </div>
              <div className="flex items-center gap-3 p-2 opacity-40 grayscale">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm">Travail</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-[#c9a84c]/10">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Synchronisation</span>
              <button onClick={fetchEvents} className={loading ? 'animate-spin' : ''}>
                <RefreshCw size={12} className="text-[#c9a84c]" />
              </button>
           </div>
           <div className="p-4 bg-[#11111d] rounded-2xl border border-[#c9a84c]/5">
              <p className="text-xs text-[#c9a84c]/80 leading-relaxed font-light italic">
                "Le temps n'est pas une ressource, c'est votre énergie."
              </p>
           </div>
        </div>
      </div>

      {/* ZONE CALENDRIER - PLEIN ÉCRAN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b border-[#c9a84c]/10 flex items-center justify-between px-8 bg-[#05050a]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-serif text-[#c9a84c]">Agenda Holistique</h2>
            {loading && <span className="text-[10px] bg-[#c9a84c]/10 text-[#c9a84c] px-2 py-1 rounded-full animate-pulse">Sync...</span>}
          </div>
        </header>

        <div className="flex-1 p-0 bg-[#05050a]"> {/* PADDING 0 ICI POUR MAXIMISER LA TAILLE */}
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            locales={[frLocale]}
            locale="fr"
            events={events}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek'
            }}
            nowIndicator={true}
            allDaySlot={true}
            slotMinTime="07:00:00"
            slotMaxTime="23:00:00"
            height="100%"
            expandRows={true}
            handleWindowResize={true}
            stickyHeaderDates={true}
            selectable={true}
            editable={true}
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', omitZeroMinute: false, meridiem: false }}
          />
        </div>
      </div>

      <style jsx global>{`
        /* SUPPRESSION DU LOOK "BASIQUE" */
        .fc { background: #05050a; border: none !important; --fc-border-color: rgba(201, 168, 76, 0.1); }
        .fc-theme-standard td, .fc-theme-standard th { border: 1px solid rgba(201, 168, 76, 0.08) !important; }
        
        /* HEADER PRO */
        .fc-toolbar { padding: 20px !important; margin-bottom: 0 !important; }
        .fc-toolbar-title { font-family: 'Serif' !important; color: #e8e4d9 !important; font-size: 1.4rem !important; font-weight: 300; }
        
        /* BOUTONS GOLD */
        .fc-button { 
          background: #0f0f1a !important; 
          border: 1px solid rgba(201, 168, 76, 0.3) !important; 
          color: #c9a84c !important; 
          border-radius: 10px !important;
          font-size: 0.8rem !important;
          padding: 8px 16px !important;
          transition: all 0.2s !important;
        }
        .fc-button:hover { background: #c9a84c !important; color: #05050a !important; border-color: #c9a84c !important; }
        .fc-button-active { background: #c9a84c !important; color: #05050a !important; font-weight: bold !important; }

        /* ÉVÉNEMENTS LOOK PRO */
        .pro-event {
          border-left: 3px solid #c9a84c !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          font-size: 0.75rem !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        .fc-timegrid-now-indicator-line { border-color: #ff4d4d !important; border-width: 2px !important; }
        
        /* TAILLE DES CRÉNEAUX */
        .fc-timegrid-slot { height: 75px !important; }
        .fc-v-event { background-color: rgba(201, 168, 76, 0.12) !important; }
      `}</style>
    </div>
  );
};
