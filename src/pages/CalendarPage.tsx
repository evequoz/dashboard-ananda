import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

export const CalendarPage = () => {
  const [view, setView] = useState('timeGridThreeDay');

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4 text-[#e8e4d9]">
      {/* Header avec Intelligence Artificielle */}
      <div className="bg-[#0f0f1a] border border-[#c9a84c]/30 p-4 rounded-2xl flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-xl font-serif text-[#c9a84c]">Assistant de Bord Ananda</h1>
          <p className="text-xs text-[#5a587a]">Analyse : 3 conflits détectés dans la semaine - Préparation séminaire requise.</p>
        </div>
        <button className="bg-[#c9a84c]/10 border border-[#c9a84c] text-[#c9a84c] px-4 py-2 rounded-lg text-xs hover:bg-[#c9a84c] hover:text-[#05050a] transition-all">
          Optimiser mon planning
        </button>
      </div>

      <div className="flex-1 bg-[#0f0f1a] rounded-2xl border border-[#22223a] p-4 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridThreeDay,timeGridDay'
          }}
          views={{
            timeGridThreeDay: {
              type: 'timeGrid',
              duration: { days: 3 },
              buttonText: '3 Jours'
            }
          }}
          locale="fr"
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          editable={true}
          selectable={true}
          height="100%"
          eventColor="#c9a84c"
          eventTextColor="#05050a"
          themeSystem="standard"
          // Ici on connectera n8n plus tard
          events={[]} 
        />
      </div>
    </div>
  );
};
