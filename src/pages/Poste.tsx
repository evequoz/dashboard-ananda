import { useState } from 'react';
import { Mail, Inbox, AlertCircle, Archive } from 'lucide-react';
import { mockEmails } from '../data/mockData';

export const Poste = () => {
  const [activeAccount, setActiveAccount] = useState<string>('serge@eh-me.com');

  const accounts = [
    { email: 'serge@eh-me.com', label: 'Principal', icon: Mail, color: '#c9a84c' },
    { email: 'info@eh-me.com', label: 'Info & Support', icon: Inbox, color: '#4caf7d' },
    { email: 'serge@seme.ch', label: 'SEME Consulting', icon: Archive, color: '#7b5ea7' },
  ];

  const filteredEmails = mockEmails.filter((email) => email.account === activeAccount);
  const unreadCount = filteredEmails.filter((email) => !email.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e4d9]">Gestion de la Poste</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0a0a15] px-4 py-2 rounded-lg border border-[#22223a]">
            <AlertCircle className="w-4 h-4 text-[#d95555]" />
            <span className="text-sm text-[#e8e4d9]">
              <span className="font-bold text-[#d95555]">{unreadCount}</span> non lus
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-b border-[#22223a]">
        {accounts.map((account) => {
          const Icon = account.icon;
          const isActive = activeAccount === account.email;
          const accountUnread = mockEmails.filter(
            (e) => e.account === account.email && !e.read
          ).length;

          return (
            <button
              key={account.email}
              onClick={() => setActiveAccount(account.email)}
              className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                isActive
                  ? 'border-[#c9a84c] bg-[#c9a84c]/5'
                  : 'border-transparent hover:bg-[#22223a]/30'
              }`}
            >
              <Icon className="w-5 h-5" style={{ color: account.color }} />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#e8e4d9]">{account.label}</span>
                  {accountUnread > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: account.color }}
                    >
                      {accountUnread}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#5a587a]">{account.email}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a]">
        <div className="divide-y divide-[#22223a]">
          {filteredEmails.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 text-[#5a587a] mx-auto mb-3" />
              <p className="text-[#5a587a]">Aucun email dans cette boîte</p>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                className={`p-6 hover:bg-[#0a0a15] transition-all duration-200 cursor-pointer ${
                  !email.read ? 'bg-[#c9a84c]/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {!email.read && (
                        <div className="w-2 h-2 bg-[#c9a84c] rounded-full" />
                      )}
                      <span className={`font-semibold ${!email.read ? 'text-[#e8e4d9]' : 'text-[#5a587a]'}`}>
                        {email.from}
                      </span>
                      {email.priority === 'urgent' && (
                        <span className="px-2 py-0.5 bg-[#d95555]/20 border border-[#d95555]/40 rounded text-xs font-semibold text-[#d95555]">
                          URGENT
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm mb-2 ${!email.read ? 'text-[#e8e4d9] font-medium' : 'text-[#5a587a]'}`}>
                      {email.subject}
                    </h3>
                    <p className="text-sm text-[#5a587a] line-clamp-2">{email.preview}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#5a587a] whitespace-nowrap">
                      {new Date(email.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
