import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Mail, Inbox, Briefcase, RefreshCw, CheckCircle,
  AlertCircle, Clock, Send, Plus,
  X, Paperclip, Trash2,
  SendHorizonal, Shield, Newspaper
} from 'lucide-react';
import {
  listInboxEmails,
  listSentEmails,
  updateInboxEmail,
  restoreInboxEmail,
  restoreInboxEmailsBulk,
  notifyInboxDeletionSync,
  createTaskFromEmail,
  deleteSentEmailsBulk,
  moveSentEmailsBulkToTrash,
  restoreSentEmailsBulk,
  deleteSentEmailsOlderThanDays,
  sendEmailViaEdge,
  refreshUntreatedEmailCount,
} from '../data/supabaseApi';
import { dispatchUntreatedEmailCount } from '../lib/emailCountEvents';

interface EmailAttachment {
  url: string;
  name: string;
  visible_name: string;
  size: number;
  mime_type: string;
  is_image: boolean;
  thumbnails?: { small?: { url: string }; tiny?: { url: string } };
}

interface Attachment {
  filename: string;
  content: string; // base64
  contentType: string;
  size: number;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

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
  'Fichier': EmailAttachment[];
  'Tâche liée'?: number | null;
  'Converti en tâche'?: boolean;
  'Date conversion'?: string | null;
  'Supprimé le'?: string | null;
  'Score spam'?: number | null;
  'Catégorie spam'?: string | null;
  'Challenge envoyé'?: boolean;
  'Challenge répondu'?: boolean;
  folder?: string;
}

interface SentEmail {
  id: number;
  De: string;
  'À': string;
  CC: string;
  BCC: string;
  Sujet: string;
  Corps: string;
  Date: string;
  Compte: string;
  'Supprimé le'?: string | null;
  replyToEmailId?: number | null;
}

const ACCOUNTS = [
  { email: 'serge@eh-me.com', label: 'EH-ME',   icon: Mail,      color: '#c9a84c' },
  { email: 'admin@eh-me.com', label: 'Admin',    icon: Inbox,     color: '#4caf7d' },
  { email: 'serge@seme.ch',   label: 'SEME',     icon: Briefcase, color: '#7b5ea7' },
];

const DEFAULT_ACCOUNT_EMAIL = 'admin@eh-me.com';
const normalizeAccountEmail = (account?: string | null) => {
  const value = (account || '').trim();
  return value || DEFAULT_ACCOUNT_EMAIL;
};

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
  catch { return d; }
};

const RE_SUBJECT_PREFIX = /^(re(\[\d+\])?|fw|fwd):\s*/i;

const normalizeThreadSubject = (subject: string) => {
  let subj = (subject || '').trim();
  while (RE_SUBJECT_PREFIX.test(subj)) {
    subj = subj.replace(RE_SUBJECT_PREFIX, '').trim();
  }
  return subj || 'Sans sujet';
};

const displayThreadSubject = (subject: string) => normalizeThreadSubject(subject);

const threadKeyForEmail = (email: Email) => {
  const account = normalizeAccountEmail(email.Compte);
  return `${account}::${normalizeThreadSubject(email.Sujet || '').toLowerCase()}`;
};

const formatRelativeDate = (d: string | null) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((todayStart - dayStart) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  } catch {
    return d;
  }
};

const formatSenderDisplay = (raw: string) =>
  (raw || '').replace(/<.*>/, '').replace(/"/g, '').trim() || 'Inconnu';

const SIGNATURE_LINE = /^(cordialement|bien à vous|best regards|bien cordialement|à bientôt)\b/i;

const stripHtmlToText = (content: string) => {
  try {
    return decodeURIComponent(escape(content))
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  } catch {
    return content.replace(/<[^>]*>/g, ' ');
  }
};

const cleanContent = (content: string) => {
  if (!content) return '';
  const raw = stripHtmlToText(content);
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const bodyLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith('>')) continue;
    if (SIGNATURE_LINE.test(line)) break;
    bodyLines.push(line);
  }
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of bodyLines) {
    if (!line) {
      if (current.length) {
        paragraphs.push(current.join(' '));
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length) paragraphs.push(current.join(' '));
  return paragraphs.join('\n\n').trim();
};

const MessageBody = ({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const text = content || '—';
  const needsTruncate = text.length > 500;
  const shown = !needsTruncate || expanded ? text : `${text.slice(0, 500)}…`;
  return (
    <div>
      <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{shown}</p>
      {needsTruncate && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-semibold text-[#c9a84c] hover:underline"
        >
          Voir tout
        </button>
      )}
    </div>
  );
};

const toSafeText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => toSafeText(v)).join(' ').trim();
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.value === 'string') return record.value;
    if (typeof record.text === 'string') return record.text;
  }
  return '';
};

const extractEmailAddress = (raw: string) => {
  const src = (raw || '').trim();
  const match = src.match(/<([^>]+)>/);
  return (match?.[1] || src).trim();
};

const OWN_ACCOUNT_EMAILS = new Set(['serge@eh-me.com', 'admin@eh-me.com']);

const isFromOwnAccount = (sender: string) =>
  OWN_ACCOUNT_EMAILS.has(extractEmailAddress(sender).toLowerCase());

const spamScoreOf = (e: Email) => {
  const v = e['Score spam'];
  if (v == null || !Number.isFinite(Number(v))) return 0;
  return Number(v);
};

/** Sujet envoyé contenant « Re: » + sujet du message reçu (insensible à la casse). */
const sentSubjectRepliesToInbox = (sentSubject: string, inboxSubject: string) => {
  const base = (inboxSubject || '').trim();
  if (!base) return false;
  return (sentSubject || '').toLowerCase().includes(`re: ${base.toLowerCase()}`);
};

const emailHasSentReply = (email: Email, sentList: SentEmail[]) => {
  if (email['Converti en tâche']) return true;
  const account = normalizeAccountEmail(email.Compte);
  const inboxSubject = email.Sujet || '';
  return sentList.some((s) => {
    if (normalizeAccountEmail(s.Compte) !== account || s['Supprimé le']) return false;
    if (s.replyToEmailId != null && s.replyToEmailId === email.id) return true;
    return sentSubjectRepliesToInbox(s.Sujet || '', inboxSubject);
  });
};

interface EmailThread {
  key: string;
  subject: string;
  inboxEmails: Email[];
  representativeEmail: Email;
  messageCount: number;
  latestDate: string | null;
}

type ThreadStatusDot = 'red' | 'green' | 'gray';

type ThreadMessage = {
  id: string;
  from: string;
  date: string | null;
  body: string;
  sortTime: number;
};

const sentMatchesThread = (
  sent: SentEmail,
  threadSubject: string,
  account: string,
  inboxEmails: Email[],
) => {
  if (normalizeAccountEmail(sent.Compte) !== account || sent['Supprimé le']) return false;
  if (sent.replyToEmailId != null && inboxEmails.some((e) => e.id === sent.replyToEmailId)) return true;
  return sentSubjectRepliesToInbox(sent.Sujet || '', threadSubject);
};

const threadHasReply = (thread: EmailThread, sentList: SentEmail[]) => {
  const account = normalizeAccountEmail(thread.representativeEmail.Compte);
  if (thread.inboxEmails.some((e) => emailHasSentReply(e, sentList))) return true;
  return sentList.some((s) => sentMatchesThread(s, thread.subject, account, thread.inboxEmails));
};

const getThreadStatusDot = (thread: EmailThread, sentList: SentEmail[]): ThreadStatusDot => {
  if (threadHasReply(thread, sentList)) return 'green';
  if (thread.inboxEmails.every((e) => e.Traité)) return 'gray';
  return 'red';
};

const threadDotColor = (dot: ThreadStatusDot) => {
  if (dot === 'green') return '#4caf7d';
  if (dot === 'red') return '#e07070';
  return '#9e9e9e';
};

const threadPreview = (thread: EmailThread) => {
  const latest = [...thread.inboxEmails].sort(
    (a, b) => new Date(b['Date réception'] || 0).getTime() - new Date(a['Date réception'] || 0).getTime(),
  )[0];
  const text = cleanContent(latest?.Contenu || '');
  if (!text) return '—';
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};

const buildInboxThreads = (
  allMails: Email[],
  sentList: SentEmail[],
  listPool: Email[],
): EmailThread[] => {
  const byKey = new Map<string, Email[]>();
  for (const e of allMails) {
    const key = threadKeyForEmail(e);
    const list = byKey.get(key) || [];
    list.push(e);
    byKey.set(key, list);
  }
  const visibleKeys = new Set(listPool.map(threadKeyForEmail));
  const threads: EmailThread[] = [];
  for (const [key, inboxEmails] of byKey) {
    if (!visibleKeys.has(key)) continue;
    inboxEmails.sort(
      (a, b) => new Date(a['Date réception'] || 0).getTime() - new Date(b['Date réception'] || 0).getTime(),
    );
    const external = inboxEmails.filter((e) => !isFromOwnAccount(e['Expéditeur'] || ''));
    const representativeEmail = external.length ? external[external.length - 1] : inboxEmails[inboxEmails.length - 1];
    const account = normalizeAccountEmail(representativeEmail.Compte);
    const subject = displayThreadSubject(representativeEmail.Sujet || '');
    const sentInThread = sentList.filter((sent) => sentMatchesThread(sent, subject, account, inboxEmails)).length;
    const latestDate = inboxEmails.reduce<string | null>((best, e) => {
      const d = e['Date réception'];
      if (!d) return best;
      if (!best || new Date(d) > new Date(best)) return d;
      return best;
    }, null);
    threads.push({
      key,
      subject,
      inboxEmails,
      representativeEmail,
      messageCount: inboxEmails.length + sentInThread,
      latestDate,
    });
  }
  return threads.sort(
    (a, b) => new Date(b.latestDate || 0).getTime() - new Date(a.latestDate || 0).getTime(),
  );
};

const buildThreadMessages = (
  inboxEmails: Email[],
  sentList: SentEmail[],
  threadSubject: string,
  account: string,
): ThreadMessage[] => {
  const msgs: ThreadMessage[] = [];
  for (const e of inboxEmails) {
    msgs.push({
      id: `inbox-${e.id}`,
      from: formatSenderDisplay(e['Expéditeur'] || ''),
      date: e['Date réception'],
      body: cleanContent(e.Contenu),
      sortTime: new Date(e['Date réception'] || 0).getTime(),
    });
  }
  for (const sent of sentList) {
    if (!sentMatchesThread(sent, threadSubject, account, inboxEmails)) continue;
    msgs.push({
      id: `sent-${sent.id}`,
      from: formatSenderDisplay(sent.De || account),
      date: sent.Date,
      body: cleanContent(sent.Corps),
      sortTime: new Date(sent.Date || 0).getTime(),
    });
  }
  return msgs.sort((a, b) => a.sortTime - b.sortTime);
};

const TASK_PROJECT_OPTIONS = ['Formation', 'Admin', 'Publications', 'Routines', 'Perso'] as const;
type TaskPriority = 'Basse' | 'Normale' | 'Haute';

interface TaskFormValues {
  titre: string;
  description: string;
  dueDate: string;
  priorite: TaskPriority;
  projet: string;
}

const descriptionFromEmail = (email: Email) => {
  const lines = cleanContent(email.Contenu).split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, 3).join('\n');
};

const todayIsoDate = () => new Date().toISOString().split('T')[0];

const countUntreatedInEmails = (list: Email[]) =>
  list.filter((e) => !e.Traité && !e['Supprimé le']).length;

// ── Modal Tâche ──
interface TaskPopupProps {
  email: Email;
  onConfirm: (values: TaskFormValues) => void;
  onClose: () => void;
  submitting?: boolean;
}
const TaskPopup = ({ email, onConfirm, onClose, submitting }: TaskPopupProps) => {
  const [titre, setTitre] = useState(displayThreadSubject(email.Sujet || '') || 'Sans sujet');
  const [description, setDescription] = useState(descriptionFromEmail(email));
  const [dueDate, setDueDate] = useState(todayIsoDate);
  const [priorite, setPriorite] = useState<TaskPriority>('Normale');
  const [projet, setProjet] = useState('');
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
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Titre</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#a0a0c0] mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-28 bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] resize-y focus:outline-none focus:border-[#c9a84c]/50"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Date échéance</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Priorité</label>
            <div className="flex gap-2">
              {(['Basse', 'Normale', 'Haute'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorite(p)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                    priorite === p
                      ? 'bg-[#c9a84c]/20 border-[#c9a84c]/50 text-[#e8d4a8]'
                      : 'bg-[var(--bg-main)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Projet</label>
            <select
              value={projet}
              onChange={(e) => setProjet(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
            >
              <option value="">—</option>
              {TASK_PROJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] disabled:opacity-50">Annuler</button>
          <button type="button" onClick={() => onConfirm({ titre, description, dueDate, priorite, projet })} disabled={!titre.trim() || submitting}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100">
            {submitting ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Sélecteur de pièces jointes (réutilisable) ──
const AttachmentPicker = ({ attachments, onChange }: {
  attachments: Attachment[];
  onChange: (list: Attachment[]) => void;
}) => {
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // On collecte TOUS les fichiers avant d'appeler onChange une seule fois
    // (évite le bug de stale closure avec plusieurs fichiers simultanés)
    const newAtts: Attachment[] = [];
    let done = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        newAtts.push({ filename: file.name, content: b64, contentType: file.type || 'application/octet-stream', size: file.size });
        done++;
        if (done === files.length) onChange([...attachments, ...newAtts]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };
  return (
    <div className="flex flex-col gap-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs">
              <Paperclip className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="text-[var(--text-primary)] max-w-[140px] truncate">{att.filename}</span>
              <span className="text-[var(--text-muted)]">{formatSize(att.size)}</span>
              <button onClick={() => onChange(attachments.filter((_, j) => j !== i))}
                className="text-[var(--text-muted)] hover:text-[#d95555] transition-all ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-all w-fit">
        <Paperclip className="w-3.5 h-3.5" />
        Joindre un fichier
        <input type="file" multiple className="hidden" onChange={handleFiles} />
      </label>
    </div>
  );
};

const formatSendError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// ── Modal Répondre ──
interface ReplyModalProps {
  accountColor: string;
  onSend: (text: string) => void;
  onClose: () => void;
  sending: boolean;
  sendStatus: 'idle' | 'success' | 'error';
  sendErrorDetail: string | null;
}
const ReplyModal = ({ accountColor, onSend, onClose, sending, sendStatus, sendErrorDetail }: ReplyModalProps) => {
  const [text, setText] = useState('');

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[220px] bg-[var(--bg-main)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-primary)] resize-y focus:outline-none focus:border-[#c9a84c]/40 leading-relaxed"
          placeholder="Votre réponse…"
          autoFocus
        />
        {sendStatus === 'error' && sendErrorDetail && (
          <p className="text-xs text-[#e07070] break-words">{sendErrorDetail}</p>
        )}
        <button
          type="button"
          onClick={() => onSend(text)}
          disabled={sending || !text.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${accountColor}, ${accountColor}cc)`, color: '#05050a' }}
        >
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
};

// ── Modal Nouveau mail ──
interface ComposeModalProps {
  activeAccount: string;
  accountColor: string;
  onSend: (to: string, cc: string, bcc: string, subject: string, body: string, attachments: Attachment[]) => void;
  onClose: () => void;
  sending: boolean;
  sendStatus: 'idle' | 'success' | 'error';
  sendErrorDetail: string | null;
}
const ComposeModal = ({ activeAccount, accountColor, onSend, onClose, sending, sendStatus, sendErrorDetail }: ComposeModalProps) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

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
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Nouveau mail</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Depuis : {activeAccount}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Champs À / CC / BCC / Sujet */}
        <div className="px-6 pt-4 space-y-0 shrink-0">
          <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-14 shrink-0">À</span>
            <input value={to} onChange={e => setTo(e.target.value)} autoFocus
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
              placeholder="email1@ex.com, email2@ex.com" />
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setShowCc(v => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${showCc ? 'bg-[var(--border)] text-[var(--text-primary)] border-[var(--border)]' : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'}`}>
                CC
              </button>
              <button onClick={() => setShowBcc(v => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${showBcc ? 'bg-[var(--border)] text-[var(--text-primary)] border-[var(--border)]' : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'}`}>
                BCC
              </button>
            </div>
          </div>
          {showCc && (
            <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5">
              <span className="text-xs font-semibold text-[var(--text-muted)] w-14 shrink-0">CC</span>
              <input value={cc} onChange={e => setCc(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                placeholder="copie@email.com, autre@email.com" />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5">
              <span className="text-xs font-semibold text-[var(--text-muted)] w-14 shrink-0">BCC</span>
              <input value={bcc} onChange={e => setBcc(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                placeholder="copie-cachée@email.com" />
            </div>
          )}
          <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-14 shrink-0">Sujet</span>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
              placeholder="Objet de l'email" />
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 px-6 py-3 min-h-0">
          <textarea value={body} onChange={e => setBody(e.target.value)}
            className="w-full h-full min-h-[200px] bg-transparent text-sm text-[var(--text-primary)] resize-none focus:outline-none leading-relaxed placeholder:text-[var(--text-muted)]"
            placeholder="Rédigez votre message..." />
        </div>

        {/* Pièces jointes */}
        <div className="px-6 pb-2 shrink-0">
          <AttachmentPicker attachments={attachments} onChange={setAttachments} />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
          {sendStatus === 'success' && (
            <p className="text-xs text-[#4caf7d] flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 shrink-0" /> Envoyé !</p>
          )}
          {sendStatus === 'error' && sendErrorDetail && (
            <div className="rounded-lg border border-[#d95555]/40 bg-[#d95555]/10 px-3 py-2 text-xs text-[#e07070] flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="break-words">{sendErrorDetail}</span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all">Annuler</button>
            <button onClick={() => onSend(to, cc, bcc, subject, body, attachments)} disabled={sending || !to.trim() || !body.trim()}
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
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [treatmentFilter, setTreatmentFilter] = useState<'all' | 'untreated' | 'treated'>('untreated');
  const [replyMode, setReplyMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sendErrorDetail, setSendErrorDetail] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState(false);
  const [composeMode, setComposeMode] = useState(false);
  const [viewMode, setViewMode] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const [inboxMailboxTab, setInboxMailboxTab] = useState<'primary' | 'spam' | 'newsletters'>('primary');
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [selectedSent, setSelectedSent] = useState<SentEmail | null>(null);
  const [selectedInboxIds, setSelectedInboxIds] = useState<number[]>([]);
  const [selectedSentIds, setSelectedSentIds] = useState<number[]>([]);
  const [selectedTrashInboxIds, setSelectedTrashInboxIds] = useState<number[]>([]);
  const [selectedTrashSentIds, setSelectedTrashSentIds] = useState<number[]>([]);
  const [showMailList, setShowMailList] = useState(true);
  const replyModeRef = useRef(false);
  replyModeRef.current = replyMode;

  const syncUntreatedBadge = useCallback(async () => {
    try {
      const count = await refreshUntreatedEmailCount();
      dispatchUntreatedEmailCount(count);
    } catch {
      // Ignore badge sync errors.
    }
  }, []);

  const fetchEmails = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await listInboxEmails(400, true);
      setEmails((data || []) as Email[]);
      await syncUntreatedBadge();
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [syncUntreatedBadge]);

  const fetchSentEmails = useCallback(async () => {
    try {
      const data = await listSentEmails(2000, true);
      setSentEmails((data || []) as SentEmail[]);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchEmails(); fetchSentEmails(); }, [fetchEmails, fetchSentEmails]);
  useEffect(() => {
    const t = setInterval(fetchEmails, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchEmails]);

  // ── Touche Delete → supprime l'email sélectionné ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (replyModeRef.current) return;
      if (selectedEmail && viewMode === 'inbox') deleteEmailDirect(selectedEmail);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedEmail, viewMode]);

  const inAccountInbox = (e: Email) =>
    normalizeAccountEmail(e.Compte) === activeAccount && !e['Supprimé le'];

  const matchesTreatmentFilter = (e: Email) => {
    if (treatmentFilter === 'untreated') return !e.Traité;
    if (treatmentFilter === 'treated') return !!e.Traité;
    return true;
  };

  const filteredPrimary = emails.filter(e =>
    inAccountInbox(e) &&
    matchesTreatmentFilter(e) &&
    String(e['Catégorie spam'] || '').toLowerCase() !== 'newsletter' &&
    !(spamScoreOf(e) > 0.8),
  );
  const filteredSpam = emails.filter(e =>
    inAccountInbox(e) && matchesTreatmentFilter(e) && spamScoreOf(e) > 0.8,
  );
  const filteredNewsletters = emails.filter(e =>
    inAccountInbox(e) && matchesTreatmentFilter(e) && String(e['Catégorie spam'] || '').toLowerCase() === 'newsletter',
  );
  const inboxMailsForList =
    inboxMailboxTab === 'spam'
      ? filteredSpam
      : inboxMailboxTab === 'newsletters'
        ? filteredNewsletters
        : filteredPrimary;

  const listPool = useMemo(
    () => inboxMailsForList.filter((e) => !isFromOwnAccount(e['Expéditeur'] || '')),
    [inboxMailsForList],
  );

  const inboxThreads = useMemo(
    () => buildInboxThreads(inboxMailsForList, sentEmails, listPool),
    [inboxMailsForList, sentEmails, listPool],
  );

  const selectedThread = useMemo(() => {
    if (!selectedThreadKey) return null;
    return inboxThreads.find((t) => t.key === selectedThreadKey) ?? null;
  }, [selectedThreadKey, inboxThreads]);

  const threadMessages = useMemo(() => {
    if (!selectedThread) return [];
    const account = normalizeAccountEmail(selectedThread.representativeEmail.Compte);
    return buildThreadMessages(
      selectedThread.inboxEmails,
      sentEmails,
      selectedThread.subject,
      account,
    );
  }, [selectedThread, sentEmails]);

  const filteredSent = sentEmails.filter(e => normalizeAccountEmail(e.Compte) === activeAccount && !e['Supprimé le']);
  const trashedInbox = emails.filter(e => normalizeAccountEmail(e.Compte) === activeAccount && !!e['Supprimé le']);
  const trashedSent = sentEmails.filter(e => normalizeAccountEmail(e.Compte) === activeAccount && !!e['Supprimé le']);
  const unreadCount = (acc: string) =>
    emails.filter(e =>
      normalizeAccountEmail(e.Compte) === acc &&
      !e.Traité &&
      !e['Supprimé le'] &&
      String(e['Catégorie spam'] || '').toLowerCase() !== 'newsletter' &&
      !(spamScoreOf(e) > 0.8),
    ).length;
  const markAsTreated = async (email: Email) => {
    setEmails((prev) => {
      const next = prev.map((e) => (e.id === email.id ? { ...e, Traité: true } : e));
      dispatchUntreatedEmailCount(countUntreatedInEmails(next));
      return next;
    });
    if (selectedEmail?.id === email.id) setSelectedEmail({ ...email, Traité: true });
    try {
      await updateInboxEmail(email.id, { Traité: true }, { skipCountDispatch: true });
      const count = await refreshUntreatedEmailCount();
      dispatchUntreatedEmailCount(count);
    } catch (e) {
      console.error(e);
      await fetchEmails();
    }
  };

  // Suppression avec confirmation (bouton)
  const deleteEmail = async (email: Email) => {
    if (!confirm(`Déplacer dans la corbeille ?\n"${email.Sujet}"`)) return;
    try {
      await notifyInboxDeletionSync([{ id: email.id, accountEmail: email.Compte }], 'trash');
      await fetchEmails();
      if (selectedEmail?.id === email.id) setSelectedEmail(null);
    } catch (e) { console.error(e); }
  };

  // Déplacement direct en corbeille (touche Delete) sans confirm
  const deleteEmailDirect = async (email: Email) => {
    try {
      await notifyInboxDeletionSync([{ id: email.id, accountEmail: email.Compte }], 'trash');
      await fetchEmails();
      setSelectedEmail(null);
    } catch (e) { console.error(e); }
  };

  const toggleSentSelection = (id: number) => {
    setSelectedSentIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleTrashInboxSelection = (id: number) => {
    setSelectedTrashInboxIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleTrashSentSelection = (id: number) => {
    setSelectedTrashSentIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const deleteSelectedInbox = async () => {
    if (!selectedInboxIds.length) return;
    if (!confirm(`Déplacer ${selectedInboxIds.length} email(s) dans la corbeille ?`)) return;
    try {
      await notifyInboxDeletionSync(
        selectedInboxIds.map(id => ({ id, accountEmail: emails.find(e => e.id === id)?.Compte })),
        'trash',
      );
      await fetchEmails();
      if (selectedEmail && selectedInboxIds.includes(selectedEmail.id)) setSelectedEmail(null);
      setSelectedInboxIds([]);
    } catch (e) { console.error(e); }
  };

  const deleteSelectedSent = async () => {
    if (!selectedSentIds.length) return;
    if (!confirm(`Déplacer ${selectedSentIds.length} mail(s) envoyé(s) dans la corbeille ?`)) return;
    try {
      const deletedAt = new Date().toISOString();
      await moveSentEmailsBulkToTrash(selectedSentIds);
      setSentEmails(prev => prev.map(e => selectedSentIds.includes(e.id) ? { ...e, 'Supprimé le': deletedAt } : e));
      if (selectedSent && selectedSentIds.includes(selectedSent.id)) setSelectedSent(null);
      setSelectedSentIds([]);
    } catch (e) { console.error(e); }
  };

  const cleanupOldSent = async () => {
    if (!confirm('Déplacer dans la corbeille les mails envoyés de plus de 30 jours pour ce compte ?')) return;
    try {
      await deleteSentEmailsOlderThanDays(30, activeAccount);
      await fetchSentEmails();
      setSelectedSentIds([]);
      if (selectedSent) {
        const sentDate = selectedSent.Date ? new Date(selectedSent.Date).getTime() : Date.now();
        if (sentDate < Date.now() - (30 * 24 * 60 * 60 * 1000)) setSelectedSent(null);
      }
    } catch (e) { console.error(e); }
  };

  const restoreSelectedTrash = async () => {
    if (!selectedTrashInboxIds.length && !selectedTrashSentIds.length) return;
    try {
      await Promise.all([
        restoreInboxEmailsBulk(selectedTrashInboxIds),
        restoreSentEmailsBulk(selectedTrashSentIds),
      ]);
      setEmails(prev => prev.map(e => selectedTrashInboxIds.includes(e.id) ? { ...e, 'Supprimé le': null } : e));
      setSentEmails(prev => prev.map(e => selectedTrashSentIds.includes(e.id) ? { ...e, 'Supprimé le': null } : e));
      setSelectedTrashInboxIds([]);
      setSelectedTrashSentIds([]);
    } catch (e) { console.error(e); }
  };

  const deleteSelectedTrashPermanently = async () => {
    const total = selectedTrashInboxIds.length + selectedTrashSentIds.length;
    if (!total) return;
    if (!confirm(`Supprimer définitivement ${total} email(s) de la corbeille ?`)) return;
    try {
      if (selectedTrashInboxIds.length) {
        await notifyInboxDeletionSync(
          selectedTrashInboxIds.map(id => ({ id, accountEmail: emails.find(e => e.id === id)?.Compte })),
          'hard_delete',
        );
      }
      if (selectedTrashSentIds.length) {
        await deleteSentEmailsBulk(selectedTrashSentIds);
      }
      await fetchEmails();
      await fetchSentEmails();
      if (selectedEmail && selectedTrashInboxIds.includes(selectedEmail.id)) setSelectedEmail(null);
      if (selectedSent && selectedTrashSentIds.includes(selectedSent.id)) setSelectedSent(null);
      setSelectedTrashInboxIds([]);
      setSelectedTrashSentIds([]);
    } catch (e) { console.error(e); }
  };

  const emptyTrash = async () => {
    const inboxIds = trashedInbox.map(e => e.id);
    const sentIds = trashedSent.map(e => e.id);
    const total = inboxIds.length + sentIds.length;
    if (!total) return;
    if (!confirm(`Vider la corbeille et supprimer définitivement ${total} email(s) ?`)) return;
    try {
      if (inboxIds.length) {
        await notifyInboxDeletionSync(
          inboxIds.map(id => ({ id, accountEmail: emails.find(e => e.id === id)?.Compte })),
          'hard_delete',
        );
      }
      if (sentIds.length) await deleteSentEmailsBulk(sentIds);
      await fetchEmails();
      await fetchSentEmails();
      setSelectedTrashInboxIds([]);
      setSelectedTrashSentIds([]);
      setSelectedEmail(null);
      setSelectedSent(null);
    } catch (e) { console.error(e); }
  };

  const createTask = async (values: TaskFormValues) => {
    if (!selectedEmail) return;
    setTaskSubmitting(true);
    try {
      const { task, alreadyExisted } = await createTaskFromEmail(selectedEmail.id, {
        Titre: values.titre.trim(),
        Description: values.description,
        Statut: 'En cours',
        Priorité: values.priorite,
        Projet: values.projet || null,
        'Date échéance': values.dueDate,
      });
      await updateInboxEmail(selectedEmail.id, { Traité: true }, { skipCountDispatch: true });
      setEmails((prev) => {
        const next = prev.map((e) => (
          e.id === selectedEmail.id
            ? {
                ...e,
                Traité: true,
                'Tâche liée': Number(task.id),
                'Converti en tâche': true,
                'Date conversion': new Date().toISOString(),
              }
            : e
        ));
        dispatchUntreatedEmailCount(countUntreatedInEmails(next));
        return next;
      });
      setSelectedEmail((prev) => (
        prev
          ? {
              ...prev,
              Traité: true,
              'Tâche liée': Number(task.id),
              'Converti en tâche': true,
              'Date conversion': new Date().toISOString(),
            }
          : prev
      ));
      setShowTaskPopup(false);
      setTaskSuccess(true);
      setTimeout(() => setTaskSuccess(false), 3500);
      const count = await refreshUntreatedEmailCount();
      dispatchUntreatedEmailCount(count);
      if (alreadyExisted) {
        alert(`Une tâche existe déjà pour cet email (ID: ${task.id}).`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const sendReply = async (text: string) => {
    if (!selectedEmail || !text.trim()) return;
    const to = extractEmailAddress(selectedEmail['Expéditeur']);
    const from = normalizeAccountEmail(selectedEmail.Compte);
    const payload = {
      to,
      subject: `Re: ${displayThreadSubject(selectedEmail.Sujet || '')}`,
      body: text,
      from,
      replyToEmailId: selectedEmail.id,
    };

    setSending(true);
    setSendStatus('idle');
    setSendErrorDetail(null);
    console.log('[Poste] email-send — début', { to, from, subject: payload.subject, replyToEmailId: payload.replyToEmailId });

    try {
      const result = await sendEmailViaEdge(payload);
      console.log('[Poste] email-send — succès', result);
      setSendStatus('success');
      await markAsTreated(selectedEmail);
      await fetchSentEmails();
      setReplyMode(false);
      setTimeout(() => { setSendStatus('idle'); setSendErrorDetail(null); }, 3000);
    } catch (error) {
      const detail = formatSendError(error);
      console.error('[Poste] email-send — échec', error);
      setSendStatus('error');
      setSendErrorDetail(detail);
    } finally {
      setSending(false);
    }
  };

  const sendNewEmail = async (to: string, cc: string, bcc: string, subject: string, body: string, attachments: Attachment[]) => {
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    setSendErrorDetail(null);
    console.log('[Poste] email-send (nouveau) — début', { to, from: activeAccount, subject });
    try {
      const result = await sendEmailViaEdge({
        to,
        subject,
        body,
        from: activeAccount,
        ...(cc.trim() && { cc: cc.trim() }),
        ...(bcc.trim() && { bcc: bcc.trim() }),
        attachments: attachments.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
          encoding: 'base64',
        })),
      });
      console.log('[Poste] email-send (nouveau) — succès', result);
      setSendStatus('success');
      await fetchSentEmails();
      setTimeout(() => { setSendStatus('idle'); setSendErrorDetail(null); setComposeMode(false); }, 2000);
    } catch (error) {
      const detail = formatSendError(error);
      console.error('[Poste] email-send (nouveau) — échec', error);
      setSendStatus('error');
      setSendErrorDetail(detail);
    } finally { setSending(false); }
  };

  const openThread = (thread: EmailThread) => {
    setSelectedEmail(thread.representativeEmail);
    setSelectedThreadKey(thread.key);
    setReplyMode(false);
    setSendStatus('idle');
    setSendErrorDetail(null);
  };

  const markThreadAsTreated = async (thread: EmailThread) => {
    const untreated = thread.inboxEmails.filter((x) => !x.Traité);
    if (!untreated.length) return;
    const ids = new Set(untreated.map((e) => e.id));

    setEmails((prev) => {
      const next = prev.map((e) => (ids.has(e.id) ? { ...e, Traité: true } : e));
      dispatchUntreatedEmailCount(countUntreatedInEmails(next));
      return next;
    });
    if (selectedEmail && ids.has(selectedEmail.id)) {
      setSelectedEmail((prev) => (prev ? { ...prev, Traité: true } : prev));
    }

    try {
      await Promise.all(
        untreated.map((e) => updateInboxEmail(e.id, { Traité: true }, { skipCountDispatch: true })),
      );
      const count = await refreshUntreatedEmailCount();
      dispatchUntreatedEmailCount(count);
    } catch (e) {
      console.error(e);
      await fetchEmails();
    }
  };

  const activeAccountData = ACCOUNTS.find(a => a.email === activeAccount)!;

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>

      {showTaskPopup && selectedEmail && (
        <TaskPopup
          email={selectedEmail}
          onConfirm={createTask}
          onClose={() => { if (!taskSubmitting) setShowTaskPopup(false); }}
          submitting={taskSubmitting}
        />
      )}
      {replyMode && selectedEmail && (
        <ReplyModal
          accountColor={activeAccountData.color}
          onSend={sendReply}
          onClose={() => { setReplyMode(false); setSendStatus('idle'); setSendErrorDetail(null); }}
          sending={sending}
          sendStatus={sendStatus}
          sendErrorDetail={sendErrorDetail}
        />
      )}
      {composeMode && (
        <ComposeModal
          activeAccount={activeAccount}
          accountColor={activeAccountData.color}
          onSend={sendNewEmail}
          onClose={() => { setComposeMode(false); setSendStatus('idle'); setSendErrorDetail(null); }}
          sending={sending}
          sendStatus={sendStatus}
          sendErrorDetail={sendErrorDetail}
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
                onClick={() => {
                  setActiveAccount(account.email);
                  setInboxMailboxTab('primary');
                  setSelectedEmail(null);
                  setSelectedThreadKey(null);
                  setSelectedSent(null);
                  setSelectedInboxIds([]);
                  setSelectedSentIds([]);
                }}
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
              <CheckCircle className="w-3 h-3" /> Tâche créée ✓
            </span>
          )}
          <button onClick={() => { setComposeMode(true); setSendStatus('idle'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`, color: '#05050a' }}>
            <Plus className="w-3.5 h-3.5" /> Nouveau mail
          </button>
          <button onClick={fetchEmails} disabled={refreshing}
            className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[#a0a0c0] hover:text-[var(--text-primary)] transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowMailList(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a0a0c0] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border)] transition-all"
            title={showMailList ? 'Masquer liste' : 'Afficher liste'}
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
          {viewMode === 'inbox' && selectedInboxIds.length > 0 && (
            <button onClick={deleteSelectedInbox}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Corbeille ({selectedInboxIds.length})
            </button>
          )}
          {viewMode === 'sent' && (
            <>
              {selectedSentIds.length > 0 && (
                <button onClick={deleteSelectedSent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Corbeille ({selectedSentIds.length})
                </button>
              )}
                <button onClick={cleanupOldSent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border)] text-[#a0a0c0] hover:text-[var(--text-primary)] transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Corbeille &gt; 30 jours
              </button>
            </>
          )}
          {viewMode === 'trash' && (
            <>
              {(selectedTrashInboxIds.length + selectedTrashSentIds.length) > 0 && (
                <button onClick={restoreSelectedTrash}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4caf7d]/10 border border-[#4caf7d]/20 text-[#4caf7d] hover:bg-[#4caf7d]/20 transition-all">
                  <CheckCircle className="w-3.5 h-3.5" /> Restaurer ({selectedTrashInboxIds.length + selectedTrashSentIds.length})
                </button>
              )}
              {(selectedTrashInboxIds.length + selectedTrashSentIds.length) > 0 && (
                <button onClick={deleteSelectedTrashPermanently}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer définitivement
                </button>
              )}
              {(trashedInbox.length + trashedSent.length) > 0 && (
                <button onClick={emptyTrash}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/15 border border-[#d95555]/35 text-[#ff8a8a] hover:bg-[#d95555]/25 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Vider la corbeille
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Layout liste + détail */}
      <div className="flex flex-1 overflow-hidden">

        {/* Liste emails */}
        {showMailList && (
        <div className="flex flex-col border-r border-[var(--border)] bg-[var(--bg-main)] shrink-0" style={{ width: '300px' }}>
          {/* Sous-onglets Reçus / Envoyés */}
          <div className="flex border-b border-[var(--border)] shrink-0">
            {(['inbox', 'sent', 'trash'] as const).map(mode => (
              <button key={mode} onClick={() => {
                setViewMode(mode);
                setInboxMailboxTab('primary');
                setSelectedEmail(null);
                setSelectedThreadKey(null);
                setSelectedSent(null);
                setSelectedInboxIds([]);
                setSelectedSentIds([]);
                setSelectedTrashInboxIds([]);
                setSelectedTrashSentIds([]);
              }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  viewMode === mode
                    ? 'text-[var(--text-primary)] border-b-[var(--gold-soft)]'
                    : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-primary)]'
                }`}>
                {mode === 'inbox' && <><Mail className="w-3.5 h-3.5" /> Reçus</>}
                {mode === 'sent' && <><SendHorizonal className="w-3.5 h-3.5" /> Envoyés</>}
                {mode === 'trash' && <><Trash2 className="w-3.5 h-3.5" /> Corbeille</>}
              </button>
            ))}
          </div>
          {viewMode === 'inbox' && (
            <div className="flex border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
              {([
                { id: 'all' as const, label: 'Tous' },
                { id: 'untreated' as const, label: 'Non traités' },
                { id: 'treated' as const, label: 'Traités' },
              ]).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setTreatmentFilter(tab.id); setSelectedEmail(null); setSelectedThreadKey(null); }}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide border-b-2 transition-all ${
                    treatmentFilter === tab.id
                      ? 'text-[var(--text-primary)] border-b-[#c9a84c]'
                      : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {viewMode === 'inbox' && (
            <div className="flex border-b border-[var(--border)] bg-[var(--bg-surface)]/50 shrink-0 px-1 gap-0.5">
              {([
                { id: 'primary' as const, label: 'Principale', icon: Inbox },
                { id: 'spam' as const, label: 'Spam', icon: Shield },
                { id: 'newsletters' as const, label: 'Newsletters', icon: Newspaper },
              ]).map(tab => {
                const Icon = tab.icon;
                const active = inboxMailboxTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setInboxMailboxTab(tab.id); setSelectedInboxIds([]); setSelectedEmail(null); setSelectedThreadKey(null); }}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-wide border-b-2 transition-all ${
                      active ? 'text-[var(--text-primary)] border-b-[#c9a84c]' : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {/* Vue Reçus */}
            {viewMode === 'inbox' && (loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
              </div>
            ) : inboxThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Mail className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">Aucun email</p>
              </div>
            ) : inboxThreads.map((thread) => {
              const isSelected = selectedThreadKey === thread.key;
              const statusDot = getThreadStatusDot(thread, sentEmails);
              const threadInboxIds = thread.inboxEmails.map((e) => e.id);
              const allSelected = threadInboxIds.length > 0 && threadInboxIds.every((id) => selectedInboxIds.includes(id));
              const hasUntreated = thread.inboxEmails.some((e) => !e.Traité);
              return (
                <button
                  key={thread.key}
                  type="button"
                  onClick={() => openThread(thread)}
                  className={`w-full text-left p-3 border-b border-[var(--border)]/50 transition-all hover:bg-[var(--bg-surface)] ${
                    isSelected ? 'bg-[var(--bg-card)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-2 w-2 h-2 rounded-full shrink-0"
                      style={{ background: threadDotColor(statusDot) }}
                      title={statusDot === 'green' ? 'Réponse envoyée' : statusDot === 'red' ? 'Sans réponse' : 'Traité'}
                    />
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedInboxIds((prev) => {
                          if (allSelected) return prev.filter((id) => !threadInboxIds.includes(id));
                          return [...new Set([...prev, ...threadInboxIds])];
                        });
                      }}
                      className="mt-2 h-3.5 w-3.5 accent-[#c9a84c]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-xs truncate ${hasUntreated ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
                          {formatSenderDisplay(thread.representativeEmail['Expéditeur'] || '')}
                        </p>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                          {formatRelativeDate(thread.latestDate)}
                        </span>
                      </div>
                      <p className={`text-xs truncate mb-0.5 ${hasUntreated ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {thread.subject}
                        {thread.messageCount > 1 ? ` (${thread.messageCount})` : ''}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {threadPreview(thread)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            }))}
            {/* Vue Envoyés */}
            {viewMode === 'sent' && (filteredSent.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <SendHorizonal className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">Aucun email envoyé</p>
              </div>
            ) : filteredSent.map(sent => {
              const isSelected = selectedSent?.id === sent.id;
              return (
                <button key={sent.id} onClick={() => setSelectedSent(sent)}
                  className={`w-full text-left p-3 border-b border-[var(--border)]/50 transition-all hover:bg-[var(--bg-surface)] ${isSelected ? 'bg-[var(--bg-card)] border-l-2' : ''}`}
                  style={isSelected ? { borderLeftColor: activeAccountData.color } : {}}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSentIds.includes(sent.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); toggleSentSelection(sent.id); }}
                      className="mt-1 h-3.5 w-3.5 accent-[#c9a84c]"
                    />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-[var(--text-primary)]">→ {sent['À']}</p>
                    <p className="text-xs truncate font-semibold text-[var(--text-secondary)] mb-0.5">{sent.Sujet || 'Sans sujet'}</p>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-[10px] text-[var(--text-muted)]">{formatDate(sent.Date)}</span>
                    </div>
                  </div>
                  </div>
                </button>
              );
            }))}
            {viewMode === 'trash' && ((trashedInbox.length + trashedSent.length) === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Trash2 className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">Corbeille vide</p>
              </div>
            ) : (
              <>
                {trashedInbox.map(email => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <button key={`trash-inbox-${email.id}`} onClick={() => { setSelectedEmail(email); setSelectedSent(null); }}
                      className={`w-full text-left p-3 border-b border-[var(--border)]/50 transition-all hover:bg-[var(--bg-surface)] ${isSelected ? 'bg-[var(--bg-card)] border-l-2' : ''}`}
                      style={isSelected ? { borderLeftColor: activeAccountData.color } : {}}>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTrashInboxIds.includes(email.id)}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); toggleTrashInboxSelection(email.id); }}
                          className="mt-2 h-3.5 w-3.5 accent-[#c9a84c]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-[#d95555] font-bold uppercase">Reçu</p>
                          <p className="text-xs font-semibold truncate text-[var(--text-primary)]">{email.Sujet || 'Sans sujet'}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{email['Expéditeur'] || '—'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {trashedSent.map(sent => {
                  const isSelected = selectedSent?.id === sent.id;
                  return (
                    <button key={`trash-sent-${sent.id}`} onClick={() => { setSelectedSent(sent); setSelectedEmail(null); }}
                      className={`w-full text-left p-3 border-b border-[var(--border)]/50 transition-all hover:bg-[var(--bg-surface)] ${isSelected ? 'bg-[var(--bg-card)] border-l-2' : ''}`}
                      style={isSelected ? { borderLeftColor: activeAccountData.color } : {}}>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTrashSentIds.includes(sent.id)}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); toggleTrashSentSelection(sent.id); }}
                          className="mt-2 h-3.5 w-3.5 accent-[#c9a84c]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-[#d95555] font-bold uppercase">Envoyé</p>
                          <p className="text-xs font-semibold truncate text-[var(--text-primary)]">{sent.Sujet || 'Sans sujet'}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">→ {sent['À'] || '—'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            ))}
          </div>
        </div>
        )}

        {/* Détail email */}
        <div className="flex-1 flex bg-[var(--bg-main)] overflow-hidden">
          {viewMode === 'trash' && !selectedEmail && !selectedSent && (
            <div className="flex flex-col items-center justify-center h-full gap-4 flex-1">
              <Trash2 className="w-10 h-10 text-[var(--text-muted)] opacity-20" />
              <p className="text-[var(--text-muted)] text-sm">Sélectionnez un email de la corbeille</p>
            </div>
          )}

          {/* Vue détail — Envoyés */}
          {(viewMode === 'sent' || (viewMode === 'trash' && !!selectedSent)) && (!selectedSent ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 flex-1">
              <SendHorizonal className="w-10 h-10 text-[var(--text-muted)] opacity-20" />
              <p className="text-[var(--text-muted)] text-sm">Sélectionnez un email envoyé</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
                <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">{selectedSent.Sujet || 'Sans sujet'}</h2>
                <div className="space-y-0.5 text-xs text-[var(--text-muted)]">
                  <p><span className="font-semibold">De :</span> {selectedSent.De}</p>
                  <p><span className="font-semibold">À :</span> {selectedSent['À']}</p>
                  {selectedSent.CC  && <p><span className="font-semibold">CC :</span>  {selectedSent.CC}</p>}
                  {selectedSent.BCC && <p><span className="font-semibold">BCC :</span> {selectedSent.BCC}</p>}
                  <p><span className="font-semibold">Date :</span> {formatDate(selectedSent.Date)}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{selectedSent.Corps}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Vue détail — Reçus */}
          {(viewMode === 'inbox' || (viewMode === 'trash' && !!selectedEmail)) && (!selectedEmail ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                <Mail className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-sm">Sélectionnez un email</p>
            </div>
          ) : (
            <>
            <div className="flex-1 flex flex-col h-full overflow-y-auto">

              <div className="sticky top-0 z-10 px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
                <div className="space-y-0.5 text-xs text-[var(--text-secondary)] mb-3">
                  <p>
                    <span className="text-[var(--text-muted)]">Expéditeur : </span>
                    {formatSenderDisplay(selectedEmail['Expéditeur'] || '')}
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">Sujet : </span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {selectedThread?.subject ?? displayThreadSubject(selectedEmail.Sujet || '')}
                    </span>
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">Date : </span>
                    {formatRelativeDate(selectedThread?.latestDate ?? selectedEmail['Date réception'])}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {viewMode === 'trash' ? (
                    <>
                      <button onClick={async () => {
                        await restoreInboxEmail(selectedEmail.id);
                        setEmails(prev => prev.map(e => e.id === selectedEmail.id ? { ...e, 'Supprimé le': null, folder: 'INBOX' } : e));
                        setSelectedEmail(null);
                      }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4caf7d]/20 border border-[#4caf7d]/30 text-[#4caf7d] hover:bg-[#4caf7d]/30 transition-all">
                        <CheckCircle className="w-3.5 h-3.5" /> Restaurer
                      </button>
                      <button onClick={async () => {
                        if (!confirm('Supprimer définitivement cet email ?')) return;
                        await notifyInboxDeletionSync([{ id: selectedEmail.id, accountEmail: selectedEmail.Compte }], 'hard_delete');
                        await fetchEmails();
                        setSelectedEmail(null);
                      }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer définitivement
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setReplyMode(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                        style={{ background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`, color: '#05050a' }}>
                        <Send className="w-3.5 h-3.5" /> Répondre
                      </button>
                      {selectedThread && !selectedThread.inboxEmails.every((e) => e.Traité) && (
                        <button type="button" onClick={() => markThreadAsTreated(selectedThread)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4caf7d]/20 border border-[#4caf7d]/30 text-[#4caf7d] hover:bg-[#4caf7d]/30 transition-all">
                          <CheckCircle className="w-3.5 h-3.5" /> Traité
                        </button>
                      )}
                      <button type="button" onClick={() => setShowTaskPopup(true)}
                        disabled={!!selectedEmail['Converti en tâche']}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50">
                        <Plus className="w-3.5 h-3.5" /> Tâche
                      </button>
                      <button type="button" onClick={() => deleteEmail(selectedEmail)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /> Corbeille
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {viewMode === 'trash' ? (
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
                    <MessageBody content={cleanContent(selectedEmail.Contenu)} />
                  </div>
                ) : (
                  threadMessages.map((msg) => (
                    <div key={msg.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
                      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                        <span className="font-medium text-[var(--text-primary)]">{msg.from}</span>
                        <span className="text-[var(--text-muted)]">{formatRelativeDate(msg.date)}</span>
                      </div>
                      <MessageBody content={msg.body} />
                    </div>
                  ))
                )}
              </div>
            </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
};
