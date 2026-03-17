import { Mail, Inbox, Briefcase, Clock, AlertCircle } from 'lucide-react';
import { mockEmails } from '../data/mockData';

export const Poste = () => {
  const accounts = [
    { email: 'serge@eh-me.com', label: 'EH-ME Formation', icon: Mail, color: '#c9a84c' },
    { email: 'info@eh-me.com', label: 'Info & Support', icon: Inbox, color: '#4caf7d' },
    { email: 'serge@seme.ch', label: 'SEME Consulting', icon: Briefcase, color: '#7b5ea7' },
  ];

  const getEmailsForAccount = (accountEmail: string) => {
    return mockEmails
      .filter((email) => email.account === accountEmail)
      .slice(0, 3);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e4d9]">Gestion de la Poste</h1>
        <div className="flex items-center gap-2 bg-[#0a0a15] px-4 py-2 rounded-lg border border-[#22223a]">
          <AlertCircle className="w-4 h-4 text-[#d95555]" />
          <span className="text-sm text-[#e8e4d9]">
            <span className="font-bold text-[#d95555]">{mockEmails.filter(e => !e.read).length}</span> non lus
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = account.icon;
          const emails = getEmailsForAccount(account.email);
          const unreadCount = emails.filter(e => !e.read).length;

          return (
            <div
              key={account.email}
              className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] overflow-hidden flex flex-col"
            >
              <div
                className="p-4 border-b border-[#22223a]"
                style={{ backgroundColor: `${account.color}10` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${account.color}, ${account.color}dd)`,
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#e8e4d9]">{account.label}</h3>
                    <p className="text-xs text-[#5a587a]">{account.email}</p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                    <span className="text-xs font-semibold" style={{ color: account.color }}>
                      {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 p-4 space-y-3">
                {emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Mail className="w-8 h-8 text-[#5a587a] mb-2 opacity-30" />
                    <p className="text-xs text-[#5a587a]">Aucun message récent</p>
                  </div>
                ) : (
                  emails.map((email) => (
                    <div
                      key={email.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
                        !email.read
                          ? 'bg-[#0a0a15] border-[#22223a] hover:border-[#c9a84c]/30'
                          : 'bg-transparent border-[#22223a]/50 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {!email.read && (
                          <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: account.color }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${!email.read ? 'text-[#e8e4d9]' : 'text-[#5a587a]'}`}>
                            {email.from}
                          </p>
                        </div>
                        {email.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 bg-[#d95555]/20 border border-[#d95555]/40 rounded text-[8px] font-bold text-[#d95555]">
                            !
                          </span>
                        )}
                      </div>
                      <h4 className={`text-xs mb-1.5 truncate ${!email.read ? 'text-[#e8e4d9] font-medium' : 'text-[#5a587a]'}`}>
                        {email.subject}
                      </h4>
                      <p className="text-xs text-[#5a587a] line-clamp-2 leading-relaxed">
                        {email.preview}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3 text-[#5a587a]" />
                        <span className="text-[9px] text-[#5a587a]">
                          {new Date(email.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                className="p-3 border-t border-[#22223a] text-center"
                style={{ backgroundColor: `${account.color}05` }}
              >
                <button
                  className="text-xs font-semibold hover:underline transition-all"
                  style={{ color: account.color }}
                >
                  Voir tous les messages →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
