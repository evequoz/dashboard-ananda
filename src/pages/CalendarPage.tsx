import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export const CalendarPage = () => {
  const [events, setEvents] = useState([]);

  // Fonction pour récupérer les données n8n
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('https://n8n.ananda-communaute.cloud/webhook/get-calendar');
        const data = await response.json();
        
        // Si n8n renvoie des données valides
        if (data && data.events && data.events.length > 0) {
          const formattedEvents = data.events.map((e: any) => ({
            title: e.title || e.summary || "Rendez-vous",
            start: e.start,
            end: e.end,
            color: '#c9a84c' // Couleur or
          }));
          setEvents(formattedEvents);
        } else {
          // DONNÉES DE SECOURS (pour être sûr que le calendrier fonctionne visuellement)
          setEvents([
            { title: 'Événement Test 1', start: new Date().toISOString().split('T')[0] + 'T10:00:00', end: new Date().toISOString().split('T')[0] + 'T12:00:00', color: '#3788d8' },
            { title: 'Événement Test 2', start: new Date().toISOString().split('T')[0] + 'T14:00:00', end: new Date().toISOString().split('T')[0] + 'T15:30:00', color: '#c9a84c' }
          ]);
        }
      } catch (error) {
        console.error("Erreur de connexion:", error);
      }
    };

    fetchEvents();
  }, []);

  // Action quand on clique sur une case vide
  const handleDateSelect = (selectInfo: any) => {
    let title = prompt('Veuillez entrer un titre pour ce rendez-vous :');
    let calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // Enlève la sélection visuelle

    if (title) {
      calendarApi.addEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        color: '#c9a84c'
      });
    }
  };

  // Action quand on clique sur un événement
  const handleEventClick = (clickInfo: any) => {
    if (window.confirm(`Voulez-vous supprimer l'événement '${clickInfo.event.title}' ?`)) {
      clickInfo.event.remove();
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg" style={{ width: '100%', height: '100%' }}>
      
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Mon Agenda</h1>
      </div>

      <div style={{ height: '85vh' }}> {/* C'EST ICI QU'ON FORCE LA TAILLE */}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="fr"
          buttonText={{
            today: "Aujourd'hui",
            month: 'Mois',
            week: 'Semaine',
            day: 'Jour'
          }}
          events={events} // Les données qu'on a chargées
          editable={true} // Permet le Drag & Drop
          selectable={true} // Permet de cliquer pour créer
          selectMirror={true}
          dayMaxEvents={true}
          nowIndicator={true}
          height="100%" // Prend 100% de la div parente (85vh)
          select={handleDateSelect}
          eventClick={handleEventClick}
        />
      </div>

      {/* Un peu de CSS global pour nettoyer l'affichage des boutons FullCalendar par défaut */}
      <style jsx global>{`
        .fc-button-primary {
          background-color: #1a202c !important;
          border-color: #1a202c !important;
        }
        .fc-button-primary:hover {
          background-color: #2d3748 !important;
        }
        .fc-button-active {
          background-color: #c9a84c !important;
          border-color: #c9a84c !important;
        }
        .fc-event {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
