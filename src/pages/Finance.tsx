import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, X, Check, RefreshCw, Download } from 'lucide-react';

const BASEROW_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const FINANCE_TABLE = 543;
const BUDGET_TABLE_ID = 542;

const headers = {
  Authorization: `Token ${BASEROW_TOKEN}`,
  'Content-Type': 'application/json',
};

const CATEGORIES = ['Formation', 'Logement', 'Assurance', 'Leasing', 'Social', 'Télécom', 'Doterra', 'Divers'];
const SOURCES = ['Stripe', 'Systeme IO', 'Cash', 'Virement', 'Carte crédit', 'Carte Yul', 'Auto'];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const now = new Date();

type Mouvement = {
  id: number;
  Date: string;
  'Date paiement': string;
  Libellé: string;
  Montant: number;
  Type: any;
  Source: any;
  Catégorie: any;
  Notes: string;
  Validé: boolean;
};

type BudgetLigne = {
  id: number;
  Libellé: string;
  Mensuel: number;
  Actif: boolean | string;
  Catégorie: string;
};

const fmt = (n: number) => Math.round(n).toLocaleString('fr-CH') + ' CHF';
const getVal = (field: any) => (field as any)?.value ?? field ?? '';

export const Finance = () => {
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [budget, setBudget] = useState<BudgetLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'Entrée' | 'Dépense'>('Entrée');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'mois' | 'archive'>('mois');
  const [filterMois, setFilterMois] = useState(now.getMonth());
  const [filterAnnee, setFilterAnnee] = useState(now.getFullYear());
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10),
    datePaiement: '',
    libelle: '',
    montant: '',
    source: 'Virement',
    categorie: 'Divers',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const finRes = await fetch(
        `${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/?user_field_names=true&size=200&order_by=-Date`,
        { headers }
      );
      const finData = await finRes.json();
      setMouvements(finData.results || []);

      const budRes = await fetch(
        `${BASEROW_URL}/database/rows/table/${BUDGET_TABLE_ID}/?user_field_names=true&size=100`,
        { headers }
      );
      const budData = await budRes.json();
      setBudget((budData.results || []).filter((r: BudgetLigne) =>
        r.Actif === true || r.Actif === 'VRAI'
      ));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Filtre mois courant
  const moisStr = `${filterAnnee}-${String(filterMois + 1).padStart(2, '0')}`;
  const mouvementsMois = mouvements.filter(m => m.Date?.startsWith(moisStr));

  // Calculs mois
  const entrees = mouvementsMois.filter(m => getVal(m.Type) === 'Entrée').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0);
  const depenses = mouvementsMois.filter(m => getVal(m.Type) === 'Dépense').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0);
  const chargesFixes = budget.reduce((s, b) => s + (parseFloat(String(b.Mensuel)) || 0), 0);
  const balance = entrees - depenses - chargesFixes;

  // Archive — tous les mouvements de l'année
  const mouvementsAnnee = mouvements.filter(m => m.Date?.startsWith(String(filterAnnee)));

  const handleEdit = (m: Mouvement) => {
    setEditingId(m.id);
    setFormType(getVal(m.Type) as 'Entrée' | 'Dépense');
    setForm({
      date: m.Date || '',
      datePaiement: m['Date paiement'] || '',
      libelle: m['Libellé'] || '',
      montant: String(m.Montant || ''),
      source: getVal(m.Source) || 'Virement',
      categorie: getVal(m.Catégorie) || 'Divers',
      notes: m.Notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce mouvement ?')) return;
    await fetch(`${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/${id}/?user_field_names=true`, {
      method: 'DELETE', headers,
    });
    fetchData();
  };

  const handlePay = async (id: number) => {
    await fetch(`${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/${id}/?user_field_names=true`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ 'Date paiement': new Date().toISOString().split('T')[0] }),
    });
    fetchData();
  };

  const handleSave = async () => {
    if (!form.libelle || !form.montant) return;
    setSaving(true);
    try {
      const url = editingId
        ? `${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/${editingId}/?user_field_names=true`
        : `${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/?user_field_names=true`;
      await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify({
          Date: form.date,
          'Date paiement': form.datePaiement || null,
          Libellé: form.libelle,
          Montant: parseFloat(form.montant) || 0,
          Type: formType,
          Source: form.source,
          Catégorie: form.categorie,
          Notes: form.notes,
          Validé: true,
        }),
      });
      setForm({ date: now.toISOString().slice(0, 10), datePaiement: '', libelle: '', montant: '', source: 'Virement', categorie: 'Divers', notes: '' });
      setEditingId(null);
      setShowForm(false);
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const exportCSV = () => {
    const rows = mouvementsAnnee;
    const header = 'Date,Date paiement,Libellé,Montant,Type,Source,Catégorie,Notes,Validé';
    const lines = rows.map(m =>
      [m.Date, m['Date paiement'] || '', `"${m['Libellé'] || ''}"`, m.Montant,
       getVal(m.Type), getVal(m.Source), getVal(m.Catégorie),
       `"${m.Notes || ''}"`, m.Validé].join(',')
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_${filterAnnee}.csv`;
    a.click();
  };

  const MouvementRow = ({ m }: { m: Mouvement }) => {
    const isEntree = getVal(m.Type) === 'Entrée';
    const nonPaye = !m['Date paiement'] && getVal(m.Type) === 'Dépense';
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] rounded-lg border border-[#22223a] group hover:border-[#c9a84c]/30">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isEntree ? 'bg-[#4caf7d]' : nonPaye ? 'bg-[#c9a84c]' : 'bg-[#d95555]'}`} />
          <div>
            <p className="text-sm text-[#e8e4d9] font-medium">{m['Libellé']}</p>
            <p className="text-xs text-[#5a587a]">
              {getVal(m.Catégorie)} · {getVal(m.Source)} · {m.Date}
              {nonPaye && <span className="ml-2 text-[#c9a84c]">⏳ Non payée</span>}
              {m['Date paiement'] && <span className="ml-2 text-[#5a587a]">Payé: {m['Date paiement']}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className={`text-sm font-bold ${isEntree ? 'text-[#4caf7d]' : nonPaye ? 'text-[#c9a84c]' : 'text-[#d95555]'}`}>
            {isEntree ? '+' : '-'}{fmt(parseFloat(String(m.Montant ?? 0)) || 0)}
          </p>
          {getVal(m.Type) === 'Dépense' && !m['Date paiement'] && (
            <button onClick={() => handlePay(m.id)} className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-[#4caf7d22] text-[#4caf7d] rounded text-xs font-semibold hover:bg-[#4caf7d44] transition-all" title="Marquer comme payée">
              Payé
            </button>
          )}
          <button onClick={() => handleEdit(m)} className="opacity-0 group-hover:opacity-100 text-[#5a587a] hover:text-[#c9a84c] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => handleDelete(m.id)} className="opacity-0 group-hover:opacity-100 text-[#5a587a] hover:text-[#d95555] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#e8e4d9]">Finances</h1>
          <select value={filterMois} onChange={e => setFilterMois(Number(e.target.value))}
            className="bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-1.5 text-sm text-[#e8e4d9]">
            {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={filterAnnee} onChange={e => setFilterAnnee(Number(e.target.value))}
            className="bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-1.5 text-sm text-[#e8e4d9]">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 rounded-lg border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setFormType('Entrée'); setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 bg-[#4caf7d] text-white rounded-lg text-sm font-semibold flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Entrée
          </button>
          <button onClick={() => { setFormType('Dépense'); setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 bg-[#d95555] text-white rounded-lg text-sm font-semibold flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Dépense
          </button>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-[#0a0a15] border border-[#22223a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#e8e4d9]">
              {editingId ? '✏️ Modifier' : `Nouvelle ${formType === 'Entrée' ? '💚 Entrée' : '🔴 Dépense'}`}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-[#5a587a] hover:text-[#e8e4d9]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Date facture</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Date paiement (optionnel)</label>
              <input type="date" value={form.datePaiement} onChange={e => setForm({ ...form, datePaiement: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Montant CHF</label>
              <input type="number" placeholder="0.00" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#5a587a] mb-1 block">Libellé</label>
              <input type="text" placeholder="Fournisseur - description..." value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Source</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9]">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Catégorie</label>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9]">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#5a587a] mb-1 block">Notes</label>
              <input type="text" placeholder="..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 text-sm text-[#5a587a]">Annuler</button>
            <button onClick={handleSave} disabled={saving || !form.libelle || !form.montant}
              className="px-6 py-2 bg-[#c9a84c] text-[#05050a] rounded-lg text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#22223a]">
        <button onClick={() => setActiveTab('mois')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'mois' ? 'border-[#c9a84c] text-[#c9a84c]' : 'border-transparent text-[#5a587a] hover:text-[#e8e4d9]'}`}>
          {MOIS[filterMois]} {filterAnnee}
        </button>
        <button onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'archive' ? 'border-[#c9a84c] text-[#c9a84c]' : 'border-transparent text-[#5a587a] hover:text-[#e8e4d9]'}`}>
          Archive {filterAnnee}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a587a]">Chargement...</div>
      ) : activeTab === 'mois' ? (
        <>
          {/* Cartes résumé */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#4caf7d22] rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#4caf7d]" />
                </div>
                <span className="text-xs text-[#5a587a]">Entrées</span>
              </div>
              <p className="text-2xl font-bold text-[#4caf7d]">{fmt(entrees)}</p>
            </div>
            <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#d9555522] rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-[#d95555]" />
                </div>
                <span className="text-xs text-[#5a587a]">Dépenses</span>
              </div>
              <p className="text-2xl font-bold text-[#d95555]">{fmt(depenses)}</p>
            </div>
            <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#c9a84c22] rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-[#c9a84c]" />
                </div>
                <span className="text-xs text-[#5a587a]">Charges fixes</span>
              </div>
              <p className="text-2xl font-bold text-[#c9a84c]">{fmt(chargesFixes)}</p>
              <p className="text-xs text-[#5a587a] mt-1">{budget.length} postes</p>
            </div>
            <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${balance >= 0 ? 'bg-[#4caf7d22]' : 'bg-[#d9555522]'}`}>
                  <TrendingUp className={`w-4 h-4 ${balance >= 0 ? 'text-[#4caf7d]' : 'text-[#d95555]'}`} />
                </div>
                <span className="text-xs text-[#5a587a]">Balance</span>
              </div>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-[#4caf7d]' : 'text-[#d95555]'}`}>{fmt(balance)}</p>
              <p className="text-xs text-[#5a587a] mt-1">Entrées − dépenses − fixes</p>
            </div>
          </div>

          {/* Mouvements + sidebar */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-[#0a0a15] rounded-xl border border-[#22223a] p-6">
              <h2 className="text-base font-semibold text-[#e8e4d9] mb-4">Mouvements du mois</h2>
              {mouvementsMois.length === 0 ? (
                <div className="text-center py-8 text-[#5a587a] text-sm">Aucun mouvement ce mois-ci</div>
              ) : (
                <div className="space-y-2">
                  {mouvementsMois.map(m => <MouvementRow key={m.id} m={m} />)}
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
                <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">Charges fixes</h3>
                <div className="space-y-2">
                  {budget.slice(0, 8).map(b => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-xs text-[#5a587a]">{b['Libellé']}</span>
                      <span className="text-xs font-semibold text-[#c9a84c]">{fmt(parseFloat(String(b.Mensuel)) || 0)}</span>
                    </div>
                  ))}
                  {budget.length > 8 && <p className="text-xs text-[#5a587a] text-center">+ {budget.length - 8} autres</p>}
                </div>
                <div className="border-t border-[#22223a] mt-3 pt-3 flex justify-between">
                  <span className="text-xs font-semibold text-[#e8e4d9]">Total</span>
                  <span className="text-xs font-bold text-[#c9a84c]">{fmt(chargesFixes)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Archive */
        <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-[#e8e4d9]">Archive {filterAnnee}</h2>
              <p className="text-xs text-[#5a587a] mt-1">{mouvementsAnnee.length} mouvements</p>
            </div>
            <button onClick={exportCSV}
              className="px-4 py-2 bg-[#22223a] text-[#e8e4d9] rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-[#2a2a4a]">
              <Download className="w-4 h-4" /> Export CSV fiduciaire
            </button>
          </div>

          {/* Résumé annuel */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#0f0f1a] rounded-lg p-4">
              <p className="text-xs text-[#5a587a] mb-1">Total entrées {filterAnnee}</p>
              <p className="text-xl font-bold text-[#4caf7d]">
                {fmt(mouvementsAnnee.filter(m => getVal(m.Type) === 'Entrée').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0))}
              </p>
            </div>
            <div className="bg-[#0f0f1a] rounded-lg p-4">
              <p className="text-xs text-[#5a587a] mb-1">Total dépenses {filterAnnee}</p>
              <p className="text-xl font-bold text-[#d95555]">
                {fmt(mouvementsAnnee.filter(m => getVal(m.Type) === 'Dépense').reduce((s, m) => s + (parseFloat(String(m.Montant)) || 0), 0))}
              </p>
            </div>
            <div className="bg-[#0f0f1a] rounded-lg p-4">
              <p className="text-xs text-[#5a587a] mb-1">Factures à payer</p>
              <p className="text-xl font-bold text-[#c9a84c]">
                {mouvementsAnnee.filter(m => getVal(m.Type) === 'Dépense' && !m['Date paiement']).length}
              </p>
            </div>
          </div>

          {/* Liste complète */}
          {mouvementsAnnee.length === 0 ? (
            <div className="text-center py-8 text-[#5a587a] text-sm">Aucun mouvement en {filterAnnee}</div>
          ) : (
            <div className="space-y-2">
              {mouvementsAnnee.map(m => <MouvementRow key={m.id} m={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
