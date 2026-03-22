import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, X, Check, RefreshCw } from 'lucide-react';

const BASEROW_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const FINANCE_TABLE = 543; // table Finance existante — à mettre à jour si différent
const BUDGET_TABLE_ID = 542; // table Budget — à mettre à jour avec le vrai ID

const headers = {
  Authorization: `Token ${BASEROW_TOKEN}`,
  'Content-Type': 'application/json',
};

const CATEGORIES = ['Formation', 'Logement', 'Assurance', 'Leasing', 'Social', 'Télécom', 'Divers'];
const SOURCES = ['Stripe', 'Systeme.io', 'Cash', 'Virement', 'Carte', 'Auto'];

const now = new Date();
const moisCourant = now.toISOString().slice(0, 7); // "2026-03"
const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

type Mouvement = {
  id: number;
  Date: string;
  Libellé: string;
  Mensuel: number;
  'Montant CHF': number;
  Type: string;
  Source: string;
  Catégorie: string;
  Notes: string;
  Validé: boolean;
};

type BudgetLigne = {
  id: number;
  Libellé: string;
  Mensuel: number;
  Mensuel: number;
  Actif: boolean | string;
  Catégorie: string;
};

export const Finance = () => {
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [budget, setBudget] = useState<BudgetLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'Entrée' | 'Dépense'>('Entrée');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10),
    libelle: '',
    montant: '',
    source: 'Cash',
    categorie: 'Divers',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mouvements du mois en cours
      const finRes = await fetch(
        `${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/?user_field_names=true&size=100&order_by=-Date`,
        { headers }
      );
      const finData = await finRes.json();
      const rows: Mouvement[] = (finData.results || []).filter((r: Mouvement) =>
        r.Date?.startsWith(moisCourant)
      );
      setMouvements(rows);

      // Budget charges fixes
      const budRes = await fetch(
        `${BASEROW_URL}/database/rows/table/${BUDGET_TABLE_ID}/?user_field_names=true&size=100`,
        { headers }
      );
      const budData = await budRes.json();
      setBudget((budData.results || []).filter((r: BudgetLigne) => r.Actif === true || r.Actif === 'VRAI' || r.Actif === '1'));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Calculs
  const entrees = mouvements.filter(m => (m.Type as any)?.value === 'Entrée' || m.Type === 'Entrée').reduce((s, m) => s + (parseFloat(String(m["Montant CHF"])) || 0), 0);
  const depenses = mouvements.filter(m => (m.Type as any)?.value === 'Dépense' || m.Type === 'Dépense').reduce((s, m) => s + (parseFloat(String(m["Montant CHF"])) || 0), 0);
  const chargesFixes = budget.reduce((s, b) => s + (parseFloat(String(b.Mensuel)) || 0), 0);
  const balance = entrees - depenses - chargesFixes;

  // Répartition dépenses par catégorie
  const parCategorie = CATEGORIES.map(cat => ({
    cat,
    total: mouvements.filter(m => (m.Type as any)?.value === 'Dépense' || ((m.Type as any)?.value ?? m.Type) === 'Dépense' && ((m.Catégorie as any)?.value ?? m.Catégorie) === cat).reduce((s, m) => s + (parseFloat(String(m["Montant CHF"])) || 0), 0),
  })).filter(c => c.total > 0);

  const handleSave = async () => {
    if (!form.libelle || !form.montant) return;
    setSaving(true);
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/?user_field_names=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          Date: form.date,
          Libellé: form.libelle,
          'Montant CHF': parseFloat(form.montant),
          Type: formType,
          Source: form.source,
          Catégorie: form.categorie,
          Notes: form.notes,
          Validé: true,
        }),
      });
      setForm({ date: now.toISOString().slice(0, 10), libelle: '', montant: '', source: 'Cash', categorie: 'Divers', notes: '' });
      setShowForm(false);
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const fmt = (n: number) => n.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' CHF';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e4d9]">Finances — {moisLabel}</h1>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 rounded-lg border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setFormType('Entrée'); setShowForm(true); }}
            className="px-4 py-2 bg-[#4caf7d] text-white rounded-lg text-sm font-semibold hover:bg-[#3d8f64] transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Entrée
          </button>
          <button
            onClick={() => { setFormType('Dépense'); setShowForm(true); }}
            className="px-4 py-2 bg-[#d95555] text-white rounded-lg text-sm font-semibold hover:bg-[#b84444] transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Dépense
          </button>
        </div>
      </div>

      {/* Formulaire rapide */}
      {showForm && (
        <div className="bg-[#0a0a15] border border-[#22223a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#e8e4d9]">
              Nouvelle {formType === 'Entrée' ? '💚 Entrée' : '🔴 Dépense'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-[#5a587a] hover:text-[#e8e4d9]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Montant CHF</label>
              <input type="number" placeholder="0.00" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#5a587a] mb-1 block">Libellé</label>
              <input type="text" placeholder="Description..." value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Source</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1 block">Catégorie</label>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#5a587a] mb-1 block">Notes (optionnel)</label>
              <input type="text" placeholder="..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#5a587a] hover:text-[#e8e4d9]">Annuler</button>
            <button onClick={handleSave} disabled={saving || !form.libelle || !form.montant}
              className="px-6 py-2 bg-[#c9a84c] text-[#05050a] rounded-lg text-sm font-semibold hover:bg-[#e8c97a] disabled:opacity-40 flex items-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Cartes résumé */}
      {loading ? (
        <div className="text-center py-12 text-[#5a587a]">Chargement...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#4caf7d22] rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#4caf7d]" />
                </div>
                <span className="text-xs text-[#5a587a]">Entrées du mois</span>
              </div>
              <p className="text-2xl font-bold text-[#4caf7d]">{fmt(entrees)}</p>
            </div>

            <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#d9555522] rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-[#d95555]" />
                </div>
                <span className="text-xs text-[#5a587a]">Dépenses saisies</span>
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
              <p className="text-xs text-[#5a587a] mt-1">{budget.length} postes actifs</p>
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

          {/* Contenu principal */}
          <div className="grid grid-cols-3 gap-6">

            {/* Mouvements récents */}
            <div className="col-span-2 bg-[#0a0a15] rounded-xl border border-[#22223a] p-6">
              <h2 className="text-base font-semibold text-[#e8e4d9] mb-4">Mouvements du mois</h2>
              {mouvements.length === 0 ? (
                <div className="text-center py-8 text-[#5a587a] text-sm">
                  Aucun mouvement ce mois-ci — utilise les boutons Entrée / Dépense pour commencer
                </div>
              ) : (
                <div className="space-y-2">
                  {mouvements.slice(0, 15).map(m => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] rounded-lg border border-[#22223a]">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${(m.Type as any)?.value === 'Entrée' || m.Type === 'Entrée' ? 'bg-[#4caf7d]' : 'bg-[#d95555]'}`} />
                        <div>
                          <p className="text-sm text-[#e8e4d9] font-medium">{m['Libellé']}</p>
                          <p className="text-xs text-[#5a587a]">{(m.Catégorie as any)?.value ?? m.Catégorie} · {(m.Source as any)?.value ?? m.Source} · {m.Date}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold ${(m.Type as any)?.value === 'Entrée' || m.Type === 'Entrée' ? 'text-[#4caf7d]' : 'text-[#d95555]'}`}>
                        {(m.Type as any)?.value === 'Entrée' || m.Type === 'Entrée' ? '+' : '-'}{fmt(parseFloat(String(m['Montant CHF'])) || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">

              {/* Charges fixes */}
              <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
                <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">Charges fixes actives</h3>
                <div className="space-y-2">
                  {budget.slice(0, 8).map(b => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-xs text-[#5a587a]">{b['Libellé']}</span>
                      <span className="text-xs font-semibold text-[#c9a84c]">{fmt(parseFloat(String(b.Mensuel)) || 0)}</span>
                    </div>
                  ))}
                  {budget.length > 8 && (
                    <p className="text-xs text-[#5a587a] text-center pt-1">+ {budget.length - 8} autres</p>
                  )}
                </div>
                <div className="border-t border-[#22223a] mt-3 pt-3 flex justify-between">
                  <span className="text-xs font-semibold text-[#e8e4d9]">Total</span>
                  <span className="text-xs font-bold text-[#c9a84c]">{fmt(chargesFixes)}</span>
                </div>
              </div>

              {/* Répartition dépenses */}
              {parCategorie.length > 0 && (
                <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
                  <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">Dépenses par catégorie</h3>
                  <div className="space-y-3">
                    {parCategorie.map(({ cat, total }) => (
                      <div key={cat}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-[#5a587a]">{cat}</span>
                          <span className="text-xs font-semibold text-[#e8e4d9]">{fmt(total)}</span>
                        </div>
                        <div className="w-full bg-[#0f0f1a] rounded-full h-1.5">
                          <div className="h-full rounded-full bg-[#d95555]"
                            style={{ width: `${Math.min((total / (depenses || 1)) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
};
