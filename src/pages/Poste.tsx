import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Inbox, Briefcase, RefreshCw, CheckCircle,
  AlertCircle, Clock, ChevronRight, Send, Plus,
  Eye, EyeOff, Sparkles, X, Paperclip, Trash2,
  FileText, ExternalLink, Image
} from 'lucide-react';

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────
const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const BASEROW_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_EMAILS = 534;
const TABLE_TACHES = 536;
const N8N_SEND_WEBHOOK = 'https://n8n.ananda-communaute.cloud/webhook/send-email';

const HEADERS = {
  Authorization: `Token ${BASEROW_TOKEN}`,
  'Content-Type': 'application/json',
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface BaserowFile {
  url: string;
  name: string;
  visible_name: string;
  size: number;
  mime_type: string;
  is_image: boolean;
  thumbnails?: {
    small?: { url: string };
    tiny?: { url: string };
  };
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
  'suggestion_reponse': string;
  'A une pièce jointe': boolean;
  'Fichier': BaserowFile[];
}

// ─────────────────────────────────────────────
// COMPTES
// ─────────────────────────────────────────────
const ACCOUNTS = [
  { email: 'serge@eh-me.com',  label: 'EH-ME',    icon: Mail,      color: '#c9a84c' },
  { email: 'admin@eh-me.com',  label: 'Admin',     icon: Inbox,     color: '#4caf7d' },
  { email: 'serge@seme.ch',    label: 'SEME',      icon: Briefcase, color: '#7b5ea7' },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
};

const getInitials = (from: string) => {
  if (!from) return '?';
  const name = from.replace(/<.*>/, '').trim();
  const parts = name.split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const cleanContent = (content: string) => {
  if (!content) return '';
  try {
    return decodeURIComponent(escape(content))
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─────────────────────────────────────────────
// POPUP TÂCHE
// ─────────────────────────────────────────────
interface TaskPopupProps {
  email: Email;
  onConfirm: (name: string, description: string) => void;
  onClose: () => void;
}

const TaskPopup = ({ email, onConfirm, onClose }: TaskPopupProps) => {
  const [taskName, setTaskName] = useState(`Répondre à: ${email.Sujet || 'Sans sujet'}`);
  const [taskDesc, setTaskDesc] = useState(
    `Email de ${email['Expéditeur']?.replace(/<.*>/, '').trim()}\n\n${email['Résumé IA'] || ''}`
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0f0f1a] border border-[#22223a] rounded-2xl p-6 w-[480px] shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#c9a84c]" />
            </div>
            <h3 className="text-base font-bold text-[#e8e4d9]">Créer une tâche</h3>
          </div>
          <button onClick={onClose} className="text-[#5a587a] hover:text-[#e8e4d9] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#a0a0c0] mb-2 block">Nom de la tâche</label>
            <input
              type="text"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              className="w-full bg-[#05050a] border border-[#22223a] rounded-lg px-3 py-2.5 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#a0a0c0] mb-2 block">Description</label>
            <textarea
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
              className="w-full h-28 bg-[#05050a] border border-[#22223a] rounded-lg px-3 py-2.5 text-sm text-[#e8e4d9] resize-none focus:outline-none focus:border-[#c9a84c]/50 transition-all"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#a0a0c0] hover:text-[#e8e4d9] border border-[#22223a] transition-all">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(taskName, taskDesc)}
            disabled={!taskName.trim()}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] hover:scale-105 transition-all disabled:opacity-40"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────
export const Poste = () => {
  const [activeAccount, setActiveAccount] = useState(ACCOUNTS[0].email);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showTreated, setShowTreated] = useState(false);
  const [replyText, setReplyText] = useState('');
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
        `${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/?user_field_names=true&size=200&order_by=-id`,
        { headers: HEADERS }
      );
      const data = await res.json();
      setEmails(data.results || []);
    } catch (e) {
      console.error('Erreur:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  // Refresh auto toutes les 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchEmails, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const filteredEmails = emails.filter(e => {
    const matchAccount = e.Compte === activeAccount;
    const matchTreated = showTreated ? true : !e.Traité;
    return matchAccount && matchTreated;
  });

  const unreadCount = (account: string) =>
    emails.filter(e => e.Compte === account && !e.Traité).length;

  const totalUnread = emails.filter(e => !e.Traité).length;

  const markAsTreated = async (email: Email) => {
    try {
      await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/?user_field_names=true`,
        { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ Traité: true }) }
      );
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, Traité: true } : e));
      if (selectedEmail?.id === email.id) setSelectedEmail({ ...email, Traité: true });
    } catch (e) { console.error(e); }
  };

  const deleteEmail = async (email: Email) => {
    if (!confirm(`Supprimer cet email ?\n"${email.Sujet}"`)) return;
    try {
      await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/`,
        { method: 'DELETE', headers: HEADERS }
      );
      setEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedEmail?.id === email.id) setSelectedEmail(null);
    } catch (e) { console.error(e); }
  };

  const createTask = async (name: string, description: string) => {
    try {
      await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_TACHES}/?user_field_names=true`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            Nom: name,
            Description: description,
            Statut: 'En cours',
            Priorité: selectedEmail?.['Action requise'] ? 'haute' : 'normale',
          }),
        }
      );
      setShowTaskPopup(false);
      setTaskSuccess(true);
      setTimeout(() => setTaskSuccess(false), 3000);
    } catch (e) { console.error(e); }
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSending(true);
    try {
      await fetch(N8N_SEND_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedEmail['Expéditeur'],
          subject: `Re: ${selectedEmail.Sujet || ''}`,
          body: replyText,
          from: selectedEmail.Compte,
        }),
      });
      setSendStatus('success');
      await markAsTreated(selectedEmail);
      setReplyMode(false);
      setReplyText('');
      setTimeout(() => setSendStatus('idle'), 3000);
    } catch {
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 3000);
    } finally {
      setSending(false);
    }
  };

  const openEmail = (email: Email) => {
    setSelectedEmail(email);
    setReplyMode(false);
    setShowFullContent(false);
    setReplyText(email['suggestion_reponse'] || '');
    setSendStatus('idle');
  };

  const activeAccountData = ACCOUNTS.find(a => a.email === activeAccount)!;
  const files: BaserowFile[] = selectedEmail?.['Fichier'] || [];

  return (
    <div className="flex flex-col -m-8" style={{ height: 'calc(100vh - 80px)' }}>

      {showTaskPopup && selectedEmail && (
        <TaskPopup email={selectedEmail} onConfirm={createTask} onClose={() => setShowTaskPopup(false)} />
      )}

      {/* ── Barre onglets + contrôles ── */}
      <div className="flex items-center justify-between px-6 py-0 border-b border-[#22223a] bg-[#05050a] shrink-0">
        
        {/* Onglets comptes */}
        <div className="flex items-center gap-1">
          {ACCOUNTS.map(account => {
            const Icon = account.icon;
            const count = unreadCount(account.email);
            const isActive = activeAccount === account.email;
            return (
              <button
                key={account.email}
                onClick={() => { setActiveAccount(account.email); setSelectedEmail(null); }}
                className={`relative flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-all border-b-2 ${
                  isActive
                    ? 'text-[#e8e4d9] border-b-[#c9a84c]'
                    : 'text-[#5a587a] border-b-transparent hover:text-[#a0a0c0]'
                }`}
                style={isActive ? { borderBottomColor: account.color } : {}}
              >
                <Icon className="w-4 h-4" style={isActive ? { color: account.color } : {}} />
                {account.label}
                {count > 0 && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: account.color }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contrôles droite */}
        <div className="flex items-center gap-3">
          {taskSuccess && (
            <span className="flex items-center gap-1 px-3 py-1 bg-[#4caf7d]/20 border border-[#4caf7d]/30 rounded-full text-xs font-semibold text-[#4caf7d]">
              <CheckCircle className="w-3 h-3" /> Tâche créée
            </span>
          )}
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 bg-[#d95555]/20 border border-[#d95555]/30 rounded-full text-xs font-bold text-[#d95555]">
              {totalUnread} non traités
            </span>
          )}
          <button
            onClick={() => setShowTreated(!showTreated)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showTreated ? 'bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c]' : 'bg-[#0a0a15] border-[#22223a] text-[#a0a0c0] hover:text-[#e8e4d9]'
            }`}
          >
            {showTreated ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showTreated ? 'Masquer traités' : 'Traités'}
          </button>
          <button
            onClick={fetchEmails}
            disabled={refreshing}
            className="p-2 rounded-lg bg-[#0a0a15] border border-[#22223a] text-[#a0a0c0] hover:text-[#e8e4d9] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Liste emails (35%) ── */}
        <div className="w-96 flex flex-col border-r border-[#22223a] bg-[#05050a] shrink-0">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-[#5a587a] animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Mail className="w-8 h-8 text-[#22223a]" />
                <p className="text-xs text-[#a0a0c0]">Aucun email</p>
              </div>
            ) : (
              filteredEmails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                const emailFiles: BaserowFile[] = email['Fichier'] || [];
                return (
                  <button
                    key={email.id}
                    onClick={() => openEmail(email)}
                    className={`w-full text-left p-4 border-b border-[#22223a]/50 transition-all hover:bg-[#0a0a15] ${
                      isSelected ? 'bg-[#0f0f1a] border-l-2 border-l-[#c9a84c]' : ''
                    } ${email.Traité ? 'opacity-40' : ''}`}
                    style={isSelected ? { borderLeftColor: activeAccountData.color } : {}}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                        style={{ background: `${activeAccountData.color}20`, color: activeAccountData.color, border: `1px solid ${activeAccountData.color}30` }}
                      >
                        {getInitials(email['Expéditeur'] || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-xs font-bold truncate ${!email.Traité ? 'text-[#e8e4d9]' : 'text-[#a0a0c0]'}`}>
                            {email['Expéditeur']?.replace(/<.*>/, '').replace(/"/g, '').trim() || 'Inconnu'}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {emailFiles.length > 0 && <Paperclip className="w-3 h-3 text-[#a0a0c0]" />}
                            {email['Action requise'] && <AlertCircle className="w-3 h-3 text-[#d95555]" />}
                            {email.Traité && <CheckCircle className="w-3 h-3 text-[#4caf7d]" />}
                          </div>
                        </div>
                        <p className={`text-xs truncate mb-1 font-semibold ${!email.Traité ? 'text-[#c8c4b8]' : 'text-[#a0a0c0]'}`}>
                          {email.Sujet || 'Sans sujet'}
                        </p>
                        <p className="text-[10px] text-[#7a78a0] line-clamp-2 leading-relaxed">
                          {email['Résumé IA'] || '—'}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3 text-[#5a587a]" />
                          <span className="text-[10px] text-[#7a78a0]">{formatDate(email['Date réception'])}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Détail email (65%) ── */}
        <div className="flex-1 flex flex-col bg-[#05050a] overflow-hidden">
          {!selectedEmail ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0a0a15] border border-[#22223a] flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#22223a]" />
              </div>
              <p className="text-[#a0a0c0] text-sm">Sélectionnez un email</p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Header email */}
              <div className="px-8 py-5 border-b border-[#22223a] shrink-0 bg-[#0a0a15]">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-[#e8e4d9] mb-1.5 leading-tight">
                      {selectedEmail.Sujet || 'Sans sujet'}
                    </h2>
                    <div className="flex items-center flex-wrap gap-3">
                      <span className="text-sm text-[#c8c4b8]">
                        <span className="text-[#a0a0c0]">De : </span>
                        <span className="font-medium">{selectedEmail['Expéditeur']?.replace(/"/g, '') || '—'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#a0a0c0]">
                        <Clock className="w-3 h-3" />
                        {formatDate(selectedEmail['Date réception'])}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedEmail['Action requise'] && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-[#d95555]/20 border border-[#d95555]/30 rounded-lg text-xs font-bold text-[#d95555]">
                        <AlertCircle className="w-3 h-3" /> Action requise
                      </span>
                    )}
                    {selectedEmail.Traité && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-[#4caf7d]/20 border border-[#4caf7d]/30 rounded-lg text-xs font-bold text-[#4caf7d]">
                        <CheckCircle className="w-3 h-3" /> Traité
                      </span>
                    )}
                  </div>
                </div>

                {/* Boutons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setReplyMode(!replyMode); if (!replyMode) setReplyText(selectedEmail['suggestion_reponse'] || ''); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`, color: '#05050a' }}
                  >
                    <Send className="w-4 h-4" /> Répondre
                  </button>
                  {!selectedEmail.Traité && (
                    <button
                      onClick={() => markAsTreated(selectedEmail)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#4caf7d]/20 border border-[#4caf7d]/30 text-[#4caf7d] hover:bg-[#4caf7d]/30 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" /> Traité
                    </button>
                  )}
                  <button
                    onClick={() => setShowTaskPopup(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#0f0f1a] border border-[#22223a] text-[#c8c4b8] hover:text-[#e8e4d9] hover:border-[#c9a84c]/30 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Tâche
                  </button>
                  <button
                    onClick={() => deleteEmail(selectedEmail)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all ml-auto"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>

              {/* Corps */}
              <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4">

                {/* Zone réponse — en haut si active */}
                {replyMode && (
                  <div className="bg-[#0f0f1a] rounded-xl border border-[#22223a] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" style={{ color: activeAccountData.color }} />
                        <span className="text-sm font-bold text-[#e8e4d9]">Réponse</span>
                        <span className="text-xs text-[#a0a0c0]">
                          → {selectedEmail['Expéditeur']?.replace(/<.*>/, '').replace(/"/g, '').trim()}
                        </span>
                      </div>
                      <button onClick={() => { setReplyMode(false); setSendStatus('idle'); }} className="text-[#a0a0c0] hover:text-[#e8e4d9]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="w-full h-32 bg-[#05050a] border border-[#22223a] rounded-lg p-3 text-sm text-[#e8e4d9] resize-none focus:outline-none focus:border-[#c9a84c]/40 transition-all"
                      placeholder="Rédigez votre réponse..."
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        {sendStatus === 'success' && (
                          <span className="text-xs text-[#4caf7d] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Envoyé
                          </span>
                        )}
                        {sendStatus === 'error' && (
                          <span className="text-xs text-[#d95555] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Erreur
                          </span>
                        )}
                      </div>
                      <button
                        onClick={sendReply}
                        disabled={sending || !replyText.trim()}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`, color: '#05050a' }}
                      >
                        {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Envoi...' : 'Envoyer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Résumé IA */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-xl border border-[#c9a84c]/25 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#c9a84c]" />
                    </div>
                    <span className="text-sm font-bold text-[#c9a84c]">Résumé IA</span>
                  </div>
                  <p className="text-sm text-[#e8e4d9] leading-relaxed">
                    {selectedEmail['Résumé IA'] || 'Aucun résumé disponible.'}
                  </p>
                </div>

                {/* Suggestion de réponse */}
                {selectedEmail['suggestion_reponse'] && !replyMode && (
                  <div className="bg-[#0f0f1a] rounded-xl border border-[#2a2a4a] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#7b5ea7]" />
                        <span className="text-sm font-bold text-[#e8e4d9]">Suggestion de réponse</span>
                      </div>
                      <button
                        onClick={() => { setReplyMode(true); setReplyText(selectedEmail['suggestion_reponse']); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#7b5ea7]/20 border border-[#7b5ea7]/30 text-[#9b7ec7] hover:bg-[#7b5ea7]/30 transition-all"
                      >
                        Utiliser <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-[#d0ccc0] leading-relaxed">
                      {selectedEmail['suggestion_reponse']}
                    </p>
                  </div>
                )}

                {/* Pièces jointes */}
                {files.length > 0 && (
                  <div className="bg-[#0f0f1a] rounded-xl border border-[#2a2a4a] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Paperclip className="w-4 h-4 text-[#a0a0c0]" />
                      <span className="text-sm font-bold text-[#e8e4d9]">
                        Pièce{files.length > 1 ? 's' : ''} jointe{files.length > 1 ? 's' : ''} ({files.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-[#05050a] border border-[#22223a] rounded-lg hover:border-[#c9a84c]/40 transition-all group"
                        >
                          {file.is_image && file.thumbnails?.small ? (
                            <img
                              src={file.thumbnails.small.url}
                              alt={file.visible_name}
                              className="w-10 h-10 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#0f0f1a] border border-[#22223a] flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-[#5a587a]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#c8c4b8] truncate group-hover:text-[#e8e4d9] transition-all">
                              {file.visible_name}
                            </p>
                            <p className="text-xs text-[#5a587a]">{formatFileSize(file.size)} · {file.mime_type}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-[#5a587a] group-hover:text-[#c9a84c] transition-all shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contenu complet */}
                {selectedEmail.Contenu && (
                  <div className="bg-[#0f0f1a] rounded-xl border border-[#2a2a4a] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#a0a0c0]" />
                        <span className="text-sm font-bold text-[#e8e4d9]">Contenu</span>
                      </div>
                      <button
                        onClick={() => setShowFullContent(!showFullContent)}
                        className="text-xs text-[#a0a0c0] hover:text-[#e8e4d9] flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#22223a] hover:border-[#c9a84c]/30 transition-all"
                      >
                        {showFullContent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
