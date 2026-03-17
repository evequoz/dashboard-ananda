import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';

export const CalendarPage = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  return (
    <div className={`flex flex-col gap-4 p-4 transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[#05050a] p-6' : 'h-[calc(100vh-100px)]'}`}>
      
      {/* HEADER DE TRAVAIL */}
      <div className="bg-[#0f0f1a] border border-[#c9a84c]/30 p-4 rounded-2xl flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-[#c9a84c]/10 p-2 rounded-lg">
            <Sparkles className="text-[#c9a84c] w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-serif text-[#c9a84c]">Cockpit de Planification</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Assistant IA Actif</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFullscreen}
            className="flex items-center gap-2 bg-[#1a1a2e] border border-[#c9a84c]/50 text-[#c9a84c] px-4 py-2 rounded-xl text-xs hover:bg-[#c9a84c] hover:text-[#05050a] transition-all"
          >
            {isFullscreen ? <><Minimize2 size={14}/> Quitter Focus</> : <><Maximize2 size={14}/> Mode Immersion</>}
          </button>
        </div>
      </div>

      {/* ZONE DE L'AGENDA */}
      <div className="flex-1 bg-[#0f0f1a] rounded-3xl border border-[#22223a] p-4 shadow-inner">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="timeGridThreeDay"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridThreeDay,listYear'
          }}
          views={{
            timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 }, buttonText: 'Focus 3j' },
            listYear: { buttonText: 'Vue Année' }
          }}
          locale="fr"
          height="100%"
          nowIndicator={true}
          editable={true}
          selectable={true}
          slotMinTime="07:00:00"
          slotMaxTime="23:00:00"
          eventBackgroundColor="rgba(201, 168, 76, 0.15)"
          eventBorderColor="#c9a84c"
          eventTextColor="#e8e4d9"
          // Données de test
          events={[
            { title: 'Séminaire Stratégique', start: new Date().toISOString().split('T')[0] + 'T09:00:00', end: new Date().toISOString().split('T')[0] + 'T17:00:00', color: '#c9a84c' }
          ]}
        />
      </div>

      <style jsx global>{`
        .fc { --fc-border-color: #22223a; --fc-button-text-color: #c9a84c; --fc-button-bg-color: #1a1a2e; --fc-button-border-color: #c9a84c; }
        .fc-toolbar-title { color: #e8e4d9 !important; font-family: serif; font-size: 1.2rem !important; }
        .fc-button-primary:hover { background-color: #c9a84c !important; color: #05050a !important; }
        .fc-button-active { background-color: #c9a84c !important; color: #05050a !important; }
        .fc-v-event { border-radius: 8px !important; padding: 2px 5px !important; }
        .fc-timegrid-slot { height: 60px !important; }
      `}</style>
    </div>
  );
};
