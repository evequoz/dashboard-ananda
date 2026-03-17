import { DollarSign, TrendingUp, Calendar, CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';
import { mockTransactions, getStats } from '../data/mockData';

export const Finance = () => {
  const stats = getStats();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-[#4caf7d]" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-[#c9a84c]" />;
      default:
        return <XCircle className="w-4 h-4 text-[#d95555]" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'pending':
        return 'En attente';
      default:
        return 'Remboursé';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf7d';
      case 'pending':
        return '#c9a84c';
      default:
        return '#d95555';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e4d9]">Finances & Revenus</h1>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] rounded-lg font-semibold text-sm hover:scale-105 transition-transform">
            Exporter les données
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-[#5a587a] font-medium">Revenus du Mois</span>
          </div>
          <p className="text-3xl font-bold text-[#e8e4d9] mb-1">{stats.monthlyRevenue}€</p>
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3 text-[#4caf7d]" />
            <span className="text-[#4caf7d] font-semibold">+34%</span>
            <span className="text-[#5a587a]">vs mois dernier</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#05050a]" />
            </div>
            <span className="text-xs text-[#5a587a] font-medium">Transactions</span>
          </div>
          <p className="text-3xl font-bold text-[#e8e4d9] mb-1">{mockTransactions.length}</p>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#5a587a]">Ce mois-ci</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7b5ea7] to-[#6a4d96] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-[#5a587a] font-medium">Ticket Moyen</span>
          </div>
          <p className="text-3xl font-bold text-[#e8e4d9] mb-1">
            {Math.round(stats.totalRevenue / mockTransactions.length)}€
          </p>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#5a587a]">Par transaction</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4caf7d] to-[#3d8f64] rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-[#5a587a] font-medium">Taux de Succès</span>
          </div>
          <p className="text-3xl font-bold text-[#e8e4d9] mb-1">
            {Math.round((mockTransactions.filter((t) => t.status === 'completed').length / mockTransactions.length) * 100)}%
          </p>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#5a587a]">Paiements validés</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-[#c9a84c]" />
            <h2 className="text-lg font-semibold text-[#e8e4d9]">Transactions Récentes</h2>
          </div>

          <div className="space-y-3">
            {mockTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-[#0a0a15] rounded-lg border border-[#22223a] hover:border-[#c9a84c]/30 transition-all duration-200"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-[#05050a]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#e8e4d9] mb-1">{transaction.clientName}</h3>
                    <p className="text-xs text-[#5a587a]">{transaction.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#4caf7d]">{transaction.amount}€</p>
                    <p className="text-xs text-[#5a587a]">
                      {new Date(transaction.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(transaction.status)}
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${getStatusColor(transaction.status)}20`,
                        color: getStatusColor(transaction.status),
                        border: `1px solid ${getStatusColor(transaction.status)}40`,
                      }}
                    >
                      {getStatusLabel(transaction.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
            <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">Répartition par Type</h3>
            <div className="space-y-3">
              {[
                { type: 'Abonnement Premium', count: 3, color: '#c9a84c' },
                { type: 'Abonnement Basic', count: 1, color: '#7b5ea7' },
                { type: 'Coaching Privé', count: 1, color: '#4caf7d' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#5a587a]">{item.type}</span>
                    <span className="text-sm font-bold text-[#e8e4d9]">{item.count}</span>
                  </div>
                  <div className="w-full bg-[#0a0a15] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.count / mockTransactions.length) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-6">
            <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">Objectifs du Mois</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#5a587a]">Revenus</span>
                  <span className="text-sm font-bold text-[#e8e4d9]">{stats.monthlyRevenue}€ / 1500€</span>
                </div>
                <div className="w-full bg-[#0a0a15] rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#4caf7d] to-[#3d8f64] h-full rounded-full"
                    style={{ width: `${(stats.monthlyRevenue / 1500) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-[#4caf7d]">Excellent ! Objectif presque atteint</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
