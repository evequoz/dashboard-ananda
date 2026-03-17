import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  Filter,
  Eye,
  EyeOff,
  Maximize2,
  Plus,
  Search
} from 'lucide-react';

interface CalendarCategory {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export const CalendarPage = () => {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>('timeGridWeek');
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [categories, setCategories] = useState<CalendarCategory[]>([
    { id: '1', name: 'Méditation & Pratique', color: '#7b5ea7', visible: true },
    { id: '2', name: 'Création Contenu', color: '#c9a84c', visible: true },
    { id: '3', name: 'Lives & Communauté', color: '#4caf7d', visible: true },
    { id: '4', name: 'Coaching Privé', color: '#d95555', visible: true },
    { id: '5', name: 'Administratif', color: '#5a587a', visible: true },
  ]);

  const toggleCategory = (id: string) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, visible: !cat.visible } : cat
    ));
  };

  const getFilteredEvents = () => {
    const visibleCategories = categories.filter(c => c.visible).map(c => c.id);
    return allEvents.filter(event => visibleCategories.includes(event.categoryId));
  };

  const allEvents = [
    {
      id: '1',
      title: 'Méditation & Kriya',
      start: new Date().toISOString().split('T')[0] + 'T07:00:00',
      end: new Date().toISOString().split('T')[0] + 'T08:30:00',
      backgroundColor: '#7b5ea7',
      borderColor: '#7b5ea7',
      categoryId: '1'
    },
    {
      id: '2',
      title: 'Publication Newsletter',
      start: new Date().toISOString().split('T')[0] + 'T10:00:00',
      end: new Date().toISOString().split('T')[0] + 'T11:30:00',
      backgroundColor: '#c9a84c',
      borderColor: '#c9a84c',
      categoryId: '2'
    },
    {
      id: '3',
      title: 'Live Communauté',
      start: new Date().toISOString().split('T')[0] + 'T15:00:00',
      end: new Date().toISOString().split('T')[0] + 'T17:00:00',
      backgroundColor: '#4caf7d',
      borderColor: '#4caf7d',
      categoryId: '3'
    },
    {
      id: '4',
      title: 'Session Coaching - Sophie',
      start: new Date().toISOString().split('T')[0] + 'T18:00:00',
      end: new Date().toISOString().split('T')[0] + 'T19:00:00',
      backgroundColor: '#d95555',
      borderColor: '#d95555',
      categoryId: '4'
    },
    {
      id: '5',
      title: 'Révision Contenu Module 4',
      start: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T09:00:00',
      end: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T12:00:00',
      backgroundColor: '#c9a84c',
      borderColor: '#c9a84c',
      categoryId: '2'
    },
    {
      id: '6',
      title: 'Comptabilité Mensuelle',
      start: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T14:00:00',
      end: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T16:00:00',
      backgroundColor: '#5a587a',
      borderColor: '#5a587a',
      categoryId: '5'
    },
  ];

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4">
      <div
        className={`bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] transition-all duration-300 ${
          showFilterPanel ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        {showFilterPanel && (
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="text-lg font-semibold text-[#e8e4d9]">Filtres</h2>
              </div>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="text-[#5a587a] hover:text-[#e8e4d9] transition-colors"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a587a]" />
                <input
                  type="text"
                  placeholder="Rechercher un événement..."
                  className="w-full bg-[#0a0a15] border border-[#22223a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e8e4d9] placeholder-[#5a587a] focus:outline-none focus:border-[#c9a84c]/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h3 className="text-xs font-semibold text-[#5a587a] uppercase tracking-wider mb-3">
                Catégories
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#c9a84c]/30 cursor-pointer transition-all"
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        category.visible ? 'border-transparent' : 'border-[#5a587a]'
                      }`}
                      style={{ backgroundColor: category.visible ? category.color : 'transparent' }}
                    >
                      {category.visible && <Eye className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className={`text-sm ${category.visible ? 'text-[#e8e4d9]' : 'text-[#5a587a]'}`}>
                        {category.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="mt-4 w-full bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] py-3 rounded-lg font-semibold text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Nouvel événement
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] flex flex-col overflow-hidden">
        <div className="bg-[#0f0f1a] border-b border-[#22223a] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {!showFilterPanel && (
                <button
                  onClick={() => setShowFilterPanel(true)}
                  className="p-2 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/30 transition-all"
                >
                  <Filter className="w-4 h-4" />
                </button>
              )}
              <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#05050a]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#e8e4d9]">Calendrier</h1>
                <p className="text-xs text-[#5a587a]">Gestion de votre planning</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-[#0a0a15] border border-[#22223a] rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('dayGridMonth')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    currentView === 'dayGridMonth'
                      ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a]'
                      : 'text-[#5a587a] hover:text-[#e8e4d9]'
                  }`}
                >
                  Mois
                </button>
                <button
                  onClick={() => setCurrentView('timeGridWeek')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    currentView === 'timeGridWeek'
                      ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a]'
                      : 'text-[#5a587a] hover:text-[#e8e4d9]'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => setCurrentView('timeGridDay')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    currentView === 'timeGridDay'
                      ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a]'
                      : 'text-[#5a587a] hover:text-[#e8e4d9]'
                  }`}
                >
                  Jour
                </button>
                <button
                  onClick={() => setCurrentView('listWeek')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    currentView === 'listWeek'
                      ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a]'
                      : 'text-[#5a587a] hover:text-[#e8e4d9]'
                  }`}
                >
                  Liste
                </button>
              </div>

              <button className="p-2 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/30 transition-all">
                <Settings className="w-4 h-4" />
              </button>
              <button className="p-2 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#5a587a] hover:text-[#c9a84c] hover:border-[#c9a84c]/30 transition-all">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button className="p-2 hover:bg-[#0a0a15] rounded-lg transition-all">
              <ChevronLeft className="w-5 h-5 text-[#c9a84c]" />
            </button>
            <h2 className="text-lg font-semibold text-[#e8e4d9] min-w-[200px] text-center">
              {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <button className="p-2 hover:bg-[#0a0a15] rounded-lg transition-all">
              <ChevronRight className="w-5 h-5 text-[#c9a84c]" />
            </button>
            <button className="ml-2 px-4 py-2 bg-[#0a0a15] border border-[#22223a] rounded-lg text-xs font-semibold text-[#c9a84c] hover:border-[#c9a84c]/50 transition-all">
              Aujourd'hui
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={currentView}
            key={currentView}
            headerToolbar={false}
            locale="fr"
            height="100%"
            nowIndicator={true}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            allDaySlot={false}
            expandRows={true}
            events={getFilteredEvents()}
            eventTextColor="#ffffff"
            eventDisplay="block"
            displayEventTime={true}
            displayEventEnd={false}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
              hour12: false
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
              hour12: false
            }}
          />
        </div>
      </div>

      <style jsx global>{`
        .fc {
          --fc-border-color: #22223a;
          --fc-button-text-color: #c9a84c;
          --fc-button-bg-color: #1a1a2e;
          --fc-button-border-color: #c9a84c;
          --fc-today-bg-color: rgba(201, 168, 76, 0.05);
          --fc-neutral-bg-color: #0a0a15;
          --fc-page-bg-color: transparent;
        }

        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: #22223a;
        }

        .fc-theme-standard .fc-scrollgrid {
          border-color: #22223a;
        }

        .fc-col-header-cell {
          background: #0a0a15;
          padding: 12px 8px !important;
        }

        .fc-col-header-cell-cushion {
          color: #c9a84c !important;
          font-weight: 600 !important;
          font-size: 0.75rem !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .fc-daygrid-day-number,
        .fc-timegrid-slot-label-cushion {
          color: #e8e4d9 !important;
          font-size: 0.875rem;
        }

        .fc-timegrid-slot {
          height: 50px !important;
        }

        .fc-timegrid-slot-label {
          color: #5a587a !important;
          font-size: 0.75rem;
          border-color: #22223a !important;
        }

        .fc-event {
          border-radius: 6px !important;
          padding: 4px 8px !important;
          border: none !important;
          font-size: 0.8125rem !important;
          font-weight: 500 !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        }

        .fc-event-time {
          font-weight: 600 !important;
          margin-right: 4px;
        }

        .fc-event-title {
          font-weight: 500 !important;
        }

        .fc-daygrid-event {
          margin: 2px 4px !important;
        }

        .fc-timegrid-event {
          border-radius: 6px !important;
        }

        .fc-timegrid-now-indicator-line {
          border-color: #4caf7d !important;
          border-width: 2px !important;
        }

        .fc-timegrid-now-indicator-arrow {
          border-color: #4caf7d !important;
        }

        .fc-day-today {
          background-color: rgba(201, 168, 76, 0.05) !important;
        }

        .fc-list-event:hover td {
          background-color: #0f0f1a !important;
        }

        .fc-list-event-dot {
          border-width: 4px !important;
        }

        .fc-list-day-cushion {
          background-color: #0a0a15 !important;
          color: #c9a84c !important;
          font-weight: 600 !important;
        }

        .fc-list-event-time,
        .fc-list-event-title {
          color: #e8e4d9 !important;
        }

        .fc-scrollgrid-sync-inner {
          background: transparent !important;
        }

        .fc-daygrid-day-frame {
          min-height: 100px;
        }

        .fc-timegrid-axis {
          background: #0a0a15 !important;
        }

        .fc-timegrid-divider {
          display: none;
        }
      `}</style>
    </div>
  );
};
