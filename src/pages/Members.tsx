import { User, TrendingUp, Star, Crown } from 'lucide-react';
import { mockMembers } from '../data/mockData';

export const Members = () => {
  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'Expert':
        return '#4caf7d';
      case 'Avancé':
        return '#c9a84c';
      default:
        return '#7b5ea7';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4caf7d';
      case 'trial':
        return '#c9a84c';
      default:
        return '#5a587a';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'trial':
        return 'Essai';
      default:
        return 'Inactif';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e4d9]">Gestion des Membres</h1>
        <div className="flex items-center gap-3">
          <div className="bg-[#0a0a15] px-4 py-2 rounded-lg border border-[#22223a]">
            <span className="text-sm text-[#5a587a]">Total : </span>
            <span className="text-sm font-bold text-[#e8e4d9]">{mockMembers.length} membres</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-4">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-[#4caf7d]" />
            <span className="text-xs text-[#5a587a]">Membres Actifs</span>
          </div>
          <p className="text-2xl font-bold text-[#e8e4d9]">
            {mockMembers.filter((m) => m.status === 'active').length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-4">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-5 h-5 text-[#c9a84c]" />
            <span className="text-xs text-[#5a587a]">Abonnés Premium</span>
          </div>
          <p className="text-2xl font-bold text-[#e8e4d9]">
            {mockMembers.filter((m) => m.plan === 'Premium').length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-4">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-[#7b5ea7]" />
            <span className="text-xs text-[#5a587a]">Niveau Expert</span>
          </div>
          <p className="text-2xl font-bold text-[#e8e4d9]">
            {mockMembers.filter((m) => m.engagement === 'Expert').length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-[#4caf7d]" />
            <span className="text-xs text-[#5a587a]">Cours Complétés</span>
          </div>
          <p className="text-2xl font-bold text-[#e8e4d9]">
            {mockMembers.reduce((sum, m) => sum + m.coursesCompleted, 0)}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#22223a] bg-[#0a0a15]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#5a587a] uppercase tracking-wider">
                  Membre
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#5a587a] uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#5a587a] uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#5a587a] uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#5a587a] uppercase tracking-wider">
                  Engagement
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#5a587a] uppercase tracking-wider">
                  Cours
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#5a587a] uppercase tracking-wider">
                  Inscription
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22223a]">
              {mockMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-[#0a0a15] transition-colors duration-150"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#05050a]" />
                      </div>
                      <span className="text-sm font-medium text-[#e8e4d9]">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#5a587a]">{member.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    {member.plan === 'Premium' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#c9a84c]/20 border border-[#c9a84c]/40 rounded-full text-xs font-semibold text-[#c9a84c]">
                        <Crown className="w-3 h-3" />
                        Premium
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-[#5a587a]/20 border border-[#5a587a]/40 rounded-full text-xs font-semibold text-[#5a587a]">
                        Basic
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${getStatusColor(member.status)}20`,
                        color: getStatusColor(member.status),
                        border: `1px solid ${getStatusColor(member.status)}40`,
                      }}
                    >
                      {getStatusLabel(member.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${getEngagementColor(member.engagement)}20`,
                        color: getEngagementColor(member.engagement),
                        border: `1px solid ${getEngagementColor(member.engagement)}40`,
                      }}
                    >
                      {member.engagement}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-[#0a0a15] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#4caf7d] to-[#3d8f64] h-full rounded-full"
                          style={{ width: `${Math.min((member.coursesCompleted / 50) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#e8e4d9]">{member.coursesCompleted}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#5a587a]">
                      {new Date(member.joinDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
