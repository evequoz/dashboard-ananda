import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Inbox, Briefcase, RefreshCw, CheckCircle,
  AlertCircle, Clock, ChevronRight, Send, Plus,
  Eye, EyeOff, Sparkles, ArrowLeft, X
} from 'lucide-react';

// ─────────────────────────────────────────────
// CONFIGURATION BASEROW
// ─────────────────────────────────────────────
const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const BASEROW_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_EMAILS = 534;
const TABLE_TACHES = 536;

// Webhook N8N pour envoyer les réponses
const N8N_SEND_WEBHOOK = 'https://n8n.ananda-communaute.cloud/webhook/send-email';

const HEADERS = {
  Authorization: `Token ${BASEROW_TOKEN}`,
  'Content-Type': 'application/json',
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Email {
  id: number;
  Sujet: string;
  'Expéditeur': string;
  'Date réception': string | null;
  'Résumé IA': string;
  'Action requise': boolean;
  Traité: boolean;
  Compte: string;
  'suggestion_reponse'?: string;
}

// ─────────────────────────────────────────────
// COMPTES
// ─────────────────────────────────────────────
const ACCOUNTS = [
  { email: 'serge@eh-me.com',  label: 'EH-ME Formation',   icon: Mail,     color: '#c9a84c' },
  { email: 'admin@eh-me.com',  label: 'Admin & Support',   icon: Inbox,    color: '#4caf7d' },
  { email: 'serge@seme.ch',    label: 'SEME Consulting',   icon: Briefcase, color: '#7b5ea7' },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
};

const getInitials = (from: string) => {
  if (!from) return '?';
  const name = from.replace(/<.*>/, '').trim();
  const parts = name.split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
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

  // ── Charger les emails depuis Baserow ──────
  const fetchEmails = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/?user_field_names=true&size=100`,
        { headers: HEADERS }
      );
      const data = await res.json();
      setEmails(data.results || []);
    } catch (e) {
      console.error('Erreur chargement emails:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  // ── Emails filtrés par compte ──────────────
  const filteredEmails = emails.filter(e => {
    const matchAccount = e.Compte === activeAccount;
    const matchTreated = showTreated ? true : !e.Traité;
    return matchAccount && matchTreated;
  });

  const unreadCount = (account: string) =>
    emails.filter(e => e.Compte === account && !e.Traité).length;

  // ── Marquer comme traité ───────────────────
  const markAsTreated = async (email: Email) => {
    try {
      await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/?user_field_names=true`,
        {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({ Traité: true }),
        }
      );
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, Traité: true } : e));
      if (selectedEmail?.id === email.id) setSelectedEmail({ ...email, Traité: true });
    } catch (e) { console.error('Erreur mise à jour:', e); }
  };

  // ── Créer une tâche depuis un email ────────
  const createTask = async (email: Email) => {
    try {
      await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_TACHES}/?user_field_names=true`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            Nom: `Répondre à: ${email.Sujet || 'Sans sujet'}`,
            Description: `Email de ${email['Expéditeur']}\n${email['Résumé IA']}`,
            Statut: 'En cours',
            Priorité: email['Action requise'] ? 'haute' : 'normale',
          }),
        }
      );
      alert('✅ Tâche créée dans Baserow');
    } catch (e) { console.error('Erreur création tâche:', e); }
  };

  // ── Envoyer la réponse via N8N ─────────────
  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSending(true);
    setSendStatus('idle');
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
    } catch (e) {
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 3000);
    } finally {
      setSending(false);
    }
  };

  // ── Ouvrir un email ────────────────────────
  const openEmail = (email: Email) => {
    setSelectedEmail(email);
    setReplyMode(false);
    setReplyText(email['suggestion_reponse'] || '');
    setSendStatus('idle');
  };

  // ─────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────
  const activeAccountData = ACCOUNTS.find(a => a.email === activeAccount)!;

  return (
    <div className="flex flex-col h-full space-y-0 -m-8 h-[calc(100vh-80px)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#22223a] bg-[#05050a]">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-[#c9a84c]" />
          <h1 className="text-xl font-bold text-[#e8e4d9]">Boîte de réception</h1>
          <span className="px-2 py-0.5 bg-[#d95555]/20 border border-[#d95555]/30 rounded-full text-xs font-bold text-[#d95555]">
            {emails.filter(e => !e.Traité).length} non traités
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTreated(!showTreated)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showTreated
                ? 'bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c]'
                : 'bg-[#0a0a15] border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9]'
            }`}
          >
            {showTreated ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showTreated ? 'Masquer traités' : 'Afficher traités'}
          </button>
          <button
            onClick={fetchEmails}
            disabled={refreshing}
            className="p-2 rounded-lg bg-[#0a0a15] border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Colonne gauche — Comptes + Liste ── */}
        <div className="w-80 flex flex-col border-r border-[#22223a] bg-[#05050a]">

          {/* Onglets comptes */}
          <div className="flex flex-col gap-1 p-3 border-b border-[#22223a]">
            {ACCOUNTS.map(account => {
              const Icon = account.icon;
              const count = unreadCount(account.email);
              const isActive = activeAccount === account.email;
              return (
                <button
                  key={account.email}
                  onClick={() => { setActiveAccount(account.email); setSelectedEmail(null); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    isActive
                      ? 'bg-[#0a0a15] border border-[#22223a]'
                      : 'hover:bg-[#0a0a15]/50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${account.color}20`, border: `1px solid ${account.color}30` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: account.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#e8e4d9]' : 'text-[#5a587a]'}`}>
                      {account.label}
                    </p>
                    <p className="text-[10px] text-[#5a587a] truncate">{account.email}</p>
                  </div>
                  {count > 0 && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: account.color }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Liste emails */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-[#5a587a] animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Mail className="w-8 h-8 text-[#22223a]" />
                <p className="text-xs text-[#5a587a]">Aucun email</p>
              </div>
            ) : (
              filteredEmails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => openEmail(email)}
                    className={`w-full text-left p-4 border-b border-[#22223a]/50 transition-all hover:bg-[#0a0a15] ${
                      isSelected ? 'bg-[#0a0a15] border-l-2 border-l-[#c9a84c]' : ''
                    } ${email.Traité ? 'opacity-50' : ''}`}
                  >
                    {/* Avatar + infos */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                        style={{
                          background: `${activeAccountData.color}20`,
                          color: activeAccountData.color,
                          border: `1px solid ${activeAccountData.color}30`
                        }}
                      >
                        {getInitials(email['Expéditeur'] || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-xs font-semibold truncate ${!email.Traité ? 'text-[#e8e4d9]' : 'text-[#5a587a]'}`}>
                            {email['Expéditeur']?.replace(/<.*>/, '').trim() || 'Inconnu'}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {email['Action requise'] && (
                              <AlertCircle className="w-3 h-3 text-[#d95555]" />
                            )}
                            {email.Traité && (
                              <CheckCircle className="w-3 h-3 text-[#4caf7d]" />
                            )}
                          </div>
                        </div>
                        <p className={`text-xs truncate mb-1 ${!email.Traité ? 'text-[#e8e4d9] font-medium' : 'text-[#5a587a]'}`}>
                          {email.Sujet || 'Sans sujet'}
                        </p>
                        <p className="text-[10px] text-[#5a587a] line-clamp-2 leading-relaxed">
                          {email['Résumé IA'] || '—'}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3 text-[#5a587a]" />
                          <span className="text-[10px] text-[#5a587a]">
                            {formatDate(email['Date réception'])}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Colonne droite — Détail email ── */}
        <div className="flex-1 flex flex-col bg-[#05050a] overflow-hidden">
          {!selectedEmail ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0a0a15] border border-[#22223a] flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#22223a]" />
              </div>
              <div>
                <p className="text-[#5a587a] text-sm font-medium">Sélectionnez un email</p>
                <p className="text-[#22223a] text-xs mt-1">pour voir son contenu</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Header email */}
              <div className="px-8 py-5 border-b border-[#22223a]">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-[#e8e4d9] mb-2 leading-tight">
                      {selectedEmail.Sujet || 'Sans sujet'}
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-[#5a587a]">
                      <span className="flex items-center gap-1">
                        <span className="text-[#e8e4d9]">De :</span>
                        {selectedEmail['Expéditeur'] || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(selectedEmail['Date réception'])}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedEmail['Action requise'] && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-[#d95555]/20 border border-[#d95555]/30 rounded-lg text-xs font-semibold text-[#d95555]">
                        <AlertCircle className="w-3 h-3" />
                        Action requise
                      </span>
                    )}
                    {selectedEmail.Traité && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-[#4caf7d]/20 border border-[#4caf7d]/30 rounded-lg text-xs font-semibold text-[#4caf7d]">
                        <CheckCircle className="w-3 h-3" />
                        Traité
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setReplyMode(true);
                      setReplyText(selectedEmail['suggestion_reponse'] || '');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`,
                      color: '#05050a'
                    }}
                  >
                    <Send className="w-4 h-4" />
                    Répondre
                  </button>
                  {!selectedEmail.Traité && (
                    <button
                      onClick={() => markAsTreated(selectedEmail)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#4caf7d]/20 border border-[#4caf7d]/30 text-[#4caf7d] hover:bg-[#4caf7d]/30 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marquer traité
                    </button>
                  )}
                  <button
                    onClick={() => createTask(selectedEmail)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0a0a15] border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Créer une tâche
                  </button>
                </div>
              </div>

              {/* Corps email */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                {/* Résumé IA */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-xl border border-[#c9a84c]/20 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#c9a84c]" />
                    </div>
                    <span className="text-sm font-semibold text-[#c9a84c]">Résumé IA</span>
                  </div>
                  <p className="text-sm text-[#e8e4d9] leading-relaxed">
                    {selectedEmail['Résumé IA'] || 'Aucun résumé disponible.'}
                  </p>
                </div>

                {/* Zone de réponse */}
                {replyMode && (
                  <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" style={{ color: activeAccountData.color }} />
                        <span className="text-sm font-semibold text-[#e8e4d9]">Réponse</span>
                        <span className="text-xs text-[#5a587a]">
                          → {selectedEmail['Expéditeur']?.replace(/<.*>/, '').trim()}
                        </span>
                      </div>
                      <button
                        onClick={() => { setReplyMode(false); setSendStatus('idle'); }}
                        className="p-1 text-[#5a587a] hover:text-[#e8e4d9] transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="w-full h-36 bg-[#05050a] border border-[#22223a] rounded-lg p-3 text-sm text-[#e8e4d9] resize-none focus:outline-none focus:border-[#c9a84c]/40 transition-all"
                      placeholder="Rédigez votre réponse..."
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        {sendStatus === 'success' && (
                          <span className="text-xs text-[#4caf7d] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Email envoyé
                          </span>
                        )}
                        {sendStatus === 'error' && (
                          <span className="text-xs text-[#d95555] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Erreur d'envoi
                          </span>
                        )}
                      </div>
                      <button
                        onClick={sendReply}
                        disabled={sending || !replyText.trim()}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                        style={{
                          background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`,
                          color: '#05050a'
                        }}
                      >
                        {sending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {sending ? 'Envoi...' : 'Envoyer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Suggestion IA si pas en mode réponse */}
                {!replyMode && selectedEmail['suggestion_reponse'] && (
                  <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#7b5ea7]" />
                        <span className="text-sm font-semibold text-[#e8e4d9]">Suggestion de réponse</span>
                      </div>
                      <button
                        onClick={() => {
                          setReplyMode(true);
                          setReplyText(selectedEmail['suggestion_reponse'] || '');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7b5ea7]/20 border border-[#7b5ea7]/30 text-[#7b5ea7] hover:bg-[#7b5ea7]/30 transition-all"
                      >
                        Utiliser
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-[#5a587a] leading-relaxed italic">
                      {selectedEmail['suggestion_reponse']}
                    </p>
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
