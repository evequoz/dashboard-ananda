import React from 'react';

export default function CalendarPage() {
  // REMPLACE l'URL ci-dessous par ton URL publique Google Calendar
  const googleCalendarUrl = "https://calendar.google.com/calendar/embed?src=nathanandaji%40gmail.com&ctz=Europe%2FParis";

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif text-[#c9a84c]">Agenda Professionnel</h1>
        <p className="text-[10px] text-[#5a587a] uppercase tracking-[0.2em]">Synchronisé en temps réel</p>
      </div>

      {/* CONTENEUR DE L'IFRAME */}
      <div className="flex-1 bg-[#0f0f1a] border border-[#22223a] rounded-3xl overflow-hidden shadow-2xl relative">
        <iframe 
          src={googleCalendarUrl}
          style={{ border: 0 }} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no"
          className="rounded-2xl opacity-90 invert-[0.85] hue-rotate-180" // Ce petit "trick" CSS adapte un peu les couleurs au mode sombre
        ></iframe>
      </div>
    </div>
  );
}
