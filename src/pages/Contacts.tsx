import { useState, useCallback } from 'react';
import {
  Search, User, Mail, Phone, Calendar, ExternalLink,
  X, Loader2, Users, ChevronRight, Send, RefreshCw,
  CheckCircle, AlertCircle,
} from 'lucide-react';

const SYSTEME_BASE   = 'https://api.systeme.io/api';
const SYSTEME_KEY    = import.meta.env.VITE_SYSTEME_API_KEY || '';
const N8N_WEBHOOK    = 'https://n8n.ananda-communaute.cloud/webhook/send-email';
const SYSTEME_HDR    = { 'X-API-Key': SYSTEME_KEY, 'Content-Type': 'application/json' };
const ACCOUNTS       = ['serge@eh-me.com', 'admin@eh-me.com', 'serge@seme.ch'];

// ── Types ──────────────────────────────────────────────────────────
interface SysContact {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: string;
  registrationSource?: string;
  fields?: Array<{ id: number; slug: string; value: any }>;
  tags?: Array<{ id: number; name: string }>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// ── Helpers ────────────────────────────────────────────────────────
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const fullName = (c: SysContact) =>
  [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;

const initials = (c: SysContact) =>
  (c.firstName?.[0] || c.email[0]).toUpperCase();

// ── Modal envoi rapide ─────────────────────────────────────────────
const QuickComposeModal = ({ to, onClose }: { to: string; onClose: () => void }) => {
  const [from, setFrom] = useState(ACCOUNTS[0]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, from, attachments: [] }),
      });
      setStatus('success');
      setTimeout(() => { setStatus('idle'); onClose(); }, 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 680, maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
              <Send className="w-4 h-4 text-[#c9a84c]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Nouveau mail</h3>
              <p className="text-xs text-[var(--text-muted)]">→ {to}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Champs */}
        <div className="px-6 pt-4 space-y-0 shrink-0">
          <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-16 shrink-0">Depuis</span>
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none">
              {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-16 shrink-0">Sujet</span>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} autoFocus
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0">
          <div>
            {status === 'success' && <span className="text-xs text-[#4caf7d] flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Envoyé !</span>}
            {status === 'error'   && <span className="text-xs text-[#d95555] flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Erreur d'envoi</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all">
              Annuler
            </button>
            <button onClick={send} disabled={sending || !body.trim()}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] hover:scale-105 transition-all disabled:opacity-40">
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Carte résultat ─────────────────────────────────────────────────
const ContactCard = ({ contact, isSelected, onSelect }: {
  contact: SysContact;
  isSelected: boolean;
  onSelect: () => void;
}) => (
  <button onClick={onSelect}
    className={`w-full text-left rounded-xl p-4 transition-all border ${
      isSelected
        ? 'border-[#c9a84c]/50 bg-[#c9a84c]/08'
        : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[#c9a84c]/30 hover:bg-[var(--card-hover)]'
    }`}>
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/25 flex items-center justify-center text-sm font-bold text-[#c9a84c] shrink-0">
        {initials(contact)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{fullName(contact)}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">{contact.email}</p>
        {contact.phone && <p className="text-xs text-[var(--text-muted)] mt-0.5">{contact.phone}</p>}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.slice(0, 4).map(t => (
              <span key={t.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#7b5ea7]/15 text-[#9b7ec7] border border-[#7b5ea7]/20">
                {t.name}
              </span>
            ))}
            {contact.tags.length > 4 && (
              <span className="text-[10px] text-[var(--text-muted)]">+{contact.tags.length - 4}</span>
            )}
          </div>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Inscrit le {fmtDate(contact.createdAt)}
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-colors ${isSelected ? 'text-[#c9a84c]' : 'text-[var(--text-muted)]'}`} />
    </div>
  </button>
);

// ── Fiche détaillée ────────────────────────────────────────────────
const ContactDetail = ({ contact, onClose, onCompose }: {
  contact: SysContact;
  onClose: () => void;
  onCompose: (email: string) => void;
}) => {
  const FIELDS_INFO = [
    { label: 'Email',        value: contact.email },
    { label: 'Téléphone',   value: contact.phone },
    { label: 'Prénom',      value: contact.firstName },
    { label: 'Nom',         value: contact.lastName },
    { label: 'Locale',      value: contact.locale },
    { label: 'Source',      value: contact.registrationSource },
    { label: 'Inscrit le',  value: fmtDate(contact.createdAt) },
    { label: 'Mis à jour',  value: fmtDate(contact.updatedAt) },
  ].filter(f => f.value && f.value !== '—');

  const customFields = (contact.fields || []).filter(f => f.value !== null && f.value !== '');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Fiche contact</h3>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Avatar + actions */}
        <div className="flex flex-col items-center gap-3 pb-5 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-full bg-[#c9a84c]/15 border-2 border-[#c9a84c]/30 flex items-center justify-center text-2xl font-bold text-[#c9a84c]">
            {initials(contact)}
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[var(--text-primary)]">{fullName(contact)}</p>
            <p className="text-sm text-[var(--text-muted)]">{contact.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={() => onCompose(contact.email)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#c9a84c] hover:from-[#c9a84c]/30 transition-all">
              <Mail className="w-3.5 h-3.5" /> Envoyer un email
            </button>
            <a href={`https://app.systeme.io/contacts/${contact.id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Voir dans Systeme.io
            </a>
          </div>
        </div>

        {/* Infos principales */}
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Informations</p>
          <div className="space-y-0">
            {FIELDS_INFO.map(f => (
              <div key={f.label} className="flex items-start gap-3 py-2 border-b border-[var(--border)]/50">
                <span className="text-xs text-[var(--text-muted)] w-24 shrink-0 mt-0.5">{f.label}</span>
                <span className="text-xs text-[var(--text-primary)] flex-1 break-all">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Tags ({contact.tags.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map(t => (
                <span key={t.id} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#7b5ea7]/15 text-[#9b7ec7] border border-[#7b5ea7]/20">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Champs personnalisés */}
        {customFields.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Champs personnalisés
            </p>
            <div className="space-y-0">
              {customFields.map(f => (
                <div key={f.slug} className="flex items-start gap-3 py-2 border-b border-[var(--border)]/50">
                  <span className="text-xs text-[var(--text-muted)] w-24 shrink-0 capitalize mt-0.5">
                    {f.slug.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[var(--text-primary)] flex-1 break-all">{String(f.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ID Systeme */}
        <p className="text-[10px] text-[var(--text-muted)] font-mono">ID Systeme.io : #{contact.id}</p>
      </div>
    </div>
  );
};

// ── Page principale ────────────────────────────────────────────────
export const Contacts = () => {
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<SysContact[]>([]);
  const [selected, setSelected]         = useState<SysContact | null>(null);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [composeTarget, setComposeTarget] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    setResults([]);
    try {
      const isEmail = q.includes('@');
      const param   = isEmail ? `email=${encodeURIComponent(q)}` : `firstName=${encodeURIComponent(q)}`;
      const res     = await fetch(`${SYSTEME_BASE}/contacts?${param}`, { headers: SYSTEME_HDR });
      if (!res.ok) throw new Error(`Erreur API Systeme.io : ${res.status}`);
      const data = await res.json();
      setResults(data.items || []);
      setSearched(true);
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion à Systeme.io');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="-m-8 flex" style={{ height: 'calc(100vh - 80px)' }}>
      {composeTarget && (
        <QuickComposeModal to={composeTarget} onClose={() => setComposeTarget(null)} />
      )}

      {/* ── Colonne gauche : recherche + résultats ── */}
      <div className={`flex flex-col border-r border-[var(--border)] bg-[var(--bg-main)] transition-all shrink-0 ${
        selected ? 'w-[420px]' : 'w-full'
      }`}>
        {/* En-tête */}
        <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#c9a84c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Contacts</h2>
              <p className="text-xs text-[var(--text-muted)]">Connecté à Systeme.io</p>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search(query)}
                placeholder="Email complet ou prénom..."
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#c9a84c]/50 transition-all"
              />
            </div>
            <button onClick={() => search(query)} disabled={loading || query.trim().length < 2}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#c9a84c] hover:from-[#c9a84c]/30 transition-all disabled:opacity-40">
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Search className="w-4 h-4" /> Chercher</>
              }
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Tape un email complet ou un prénom, puis appuie sur Entrée
          </p>
        </div>

        {/* Résultats */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div className="p-4 bg-[#d95555]/10 border border-[#d95555]/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#d95555] shrink-0 mt-0.5" />
              <p className="text-sm text-[#d95555]">{error}</p>
            </div>
          )}

          {!loading && searched && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <User className="w-10 h-10 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Aucun contact trouvé</p>
              <p className="text-xs text-[var(--text-muted)]">Essaie avec un email complet ou un prénom exact</p>
            </div>
          )}

          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-12 h-12 text-[var(--text-muted)] opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">Lance une recherche pour trouver un contact</p>
            </div>
          )}

          {results.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              isSelected={selected?.id === c.id}
              onSelect={() => setSelected(c)}
            />
          ))}

          {results.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center pt-1">
              {results.length} contact{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Colonne droite : fiche détaillée ── */}
      {selected && (
        <div className="flex-1 bg-[var(--bg-card)] border-l border-[var(--border)] overflow-hidden">
          <ContactDetail
            contact={selected}
            onClose={() => setSelected(null)}
            onCompose={email => setComposeTarget(email)}
          />
        </div>
      )}
    </div>
  );
};
