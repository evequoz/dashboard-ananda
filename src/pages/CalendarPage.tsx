import React from 'react';

// Remplacement de "export default function" par "export const"
export const CalendarPage = () => {
  const googleCalendarUrl = "https://calendar.google.com/calendar/embed?src=nathanandaji%40gmail.com&ctz=Europe%2FParis";

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif text-[#c9a84c]">Agenda Professionnel</h1>
        <p className="text-[10px] text-[#5a587a] uppercase tracking-[0.2em]">Synchronisé en temps réel</p>
      </div>

      <div className="flex-1 bg-[#0f0f1a] border border-[#22223a] rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
        <iframe 
          src={googleCalendarUrl}
          style={{ border: 0 }} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no"
          className="rounded-2xl opacity-90 invert-[0.85] hue-rotate-180"
        ></iframe>
      </div>
    </div>
  );
};
