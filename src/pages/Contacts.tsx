import { useState, useCallback, useEffect } from 'react';
import {
  Search, User, Mail, Phone, Calendar, ExternalLink,
  X, Loader2, Users, ChevronRight, Send, RefreshCw,
  CheckCircle, AlertCircle, Plus, Pencil, Trash2,
  Building2, Tag, FileText, Cloud, Clock, Inbox,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────
const SYSTEME_PROXY     = 'https://n8n.ananda-communaute.cloud/webhook/systeme-proxy';
const N8N_WEBHOOK       = 'https://n8n.ananda-communaute.cloud/webhook/send-email';
const BASEROW_URL       = 'https://baserow.ananda-communaute.cloud/api';
const BASEROW_TOKEN     = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_ADMIN       = 544; // contacts_admin
const N8N_GOOGLE_SYNC   = 'https://n8n.ananda-communaute.cloud/webhook/sync-google-contacts';
const TABLE_EMAILS      = 534;
const TABLE_SENT        = 0;   // ⚠️ Remplacer par l'ID Baserow de emails_envoyes
const ACCOUNTS          = ['serge@eh-me.com', 'admin@eh-me.com', 'serge@seme.ch'];
const CATEGORIES        = ['Fournisseur', 'Partenaire', 'Admin', 'Comptable', 'Autre'];
const HEADERS           = { Authorization: `Token ${BASEROW_TOKEN}`, 'Content-Type': 'application/json' };

// ── Interfaces ────────────────────────────────────────────────────
interface SysContact {
  id: number; email: string; firstName?: string; lastName?: string;
  phone?: string; locale?: string; registrationSource?: string;
  fields?: Array<{ id: number; slug: string; value: any }>;
  tags?: Array<{ id: number; name: string }>;
  createdAt?: string; updatedAt?: string; [key: string]: any;
}

interface AdminContact {
  id: number;
  Prénom: string; Nom: string; Email: string; Téléphone: string;
  Entreprise: string; Catégorie: { value: string } | null;
  Notes: string; 'Date création': string;
}

interface EmailRecord { id: number; Sujet: string; 'Date réception': string; Traité: boolean; }
interface SentRecord  { id: number; Sujet: string; Date: string; 'À': string; }

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';

const sysName     = (c: SysContact)   => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
const sysInitials = (c: SysContact)   => (c.firstName?.[0] || c.email[0]).toUpperCase();
const adminName   = (c: AdminContact) => [c.Prénom, c.Nom].filter(Boolean).join(' ') || c.Email;
const adminInit   = (c: AdminContact) => (c.Prénom?.[0] || c.Email?.[0] || '?').toUpperCase();
const getCatColor = (cat: string) => ({
  Fournisseur: '#c9a84c', Partenaire: '#4caf7d', Admin: '#7b5ea7',
  Comptable: '#4b9cd3', Autre: '#a0a0c0',
}[cat] ?? '#a0a0c0');

// ── QuickComposeModal ─────────────────────────────────────────────
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, from, attachments: [] }),
      });
      setStatus('success');
      setTimeout(() => { setStatus('idle'); onClose(); }, 2000);
    } catch { setStatus('error'); setTimeout(() => setStatus('idle'), 3000); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col" style={{ width: 680, maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
              <Send className="w-4 h-4 text-[#c9a84c]" />
            </div>
            <div><h3 className="text-sm font-bold text-[var(--text-primary)]">Nouveau mail</h3>
              <p className="text-xs text-[var(--text-muted)]">→ {to}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-16 shrink-0">Depuis</span>
            <select value={from} onChange={e => setFrom(e.target.value)} className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none">
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
        <div className="flex-1 px-6 py-3 min-h-0">
          <textarea value={body} onChange={e => setBody(e.target.value)}
            className="w-full h-full min-h-[200px] bg-transparent text-sm text-[var(--text-primary)] resize-none focus:outline-none leading-relaxed placeholder:text-[var(--text-muted)]"
            placeholder="Rédigez votre message..." />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0">
          <div>
            {status === 'success' && <span className="text-xs text-[#4caf7d] flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Envoyé !</span>}
            {status === 'error'   && <span className="text-xs text-[#d95555] flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Erreur d'envoi</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all">Annuler</button>
            <button onClick={send} disabled={sending || !body.trim()}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] hover:from-[#c9a84c]/30 transition-all disabled:opacity-40">
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
// ONGLET COMMUNAUTÉ — Systeme.io
// ════════════════════════════════════════════════════════
const SysContactCard = ({ contact, isSelected, onSelect }: { contact: SysContact; isSelected: boolean; onSelect: () => void }) => (
  <button onClick={onSelect} className={`w-full text-left rounded-xl p-4 transition-all border ${
    isSelected ? 'border-[#c9a84c]/50 bg-[#c9a84c]/08' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[#c9a84c]/30 hover:bg-[var(--card-hover)]'
  }`}>
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/25 flex items-center justify-center text-sm font-bold text-[#c9a84c] shrink-0">
        {sysInitials(contact)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{sysName(contact)}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">{contact.email}</p>
        {contact.phone && <p className="text-xs text-[var(--text-muted)] mt-0.5">{contact.phone}</p>}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.slice(0, 4).map(t => (
              <span key={t.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#7b5ea7]/15 text-[#9b7ec7] border border-[#7b5ea7]/20">{t.name}</span>
            ))}
            {contact.tags.length > 4 && <span className="text-[10px] text-[var(--text-muted)]">+{contact.tags.length - 4}</span>}
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

const SysContactDetail = ({ contact, onClose, onCompose }: { contact: SysContact; onClose: () => void; onCompose: (e: string) => void }) => {
  const fields = [
    { label: 'Email',       value: contact.email },
    { label: 'Téléphone',  value: contact.phone },
    { label: 'Prénom',     value: contact.firstName },
    { label: 'Nom',        value: contact.lastName },
    { label: 'Locale',     value: contact.locale },
    { label: 'Source',     value: contact.registrationSource },
    { label: 'Inscrit le', value: fmtDate(contact.createdAt) },
    { label: 'Mis à jour', value: fmtDate(contact.updatedAt) },
  ].filter(f => f.value && f.value !== '—');
  const customFields = (contact.fields || []).filter(f => f.value !== null && f.value !== '');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Fiche Systeme.io</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="flex flex-col items-center gap-3 pb-5 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-full bg-[#c9a84c]/15 border-2 border-[#c9a84c]/30 flex items-center justify-center text-2xl font-bold text-[#c9a84c]">{sysInitials(contact)}</div>
          <div className="text-center">
            <p className="text-base font-bold text-[var(--text-primary)]">{sysName(contact)}</p>
            <p className="text-sm text-[var(--text-muted)]">{contact.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={() => onCompose(contact.email)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#c9a84c]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] hover:bg-[#c9a84c]/30 transition-all">
              <Mail className="w-3.5 h-3.5" /> Envoyer un email
            </button>
            <a href={`https://app.systeme.io/contacts/${contact.id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Voir dans Systeme.io
            </a>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Informations</p>
          <div className="space-y-0">
            {fields.map(f => (
              <div key={f.label} className="flex items-start gap-3 py-2 border-b border-[var(--border)]/50">
                <span className="text-xs text-[var(--text-muted)] w-24 shrink-0 mt-0.5">{f.label}</span>
                <span className="text-xs text-[var(--text-primary)] flex-1 break-all">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
        {contact.tags && contact.tags.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Tags ({contact.tags.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map(t => (
                <span key={t.id} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#7b5ea7]/15 text-[#9b7ec7] border border-[#7b5ea7]/20">{t.name}</span>
              ))}
            </div>
          </div>
        )}
        {customFields.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Champs personnalisés</p>
            <div className="space-y-0">
              {customFields.map(f => (
                <div key={f.slug} className="flex items-start gap-3 py-2 border-b border-[var(--border)]/50">
                  <span className="text-xs text-[var(--text-muted)] w-24 shrink-0 capitalize mt-0.5">{f.slug.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-[var(--text-primary)] flex-1 break-all">{String(f.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[10px] text-[var(--text-muted)] font-mono">ID Systeme.io : #{contact.id}</p>
      </div>
    </div>
  );
};

const CommunauteTab = ({ onCompose }: { onCompose: (email: string) => void }) => {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<SysContact[]>([]);
  const [selected, setSelected] = useState<SysContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true); setError(null); setSelected(null); setResults([]);
    try {
      const isEmail = q.includes('@');
      const param   = isEmail ? `email=${encodeURIComponent(q)}` : `firstName=${encodeURIComponent(q)}`;
      const res = await fetch(`${SYSTEME_PROXY}?${param}`);
      if (!res.ok) throw new Error(`Erreur API : ${res.status}`);
      const data = await res.json();
      setResults(data.items || []); setSearched(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={`flex flex-col border-r border-[var(--border)] bg-[var(--bg-main)] transition-all shrink-0 ${selected ? 'w-[420px]' : 'w-full'}`}>
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search(query)}
                placeholder="Email complet ou prénom..."
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
            </div>
            <button onClick={() => search(query)} disabled={loading || query.trim().length < 2}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#c9a84c]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] hover:bg-[#c9a84c]/30 transition-all disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" /> Chercher</>}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Tape un email complet ou un prénom, puis Entrée</p>
        </div>
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
            </div>
          )}
          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-12 h-12 text-[var(--text-muted)] opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">Lance une recherche pour trouver un contact</p>
            </div>
          )}
          {results.map(c => (
            <SysContactCard key={c.id} contact={c} isSelected={selected?.id === c.id} onSelect={() => setSelected(c)} />
          ))}
          {results.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center pt-1">{results.length} contact{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
      {selected && (
        <div className="flex-1 bg-[var(--bg-card)] border-l border-[var(--border)] overflow-hidden">
          <SysContactDetail contact={selected} onClose={() => setSelected(null)} onCompose={onCompose} />
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
// ONGLET ADMIN/PRO — Baserow
// ════════════════════════════════════════════════════════

// ── Formulaire ajout/modification ──
const AdminContactForm = ({ initial, onSave, onClose }: {
  initial?: AdminContact;
  onSave: (data: Partial<AdminContact>) => Promise<void>;
  onClose: () => void;
}) => {
  const [form, setForm] = useState({
    Prénom: initial?.Prénom || '',
    Nom: initial?.Nom || '',
    Email: initial?.Email || '',
    Téléphone: initial?.Téléphone || '',
    Entreprise: initial?.Entreprise || '',
    Catégorie: initial?.Catégorie?.value || '',
    Notes: initial?.Notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.Email.trim()) return;
    setSaving(true);
    await onSave({ ...form, Catégorie: form.Catégorie ? form.Catégorie : undefined });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col w-[560px] max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{initial ? 'Modifier le contact' : 'Nouveau contact Admin/Pro'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {[
            { label: 'Prénom', key: 'Prénom', placeholder: 'Jean' },
            { label: 'Nom',    key: 'Nom',    placeholder: 'Dupont' },
            { label: 'Email *', key: 'Email', placeholder: 'jean@exemple.com' },
            { label: 'Téléphone', key: 'Téléphone', placeholder: '+41 79 000 00 00' },
            { label: 'Entreprise', key: 'Entreprise', placeholder: 'ACME SA' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1.5 block">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50 transition-all"
                placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-1.5 block">Catégorie</label>
            <select value={form.Catégorie} onChange={e => set('Catégorie', e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50 transition-all">
              <option value="">— Choisir —</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-1.5 block">Notes</label>
            <textarea value={form.Notes} onChange={e => set('Notes', e.target.value)}
              className="w-full h-24 bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[#c9a84c]/50 transition-all"
              placeholder="Notes libres..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all">Annuler</button>
          <button onClick={handleSave} disabled={saving || !form.Email.trim()}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] hover:from-[#c9a84c]/30 transition-all disabled:opacity-40">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Historique emails ──
const EmailHistory = ({ email }: { email: string }) => {
  const [received, setReceived] = useState<EmailRecord[]>([]);
  const [sent, setSent]         = useState<SentRecord[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const enc = encodeURIComponent(email);
        const [recRes, sentRes] = await Promise.all([
          fetch(`${BASEROW_URL}/database/rows/table/${TABLE_EMAILS}/?user_field_names=true&size=20&order_by=-id&filter__Expéditeur__contains=${enc}`, { headers: HEADERS }),
          TABLE_SENT ? fetch(`${BASEROW_URL}/database/rows/table/${TABLE_SENT}/?user_field_names=true&size=20&order_by=-id&filter__À__contains=${enc}`, { headers: HEADERS }) : null,
        ]);
        const recData = await recRes.json();
        setReceived(recData.results || []);
        if (sentRes) { const sentData = await sentRes.json(); setSent(sentData.results || []); }
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [email]);

  if (loading) return <div className="flex items-center gap-2 py-3"><Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-muted)]">Chargement…</span></div>;
  if (received.length === 0 && sent.length === 0) return <p className="text-xs text-[var(--text-muted)] py-2">Aucun email échangé trouvé.</p>;

  return (
    <div className="space-y-1.5">
      {received.map(e => (
        <div key={`r${e.id}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
          <Inbox className="w-3 h-3 text-[#4caf7d] shrink-0" />
          <span className="text-[10px] text-[var(--text-primary)] flex-1 truncate">{e.Sujet || 'Sans sujet'}</span>
          <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fmtShort(e['Date réception'])}</span>
        </div>
      ))}
      {sent.map(e => (
        <div key={`s${e.id}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
          <Send className="w-3 h-3 text-[#c9a84c] shrink-0" />
          <span className="text-[10px] text-[var(--text-primary)] flex-1 truncate">{e.Sujet || 'Sans sujet'}</span>
          <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fmtShort(e.Date)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Fiche détaillée Admin ──
const AdminContactDetail = ({ contact, onClose, onCompose, onEdit, onDelete }: {
  contact: AdminContact; onClose: () => void; onCompose: (e: string) => void;
  onEdit: () => void; onDelete: () => void;
}) => {
  const [notes, setNotes]     = useState(contact.Notes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes]   = useState(false);
  const cat = contact.Catégorie?.value || '';
  const catColor = getCatColor(cat);

  const saveNotes = async () => {
    if (!TABLE_ADMIN) return;
    setSavingNotes(true);
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ADMIN}/${contact.id}/?user_field_names=true`, {
        method: 'PATCH', headers: HEADERS,
        body: JSON.stringify({ Notes: notes }),
      });
      setEditingNotes(false);
    } catch { /* ignore */ }
    finally { setSavingNotes(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Fiche Admin/Pro</h3>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <Pencil className="w-3 h-3" /> Modifier
          </button>
          <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#d95555]/10 border border-[#d95555]/20 text-[#d95555] hover:bg-[#d95555]/20 transition-all">
            <Trash2 className="w-3 h-3" /> Supprimer
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all ml-1"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Avatar + actions */}
        <div className="flex flex-col items-center gap-3 pb-5 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl font-bold"
            style={{ background: `${catColor}20`, borderColor: `${catColor}40`, color: catColor }}>
            {adminInit(contact)}
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[var(--text-primary)]">{adminName(contact)}</p>
            <p className="text-sm text-[var(--text-muted)]">{contact.Email}</p>
            {cat && (
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}30` }}>{cat}</span>
            )}
          </div>
          <button onClick={() => onCompose(contact.Email)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#c9a84c]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] hover:bg-[#c9a84c]/30 transition-all">
            <Mail className="w-3.5 h-3.5" /> Envoyer un email
          </button>
        </div>

        {/* Infos */}
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Informations</p>
          <div className="space-y-0">
            {[
              { label: 'Email',      value: contact.Email,      icon: <Mail className="w-3 h-3" /> },
              { label: 'Téléphone', value: contact.Téléphone,  icon: <Phone className="w-3 h-3" /> },
              { label: 'Entreprise', value: contact.Entreprise, icon: <Building2 className="w-3 h-3" /> },
              { label: 'Ajouté le',  value: fmtDate(contact['Date création']), icon: <Calendar className="w-3 h-3" /> },
            ].filter(f => f.value).map(f => (
              <div key={f.label} className="flex items-start gap-3 py-2 border-b border-[var(--border)]/50">
                <span className="text-[var(--text-muted)] mt-0.5 shrink-0">{f.icon}</span>
                <span className="text-xs text-[var(--text-muted)] w-20 shrink-0 mt-0.5">{f.label}</span>
                <span className="text-xs text-[var(--text-primary)] flex-1 break-all">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Notes
            </p>
            {!editingNotes
              ? <button onClick={() => setEditingNotes(true)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-all"><Pencil className="w-3 h-3" /> Modifier</button>
              : <div className="flex gap-1.5">
                  <button onClick={() => { setNotes(contact.Notes); setEditingNotes(false); }} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">Annuler</button>
                  <button onClick={saveNotes} disabled={savingNotes} className="text-[10px] text-[#4caf7d] font-bold flex items-center gap-1 transition-all disabled:opacity-50">
                    {savingNotes ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Sauvegarder
                  </button>
                </div>
            }
          </div>
          {editingNotes
            ? <textarea value={notes} onChange={e => setNotes(e.target.value)} autoFocus
                className="w-full h-28 bg-[var(--bg-main)] border border-[#c9a84c]/40 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] resize-none focus:outline-none transition-all" />
            : <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border)] min-h-[60px]">
                {notes || <span className="text-[var(--text-muted)] italic">Aucune note</span>}
              </p>
          }
        </div>

        {/* Historique emails */}
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Historique emails
          </p>
          <EmailHistory email={contact.Email} />
        </div>
      </div>
    </div>
  );
};

// (import CSV supprimé — remplacé par synchronisation Google via n8n)

// ── Carte contact Admin ──
const AdminContactCard = ({ contact, isSelected, onSelect }: { contact: AdminContact; isSelected: boolean; onSelect: () => void }) => {
  const cat = contact.Catégorie?.value || '';
  const catColor = getCatColor(cat);
  return (
    <button onClick={onSelect} className={`w-full text-left rounded-xl p-3.5 transition-all border ${
      isSelected ? 'border-[#c9a84c]/50 bg-[#c9a84c]/05' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[#c9a84c]/25 hover:bg-[var(--card-hover)]'
    }`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: `${catColor}18`, border: `1px solid ${catColor}30`, color: catColor }}>
          {adminInit(contact)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{adminName(contact)}</p>
            {cat && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${catColor}18`, color: catColor }}>{cat}</span>}
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate">{contact.Email}</p>
          {contact.Entreprise && <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><Building2 className="w-2.5 h-2.5" />{contact.Entreprise}</p>}
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-[#c9a84c]' : 'text-[var(--text-muted)]'}`} />
      </div>
    </button>
  );
};

// ── Onglet Admin/Pro principal ──
const AdminTab = ({ onCompose }: { onCompose: (email: string) => void }) => {
  const [contacts, setContacts]   = useState<AdminContact[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery]         = useState('');
  const [selected, setSelected]   = useState<AdminContact | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<AdminContact | undefined>(undefined);
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message?: string; created?: number; updated?: number } | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!TABLE_ADMIN) { setLoading(false); return; }
    setLoading(true);
    setFetchError(null);
    try {
      // Pagination automatique — Baserow limite à 200 par page
      const all: AdminContact[] = [];
      let url: string | null =
        `${BASEROW_URL}/database/rows/table/${TABLE_ADMIN}/?user_field_names=true&size=200`;

      while (url) {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) {
          const errText = await res.text().catch(() => 'réponse non lisible');
          setFetchError(`Erreur ${res.status} — ${errText.slice(0, 200)}`);
          setContacts([]);
          return;
        }
        const data = await res.json();
        if (!data.results) {
          setFetchError('Réponse Baserow inattendue (champ "results" absent) — vérifie le token et l\'ID de table');
          setContacts([]);
          return;
        }
        all.push(...data.results);
        url = data.next ?? null; // null = dernière page
      }

      setContacts(all);
    } catch (e: any) {
      setFetchError(`Erreur réseau : ${e?.message ?? String(e)}`);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const filtered = contacts
    .filter(c => {
      const q = query.toLowerCase();
      return !q || adminName(c).toLowerCase().includes(q) || c.Email?.toLowerCase().includes(q) || c.Entreprise?.toLowerCase().includes(q);
    })
    .sort((a, b) => adminName(a).localeCompare(adminName(b), 'fr'));

  const handleSave = async (data: Partial<AdminContact>) => {
    if (!TABLE_ADMIN) { alert('Configurer TABLE_ADMIN dans Contacts.tsx'); return; }
    if (editTarget) {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ADMIN}/${editTarget.id}/?user_field_names=true`, {
        method: 'PATCH', headers: HEADERS, body: JSON.stringify(data),
      });
    } else {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ADMIN}/?user_field_names=true`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify(data),
      });
    }
    await fetchContacts();
    setShowForm(false); setEditTarget(undefined);
  };

  const handleDelete = async (c: AdminContact) => {
    if (!confirm(`Supprimer ${adminName(c)} ?`)) return;
    await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ADMIN}/${c.id}/`, { method: 'DELETE', headers: HEADERS });
    setSelected(null); await fetchContacts();
  };

  const syncGoogle = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res  = await fetch(N8N_GOOGLE_SYNC);
      const data = await res.json();
      setSyncResult({ ok: data.ok ?? true, message: data.message, created: data.created, updated: data.updated });
      await fetchContacts();
    } catch { setSyncResult(null); alert('Erreur lors de la synchronisation Google Contacts.'); }
    finally { setSyncing(false); }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {showForm && <AdminContactForm initial={editTarget} onSave={handleSave} onClose={() => { setShowForm(false); setEditTarget(undefined); }} />}

      {/* Colonne liste */}
      <div className={`flex flex-col border-r border-[var(--border)] bg-[var(--bg-main)] shrink-0 transition-all ${selected ? 'w-[380px]' : 'w-full'}`}>
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Nom, email ou entreprise..."
                className="w-full pl-9 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
            </div>
            <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#c9a84c]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] hover:bg-[#c9a84c]/30 transition-all shrink-0">
              <Plus className="w-4 h-4" /> Nouveau
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-muted)]">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-3">
              {syncResult && (
                <span className="text-[10px] text-[#4caf7d] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {syncResult.message
                    ? syncResult.message
                    : `${syncResult.created ?? 0} ajouté${(syncResult.created ?? 0) !== 1 ? 's' : ''}, ${syncResult.updated ?? 0} mis à jour`}
                </span>
              )}
              <button onClick={syncGoogle} disabled={syncing}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50">
                {syncing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Cloud className="w-3.5 h-3.5" />}
                {syncing ? 'Sync…' : 'Sync Google'}
              </button>
            </div>
          </div>
          {!TABLE_ADMIN && (
            <div className="mt-2 px-3 py-2 bg-[#d95555]/10 border border-[#d95555]/20 rounded-lg text-[10px] text-[#d95555]">
              ⚠️ TABLE_ADMIN non configuré dans Contacts.tsx
            </div>
          )}
          {fetchError && (
            <div className="mt-2 px-3 py-2 bg-[#d95555]/10 border border-[#d95555]/20 rounded-lg text-[10px] text-[#d95555] font-mono break-all flex items-start gap-2">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              {fetchError}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2">
              <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
              <span className="text-sm text-[var(--text-muted)]">Chargement…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <Users className="w-10 h-10 text-[var(--text-muted)] opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">{query ? 'Aucun résultat' : 'Aucun contact Admin/Pro'}</p>
            </div>
          ) : filtered.map(c => (
            <AdminContactCard key={c.id} contact={c} isSelected={selected?.id === c.id} onSelect={() => setSelected(c)} />
          ))}
        </div>
      </div>

      {/* Colonne détail */}
      {selected && (
        <div className="flex-1 bg-[var(--bg-card)] border-l border-[var(--border)] overflow-hidden">
          <AdminContactDetail
            contact={selected}
            onClose={() => setSelected(null)}
            onCompose={onCompose}
            onEdit={() => { setEditTarget(selected); setShowForm(true); }}
            onDelete={() => handleDelete(selected)}
          />
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════
export const Contacts = () => {
  const [tab, setTab]               = useState<'communaute' | 'admin'>('communaute');
  const [composeTarget, setComposeTarget] = useState<string | null>(null);

  return (
    <div className="-m-8 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {composeTarget && <QuickComposeModal to={composeTarget} onClose={() => setComposeTarget(null)} />}

      {/* Onglets principaux */}
      <div className="flex items-center gap-1 px-6 border-b border-[var(--border)] bg-[var(--bg-main)] shrink-0">
        <div className="flex items-center gap-3 py-1 mr-4">
          <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-[#c9a84c]" />
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Contacts</span>
        </div>
        {([
          { id: 'communaute', label: 'Communauté', icon: <Users className="w-4 h-4" />, desc: 'Systeme.io' },
          { id: 'admin',      label: 'Admin / Pro', icon: <Building2 className="w-4 h-4" />, desc: 'Baserow' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all border-b-2 ${
              tab === t.id ? 'text-[var(--text-primary)] border-b-[#c9a84c]' : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-primary)]'
            }`}>
            {t.icon} {t.label}
            <span className="text-[10px] text-[var(--text-muted)] font-normal">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 overflow-hidden">
        {tab === 'communaute' && <CommunauteTab onCompose={setComposeTarget} />}
        {tab === 'admin'      && <AdminTab      onCompose={setComposeTarget} />}
      </div>
    </div>
  );
};
