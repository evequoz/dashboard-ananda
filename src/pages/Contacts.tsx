import { useState, useCallback, useEffect } from 'react';
import {
  Search, Mail, Phone, Calendar,
  X, Loader2, Users, ChevronRight, Send, RefreshCw,
  CheckCircle, AlertCircle, Plus, Pencil, Trash2,
  Building2, FileText, Clock, Inbox,
} from 'lucide-react';
import {
  listAdminContacts,
  createAdminContact,
  updateAdminContact,
  deleteAdminContact,
  listInboxEmails,
  listSentEmails,
  sendEmailViaEdge,
} from '../data/supabaseApi';

// ── Constants ─────────────────────────────────────────────────────
const ACCOUNTS          = ['serge@eh-me.com', 'admin@eh-me.com', 'serge@seme.ch'];
const CATEGORIES        = ['Fournisseur', 'Partenaire', 'Admin', 'Comptable', 'Autre'];

// ── Interfaces ────────────────────────────────────────────────────
interface AdminContact {
  id: number;
  Prénom: string; Nom: string; Email: string; Téléphone: string;
  Entreprise: string; Catégorie: { value: string } | null;
  Notes: string; 'Date création': string;
}

interface EmailRecord { id: number; Sujet: string; 'Date réception': string; Traité: boolean; 'Expéditeur'?: string; }
interface SentRecord  { id: number; Sujet: string; Date: string; 'À': string; }

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';
const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
      await sendEmailViaEdge({ from, to, subject, body });
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
    await onSave({ ...form, Catégorie: form.Catégorie ? { value: form.Catégorie } : null });
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
          {([
            { label: 'Prénom', key: 'Prénom', placeholder: 'Jean' },
            { label: 'Nom',    key: 'Nom',    placeholder: 'Dupont' },
            { label: 'Email *', key: 'Email', placeholder: 'jean@exemple.com' },
            { label: 'Téléphone', key: 'Téléphone', placeholder: '+41 79 000 00 00' },
            { label: 'Entreprise', key: 'Entreprise', placeholder: 'ACME SA' },
          ] as const).map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1.5 block">{f.label}</label>
              <input value={form[f.key]} onChange={e => set(f.key, e.target.value)}
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
        const [recData, sentData] = await Promise.all([listInboxEmails(200), listSentEmails(200)]);
        const lc = email.toLowerCase();
        setReceived((recData || []).filter((r) => (r['Expéditeur'] || '').toLowerCase().includes(lc)).slice(0, 20) as EmailRecord[]);
        setSent((sentData || []).filter((s) => (s['À'] || '').toLowerCase().includes(lc)).slice(0, 20) as SentRecord[]);
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
    setSavingNotes(true);
    try {
      await updateAdminContact(contact.id, { Notes: notes });
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

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      setContacts(await listAdminContacts());
    } catch (e: unknown) {
      setFetchError(`Erreur réseau : ${getErrorMessage(e)}`);
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
    if (editTarget) {
      await updateAdminContact(editTarget.id, data);
    } else {
      await createAdminContact(data);
    }
    await fetchContacts();
    setShowForm(false); setEditTarget(undefined);
  };

  const handleDelete = async (c: AdminContact) => {
    if (!confirm(`Supprimer ${adminName(c)} ?`)) return;
    await deleteAdminContact(c.id);
    setSelected(null); await fetchContacts();
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
          </div>
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
  const [composeTarget, setComposeTarget] = useState<string | null>(null);

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      {composeTarget && <QuickComposeModal to={composeTarget} onClose={() => setComposeTarget(null)} />}

      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-main)] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
          <Building2 className="w-3.5 h-3.5 text-[#c9a84c]" />
        </div>
        <div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Contacts Admin / Pro</span>
          <p className="text-[10px] text-[var(--text-muted)]">Synchronisés via Supabase</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <AdminTab onCompose={setComposeTarget} />
      </div>
    </div>
  );
};
