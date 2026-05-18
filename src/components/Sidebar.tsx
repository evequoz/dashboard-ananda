import { useState, useEffect } from 'react';
import { LayoutDashboard, Mail, Users, DollarSign, Calendar, CheckSquare, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth, type PageKey } from '../contexts/AuthContext';
import { useTheme } from '../App';
import { refreshUntreatedEmailCount } from '../data/supabaseApi';
import { UNTREATED_EMAIL_COUNT_EVENT } from '../lib/emailCountEvents';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const { user, canAccess, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const ACCESS_BY_MENU_PAGE: Record<string, PageKey> = {
    overview: 'overview',
    agenda: 'agenda',
    tasks: 'tasks',
    poste: 'poste',
    finance: 'finance',
    contacts: 'contacts',
  };

  const menuItems = [
    { id: 'overview', label: 'Aperçu',  icon: LayoutDashboard, page: 'overview' },
    { id: 'agenda',   label: 'Agenda',  icon: Calendar,        page: 'agenda'   },
    { id: 'tasks',    label: 'Tâches',  icon: CheckSquare,     page: 'tasks'    },
    { id: 'poste',    label: 'Mails',   icon: Mail,            page: 'poste'    },
    { id: 'finance',  label: 'Finance', icon: DollarSign,      page: 'finance'  },
    { id: 'contacts', label: 'Contacts', icon: Users,           page: 'contacts' },
  ];

  const visibleItems = menuItems.filter(item => canAccess(ACCESS_BY_MENU_PAGE[item.page]));
  const roleLabel = user?.role === 'admin' ? 'Administrateur' : 'Assistante';
  const isDark = theme === 'dark';
  const [untreatedMailCount, setUntreatedMailCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const n = await refreshUntreatedEmailCount();
        setUntreatedMailCount(n);
      } catch {
        // Ignore count fetch errors in sidebar.
      }
    };
    load();
    const onCount = (evt: Event) => {
      const detail = (evt as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === 'number') setUntreatedMailCount(detail.count);
    };
    window.addEventListener(UNTREATED_EMAIL_COUNT_EVENT, onCount as EventListener);
    const t = setInterval(load, 3 * 60 * 1000);
    return () => {
      window.removeEventListener(UNTREATED_EMAIL_COUNT_EVENT, onCount as EventListener);
      clearInterval(t);
    };
  }, []);

  return (
    <aside style={{
      width: '240px',
      background: isDark ? '#0a0a15' : '#1a1826',
      borderRight: `1px solid ${isDark ? '#22223a' : '#2a2840'}`,
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0, flexShrink: 0,
      transition: 'background 0.3s',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: `1px solid ${isDark ? '#22223a' : '#2a2840'}` }}>
        <h1 style={{
          fontSize: 20, fontWeight: 700,
          background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          Ananda Admin
        </h1>
        <p style={{ fontSize: 11, color: '#5a587a', marginTop: 4 }}>Tableau de bord</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button key={item.id} onClick={() => onPageChange(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10, width: '100%',
              border: isActive ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
              background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
              color: isActive ? '#e8c97a' : '#6060a0',
              cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color = '#c0c0e0'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; } }}
            onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color = '#6060a0'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === 'poste' && untreatedMailCount > 0 && (
                <span
                  style={{
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 99,
                    background: '#d95555',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {untreatedMailCount > 99 ? '99+' : untreatedMailCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Statut système */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ padding: '10px 14px', background: isDark ? '#05050a' : '#0f0f1e', borderRadius: 10, border: `1px solid ${isDark ? '#22223a' : '#2a2840'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf7d', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4caf7d' }}>Système en ligne</span>
          </div>
          <p style={{ fontSize: 10, color: '#5a587a', margin: 0 }}>Dernière synchro : il y a 2 min</p>
        </div>
      </div>

      {/* Footer — toggle + user */}
      <div style={{ padding: '12px', borderTop: `1px solid ${isDark ? '#22223a' : '#2a2840'}` }}>
        {/* Toggle thème */}
        <button onClick={toggleTheme} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '9px 14px', marginBottom: 8, borderRadius: 10,
          border: `1px solid ${isDark ? '#22223a' : '#2a2840'}`,
          background: 'transparent', color: '#6060a0',
          cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c9a84c'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.3)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6060a0'; (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#22223a' : '#2a2840'; }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
          {/* Indicateur visuel */}
          <div style={{
            marginLeft: 'auto', width: 32, height: 18, borderRadius: 99,
            background: isDark ? '#22223a' : 'rgba(201,168,76,0.3)',
            border: `1px solid ${isDark ? '#33335a' : 'rgba(201,168,76,0.5)'}`,
            position: 'relative', transition: 'all 0.3s',
          }}>
            <div style={{
              position: 'absolute', top: 2,
              left: isDark ? 2 : 14,
              width: 12, height: 12, borderRadius: '50%',
              background: isDark ? '#5a587a' : '#c9a84c',
              transition: 'all 0.3s',
            }} />
          </div>
        </button>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#c9a84c',
          }}>
            {user?.avatar}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: '#c0c0e0', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
            <p style={{ fontSize: 10, color: '#c9a84c', margin: 0, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{roleLabel}</p>
          </div>
          <button onClick={logout} title="Se déconnecter" style={{ background: 'none', border: 'none', color: '#5a587a', cursor: 'pointer', padding: 4, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#d95555'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#5a587a'}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
