import { LayoutDashboard, Mail, Wrench, DollarSign, Calendar, CheckSquare, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const { user, canAccess, logout } = useAuth();

  const menuItems = [
    { id: 'overview', label: 'Aperçu',   icon: LayoutDashboard, page: 'overview' },
    { id: 'agenda',   label: 'Agenda',   icon: Calendar,        page: 'agenda'   },
    { id: 'tasks',    label: 'Tâches',   icon: CheckSquare,     page: 'tasks'    },
    { id: 'poste',    label: 'Mails',    icon: Mail,            page: 'poste'    },
    { id: 'finance',  label: 'Finance',  icon: DollarSign,      page: 'finance'  },
    { id: 'tools',    label: 'Outils',   icon: Wrench,          page: 'tools'    },
  ];

  const visibleItems = menuItems.filter(item => canAccess(item.page as any));
  const roleLabel = user?.role === 'admin' ? 'Administrateur' : 'Assistante';

  return (
    <aside className="w-64 bg-gradient-to-b from-[#0a0a15] to-[#0f0f1a] border-r border-[#22223a] flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[#22223a]">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] bg-clip-text text-transparent">
          Ananda Admin
        </h1>
        <p className="text-xs text-[#5a587a] mt-1">Tableau de bord</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
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

      <div className="px-4 pb-3">
        <div className="bg-[#0a0a15] rounded-lg p-3 border border-[#22223a]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#4caf7d] rounded-full animate-pulse" />
            <span className="text-xs text-[#4caf7d] font-semibold">Système en ligne</span>
          </div>
          <p className="text-xs text-[#5a587a]">Dernière synchro : il y a 2 min</p>
        </div>
      </div>

      <div className="p-4 border-t border-[#22223a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[11px] font-semibold text-[#c9a84c] flex-shrink-0">
            {user?.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#e8e4d9] truncate font-medium">{user?.name}</p>
            <p className="text-[10px] text-[#c9a84c]/70 tracking-widest uppercase">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            className="text-[#5a587a] hover:text-red-400 transition-colors p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
