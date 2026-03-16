import { DashboardCard } from '../dashboard/DashboardCard';
import { TrendingUp, DollarSign, CreditCard, PieChart } from 'lucide-react';

export const FinanceTab = () => {
  const monthlyRevenue = [
    { month: 'Janvier', amount: 3240, growth: '+12%' },
    { month: 'Février', amount: 3580, growth: '+10%' },
    { month: 'Mars', amount: 3840, growth: '+7%' },
  ];

  const recentTransactions = [
    { type: 'Abonnement Premium', client: 'Sophie Martin', amount: '+49€', date: '16 Mars', status: 'completed' },
    { type: 'Masterclass', client: 'Lucas Dubois', amount: '+120€', date: '15 Mars', status: 'completed' },
    { type: 'Abonnement Basic', client: 'Emma Laurent', amount: '+29€', date: '15 Mars', status: 'completed' },
    { type: 'Remboursement', client: 'Thomas Petit', amount: '-49€', date: '14 Mars', status: 'refunded' },
  ];

  const revenueBySource = [
    { source: 'Abonnements', amount: 2840, percentage: 74 },
    { source: 'Masterclass', amount: 680, percentage: 18 },
    { source: 'Coaching privé', amount: 320, percentage: 8 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#0f0f1a] to-[#141425] border border-[#22223a] rounded-2xl p-6 hover:border-[#4caf7d]/40 transition-all duration-300 hover:shadow-xl hover:shadow-[#4caf7d]/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#4caf7d]/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#4caf7d]" />
              </div>
              <span className="text-xs text-[#4caf7d] font-semibold">+7%</span>
            </div>
            <p className="text-xs text-[#5a587a] mb-1">Revenu Mars</p>
            <p className="text-3xl font-bold text-[#4caf7d]">3,840€</p>
          </div>

          <div className="bg-gradient-to-br from-[#0f0f1a] to-[#141425] border border-[#22223a] rounded-2xl p-6 hover:border-[#c9a84c]/40 transition-all duration-300 hover:shadow-xl hover:shadow-[#c9a84c]/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#c9a84c]/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#c9a84c]" />
              </div>
              <span className="text-xs text-[#c9a84c] font-semibold">247</span>
            </div>
            <p className="text-xs text-[#5a587a] mb-1">Membres actifs</p>
            <p className="text-3xl font-bold text-[#c9a84c]">15.55€</p>
            <p className="text-xs text-[#5a587a] mt-1">Revenu moyen/membre</p>
          </div>

          <div className="bg-gradient-to-br from-[#0f0f1a] to-[#141425] border border-[#22223a] rounded-2xl p-6 hover:border-[#7b5ea7]/40 transition-all duration-300 hover:shadow-xl hover:shadow-[#7b5ea7]/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#7b5ea7]/20 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#7b5ea7]" />
              </div>
              <span className="text-xs text-[#7b5ea7] font-semibold">94%</span>
            </div>
            <p className="text-xs text-[#5a587a] mb-1">Taux de paiement</p>
            <p className="text-3xl font-bold text-[#7b5ea7]">232/247</p>
          </div>
        </div>

        <DashboardCard title="Transactions récentes" icon="💳">
          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#c9a84c]/30 transition-all duration-300"
              >
                <div>
                  <p className="text-[#e8e4d9] font-medium text-sm">{transaction.type}</p>
                  <p className="text-xs text-[#5a587a]">{transaction.client}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.amount.startsWith('+') ? 'text-[#4caf7d]' : 'text-[#d95555]'}`}>
                    {transaction.amount}
                  </p>
                  <p className="text-xs text-[#5a587a]">{transaction.date}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Évolution mensuelle" icon="📈">
          <div className="space-y-4">
            {monthlyRevenue.map((month, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0a0a15] to-[#0f0f1a] rounded-lg border border-[#22223a]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#c9a84c]/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#c9a84c]" />
                  </div>
                  <div>
                    <p className="text-[#e8e4d9] font-semibold">{month.month}</p>
                    <p className="text-xs text-[#5a587a]">Revenu total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#4caf7d]">{month.amount}€</p>
                  <span className="text-xs text-[#4caf7d] font-semibold">{month.growth}</span>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="space-y-8">
        <DashboardCard title="Répartition des revenus" icon="🥧">
          <div className="space-y-4">
            {revenueBySource.map((source, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#e8e4d9]">{source.source}</span>
                  <span className="text-sm font-semibold text-[#c9a84c]">{source.amount}€</span>
                </div>
                <div className="w-full bg-[#0a0a15] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] h-full rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-[#5a587a]">{source.percentage}%</span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Objectifs mensuels" icon="🎯">
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-lg border border-[#22223a]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-[#e8e4d9]">Objectif Mars</span>
                <span className="text-sm font-semibold text-[#4caf7d]">4,000€</span>
              </div>
              <div className="w-full bg-[#0a0a15] rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-[#4caf7d] to-[#3d8f64] h-full rounded-full transition-all duration-500"
                  style={{ width: '96%' }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#5a587a]">3,840€ / 4,000€</span>
                <span className="text-xs text-[#4caf7d] font-semibold">96%</span>
              </div>
            </div>

            <div className="bg-[#0a0a15] rounded-lg p-4 border border-[#22223a]">
              <p className="text-xs text-[#5a587a] mb-2">Prévision fin de mois</p>
              <p className="text-2xl font-bold text-[#4caf7d]">4,100€</p>
              <p className="text-xs text-[#4caf7d] mt-1">+2.5% au-dessus de l'objectif</p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Prochains paiements" icon="⏰">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <span className="text-sm text-[#e8e4d9]">Abonnements mensuels</span>
              <span className="text-sm font-semibold text-[#c9a84c]">1er Avril</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#0a0a15] rounded-lg border border-[#22223a]">
              <span className="text-sm text-[#e8e4d9]">Masterclass Chakras</span>
              <span className="text-sm font-semibold text-[#c9a84c]">22 Mars</span>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
