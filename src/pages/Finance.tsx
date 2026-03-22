import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, X, Check, RefreshCw, Pencil } from 'lucide-react';

const BASEROW_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const FINANCE_TABLE = 543;
const BUDGET_TABLE_ID = 542;

const headers = {
  Authorization: `Token ${BASEROW_TOKEN}`,
  'Content-Type': 'application/json',
};

const CATEGORIES = ['Formation', 'Logement', 'Assurance', 'Leasing', 'Social', 'Télécom', 'Divers'];
const SOURCES = ['Stripe', 'Systeme.io', 'Cash', 'Virement', 'Carte', 'Auto'];

const now = new Date();
const moisCourant = now.toISOString().slice(0, 7);
const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

type Mouvement = {
  id: number;
  Date: string;
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

type EditForm = {
  date: string;
  libelle: string;
  montant: string;
  type: string;
  source: string;
  categorie: string;
  notes: string;
};

const getVal = (field: any) => field?.value ?? field ?? '';

export const Finance = () => {
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [budget, setBudget] = useState<BudgetLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'Entrée' | 'Dépense'>('Entrée');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    date: '', libelle: '', montant: '', type: 'Entrée', source: 'Cash', categorie: 'Divers', notes: ''
  });
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10),
    libelle: '', montant: '', source: 'Cash', categorie: 'Divers', notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const finRes = await fetch(
        `${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/?user_field_names=true&size=100&order_by=-Date`,
        { headers }
      );
      const finData = await finRes.json();
      setMouvements((finData.results || []).filter((r: Mouvement) => r.Date?.startsWith(moisCourant)));

      const budRes = await fetch(
        `${BASEROW_URL}/database/rows/table/${BUDGET_TABLE_ID}/?user_field_names=true&size=100`,
        { headers }
      );
      const budData = await budRes.json();
      setBudget((budData.results || []).filter((r: BudgetLigne) =>
        r.Actif === true || r.Actif === 'VRAI' || r.Actif === '1'
      ));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const entrees = mouvements.filter(m => getVal(m.Type) === 'Entrée').reduce((s, m) => s + (parseFloat(String(m.Montant ?? 0)) || 0), 0);
  const depenses = mouvements.filter(m => getVal(m.Type) === 'Dépense').reduce((s, m) => s + (parseFloat(String(m.Montant ?? 0)) || 0), 0);
  const chargesFixes = budget.reduce((s, b) => s + (parseFloat(String(b.Mensuel)) || 0), 0);
  const balance = entrees - depenses - chargesFixes;

  const parCategorie = CATEGORIES.map(cat => ({
    cat,
    total: mouvements.filter(m => getVal(m.Type) === 'Dépense' && getVal(m.Catégorie) === cat)
      .reduce((s, m) => s + (parseFloat(String(m.Montant ?? 0)) || 0), 0),
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
          Montant: parseFloat(form.montant) || 0,
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

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce mouvement ?')) return;
    await fetch(`${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/${id}/?user_field_names=true`, {
      method: 'DELETE', headers,
    });
    fetchData();
  };

  const startEdit = (m: Mouvement) => {
    setEditingId(m.id);
    setEditForm({
      date: m.Date,
      libelle: m.Libellé,
      montant: String(m.Montant ?? ''),
      type: getVal(m.Type),
      source: getVal(m.Source),
      categorie: getVal(m.Catégorie),
      notes: m.Notes,
    });
  };

  const handleUpdate = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${FINANCE_TABLE}/${id}/?user_field_names=true`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          Date: editForm.date,
          Libellé: editForm.libelle,
          Montant: parseFloat(editForm.montant) || 0,
          Type: editForm.type,
          Source: editForm.source,
          Catégorie: editForm.categorie,
          Notes: editForm.notes,
        }),
      });
      setEditingId(null);
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const fmt = (n: number) => n.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' CHF';
  const inputCls = "w-full bg-[#0a0a15] border border-[#22223a] rounded px-2 py-1 text-xs text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e4d9]">Finances — {moisLabel}</h1>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 rounded-lg border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setFormType('Entrée'); setShowForm(true); }}
            className="px-4 py-2 bg-[#4caf7d] text-white rounded-lg text-sm font-semibold hover:bg-[#3d8f64] transition-colors flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Entrée
          </button>
          <button onClick={() => { setFormType('Dépense'); setShowForm(true); }}
            className="px-4 py-2 bg-[#d95555] text-white rounded-lg text-sm font-semibold hover:bg-[#b84444] transition-colors flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Dépense
          </button>
        </div>
      </div>

      {/* Formulaire nouvelle entrée */}
      {showForm && (
        <div className="bg-[#0a0a15] border border-[#22223a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#e8e4d9]">
              {formType === 'Entrée' ? '+ Nouvelle entrée' : '− Nouvelle dépense'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-[#5a587a] hover:text-[#e8e4d9]"><X className="w-5 h-5" /></button>
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
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#5a587a]">Chargement...</div>
      ) : (
        <>
          {/* Cartes résumé */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Entrées du mois', val: entrees, icon: <TrendingUp className="w-4 h-4 text-[#4caf7d]" />, bg: 'bg-[#4caf7d22]', color: 'text-[#4caf7d]' },
              { label: 'Dépenses saisies', val: depenses, icon: <TrendingDown className="w-4 h-4 text-[#d95555]" />, bg: 'bg-[#d9555522]', color: 'text-[#d95555]' },
              { label: 'Charges fixes', val: chargesFixes, icon: <DollarSign className="w-4 h-4 text-[#c9a84c]" />, bg: 'bg-[#c9a84c22]', color: 'text-[#c9a84c]', sub: `${budget.length} postes actifs` },
              { label: 'Balance', val: balance, icon: <TrendingUp className={`w-4 h-4 ${balance >= 0 ? 'text-[#4caf7d]' : 'text-[#d95555]'}`} />, bg: balance >= 0 ? 'bg-[#4caf7d22]' : 'bg-[#d9555522]', color: balance >= 0 ? 'text-[#4caf7d]' : 'text-[#d95555]', sub: 'Entrées − dépenses − fixes' },
            ].map((card, i) => (
              <div key={i} className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center`}>{card.icon}</div>
                  <span className="text-xs text-[#5a587a]">{card.label}</span>
                </div>
                <p className={`text-2xl font-bold ${card.color}`}>{fmt(card.val)}</p>
                {card.sub && <p className="text-xs text-[#5a587a] mt-1">{card.sub}</p>}
              </div>
            ))}
          </div>

          {/* Contenu principal */}
          <div className="grid grid-cols-3 gap-6">

            {/* Mouvements */}
            <div className="col-span-2 bg-[#0a0a15] rounded-xl border border-[#22223a] p-6">
              <h2 className="text-base font-semibold text-[#e8e4d9] mb-4">Mouvements du mois</h2>
              {mouvements.length === 0 ? (
                <div className="text-center py-8 text-[#5a587a] text-sm">
                  Aucun mouvement ce mois-ci — utilise les boutons Entrée / Dépense pour commencer
                </div>
              ) : (
                <div className="space-y-2">
                  {mouvements.map(m => (
                    <div key={m.id}>
                      {editingId === m.id ? (
                        /* Mode édition inline */
                        <div className="bg-[#0f0f1a] rounded-lg border border-[#c9a84c] p-3 space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className={inputCls} />
                            <input type="text" value={editForm.libelle} onChange={e => setEditForm({ ...editForm, libelle: e.target.value })} placeholder="Libellé" className={`${inputCls} col-span-2`} />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <input type="number" value={editForm.montant} onChange={e => setEditForm({ ...editForm, montant: e.target.value })} placeholder="Montant" className={inputCls} />
                            <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} className={inputCls}>
                              <option>Entrée</option><option>Dépense</option>
                            </select>
                            <select value={editForm.source} onChange={e => setEditForm({ ...editForm, source: e.target.value })} className={inputCls}>
                              {SOURCES.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <select value={editForm.categorie} onChange={e => setEditForm({ ...editForm, categorie: e.target.value })} className={inputCls}>
                              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-[#5a587a] hover:text-[#e8e4d9]">Annuler</button>
                            <button onClick={() => handleUpdate(m.id)} disabled={saving}
                              className="px-4 py-1 bg-[#c9a84c] text-[#05050a] rounded text-xs font-semibold flex items-center gap-1">
                              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Sauvegarder
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Mode affichage */
                        <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] rounded-lg border border-[#22223a] group hover:border-[#22223a]/80">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${getVal(m.Type) === 'Entrée' ? 'bg-[#4caf7d]' : 'bg-[#d95555]'}`} />
                            <div>
                              <p className="text-sm text-[#e8e4d9] font-medium">{m.Libellé}</p>
                              <p className="text-xs text-[#5a587a]">{getVal(m.Catégorie)} · {getVal(m.Source)} · {m.Date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className={`text-sm font-bold ${getVal(m.Type) === 'Entrée' ? 'text-[#4caf7d]' : 'text-[#d95555]'}`}>
                              {getVal(m.Type) === 'Entrée' ? '+' : '-'}{fmt(parseFloat(String(m.Montant ?? 0)) || 0)}
                            </p>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(m)} className="p-1 text-[#5a587a] hover:text-[#c9a84c] transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(m.id)} className="p-1 text-[#5a587a] hover:text-[#d95555] transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-5">
                <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">Charges fixes actives</h3>
                <div className="space-y-2">
                  {budget.slice(0, 8).map(b => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-xs text-[#5a587a]">{b['Libellé']}</span>
                      <span className="text-xs font-semibold text-[#c9a84c]">{fmt(parseFloat(String(b.Mensuel)) || 0)}</span>
                    </div>
                  ))}
                  {budget.length > 8 && <p className="text-xs text-[#5a587a] text-center pt-1">+ {budget.length - 8} autres</p>}
                </div>
                <div className="border-t border-[#22223a] mt-3 pt-3 flex justify-between">
                  <span className="text-xs font-semibold text-[#e8e4d9]">Total</span>
                  <span className="text-xs font-bold text-[#c9a84c]">{fmt(chargesFixes)}</span>
                </div>
              </div>

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
