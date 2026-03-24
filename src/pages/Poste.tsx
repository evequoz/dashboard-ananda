import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Inbox, Briefcase, RefreshCw, CheckCircle,
  AlertCircle, Clock, ChevronRight, Send, Plus,
  Eye, EyeOff, Sparkles, X, Paperclip, Trash2,
  FileText, ExternalLink
} from 'lucide-react';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const BASEROW_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_EMAILS = 534;
const TABLE_TACHES = 536;
const N8N_SEND_WEBHOOK = 'https://n8n.ananda-communaute.cloud/webhook/send-email';

const HEADERS = {
  Authorization: `Token ${BASEROW_TOKEN}`,
  'Content-Type': 'application/json',
};

interface BaserowFile {
  url: string;
  name: string;
  visible_name: string;
  size: number;
  mime_type: string;
  is_image: boolean;
  thumbnails?: { small?: { url: string }; tiny?: { url: string } };
}

interface Email {
  id: number;
  Sujet: string;
  'Expéditeur': string;
  'Date réception': string | null;
  'Résumé IA': string;
  Contenu: string;
  'Action requise': boolean;
  Traité: boolean;
  Compte: string;
  'Réponse 1': string;
  'Réponse 2': string;
  'Réponse 3': string;
  'A une pièce jointe': boolean;
  'Fichier': BaserowFile[];
}

const ACCOUNTS = [
  { email: 'serge@eh-me.com', label: 'EH-ME',   icon: Mail,      color: '#c9a84c' },
  { email: 'admin@eh-me.com', label: 'Admin',    icon: Inbox,     color: '#4caf7d' },
  { email: 'serge@seme.ch',   label: 'SEME',     icon: Briefcase, color: '#7b5ea7' },
];

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
  catch { return d; }
};

const getInitials = (from: string) => {
  if (!from) return '?';
  const name = from.replace(/<.*>/, '').replace(/"/g, '').trim();
  const parts = name.split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const cleanContent = (content: string) => {
  if (!content) return '';
  try {
    return decodeURIComponent(escape(content))
      .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  } catch {
    return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

const getFileName = (name: string) => {
  if (!name) return 'Fichier';
  const n = name.replace(/^[a-z0-9]+_/, '');
  return n.length > 28 ? n.slice(0, 25) + '…' : n;
};

// ── Modal Tâche ──
interface TaskPopupProps {
  email: Email;
  onConfirm: (name: string, desc: string) => void;
  onClose: () => void;
}
const TaskPopup = ({ email, onConfirm, onClose }: TaskPopupProps) => {
  const [taskName, setTaskName] = useState(`Répondre à: ${email.Sujet || 'Sans sujet'}`);
  const [taskDesc, setTaskDesc] = useState(
    `Email de ${email['Expéditeur']?.replace(/<.*>/, '').replace(/"/g, '').trim()}\n\n${email['Résumé IA'] || ''}`
  );
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 w-[500px] shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#c9a84c]" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Créer une tâche</h3>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#a0a0c0] mb-2 block">Nom de la tâche</label>
            <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#a0a0c0] mb-2 block">Description</label>
            <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)}
              className="w-full h-24 bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#a0a0c0] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all">Annuler</button>
          <button onClick={() => onConfirm(taskName, taskDesc)} disabled={!taskName.trim()}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] hover:scale-105 transition-all disabled:opacity-40">
            Créer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal Répondre ──
interface ReplyModalProps {
  email: Email;
  accountColor: string;
  onSend: (text: string) => void;
  onClose: () => void;
  sending: boolean;
  sendStatus: 'idle' | 'success' | 'error';
}
const ReplyModal = ({ email, accountColor, onSend, onClose, sending, sendStatus }: ReplyModalProps) => {
  const suggestions = [
    { label: 'Réponse 1 — Directe', value: email['Réponse 1'] || '' },
    { label: 'Réponse 2 — Développée', value: email['Réponse 2'] || '' },
    { label: 'Réponse 3 — Spirituelle', value: email['Réponse 3'] || '' },
  ].filter(s => s.value.trim() !== '');

  const [text, setText] = useState(suggestions[0]?.value || '');
  const [activeTab, setActiveTab] = useState(0);

  const selectSuggestion = (idx: number) => {
    setActiveTab(idx);
    setText(suggestions[idx].value);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '820px', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accountColor}20`, border: `1px solid ${accountColor}30` }}>
              <Send className="w-4 h-4" style={{ color: accountColor }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Répondre</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                → {email['Expéditeur']?.replace(/<.*>/, '').replace(/"/g, '').trim()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestions IA — 3 onglets */}
        {suggestions.length > 0 && (
          <div className="px-6 pt-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#7b5ea7]" />
              <span className="text-xs font-bold text-[#9b7ec7]">Suggestions IA — dans ton style</span>
            </div>

            {/* Onglets */}
            <div className="flex gap-2 mb-3">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => selectSuggestion(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    activeTab === i
                      ? 'bg-[#7b5ea7]/30 border-[#7b5ea7]/50 text-[#c9b8e8]'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[#a0a0c0] hover:border-[#33335a]'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Aperçu suggestion sélectionnée */}
            <div className="p-4 bg-[#7b5ea7]/08 border border-[#7b5ea7]/20 rounded-xl mb-3 max-h-36 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#7b5ea7] uppercase tracking-wider">
                  {suggestions[activeTab]?.label}
                </span>
                <button onClick={() => setText(suggestions[activeTab].value)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#7b5ea7]/20 border border-[#7b5ea7]/30 text-[#9b7ec7] hover:bg-[#7b5ea7]/40 transition-all">
                  Utiliser <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-[#b0a0d0] leading-relaxed whitespace-pre-wrap">
                {suggestions[activeTab]?.value}
              </p>
            </div>
          </div>
        )}

        {/* Zone d'écriture */}
        <div className="flex-1 px-6 pb-2 min-h-0">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-full min-h-[200px] bg-[var(--bg-main)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[#c9a84c]/40 transition-all leading-relaxed"
            placeholder="Rédigez ou modifiez votre réponse..."
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0">
          <div>
            {sendStatus === 'success' && (
              <span className="text-xs text-[#4caf7d] flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Email envoyé
              </span>
            )}
            {sendStatus === 'error' && (
              <span className="text-xs text-[#d95555] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Erreur d'envoi
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm text-[#a0a0c0] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[#5a587a] transition-all">
              Annuler
            </button>
            <button onClick={() => onSend(text)} disabled={sending || !text.trim()}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: `linear-gradient(135deg, ${accountColor}, ${accountColor}cc)`, color: '#05050a' }}>
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Composant principal ──
export const Poste = () => {
  const [activeAccount, setActiveAccount] = useState(ACCOUNTS[0].email);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showTreated, setShowTreated] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState(false);

  const fetchEmails = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/?user_field_names=true&size=200`,
        { headers: HEADERS }
      );
      const data = await res.json();
      setEmails((data.results || []).reverse());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);
  useEffect(() => {
    const t = setInterval(fetchEmails, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchEmails]);

  const filteredEmails = emails.filter(e =>
    e.Compte === activeAccount && (showTreated ? true : !e.Traité)
  );

  const unreadCount = (acc: string) => emails.filter(e => e.Compte === acc && !e.Traité).length;
  const totalUnread = emails.filter(e => !e.Traité).length;

  const markAsTreated = async (email: Email) => {
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/?user_field_names=true`,
        { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ Traité: true }) });
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, Traité: true } : e));
      if (selectedEmail?.id === email.id) setSelectedEmail({ ...email, Traité: true });
    } catch (e) { console.error(e); }
  };

  const deleteEmail = async (email: Email) => {
    if (!confirm(`Supprimer ?\n"${email.Sujet}"`)) return;
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/`,
        { method: 'DELETE', headers: HEADERS });
      setEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedEmail?.id === email.id) setSelectedEmail(null);
    } catch (e) { console.error(e); }
  };

  const createTask = async (name: string, desc: string) => {
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_TACHES}/?user_field_names=true`,
        { method: 'POST', headers: HEADERS, body: JSON.stringify({
          Titre: name, Description: desc, Statut: 'En cours',
          Priorité: selectedEmail?.['Action requise'] ? 'Haute' : 'Normale',
        })});
      setShowTaskPopup(false);
      setTaskSuccess(true);
      setTimeout(() => setTaskSuccess(false), 3000);
    } catch (e) { console.error(e); }
  };

  const sendReply = async (text: string) => {
    if (!selectedEmail || !text.trim()) return;
    setSending(true);
    try {
      await fetch(N8N_SEND_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedEmail['Expéditeur'],
          subject: `Re: ${selectedEmail.Sujet || ''}`,
          body: text,
          from: selectedEmail.Compte,
        }),
      });
      setSendStatus('success');
      await markAsTreated(selectedEmail);
      setReplyMode(false);
      setTimeout(() => setSendStatus('idle'), 3000);
    } catch {
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 3000);
    } finally { setSending(false); }
  };

  const openEmail = (email: Email) => {
    setSelectedEmail(email);
    setReplyMode(false);
    setShowFullContent(false);
    setSendStatus('idle');
  };

  const hasSuggestions = (email: Email) =>
    !!(email['Réponse 1'] || email['Réponse 2'] || email['Réponse 3']);

  const activeAccountData = ACCOUNTS.find(a => a.email === activeAccount)!;
  const files: BaserowFile[] = selectedEmail?.['Fichier'] || [];

  return (
    <div className="flex flex-col -m-8" style={{ height: 'calc(100vh - 80px)' }}>

      {showTaskPopup && selectedEmail && (
        <TaskPopup email={selectedEmail} onConfirm={createTask} onClose={() => setShowTaskPopup(false)} />
      )}
      {replyMode && selectedEmail && (
        <ReplyModal
          email={selectedEmail}
          accountColor={activeAccountData.color}
          onSend={sendReply}
          onClose={() => { setReplyMode(false); setSendStatus('idle'); }}
          sending={sending}
          sendStatus={sendStatus}
        />
      )}

      {/* Onglets comptes */}
      <div className="flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg-main)] shrink-0">
        <div className="flex items-center gap-1">
          {ACCOUNTS.map(account => {
            const Icon = account.icon;
            const count = unreadCount(account.email);
            const isActive = activeAccount === account.email;
            return (
              <button key={account.email}
                onClick={() => { setActiveAccount(account.email); setSelectedEmail(null); }}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] border-b-transparent hover:text-[#a0a0c0]'
                }`}
                style={isActive ? { borderBottomColor: account.color } : {}}>
                <Icon className="w-4 h-4" style={isActive ? { color: account.color } : {}} />
                {account.label}
                {count > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: account.color }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {taskSuccess && (
            <span className="flex items-center gap-1 px-2 py-1 bg-[#4caf7d]/20 border border-[#4caf7d]/30 rounded-full text-xs font-semibold text-[#4caf7d]">
              <CheckCircle className="w-3 h-3" /> Tâche créée
            </span>
          )}
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 bg-[#d95555]/20 border border-[#d95555]/30 rounded-full text-xs font-bold text-[#d95555]">
              {totalUnread} non traités
            </span>
          )}
          <button onClick={() => setShowTreated(!showTreated)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showTreated ? 'bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c]' : 'bg-[var(--bg-surface)] border-[var(--border)] text-[#a0a0c0] hover:text-[var(--text-primary)]'
            }`}>
            {showTreated ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showTreated ? 'Masquer traités' : 'Traités'}
          </button>
          <button onClick={fetchEmails} disabled={refreshing}
            className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[#a0a0c0] hover:text-[var(--text-primary)] transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Layout liste + détail */}
      <div className="flex flex-1 overflow-hidden">

        {/* Liste emails */}
        <div className="flex flex-col border-r border-[var(--border)] bg-[var(--bg-main)] shrink-0" style={{ width: '300px' }}>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Mail className="w-8 h-8 text-[#22223a]" />
                <p className="text-xs text-[#a0a0c0]">Aucun email</p>
              </div>
            ) : filteredEmails.map(email => {
              const isSelected = selectedEmail?.id === email.id;
              const emailFiles: BaserowFile[] = email['Fichier'] || [];
              return (
                <button key={email.id} onClick={() => openEmail(email)}
                  className={`w-full text-left p-3 border-b border-[var(--border)]/50 transition-all hover:bg-[var(--bg-surface)] ${
                    isSelected ? 'bg-[var(--bg-card)] border-l-2' : ''
                  } ${email.Traité ? 'opacity-40' : ''}`}
                  style={isSelected ? { borderLeftColor: activeAccountData.color } : {}}>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: `${activeAccountData.color}20`, color: activeAccountData.color, border: `1px solid ${activeAccountData.color}30` }}>
                      {getInitials(email['Expéditeur'] || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-bold truncate ${!email.Traité ? 'text-[var(--text-primary)]' : 'text-[#a0a0c0]'}`}>
                          {email['Expéditeur']?.replace(/<.*>/, '').replace(/"/g, '').trim() || 'Inconnu'}
                        </p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {emailFiles.length > 0 && <Paperclip className="w-3 h-3 text-[#a0a0c0]" />}
                          {hasSuggestions(email) && <Sparkles className="w-3 h-3 text-[#7b5ea7]" />}
                          {email['Action requise'] && <AlertCircle className="w-3 h-3 text-[#d95555]" />}
                          {email.Traité && <CheckCircle className="w-3 h-3 text-[#4caf7d]" />}
                        </div>
                      </div>
                      <p className={`text-xs truncate mb-0.5 font-semibold ${!email.Traité ? 'text-[#c8c4b8]' : 'text-[#a0a0c0]'}`}>
                        {email.Sujet || 'Sans sujet'}
                      </p>
                      <p className="text-[10px] text-[#7a78a0] line-clamp-2 leading-relaxed">
                        {email['Résumé IA'] || '—'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                        <span className="text-[10px] text-[#7a78a0]">{formatDate(email['Date réception'])}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Détail email */}
        <div className="flex-1 flex flex-col bg-[var(--bg-main)] overflow-hidden">
          {!selectedEmail ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#22223a]" />
              </div>
              <p className="text-[#a0a0c0] text-sm">Sélectionnez un email</p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Header */}
              <div className="px-6 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight truncate">
                      {selectedEmail.Sujet || 'Sans sujet'}
                    </h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#c8c4b8]">
                        <span className="text-[var(--text-muted)]">De : </span>
                        {selectedEmail['Expéditeur']?.replace(/"/g, '') || '—'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />{formatDate(selectedEmail['Date réception'])}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedEmail['Action requise'] && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-[#d95555]/20 border border-[#d95555]/30 rounded-lg text-xs font-bold text-[#d95555]">
                        <AlertCircle className="w-3 h-3" /> Action
                      </span>
                    )}
                    {selectedEmail.Traité && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-[#4caf7d]/20 border border-[#4caf7d]/30 rounded-lg text-xs font-bold text-[#4caf7d]">
                        <CheckCircle className="w-3 h-3" /> Traité
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setReplyMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`, color: '#05050a' }}>
                    <Send className="w-3.5 h-3.5" /> Répondre
                  </button>
                  {!selectedEmail.Traité && (
                    <button onClick={() => markAsTreated(selectedEmail)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4caf7d]/20 border border-[#4caf7d]/30 text-[#4caf7d] hover:bg-[#4caf7d]/30 transition-all">
                      <CheckCircle className="w-3.5 h-3.5" /> Traité
                    </button>
                  )}
                  <button onClick={() => setShowTaskPopup(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--bg-card)] border border-[var(--border)] text-[#c8c4b8] hover:text-[var(--text-primary)] hover:border-[#c9a84c]/30 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Tâche
                  </button>
                  {files.map((file, i) => (
                    <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[#a0a0c0] hover:text-[#c9a84c] hover:border-[#c9a84c]/40 transition-all">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="max-w-[160px] truncate">{getFileName(file.visible_name)}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                    </a>
                  ))}
                  <button onClick={() => deleteEmail(selectedEmail)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>

              {/* Corps */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Résumé IA */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-xl border border-[#c9a84c]/25 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                    </div>
                    <span className="text-xs font-bold text-[#c9a84c]">Résumé IA</span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {selectedEmail['Résumé IA'] || 'Aucun résumé.'}
                  </p>
                </div>

                {/* 3 Suggestions de réponse */}
                <div className="bg-[var(--bg-card)] rounded-xl border border-[#2a2a4a] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-[#7b5ea7]" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">Suggestions de réponse — dans ton style</span>
                  </div>

                  {hasSuggestions(selectedEmail) ? (
                    <div className="space-y-3">
                      {[
                        { label: 'Réponse 1 — Directe & concise', key: 'Réponse 1' as keyof Email, color: '#c9a84c' },
                        { label: 'Réponse 2 — Développée', key: 'Réponse 2' as keyof Email, color: '#4caf7d' },
                        { label: 'Réponse 3 — Chaleureuse & spirituelle', key: 'Réponse 3' as keyof Email, color: '#7b5ea7' },
                      ].filter(s => selectedEmail[s.key]).map((s, i) => (
                        <div key={i} className="rounded-xl border p-4 transition-all hover:border-opacity-60"
                          style={{ borderColor: s.color + '30', background: s.color + '08' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.color }}>
                              {s.label}
                            </span>
                            <button onClick={() => setReplyMode(true)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                              style={{ background: s.color + '20', border: `1px solid ${s.color}40`, color: s.color }}>
                              Utiliser <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap"
                            style={{ color: s.color === '#c9a84c' ? '#d4c890' : s.color === '#4caf7d' ? '#90d4b0' : '#b090d4' }}>
                            {selectedEmail[s.key] as string}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] italic">Aucune suggestion pour cet email.</p>
                  )}
                </div>

                {/* Contenu */}
                {selectedEmail.Contenu && (
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[#2a2a4a] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#a0a0c0]" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Contenu</span>
                      </div>
                      <button onClick={() => setShowFullContent(!showFullContent)}
                        className="text-xs text-[#a0a0c0] hover:text-[var(--text-primary)] flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] hover:border-[#c9a84c]/30 transition-all">
                        {showFullContent ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showFullContent ? 'Réduire' : 'Voir tout'}
                      </button>
                    </div>
                    <div className={`text-sm text-[#d0ccc0] leading-relaxed whitespace-pre-wrap ${!showFullContent ? 'line-clamp-5' : ''}`}>
                      {cleanContent(selectedEmail.Contenu)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
