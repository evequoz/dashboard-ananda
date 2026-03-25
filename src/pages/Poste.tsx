import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Inbox, Briefcase, RefreshCw, CheckCircle,
  AlertCircle, Clock, ChevronRight, Send, Plus,
  Eye, EyeOff, Sparkles, X, Paperclip, Trash2,
  FileText, ExternalLink, User, Users, Ban, SendHorizonal
} from 'lucide-react';

// Proxy n8n → évite les problèmes CORS avec l'API Systeme.io
const SYSTEME_PROXY = 'https://n8n.ananda-communaute.cloud/webhook/systeme-proxy';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const BASEROW_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_EMAILS    = 534;
const TABLE_TACHES    = 536;
const TABLE_SENT      = 0;   // ⚠️ Remplacer par l'ID Baserow de ta table emails_envoyes
const TABLE_BLACKLIST = 0;   // ⚠️ Remplacer par l'ID Baserow de ta table blacklist
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
  'Fichier': BaserowFile[];
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
}

interface BlacklistEntry {
  id: number;
  Email: string;
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

// ── Modal Répondre ──
interface ReplyModalProps {
  email: Email;
  accountColor: string;
  onSend: (text: string, cc: string, bcc: string, attachments: Attachment[]) => void;
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
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const selectSuggestion = (idx: number) => { setActiveTab(idx); setText(suggestions[idx].value); };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '820px', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="px-6 pt-4 pb-0 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between mb-3">
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
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCc(v => !v)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${showCc ? 'bg-[var(--border)] text-[var(--text-primary)] border-[var(--border)]' : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'}`}>
                CC
              </button>
              <button onClick={() => setShowBcc(v => !v)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${showBcc ? 'bg-[var(--border)] text-[var(--text-primary)] border-[var(--border)]' : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'}`}>
                BCC
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {showCc && (
            <div className="flex items-center gap-3 border-t border-[var(--border)] py-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] w-14 shrink-0">CC</span>
              <input value={cc} onChange={e => setCc(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                placeholder="copie@email.com, autre@email.com" />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center gap-3 border-t border-[var(--border)] py-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] w-14 shrink-0">BCC</span>
              <input value={bcc} onChange={e => setBcc(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                placeholder="copie-cachée@email.com" />
            </div>
          )}
        </div>

        {/* Suggestions IA */}
        {suggestions.length > 0 && (
          <div className="px-6 pt-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#7b5ea7]" />
              <span className="text-xs font-bold text-[#9b7ec7]">Suggestions IA — dans ton style</span>
            </div>
            <div className="flex gap-2 mb-3">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => selectSuggestion(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    activeTab === i
                      ? 'bg-[#7b5ea7]/30 border-[#7b5ea7]/50 text-[#9b7ec7]'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="p-4 bg-[var(--bg-surface)] border border-[#7b5ea7]/20 rounded-xl mb-3 max-h-36 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#7b5ea7] uppercase tracking-wider">{suggestions[activeTab]?.label}</span>
                <button onClick={() => setText(suggestions[activeTab].value)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#7b5ea7]/20 border border-[#7b5ea7]/30 text-[#7b5ea7] hover:bg-[#7b5ea7]/40 transition-all">
                  Utiliser <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {suggestions[activeTab]?.value}
              </p>
            </div>
          </div>
        )}

        {/* Zone d'écriture */}
        <div className="flex-1 px-6 pb-2 min-h-0">
          <textarea value={text} onChange={e => setText(e.target.value)}
            className="w-full h-full min-h-[180px] bg-[var(--bg-main)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[#c9a84c]/40 transition-all leading-relaxed"
            placeholder="Rédigez ou modifiez votre réponse..." autoFocus />
        </div>

        {/* Pièces jointes */}
        <div className="px-6 pb-2 shrink-0">
          <AttachmentPicker attachments={attachments} onChange={setAttachments} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0">
          <div>
            {sendStatus === 'success' && <span className="text-xs text-[#4caf7d] flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Envoyé</span>}
            {sendStatus === 'error' && <span className="text-xs text-[#d95555] flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Erreur d'envoi</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all">Annuler</button>
            <button onClick={() => onSend(text, cc, bcc, attachments)} disabled={sending || !text.trim()}
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

// ── Modal Nouveau mail ──
interface ComposeModalProps {
  activeAccount: string;
  accountColor: string;
  onSend: (to: string, cc: string, bcc: string, subject: string, body: string, attachments: Attachment[]) => void;
  onClose: () => void;
  sending: boolean;
  sendStatus: 'idle' | 'success' | 'error';
}
const ComposeModal = ({ activeAccount, accountColor, onSend, onClose, sending, sendStatus }: ComposeModalProps) => {
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0">
          <div>
            {sendStatus === 'success' && <span className="text-xs text-[#4caf7d] flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Envoyé !</span>}
            {sendStatus === 'error' && <span className="text-xs text-[#d95555] flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Erreur d'envoi</span>}
          </div>
          <div className="flex gap-3">
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

// ── Panneau contact Systeme.io ──
interface SysContact { id: number; email: string; firstName?: string; lastName?: string; phone?: string; tags?: Array<{ id: number; name: string }>; createdAt?: string; [k: string]: any; }

const ContactSidePanel = ({ senderRaw }: { senderRaw: string }) => {
  const [contact, setContact] = useState<SysContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setContact(null); setNotFound(false); setLoading(true);
    const match = senderRaw.match(/<(.+?)>/);
    const email = (match ? match[1] : senderRaw).trim();
    if (!email) { setLoading(false); setNotFound(true); return; }
    fetch(`${SYSTEME_PROXY}?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => {
        if (d.items && d.items.length > 0) setContact(d.items[0]);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [senderRaw]);

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const name = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email : '';

  return (
    <div className="w-56 shrink-0 border-l border-[var(--border)] bg-[var(--bg-surface)] flex flex-col overflow-y-auto">
      <div className="px-3 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#c9a84c]" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Contact</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
        </div>
      )}

      {!loading && notFound && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 px-3">
          <User className="w-7 h-7 text-[var(--text-muted)] opacity-40" />
          <p className="text-[10px] text-[var(--text-muted)] text-center">Contact inconnu dans Systeme.io</p>
        </div>
      )}

      {!loading && contact && (
        <div className="px-3 py-3 space-y-3">
          {/* Avatar + nom */}
          <div className="flex flex-col items-center gap-2 pb-3 border-b border-[var(--border)]">
            <div className="w-10 h-10 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-sm font-bold text-[#c9a84c]">
              {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{name}</p>
              <p className="text-[10px] text-[var(--text-muted)] break-all mt-0.5">{contact.email}</p>
            </div>
          </div>

          {/* Infos */}
          <div className="space-y-1.5">
            {contact.phone && (
              <div>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Téléphone</p>
                <p className="text-[10px] text-[var(--text-primary)]">{contact.phone}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Inscrit</p>
              <p className="text-[10px] text-[var(--text-primary)]">{fmtDate(contact.createdAt)}</p>
            </div>
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {contact.tags.slice(0, 6).map(t => (
                  <span key={t.id} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-[#7b5ea7]/15 text-[#9b7ec7] border border-[#7b5ea7]/20 leading-tight">
                    {t.name}
                  </span>
                ))}
                {contact.tags.length > 6 && <span className="text-[9px] text-[var(--text-muted)]">+{contact.tags.length - 6}</span>}
              </div>
            </div>
          )}

          {/* Lien Systeme.io */}
          <a href={`https://app.systeme.io/contacts/${contact.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <ExternalLink className="w-3 h-3" /> Voir dans Systeme.io
          </a>
        </div>
      )}
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
  const [composeMode, setComposeMode] = useState(false);
  const [viewMode, setViewMode] = useState<'inbox' | 'sent'>('inbox');
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [selectedSent, setSelectedSent] = useState<SentEmail | null>(null);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const replyModeRef = useRef(false);
  replyModeRef.current = replyMode;

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

  const fetchSentEmails = useCallback(async () => {
    if (!TABLE_SENT) return;
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_SENT}/?user_field_names=true&size=200`, { headers: HEADERS });
      const data = await res.json();
      setSentEmails((data.results || []).reverse());
    } catch (e) { console.error(e); }
  }, []);

  const fetchBlacklist = useCallback(async () => {
    if (!TABLE_BLACKLIST) return;
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_BLACKLIST}/?user_field_names=true&size=500`, { headers: HEADERS });
      const data = await res.json();
      setBlacklist(data.results || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchEmails(); fetchBlacklist(); fetchSentEmails(); }, [fetchEmails, fetchBlacklist, fetchSentEmails]);
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

  const filteredEmails = emails.filter(e =>
    e.Compte === activeAccount && (showTreated ? true : !e.Traité)
  );
  const filteredSent = sentEmails.filter(e => e.Compte === activeAccount);

  const unreadCount = (acc: string) => emails.filter(e => e.Compte === acc && !e.Traité).length;
  const totalUnread = emails.filter(e => !e.Traité).length;
  const isBlocked = (sender: string) => {
    const email = sender.match(/<(.+?)>/)?.[1] || sender;
    return blacklist.some(b => b.Email.toLowerCase() === email.toLowerCase());
  };

  const markAsTreated = async (email: Email) => {
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/?user_field_names=true`,
        { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ Traité: true }) });
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, Traité: true } : e));
      if (selectedEmail?.id === email.id) setSelectedEmail({ ...email, Traité: true });
    } catch (e) { console.error(e); }
  };

  // Suppression avec confirmation (bouton)
  const deleteEmail = async (email: Email) => {
    if (!confirm(`Supprimer ?\n"${email.Sujet}"`)) return;
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/`,
        { method: 'DELETE', headers: HEADERS });
      setEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedEmail?.id === email.id) setSelectedEmail(null);
    } catch (e) { console.error(e); }
  };

  // Suppression directe (touche Delete) sans confirm
  const deleteEmailDirect = async (email: Email) => {
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/${email.id}/`,
        { method: 'DELETE', headers: HEADERS });
      setEmails(prev => prev.filter(e => e.id !== email.id));
      setSelectedEmail(null);
    } catch (e) { console.error(e); }
  };

  // Sauvegarder un email envoyé dans Baserow
  const saveToSent = async (from: string, to: string, cc: string, bcc: string, subject: string, body: string) => {
    if (!TABLE_SENT) return;
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_SENT}/?user_field_names=true`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ De: from, 'À': to, CC: cc, BCC: bcc, Sujet: subject, Corps: body, Date: new Date().toISOString(), Compte: from }),
      });
      fetchSentEmails();
    } catch (e) { console.error(e); }
  };

  // Bloquer un expéditeur
  const blockSender = async (email: Email) => {
    if (!TABLE_BLACKLIST) { alert('Table blacklist non configurée (voir TABLE_BLACKLIST dans Poste.tsx)'); return; }
    const raw = email['Expéditeur'] || '';
    const addr = raw.match(/<(.+?)>/)?.[1] || raw;
    if (isBlocked(raw)) { alert(`${addr} est déjà bloqué.`); return; }
    if (!confirm(`Bloquer ${addr} ?\nSes prochains emails ne seront plus importés.`)) return;
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_BLACKLIST}/?user_field_names=true`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ Email: addr, Nom: raw.replace(/<.*>/, '').replace(/"/g, '').trim(), 'Bloqué le': new Date().toISOString() }),
      });
      const entry: BlacklistEntry = await res.json();
      setBlacklist(prev => [...prev, entry]);
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

  const sendReply = async (text: string, cc: string, bcc: string, attachments: Attachment[] = []) => {
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
          ...(cc.trim()  && { cc:  cc.trim()  }),
          ...(bcc.trim() && { bcc: bcc.trim() }),
          attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
            encoding: 'base64',
          })),
        }),
      });
      setSendStatus('success');
      await markAsTreated(selectedEmail);
      await saveToSent(selectedEmail.Compte, selectedEmail['Expéditeur'], cc, bcc, `Re: ${selectedEmail.Sujet || ''}`, text);
      setReplyMode(false);
      setTimeout(() => setSendStatus('idle'), 3000);
    } catch {
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 3000);
    } finally { setSending(false); }
  };

  const sendNewEmail = async (to: string, cc: string, bcc: string, subject: string, body: string, attachments: Attachment[]) => {
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    try {
      await fetch(N8N_SEND_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body,
          from: activeAccount,
          ...(cc.trim()  && { cc:  cc.trim()  }),
          ...(bcc.trim() && { bcc: bcc.trim() }),
          attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
            encoding: 'base64',
          })),
        }),
      });
      setSendStatus('success');
      await saveToSent(activeAccount, to, cc, bcc, subject, body);
      setTimeout(() => { setSendStatus('idle'); setComposeMode(false); }, 2000);
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
      {composeMode && (
        <ComposeModal
          activeAccount={activeAccount}
          accountColor={activeAccountData.color}
          onSend={sendNewEmail}
          onClose={() => { setComposeMode(false); setSendStatus('idle'); }}
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
          <button onClick={() => { setComposeMode(true); setSendStatus('idle'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${activeAccountData.color}, ${activeAccountData.color}cc)`, color: '#05050a' }}>
            <Plus className="w-3.5 h-3.5" /> Nouveau mail
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
          {/* Sous-onglets Reçus / Envoyés */}
          <div className="flex border-b border-[var(--border)] shrink-0">
            {(['inbox', 'sent'] as const).map(mode => (
              <button key={mode} onClick={() => { setViewMode(mode); setSelectedEmail(null); setSelectedSent(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  viewMode === mode
                    ? 'text-[var(--text-primary)] border-b-[var(--gold-soft)]'
                    : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-primary)]'
                }`}>
                {mode === 'inbox' ? <><Mail className="w-3.5 h-3.5" /> Reçus</> : <><SendHorizonal className="w-3.5 h-3.5" /> Envoyés</>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Vue Reçus */}
            {viewMode === 'inbox' && (loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Mail className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">Aucun email</p>
              </div>
            ) : filteredEmails.map(email => {
              const isSelected = selectedEmail?.id === email.id;
              const emailFiles: BaserowFile[] = email['Fichier'] || [];
              const blocked = isBlocked(email['Expéditeur'] || '');
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
                        <p className={`text-xs font-bold truncate ${!email.Traité ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                          {email['Expéditeur']?.replace(/<.*>/, '').replace(/"/g, '').trim() || 'Inconnu'}
                        </p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {blocked && <Ban className="w-3 h-3 text-[#d95555]" title="Bloqué" />}
                          {emailFiles.length > 0 && <Paperclip className="w-3 h-3 text-[var(--text-muted)]" />}
                          {hasSuggestions(email) && <Sparkles className="w-3 h-3 text-[#7b5ea7]" />}
                          {email['Action requise'] && <AlertCircle className="w-3 h-3 text-[#d95555]" />}
                          {email.Traité && <CheckCircle className="w-3 h-3 text-[#4caf7d]" />}
                        </div>
                      </div>
                      <p className={`text-xs truncate mb-0.5 font-semibold ${!email.Traité ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        {email.Sujet || 'Sans sujet'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {email['Résumé IA'] || '—'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                        <span className="text-[10px] text-[var(--text-muted)]">{formatDate(email['Date réception'])}</span>
                      </div>
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
                {!TABLE_SENT && <p className="text-[10px] text-[#d95555] text-center px-4">⚠️ Configurer TABLE_SENT dans Poste.tsx</p>}
              </div>
            ) : filteredSent.map(sent => {
              const isSelected = selectedSent?.id === sent.id;
              return (
                <button key={sent.id} onClick={() => setSelectedSent(sent)}
                  className={`w-full text-left p-3 border-b border-[var(--border)]/50 transition-all hover:bg-[var(--bg-surface)] ${isSelected ? 'bg-[var(--bg-card)] border-l-2' : ''}`}
                  style={isSelected ? { borderLeftColor: activeAccountData.color } : {}}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-[var(--text-primary)]">→ {sent['À']}</p>
                    <p className="text-xs truncate font-semibold text-[var(--text-secondary)] mb-0.5">{sent.Sujet || 'Sans sujet'}</p>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-[10px] text-[var(--text-muted)]">{formatDate(sent.Date)}</span>
                    </div>
                  </div>
                </button>
              );
            }))}
          </div>
        </div>

        {/* Détail email */}
        <div className="flex-1 flex bg-[var(--bg-main)] overflow-hidden">

          {/* Vue détail — Envoyés */}
          {viewMode === 'sent' && (!selectedSent ? (
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
          {viewMode === 'inbox' && (!selectedEmail ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                <Mail className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-sm">Sélectionnez un email</p>
            </div>
          ) : (
            <>
            <div className="flex-1 flex flex-col h-full overflow-hidden">

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
                  <button onClick={() => blockSender(selectedEmail)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      isBlocked(selectedEmail['Expéditeur'] || '')
                        ? 'bg-[#d95555]/20 border-[#d95555]/40 text-[#d95555] cursor-default'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[#d95555]/10 hover:border-[#d95555]/30 hover:text-[#d95555]'
                    }`}>
                    <Ban className="w-3.5 h-3.5" />
                    {isBlocked(selectedEmail['Expéditeur'] || '') ? 'Bloqué' : 'Bloquer'}
                  </button>
                  <button onClick={() => deleteEmail(selectedEmail)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>

              {/* Corps */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Résumé IA */}
                <div className="bg-[var(--bg-card)] rounded-xl border border-[#c9a84c]/25 p-5">
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
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
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
                          <p className="text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
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
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
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
            <ContactSidePanel senderRaw={selectedEmail['Expéditeur'] || ''} />
            </>
          ))}
        </div>
      </div>
    </div>
  );
};
