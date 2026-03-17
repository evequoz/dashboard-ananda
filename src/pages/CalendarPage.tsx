import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { Sparkles, Maximize2 } from 'lucide-react';

export const CalendarPage = () => {
  const [events, setEvents] = useState([]);

  // RÉCUPÉRATION DIRECTE DES DONNÉES GOOGLE
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await response.json();
        
        // Si n8n renvoie bien le tableau direct de Google Agenda
        if (Array.isArray(data)) {
          const formattedEvents = data.map((item: any) => ({
            title: item.summary || "Rendez-vous",
            start: item.start?.dateTime || item.start?.date,
            end: item.end?.dateTime || item.end?.date,
            backgroundColor: '#05050a', // Noir pour trancher avec le blanc
            borderColor: '#c9a84c', // Bordure or
            textColor: '#c9a84c'
          }));
          setEvents(formattedEvents);
        }
      } catch (error) {
        console.error("Erreur de synchro:", error);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 h-[calc(100vh-100px)]">
      
      {/* HEADER SIMPLE */}
      <div className="bg-[#0f0f1a] border border-[#c9a84c]/30 p-4 rounded-2xl flex items-center gap-4">
        <Sparkles className="text-[#c9a84c] w-5 h-5" />
        <h1 className="text-xl font-serif text-[#c9a84c]">Cockpit de Planification</h1>
      </div>

      {/* ZONE AGENDA CLAIRE ET PROPRE */}
      <div className="flex-1 bg-white rounded-2xl p-4 shadow-2xl overflow-hidden">
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
        />
      </div>
      
      {/* SEUL CSS AUTORISÉ : Nettoyer les boutons de base */}
      <style jsx global>{`
        .fc-button-primary { background-color: #0f0f1a !important; border-color: #0f0f1a !important; text-transform: capitalize;}
        .fc-button-active { background-color: #c9a84c !important; border-color: #c9a84c !important; color: black !important;}
        .fc-v-event { cursor: pointer; border-width: 2px !important; }
      `}</style>
    </div>
  );
};
