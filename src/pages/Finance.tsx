import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, X, Check, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { useTheme } from '../App';
import {
  listFinanceEntries,
  listBudgetItems,
  deleteFinanceEntry,
  updateFinanceEntry,
  createFinanceEntry,
  ensureMonthlyFixedCharges,
} from '../data/supabaseApi';

const CATEGORIES = ['Formation', 'Logement', 'Assurance', 'Leasing', 'Social', 'Télécom', 'Doterra', 'Divers'];
const SOURCES = ['Stripe', 'Systeme IO', 'Cash', 'Virement', 'Carte crédit', 'Carte Yul', 'Auto'];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const now = new Date();
const fmt = (n: number) => Math.round(n).toLocaleString('fr-CH') + ' CHF';
const getVal = (field: any) => (field as any)?.value ?? field ?? '';
const isActiveBudget = (value: any) => {
  const str = String(value ?? '').trim().toLowerCase();
  if ([false, 0].includes(value)) return false;
  if (['false', 'faux', '0', 'no', 'non'].includes(str)) return false;
  return true;
};

type Mouvement = {
  id: number; Date: string; 'Date paiement': string;
  Libellé: string; Montant: number; Type: any;
  Source: any; Catégorie: any; Notes: string; Validé: boolean;
};
type BudgetLigne = {
  id: number; Libellé: string; Mensuel: number; Actif: boolean | string; Catégorie: string;
};

export const Finance = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [budget, setBudget] = useState<BudgetLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'Entrée' | 'Dépense'>('Entrée');
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'mois' | 'archive'>('mois');
  const [recherche, setRecherche] = useState('');
  const [filterMois, setFilterMois] = useState(now.getMonth());
  const [filterAnnee, setFilterAnnee] = useState(now.getFullYear());
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10), datePaiement: '',
    libelle: '', montant: '', source: 'Virement', categorie: 'Divers', notes: '',
  });

  // Couleurs selon thème
  const C = {
    bg:      isDark ? '#0a0a15' : '#ffffff',
    card:    isDark ? '#0f0f1a' : '#fafaf7',
    input:   isDark ? '#05050a' : '#f5f3ee',
    border:  isDark ? '#22223a' : '#e2dfd7',
    text:    isDark ? '#e8e4d9' : '#1a1826',
    muted:   isDark ? '#5a587a' : '#8a88aa',
    gold:    isDark ? '#c9a84c' : '#a07828',
    green:   '#4caf7d',
    red:     '#d95555',
    orange:  '#c9a84c',
  };

  const inputStyle = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none', width: '100%',
    boxSizing: 'border-box' as const, fontFamily: 'inherit',
  };

  const fetchData = async (_injectForSelectedMonth = false) => {
    setLoading(true);
    setSyncError(null);
    try {
      // Toujours vérifier/injecter les charges fixes pour le mois affiché.
      await ensureMonthlyFixedCharges(filterAnnee, filterMois + 1);
      const [finData, budData] = await Promise.all([listFinanceEntries(), listBudgetItems()]);
      setMouvements(finData || []);
      setBudget((budData || []).filter((r: BudgetLigne) => isActiveBudget(r.Actif)));
    } catch (e) {
      console.error(e);
      setSyncError("Erreur de synchronisation finance. Vérifie Supabase/n8n puis clique sur 'Réinjecter / Recalculer'.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterMois, filterAnnee]);

  const moisStr = `${filterAnnee}-${String(filterMois + 1).padStart(2, '0')}`;
  const mouvementsMois = mouvements.filter(m => m.Date?.startsWith(moisStr));

  // ── Factures non payées de mois précédents ──
  const facturesImpayees = mouvements.filter(m => {
    if (getVal(m.Type) !== 'Dépense') return false;
    if (m['Date paiement']) return false;
    if (m.Date?.startsWith(moisStr)) return false; // déjà dans le mois affiché
    return true;
  });

  const entrees = mouvementsMois.filter(m => getVal(m.Type) === 'Entrée').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0);
  const depenses = mouvementsMois.filter(m => getVal(m.Type) === 'Dépense').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0);
  const chargesFixes = budget.reduce((s, b) => s + (parseFloat(String(b.Mensuel)) || 0), 0);
  const soldeOuverture = mouvements
    .filter(m => !!m.Date && m.Date < moisStr)
    .reduce((s, m) => s + ((getVal(m.Type) === 'Entrée' ? 1 : -1) * (parseFloat(String(m.Montant)) || 0)), 0);
  const soldeMois = entrees - depenses;
  const balance = soldeOuverture + soldeMois;
  const chargesFixesInjectees = mouvementsMois.filter(m => getVal(m.Type) === 'Dépense' && getVal(m.Source) === 'Auto')
    .reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0);

  const mouvementsAnnee = mouvements.filter(m => {
    if (!m.Date?.startsWith(String(filterAnnee))) return false;
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      (m['Libellé'] || '').toLowerCase().includes(q) ||
      (getVal(m.Catégorie) || '').toLowerCase().includes(q) ||
      (getVal(m.Source) || '').toLowerCase().includes(q) ||
      (m.Notes || '').toLowerCase().includes(q) ||
      String(m.Montant || '').includes(q)
    );
  });

  const handleEdit = (m: Mouvement) => {
    setEditingId(m.id);
    setFormType(getVal(m.Type) as 'Entrée' | 'Dépense');
    setForm({ date: m.Date || '', datePaiement: m['Date paiement'] || '', libelle: m['Libellé'] || '', montant: String(m.Montant || ''), source: getVal(m.Source) || 'Virement', categorie: getVal(m.Catégorie) || 'Divers', notes: m.Notes || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce mouvement ?')) return;
    await deleteFinanceEntry(id);
    fetchData();
  };

  const handlePay = async (id: number) => {
    await updateFinanceEntry(id, { 'Date paiement': new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const handleSave = async () => {
    if (!form.libelle || !form.montant) return;
    setSaving(true);
    try {
      const payload = { Date: form.date, 'Date paiement': form.datePaiement || null, Libellé: form.libelle, Montant: parseFloat(form.montant) || 0, Type: formType, Source: form.source, Catégorie: form.categorie, Notes: form.notes, Validé: true };
      if (editingId) await updateFinanceEntry(editingId, payload);
      else await createFinanceEntry(payload);
      setForm({ date: now.toISOString().slice(0, 10), datePaiement: '', libelle: '', montant: '', source: 'Virement', categorie: 'Divers', notes: '' });
      setEditingId(null); setShowForm(false); fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleRecalculateMonth = async () => {
    setRecalculating(true);
    try {
      await fetchData(true);
    } finally {
      setRecalculating(false);
    }
  };

  const exportCSV = () => {
    const header = 'Date,Date paiement,Libellé,Montant,Type,Source,Catégorie,Notes,Validé';
    const lines = mouvementsAnnee.map(m => [m.Date, m['Date paiement'] || '', `"${m['Libellé'] || ''}"`, m.Montant, getVal(m.Type), getVal(m.Source), getVal(m.Catégorie), `"${m.Notes || ''}"`, m.Validé].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `finance_${filterAnnee}.csv` });
    a.click();
  };

  const MouvementRow = ({ m, showRetard = false }: { m: Mouvement; showRetard?: boolean }) => {
    const isEntree = getVal(m.Type) === 'Entrée';
    const nonPaye = !m['Date paiement'] && getVal(m.Type) === 'Dépense';
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: showRetard ? (isDark ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.08)') : C.card, borderRadius: 10, border: `1px solid ${showRetard ? 'rgba(201,168,76,0.25)' : C.border}`, transition: 'all 0.15s' }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = showRetard ? 'rgba(201,168,76,0.5)' : C.gold + '50'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = showRetard ? 'rgba(201,168,76,0.25)' : C.border}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isEntree ? C.green : nonPaye ? C.orange : C.red }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{m['Libellé']}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
              {getVal(m.Catégorie)} · {getVal(m.Source)} · {m.Date}
              {nonPaye && !showRetard && <span style={{ marginLeft: 8, color: C.orange }}>⏳ Non payée</span>}
              {showRetard && <span style={{ marginLeft: 8, color: C.orange, fontWeight: 600 }}>⚠️ Mois précédent</span>}
              {m['Date paiement'] && <span style={{ marginLeft: 8, color: C.muted }}>Payé: {m['Date paiement']}</span>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: isEntree ? C.green : nonPaye ? C.orange : C.red, margin: 0 }}>
            {isEntree ? '+' : '-'}{fmt(parseFloat(String(m.Montant ?? 0)) || 0)}
          </p>
          {getVal(m.Type) === 'Dépense' && !m['Date paiement'] && (
            <button onClick={() => handlePay(m.id)} style={{ padding: '4px 10px', background: 'rgba(76,175,125,0.15)', color: C.green, border: `1px solid rgba(76,175,125,0.3)`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Payé
            </button>
          )}
          <button onClick={() => handleEdit(m)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = C.gold}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = C.muted}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = C.red}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = C.muted}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Finances</h1>
          <select value={filterMois} onChange={e => setFilterMois(Number(e.target.value))} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
            {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={filterAnnee} onChange={e => setFilterAnnee(Number(e.target.value))} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRecalculateMonth}
            disabled={recalculating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: 'pointer', fontSize: 12, opacity: recalculating ? 0.6 : 1 }}
          >
            <RefreshCw size={14} style={recalculating ? { animation: 'spin 1s linear infinite' } : undefined} />
            Réinjecter / Recalculer
          </button>
          <button onClick={() => fetchData(false)} style={{ padding: '8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer' }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => { setFormType('Entrée'); setEditingId(null); setShowForm(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.green, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <PlusCircle size={14} /> Entrée
          </button>
          <button onClick={() => { setFormType('Dépense'); setEditingId(null); setShowForm(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.red, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <PlusCircle size={14} /> Dépense
          </button>
        </div>
      </div>
      {syncError && (
        <div style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.red}55`, background: isDark ? 'rgba(217,85,85,0.12)' : 'rgba(217,85,85,0.08)', color: C.red, fontSize: 12 }}>
          {syncError}
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>
              {editingId ? '✏️ Modifier' : `${formType === 'Entrée' ? '💚 Nouvelle entrée' : '🔴 Nouvelle dépense'}`}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Date facture</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Date paiement (optionnel)</label>
              <input type="date" value={form.datePaiement} onChange={e => setForm({ ...form, datePaiement: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Montant CHF</label>
              <input type="number" placeholder="0.00" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Libellé</label>
              <input type="text" placeholder="Fournisseur - description..." value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Source</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={inputStyle}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Catégorie</label>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Notes</label>
              <input type="text" placeholder="..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            <button onClick={handleSave} disabled={saving || !form.libelle || !form.montant}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: C.gold, color: isDark ? '#05050a' : '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving || !form.libelle || !form.montant ? 0.4 : 1 }}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}` }}>
        {(['mois', 'archive'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${activeTab === tab ? C.gold : 'transparent'}`,
            color: activeTab === tab ? C.gold : C.muted,
            transition: 'all 0.15s', marginBottom: -1,
          }}>
            {tab === 'mois' ? `${MOIS[filterMois]} ${filterAnnee}` : `Archive ${filterAnnee}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>Chargement...</div>
      ) : activeTab === 'mois' ? (
        <>
          {/* ── FACTURES EN RETARD ── */}
          {facturesImpayees.length > 0 && (
            <div style={{ background: isDark ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <AlertCircle size={16} color={C.orange} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.orange, margin: 0 }}>
                  {facturesImpayees.length} facture{facturesImpayees.length > 1 ? 's' : ''} non payée{facturesImpayees.length > 1 ? 's' : ''} — mois précédents
                </h3>
                <span style={{ fontSize: 12, color: C.muted }}>
                  Total : {fmt(facturesImpayees.reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0))}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {facturesImpayees.map(m => <MouvementRow key={m.id} m={m} showRetard={true} />)}
              </div>
            </div>
          )}

          {/* Cartes résumé */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Entrées', value: entrees, color: C.green, icon: TrendingUp },
              { label: 'Dépenses', value: depenses, color: C.red, icon: TrendingDown },
              { label: 'Charges fixes', value: chargesFixes, color: C.orange, icon: DollarSign, sub: `${budget.length} postes · injectées: ${fmt(chargesFixesInjectees)}` },
              { label: 'Solde', value: balance, color: balance >= 0 ? C.green : C.red, icon: TrendingUp, sub: `Ouverture ${fmt(soldeOuverture)} + mois ${fmt(soldeMois)}` },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: card.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={card.color} />
                    </div>
                    <span style={{ fontSize: 12, color: C.muted }}>{card.label}</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: card.color, margin: 0 }}>{fmt(card.value)}</p>
                  {card.sub && <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{card.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* Mouvements + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16, marginTop: 0 }}>Mouvements du mois</h2>
              {mouvementsMois.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 13 }}>Aucun mouvement ce mois-ci</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {mouvementsMois.map(m => <MouvementRow key={m.id} m={m} />)}
                </div>
              )}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16, marginTop: 0 }}>Charges fixes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {budget.slice(0, 10).map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{b['Libellé']}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.orange }}>{fmt(parseFloat(String(b.Mensuel)) || 0)}</span>
                  </div>
                ))}
                {budget.length > 10 && <p style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>+ {budget.length - 10} autres</p>}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>{fmt(chargesFixes)}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>Archive {filterAnnee}</h2>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{mouvementsAnnee.length} mouvements</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
                style={{ ...inputStyle, width: 200 }} />
              <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: 'pointer', fontSize: 13 }}>
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: `Total entrées ${filterAnnee}`, value: mouvementsAnnee.filter(m => getVal(m.Type) === 'Entrée').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0), color: C.green },
              { label: `Total dépenses ${filterAnnee}`, value: mouvementsAnnee.filter(m => getVal(m.Type) === 'Dépense').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0), color: C.red },
              { label: 'Factures à payer', value: mouvementsAnnee.filter(m => getVal(m.Type) === 'Dépense' && !m['Date paiement']).length, color: C.orange, isCount: true },
            ].map((c, i) => (
              <div key={i} style={{ background: isDark ? '#05050a' : '#f5f3ee', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, color: C.muted, margin: '0 0 6px' }}>{c.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: c.color, margin: 0 }}>{(c as any).isCount ? c.value : fmt(c.value as number)}</p>
              </div>
            ))}
          </div>
          {mouvementsAnnee.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 13 }}>Aucun mouvement en {filterAnnee}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {mouvementsAnnee.map(m => <MouvementRow key={m.id} m={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
