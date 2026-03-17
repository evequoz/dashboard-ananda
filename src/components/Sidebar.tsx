import { LayoutDashboard, Mail, Wrench, Users, DollarSign, Calendar } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const menuItems = [
    { id: 'overview', label: 'Aperçu', icon: LayoutDashboard, disabled: false },
    { id: 'agenda', label: 'Agenda', icon: Calendar, disabled: false }, // Nouvel ajout
    { id: 'poste', label: 'Poste', icon: Mail, disabled: false },
    { id: 'members', label: 'Membres', icon: Users, disabled: true },
    { id: 'finance', label: 'Finance', icon: DollarSign, disabled: false },
    { id: 'tools', label: 'Outils', icon: Wrench, disabled: false },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-[#0a0a15] to-[#0f0f1a] border-r border-[#22223a] flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[#22223a]">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] bg-clip-text text-transparent">
          Ananda Admin
        </h1>
        <p className="text-xs text-[#5a587a] mt-1">Tableau de bord</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && onPageChange(item.id)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                item.disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : isActive
                  ? 'bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#e8c97a]'
                  : 'text-[#5a587a] hover:bg-[#22223a] hover:text-[#e8e4d9]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#22223a]">
        <div className="bg-[#0a0a15] rounded-lg p-3 border border-[#22223a]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#4caf7d] rounded-full animate-pulse" />
            <span className="text-xs text-[#4caf7d] font-semibold">Système en ligne</span>
          </div>
          <p className="text-xs text-[#5a587a]">Dernière synchro : il y a 2 min</p>
        </div>
      </div>
    </aside>
  );
};
