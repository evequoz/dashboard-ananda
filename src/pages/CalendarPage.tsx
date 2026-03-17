import React from 'react';

export const CalendarPage = () => {
  // Ton URL fusionnée avec tes deux agendas
  const googleCalendarUrl = "https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=Europe%2FParis&showPrint=0&src=bmF0aGFuYW5kYWppQGdtYWlsLmNvbQ&src=YTEwYzIzZTQ1MjQyMzdmZTlhZmU2ZWQ0MmVhM2U2OGUyOTM1ZWQwNDZjNDNhMDE2MmI2MmUzMmQzNGRjYWQ1N0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%2390b0ff&color=%23c0ca33";

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif text-[#c9a84c]">Mon Agenda</h1>
          <p className="text-[10px] text-[#5a587a] uppercase tracking-[0.2em] mt-1">Vue unifiée : Perso & EH-ME</p>
        </div>
      </div>

      {/* Le cadre blanc de l'agenda pour une lisibilité parfaite */}
      <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#22223a]">
        <iframe 
          src={googleCalendarUrl}
          style={{ border: 0 }} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no"
          className="w-full h-full"
        ></iframe>
      </div>
    </div>
  );
};
