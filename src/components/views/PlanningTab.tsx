import { DashboardCard } from '../dashboard/DashboardCard';
import { Calendar, Clock, Video, Users } from 'lucide-react';

export const PlanningTab = () => {
  const weekSchedule = [
    { day: 'Lundi', sessions: ['Méditation 9h', 'Cours Pranayama 14h', 'Live Q&A 19h'] },
    { day: 'Mardi', sessions: ['Kriya 9h', 'Enregistrement 11h', 'Coaching 16h'] },
    { day: 'Mercredi', sessions: ['Méditation 9h', 'Live EHME 14h30'] },
    { day: 'Jeudi', sessions: ['Pranayama 9h', 'Création contenu 11h'] },
    { day: 'Vendredi', sessions: ['Méditation 9h', 'Live Masterclass 19h'] },
  ];

  const upcomingEvents = [
    { title: 'Masterclass Les Chakras', date: '22 Mars 2026', type: 'Formation', attendees: 45 },
    { title: 'Retraite Spirituelle Printemps', date: '15 Avril 2026', type: 'Événement', attendees: 28 },
    { title: 'Webinaire Ayurveda', date: '5 Avril 2026', type: 'Live', attendees: 120 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <DashboardCard title="Calendrier de la semaine" icon="📅" className="lg:col-span-1">
        <div className="space-y-4">
          {weekSchedule.map((schedule, index) => (
            <div
              key={index}
              className="bg-[#0a0a15] rounded-lg p-4 border border-[#22223a] hover:border-[#c9a84c]/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-[#c9a84c]" />
                <h3 className="text-[#e8c97a] font-semibold">{schedule.day}</h3>
              </div>
              <div className="space-y-2 ml-7">
                {schedule.sessions.map((session, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-[#5a587a]">
                    <Clock className="w-3 h-3" />
                    <span>{session}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <div className="space-y-8">
        <DashboardCard title="Événements à venir" icon="🎯">
          <div className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-[#0a0a15] to-[#0f0f1a] rounded-lg p-5 border border-[#22223a] hover:border-[#c9a84c]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#c9a84c]/10"
              >
                <h3 className="text-[#e8e4d9] font-semibold mb-2">{event.title}</h3>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#5a587a]">
                    <Calendar className="w-4 h-4 text-[#c9a84c]" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#5a587a]">
                    <Users className="w-4 h-4 text-[#4caf7d]" />
                    <span>{event.attendees} inscrits</span>
                  </div>
                </div>
                <span className="inline-block mt-3 px-3 py-1 bg-[#c9a84c]/20 border border-[#c9a84c]/40 rounded-full text-xs text-[#c9a84c] font-semibold">
                  {event.type}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Contenu à préparer" icon="🎬">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <Video className="w-5 h-5 text-[#c9a84c] mt-0.5" />
              <div>
                <p className="text-[#e8e4d9] font-medium text-sm">Vidéo: Introduction aux Mudras</p>
                <p className="text-xs text-[#5a587a] mt-1">Deadline: 20 Mars</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <Video className="w-5 h-5 text-[#c9a84c] mt-0.5" />
              <div>
                <p className="text-[#e8e4d9] font-medium text-sm">Article: Pratique quotidienne</p>
                <p className="text-xs text-[#5a587a] mt-1">Deadline: 25 Mars</p>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
