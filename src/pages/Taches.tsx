import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, CheckCircle2, Circle, AlertTriangle, RotateCcw, Calendar, Columns, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_ID = 536;
const HEADERS = { 'Authorization': `Token ${TOKEN}`, 'Content-Type': 'application/json' };

const PROJETS = ['', 'Formation', 'Cours en ligne', 'Admin', 'Recrutement', 'Publications', 'Routines'];
const PRIORITES = ['Normale', 'Haute', 'Basse'];
const RECURRENCES = ['Aucune', 'Quotidienne', 'Hebdomadaire', 'Mensuelle'];
const STATUTS = ['À faire', 'En cours', 'Fait'];

const KANBAN_COLS = [
  { id: 'À faire',  label: 'À faire',  color: '#5a587a', bg: '#0f0f1a', accent: '#33335a' },
  { id: 'En cours', label: 'En cours', color: '#c9a84c', bg: '#1a1500', accent: '#3a2e00' },
  { id: 'Fait',     label: 'Fait',     color: '#4caf7d', bg: '#001a0d', accent: '#003320' },
];

type View = 'kanban' | 'today' | 'calendar';

interface Task {
  id: number;
  Titre?: string;
  Description?: string;
  Projet?: { id: number; value: string; color: string } | null;
  Priorité?: { id: number; value: string; color: string } | null;
  Statut?: { id: number; value: string; color: string } | null;
  Récurrence?: { id: number; value: string; color: string } | null;
  Fait?: boolean;
  'Date échéance'?: string;
  'Date faite'?: string;
}

interface NewTaskForm {
  Titre: string;
  Description: string;
  Projet: string;
  Priorité: string;
  Statut: string;
  'Date échéance': string;
  Récurrence: string;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function getVal(f: any): string { if (!f) return ''; if (typeof f === 'object' && 'value' in f) return f.value; return String(f); }

function isOverdue(t: Task) {
  if (!t['Date échéance'] || getVal(t.Statut) === 'Fait') return false;
  return t['Date échéance'].split('T')[0] < todayStr();
}

function PrioBadge({ prio }: { prio: string }) {
  if (!prio || prio === 'Normale') return null;
  const s: Record<string, string> = {
    Haute: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
    Basse: 'bg-[#22223a] text-[#5a587a] border border-[#22223a]',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s[prio] || ''}`}>{prio}</span>;
}

function ProjetBadge({ projet }: { projet: string }) {
  if (!projet) return null;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] text-[#8884a8] border border-[#22223a]">{projet}</span>;
}

// ─── MODAL CRÉATION ──────────────────────────────────────────
function TaskModal({ onClose, onSave, defaultStatut = 'À faire' }: {
  onClose: () => void;
  onSave: (task: Task) => void;
  defaultStatut?: string;
}) {
  const [form, setForm] = useState<NewTaskForm>({
    Titre: '', Description: '', Projet: '', Priorité: 'Normale',
    Statut: defaultStatut, 'Date échéance': todayStr(), Récurrence: 'Aucune',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof NewTaskForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!form.Titre.trim()) { setError('Le titre est obligatoire'); return; }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        Titre: form.Titre.trim(),
        Description: form.Description.trim() || null,
        Fait: form.Statut === 'Fait',
        'Date échéance': form['Date échéance'] || null,
      };
      if (form.Projet) body['Projet'] = form.Projet;
      if (form.Priorité) body['Priorité'] = form.Priorité;
      if (form.Statut) body['Statut'] = form.Statut;
      if (form.Récurrence && form.Récurrence !== 'Aucune') body['Récurrence'] = form.Récurrence;

      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(JSON.stringify(e)); }
      const created = await res.json();
      onSave(created);
    } catch (e: any) {
      setError('Erreur : ' + e.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0a0a15] border border-[#22223a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#e8e4d9]">Nouvelle tâche</h2>
          <button onClick={onClose} className="text-[#5a587a] hover:text-[#e8e4d9]"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-xs rounded-lg p-3 mb-4">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#5a587a] mb-1.5 block">Titre *</label>
            <input autoFocus className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
              placeholder="Nom de la tâche" value={form.Titre} onChange={e => set('Titre', e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
          </div>
          <div>
            <label className="text-xs text-[#5a587a] mb-1.5 block">Description</label>
            <textarea className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50 resize-none h-16"
              placeholder="Infos complémentaires..." value={form.Description} onChange={e => set('Description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#5a587a] mb-1.5 block">Projet</label>
              <select className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Projet} onChange={e => set('Projet', e.target.value)}>
                {PROJETS.map(p => <option key={p} value={p}>{p || '— Choisir —'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1.5 block">Priorité</label>
              <select className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Priorité} onChange={e => set('Priorité', e.target.value)}>
                {PRIORITES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#5a587a] mb-1.5 block">Statut</label>
              <select className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Statut} onChange={e => set('Statut', e.target.value)}>
                {STATUTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#5a587a] mb-1.5 block">Récurrence</label>
              <select className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Récurrence} onChange={e => set('Récurrence', e.target.value)}>
                {RECURRENCES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#5a587a] mb-1.5 block">Date d'échéance</label>
            <input type="date" className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
              value={form['Date échéance']} onChange={e => set('Date échéance', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#5a587a] hover:text-[#e8e4d9] transition-colors">Annuler</button>
          <button onClick={save} disabled={saving || !form.Titre.trim()}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#e8c97a] text-sm font-medium hover:from-[#c9a84c]/30 transition-all disabled:opacity-40">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARTE TÂCHE ─────────────────────────────────────────────
function TaskCard({ task, onStatusChange, compact = false }: {
  task: Task;
  onStatusChange: (id: number, statut: string) => void;
  compact?: boolean;
}) {
  const statut = getVal(task.Statut);
  const prio = getVal(task.Priorité);
  const projet = getVal(task.Projet);
  const rec = getVal(task.Récurrence);
  const overdue = isOverdue(task);
  const done = statut === 'Fait';

  return (
    <div className={`bg-[#0f0f1a] border rounded-xl p-3 transition-all duration-200 group
      ${done ? 'border-[#1a1a2e] opacity-60' : overdue ? 'border-amber-800/40' : 'border-[#22223a] hover:border-[#33335a]'}`}>
      <div className="flex items-start gap-2">
        <button onClick={() => onStatusChange(task.id, done ? 'À faire' : statut === 'À faire' ? 'En cours' : 'Fait')}
          className="mt-0.5 flex-shrink-0 transition-all hover:scale-110">
          {done
            ? <CheckCircle2 className="w-4 h-4 text-[#4caf7d]" />
            : statut === 'En cours'
              ? <Circle className="w-4 h-4 text-[#c9a84c]" />
              : <Circle className={`w-4 h-4 ${overdue ? 'text-amber-500' : 'text-[#33335a] group-hover:text-[#5a587a]'}`} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight ${done ? 'line-through text-[#5a587a]' : 'text-[#e8e4d9]'}`}>
            {task.Titre || '(Sans titre)'}
          </p>
          {!compact && task.Description && (
            <p className="text-xs text-[#5a587a] mt-1 line-clamp-2">{task.Description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <PrioBadge prio={prio} />
            <ProjetBadge projet={projet} />
            {overdue && !done && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-900/30 border border-amber-800/40 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5" />En retard
              </span>
            )}
            {rec && rec !== 'Aucune' && (
              <span className="flex items-center gap-1 text-[10px] text-[#5a587a]">
                <RotateCcw className="w-2.5 h-2.5" />{rec}
              </span>
            )}
            {task['Date échéance'] && (
              <span className="text-[10px] text-[#5a587a]">
                {new Date(task['Date échéance']).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VUE KANBAN ──────────────────────────────────────────────
function KanbanView({ tasks, onStatusChange, onAddInCol }: {
  tasks: Task[];
  onStatusChange: (id: number, statut: string) => void;
  onAddInCol: (statut: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {KANBAN_COLS.map(col => {
        const colTasks = tasks.filter(t => getVal(t.Statut) === col.id || (!t.Statut && col.id === 'À faire'));
        return (
          <div key={col.id} className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: col.color }}>{col.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#0a0a15] border border-[#22223a] text-[#5a587a]">{colTasks.length}</span>
              </div>
              <button onClick={() => onAddInCol(col.id)}
                className="text-[#5a587a] hover:text-[#e8e4d9] transition-colors p-1 rounded hover:bg-[#22223a]">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {colTasks.length === 0 && (
                <div className="border border-dashed border-[#22223a] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#33335a]">Aucune tâche</p>
                </div>
              )}
              {colTasks.map(t => (
                <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} compact />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── VUE AUJOURD'HUI ─────────────────────────────────────────
function TodayView({ tasks, onStatusChange }: {
  tasks: Task[];
  onStatusChange: (id: number, statut: string) => void;
}) {
  const today = todayStr();
  const todayTasks = tasks.filter(t => {
    const d = t['Date échéance']?.split('T')[0];
    return !d || d === today || d < today;
  });
  const overdue = todayTasks.filter(t => isOverdue(t));
  const pending = todayTasks.filter(t => getVal(t.Statut) !== 'Fait' && !isOverdue(t));
  const inprogress = tasks.filter(t => getVal(t.Statut) === 'En cours');
  const done = todayTasks.filter(t => getVal(t.Statut) === 'Fait');

  const Section = ({ title, items, color }: { title: string; items: Task[]; color: string }) => (
    items.length > 0 ? (
      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color }}>{title}</p>
        <div className="space-y-2">{items.map(t => <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} />)}</div>
      </div>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'À faire', value: pending.length, color: 'text-[#e8e4d9]' },
          { label: 'En cours', value: inprogress.length, color: 'text-[#c9a84c]' },
          { label: 'Faites', value: done.length, color: 'text-[#4caf7d]' },
          { label: 'En retard', value: overdue.length, color: overdue.length > 0 ? 'text-amber-400' : 'text-[#5a587a]' },
        ].map(s => (
          <div key={s.label} className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-3">
            <p className="text-xs text-[#5a587a] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {overdue.length === 0 && pending.length === 0 && inprogress.length === 0 && done.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-[#4caf7d]/40 mx-auto mb-3" />
          <p className="text-[#5a587a] text-sm">Aucune tâche pour aujourd'hui</p>
        </div>
      )}
      <Section title="En retard — à traiter" items={overdue} color="#f59e0b" />
      <Section title="En cours" items={inprogress} color="#c9a84c" />
      <Section title="À faire aujourd'hui" items={pending} color="#5a587a" />
      <Section title="Faites" items={done} color="#4caf7d" />
    </div>
  );
}

// ─── VUE CALENDRIER ──────────────────────────────────────────
function CalendarView({ tasks, onStatusChange }: {
  tasks: Task[];
  onStatusChange: (id: number, statut: string) => void;
}) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const tasksByDate: Record<string, Task[]> = {};
  tasks.forEach(t => {
    if (t['Date échéance']) {
      const d = t['Date échéance'].split('T')[0];
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(t);
    }
  });

  const selectedTasks = selected ? (tasksByDate[selected] || []) : [];
  const monthName = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: selected ? '1fr 320px' : '1fr' }}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] hover:border-[#33335a] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[#e8e4d9] capitalize">{monthName}</span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] hover:border-[#33335a] transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="text-center text-xs text-[#5a587a] font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDate[dateStr] || [];
            const isToday = dateStr === todayStr();
            const isPast = dateStr < todayStr();
            const isSelected = dateStr === selected;
            const hasPending = dayTasks.some(t => getVal(t.Statut) !== 'Fait');
            const hasDone = dayTasks.some(t => getVal(t.Statut) === 'Fait');

            return (
              <button key={day} onClick={() => setSelected(isSelected ? null : dateStr)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 pb-1 px-1 transition-all text-xs
                  ${isSelected ? 'bg-[#c9a84c]/20 border border-[#c9a84c]/40' : 'hover:bg-[#22223a] border border-transparent'}
                  ${isToday ? 'border-[#c9a84c]/30' : ''}`}>
                <span className={`font-medium text-[11px] ${isToday ? 'text-[#c9a84c]' : isPast ? 'text-[#33335a]' : 'text-[#e8e4d9]'}`}>{day}</span>
                {dayTasks.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />}
                    {hasDone && <span className="w-1.5 h-1.5 rounded-full bg-[#4caf7d]" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="bg-[#0a0a15] border border-[#22223a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#e8e4d9]">
              {new Date(selected).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button onClick={() => setSelected(null)} className="text-[#5a587a] hover:text-[#e8e4d9]"><X className="w-4 h-4" /></button>
          </div>
          {selectedTasks.length === 0
            ? <p className="text-xs text-[#5a587a]">Aucune tâche ce jour</p>
            : <div className="space-y-2">{selectedTasks.map(t => <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} compact />)}</div>
          }
        </div>
      )}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export const Taches = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('today');
  const [showModal, setShowModal] = useState(false);
  const [defaultStatut, setDefaultStatut] = useState('À faire');

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const loadTasks = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true&size=200`, { headers: HEADERS });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setTasks(data.results || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function updateStatut(id: number, statut: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, Statut: { id: 0, value: statut, color: '' }, Fait: statut === 'Fait' } : t));
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ID}/${id}/?user_field_names=true`, {
        method: 'PATCH', headers: HEADERS,
        body: JSON.stringify({ Statut: statut, Fait: statut === 'Fait' }),
      });
    } catch { loadTasks(); }
  }

  function handleAddInCol(statut: string) { setDefaultStatut(statut); setShowModal(true); }

  function handleSaved(task: Task) { setTasks(prev => [task, ...prev]); setShowModal(false); }

  const VIEWS: { id: View; label: string; icon: any }[] = [
    { id: 'today', label: "Aujourd'hui", icon: Clock },
    { id: 'kanban', label: 'Kanban', icon: Columns },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
  ];

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e4d9]">Tâches</h1>
          <p className="text-sm text-[#5a587a] mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Switcher de vue */}
          <div className="flex items-center bg-[#0a0a15] border border-[#22223a] rounded-lg p-1 gap-1">
            {VIEWS.map(v => {
              const Icon = v.icon;
              return (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${view === v.id ? 'bg-[#22223a] text-[#e8c97a]' : 'text-[#5a587a] hover:text-[#e8e4d9]'}`}>
                  <Icon className="w-3.5 h-3.5" />{v.label}
                </button>
              );
            })}
          </div>
          <button onClick={loadTasks} className="p-2 rounded-lg border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] hover:border-[#33335a] transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setDefaultStatut('À faire'); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#e8c97a] hover:from-[#c9a84c]/30 transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />Nouvelle tâche
          </button>
        </div>
      </div>

      {error && <div className="bg-red-950/30 border border-red-800/40 text-red-400 text-sm rounded-xl p-4">{error}</div>}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#5a587a]" />
            <p className="text-sm text-[#5a587a]">Chargement des tâches...</p>
          </div>
        </div>
      ) : (
        <div className={`flex-1 ${view === 'kanban' ? 'min-h-0' : ''}`}>
          {view === 'today' && <TodayView tasks={tasks} onStatusChange={updateStatut} />}
          {view === 'kanban' && <KanbanView tasks={tasks} onStatusChange={updateStatut} onAddInCol={handleAddInCol} />}
          {view === 'calendar' && <CalendarView tasks={tasks} onStatusChange={updateStatut} />}
        </div>
      )}

      {showModal && <TaskModal onClose={() => setShowModal(false)} onSave={handleSaved} defaultStatut={defaultStatut} />}
    </div>
  );
};
