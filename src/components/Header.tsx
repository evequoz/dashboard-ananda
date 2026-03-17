import { Users, DollarSign, TrendingUp, Mail } from 'lucide-react';
import { getStats } from '../data/mockData';

export const Header = () => {
  const stats = getStats();

  const statCards = [
    {
      label: 'Membres Actifs',
      value: stats.activeMembers,
      total: stats.totalMembers,
      icon: Users,
      color: '#4caf7d',
    },
    {
      label: 'Revenus du Mois',
      value: `${stats.monthlyRevenue}€`,
      icon: DollarSign,
      color: '#c9a84c',
    },
    {
      label: 'Taux Premium',
      value: `${Math.round((stats.premiumMembers / stats.totalMembers) * 100)}%`,
      icon: TrendingUp,
      color: '#7b5ea7',
    },
    {
      label: 'Emails Non Lus',
      value: stats.unreadEmails,
      icon: Mail,
      color: '#d95555',
    },
  ];

  return (
    <header className="bg-gradient-to-r from-[#0f0f1a] to-[#141425] border-b border-[#22223a] px-8 py-4">
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-[#0a0a15] rounded-lg p-4 border border-[#22223a] hover:border-[#c9a84c]/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#5a587a] font-medium">{stat.label}</span>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#e8e4d9]">{stat.value}</span>
                {stat.total && (
                  <span className="text-sm text-[#5a587a]">/ {stat.total}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </header>
  );
};
