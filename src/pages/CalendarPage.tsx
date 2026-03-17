import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';

export const CalendarPage = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [events, setEvents] = useState([]); // On prépare la boîte pour tes vrais RDV

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // 1. L'IA VA CHERCHER TES RDV N8N
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await response.json();
        
        if (data && data.events) {
          // On s'assure que FullCalendar comprenne bien les dates de n8n
          const formatted = data.events.map((e: any) => ({
            title: e.title || e.summary || "Rendez-vous",
            start: e.start,
            end: e.end,
            color: '#c9a84c'
          }));
          setEvents(formatted);
        }
      } catch (error) {
        console.error("Erreur n8n:", error);
      }
    };
    fetchEvents();
  }, []);

  // 2. FONCTION POUR AJOUTER UN RDV AU CLIC
  const handleDateSelect = (selectInfo: any) => {
    let title = prompt('Titre du nouveau rendez-vous :');
    let calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // Retire la surbrillance de sélection

    if (title) {
      calendarApi.addEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        color: '#c9a84c'
      });
      // Note : Ça l'affiche sur ton écran. Pour le renvoyer vers Google Agenda, 
      // il faudra un autre petit lien n8n plus tard.
    }
  };

  return (
    <div className={`flex flex-col gap-4 p-4 transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[#05050a] p-6' : 'h-[calc(100vh-100px)]'}`}>
      
      {/* HEADER DE TRAVAIL (Ton design intact) */}
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

      {/* ZONE DE L'AGENDA (Ton design intact) */}
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
          
          /* --- LES NOUVELLES FONCTIONS PRO SONT ICI --- */
          editable={true} // Glisser-déposer activé
          selectable={true} // Possibilité de cliquer sur une case vide
          selectMirror={true}
          select={handleDateSelect} // Action de création de RDV
          events={events} // Connexion aux données de n8n
          /* ------------------------------------------- */

          slotMinTime="07:00:00"
          slotMaxTime="23:00:00"
          eventBackgroundColor="rgba(201, 168, 76, 0.15)"
          eventBorderColor="#c9a84c"
          eventTextColor="#e8e4d9"
        />
      </div>

      <style jsx global>{`
        /* Ton CSS d'origine exact */
        .fc { --fc-border-color: #22223a; --fc-button-text-color: #c9a84c; --fc-button-bg-color: #1a1a2e; --fc-button-border-color: #c9a84c; }
        .fc-toolbar-title { color: #e8e4d9 !important; font-family: serif; font-size: 1.2rem !important; }
        .fc-button-primary:hover { background-color: #c9a84c !important; color: #05050a !important; }
        .fc-button-active { background-color: #c9a84c !important; color: #05050a !important; }
        .fc-v-event { border-radius: 8px !important; padding: 2px 5px !important; cursor: pointer; }
        .fc-timegrid-slot { height: 60px !important; }
      `}</style>
    </div>
  );
};
