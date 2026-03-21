import { useState, useEffect } from 'react';
import { Plus, RefreshCw, CheckCircle2, Circle, AlertTriangle, RotateCcw } from 'lucide-react';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_ID = 536;

const HEADERS = {
  'Authorization': `Token ${TOKEN}`,
  'Content-Type': 'application/json',
};

const PROJETS = ['Formation', 'Cours en ligne', 'Admin', 'Recrutement', 'Publications', 'Routines'];
const PRIORITES = ['Haute', 'Normale', 'Basse'];
const RECURRENCES = ['Aucune', 'Quotidienne', 'Hebdomadaire', 'Mensuelle'];

interface Task {
  id: number;
  Titre: string;
  Description?: string;
  Projet?: { value: string } | string;
  Priorité?: { value: string } | string;
  'Date échéance'?: string;
  Récurrence?: { value: string } | string;
  Fait?: boolean;
  'Date faite'?: string;
}

interface NewTask {
  Titre: string;
  Description: string;
  Projet: string;
  Priorité: string;
  'Date échéance': string;
  Récurrence: string;
}

function getVal(field: { value: string } | string | undefined): string {
  if (!field) return '';
  if (typeof field === 'object' && 'value' in field) return field.value;
  return field as string;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isOverdue(task: Task): boolean {
  if (!task['Date échéance'] || task.Fait) return false;
  return task['Date échéance'].split('T')[0] < todayStr();
}

function isForToday(task: Task): boolean {
  if (!task['Date échéance']) return true;
  return task['Date échéance'].split('T')[0] <= todayStr();
}

function PrioBadge({ prio }: { prio: string }) {
  if (!prio || prio === 'Normale') return null;
  const styles: Record<string, string> = {
    Haute: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
    Basse: 'bg-[#22223a] text-[#5a587a] border border-[#22223a]',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[prio] || ''}`}>
      {prio}
    </span>
  );
}

function ProjetBadge({ projet }: { projet: string }) {
  if (!projet) return null;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] text-[#8884a8] border border-[#22223a]">
      {projet}
    </span>
  );
}

function RecBadge({ rec }: { rec: string }) {
  if (!rec || rec === 'Aucune') return null;
  return (
    <span className="flex items-center gap-1 text-[10px] text-[#5a587a]">
      <RotateCcw className="w-3 h-3" />
      {rec}
    </span>
  );
}

export const Taches = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [newTask, setNewTask] = useState<NewTask>({
    Titre: '',
    Description: '',
    Projet: '',
    Priorité: 'Normale',
    'Date échéance': todayStr(),
    Récurrence: 'Aucune',
  });

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  async function loadTasks() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true&size=200`,
        { headers: HEADERS }
      );
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setTasks(data.results || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion à Baserow');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  async function toggleDone(task: Task) {
    setTogglingId(task.id);
    const newVal = !task.Fait;
    const body: Record<string, any> = { Fait: newVal };
    if (newVal) body['Date faite'] = todayStr();

    try {
      await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_ID}/${task.id}/?user_field_names=true`,
        { method: 'PATCH', headers: HEADERS, body: JSON.stringify(body) }
      );
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, Fait: newVal, 'Date faite': newVal ? todayStr() : undefined } : t
      ));
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setTogglingId(null);
    }
  }

  async function saveTask() {
    if (!newTask.Titre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${BASEROW_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true`,
        { method: 'POST', headers: HEADERS, body: JSON.stringify({ ...newTask, Fait: false }) }
      );
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const created = await res.json();
      setTasks(prev => [created, ...prev]);
      setShowModal(false);
      setNewTask({ Titre: '', Description: '', Projet: '', Priorité: 'Normale', 'Date échéance': todayStr(), Récurrence: 'Aucune' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const todayTasks = tasks.filter(t => isForToday(t));
  const overdueTasks = todayTasks.filter(t => isOverdue(t));

  const applyFilter = (list: Task[]) => {
    if (filter === 'all') return list;
    if (filter === 'haute') return list.filter(t => getVal(t.Priorité) === 'Haute');
    return list.filter(t => getVal(t.Projet) === filter);
  };

  const pending = applyFilter(todayTasks.filter(t => !t.Fait && !isOverdue(t)));
  const done = applyFilter(todayTasks.filter(t => t.Fait));
  const overdueFiltered = applyFilter(overdueTasks);

  const statTodo = todayTasks.filter(t => !t.Fait).length;
  const statDone = tasks.filter(t => t.Fait && t['Date faite'] === todayStr()).length;
  const statOverdue = overdueTasks.length;

  const TaskCard = ({ task }: { task: Task }) => {
    const overdue = isOverdue(task);
    const prio = getVal(task.Priorité);
    const projet = getVal(task.Projet);
    const rec = getVal(task.Récurrence);
    const dateEch = task['Date échéance']?.split('T')[0];
    const isToggling = togglingId === task.id;

    return (
      <div className={`
        flex items-start gap-3 p-4 rounded-xl border transition-all duration-200
        ${task.Fait
          ? 'bg-[#0a0a15]/50 border-[#1a1a2e] opacity-60'
          : overdue
            ? 'bg-amber-950/20 border-amber-800/40'
            : 'bg-[#0f0f1a] border-[#22223a] hover:border-[#33335a]'
        }
      `}>
        <button
          onClick={() => toggleDone(task)}
          disabled={isToggling}
          className={`mt-0.5 flex-shrink-0 transition-all duration-200 ${isToggling ? 'opacity-40' : 'hover:scale-110'}`}
        >
          {task.Fait
            ? <CheckCircle2 className="w-5 h-5 text-[#4caf7d]" />
            : <Circle className={`w-5 h-5 ${overdue ? 'text-amber-500' : 'text-[#33335a] hover:text-[#c9a84c]'}`} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${task.Fait ? 'line-through text-[#5a587a]' : 'text-[#e8e4d9]'}`}>
              {task.Titre || '(Sans titre)'}
            </span>
            <PrioBadge prio={prio} />
            <ProjetBadge projet={projet} />
            {overdue && !task.Fait && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-900/30 border border-amber-800/40 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                En retard
              </span>
            )}
          </div>

          {task.Description && (
            <p className="text-xs text-[#5a587a] mt-1 truncate">{task.Description}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {dateEch && overdue && !task.Fait && (
              <span className="text-[10px] text-amber-600">Échéance : {formatDate(dateEch)}</span>
            )}
            <RecBadge rec={rec} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e4d9]">Tâches du jour</h1>
          <p className="text-sm text-[#5a587a] mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTasks}
            className="p-2 rounded-lg border border-[#22223a] text-[#5a587a] hover:text-[#e8e4d9] hover:border-[#33335a] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#e8c97a] hover:from-[#c9a84c]/30 hover:to-[#e8c97a]/30 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'À faire', value: statTodo, color: 'text-[#e8e4d9]' },
          { label: "Faites aujourd'hui", value: statDone, color: 'text-[#4caf7d]' },
          { label: 'En retard', value: statOverdue, color: statOverdue > 0 ? 'text-amber-400' : 'text-[#5a587a]' },
        ].map(s => (
          <div key={s.label} className="bg-[#0a0a15] rounded-xl border border-[#22223a] p-4">
            <p className="text-xs text-[#5a587a] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'haute', label: 'Urgentes' },
          { id: 'Formation', label: 'Formation' },
          { id: 'Admin', label: 'Admin' },
          { id: 'Publications', label: 'Publications' },
          { id: 'Routines', label: 'Routines' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filter === f.id
                ? 'bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#e8c97a]'
                : 'border-[#22223a] text-[#5a587a] hover:border-[#33335a] hover:text-[#8884a8]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/40 text-red-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="text-center py-16 text-[#5a587a]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement des tâches...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* En retard */}
          {overdueFiltered.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-500/80 uppercase tracking-widest mb-3">
                En retard — à traiter
              </p>
              <div className="space-y-2">
                {overdueFiltered.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {/* À faire */}
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#5a587a] uppercase tracking-widest mb-3">
                À faire aujourd'hui
              </p>
              <div className="space-y-2">
                {pending.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {/* Vide */}
          {pending.length === 0 && overdueFiltered.length === 0 && done.length === 0 && (
            <div className="text-center py-16">
              <CheckCircle2 className="w-10 h-10 text-[#4caf7d]/40 mx-auto mb-3" />
              <p className="text-[#5a587a] text-sm">Aucune tâche pour aujourd'hui</p>
              <p className="text-[#33335a] text-xs mt-1">Clique sur "Nouvelle tâche" pour commencer</p>
            </div>
          )}

          {/* Faites */}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#4caf7d]/60 uppercase tracking-widest mb-3">
                Faites
              </p>
              <div className="space-y-2">
                {done.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal nouvelle tâche */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a15] border border-[#22223a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-[#e8e4d9] mb-5">Nouvelle tâche</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#5a587a] mb-1.5 block">Titre</label>
                <input
                  autoFocus
                  className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                  placeholder="Nom de la tâche"
                  value={newTask.Titre}
                  onChange={e => setNewTask(p => ({ ...p, Titre: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveTask()}
                />
              </div>

              <div>
                <label className="text-xs text-[#5a587a] mb-1.5 block">Description</label>
                <textarea
                  className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50 resize-none h-20"
                  placeholder="Infos complémentaires..."
                  value={newTask.Description}
                  onChange={e => setNewTask(p => ({ ...p, Description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#5a587a] mb-1.5 block">Projet</label>
                  <select
                    className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                    value={newTask.Projet}
                    onChange={e => setNewTask(p => ({ ...p, Projet: e.target.value }))}
                  >
                    <option value="">— Choisir —</option>
                    {PROJETS.map(pr => <option key={pr}>{pr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#5a587a] mb-1.5 block">Priorité</label>
                  <select
                    className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                    value={newTask.Priorité}
                    onChange={e => setNewTask(p => ({ ...p, Priorité: e.target.value }))}
                  >
                    {PRIORITES.map(pr => <option key={pr}>{pr}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#5a587a] mb-1.5 block">Date d'échéance</label>
                  <input
                    type="date"
                    className="w-full bg-[#0f0f1a] border border-[#22223a] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                    value={newTask['Date échéance']}
                    onChange={e => setNewTask(p => ({ ...p, 'Date échéance': e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#5a587a] mb-1.5 block">Récurrence</label>
                  <select
                    className="w-full bg-[#0f0f1a] border border-[#22marinea] rounded-lg px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#c9a84c]/50"
                    value={newTask.Récurrence}
                    onChange={e => setNewTask(p => ({ ...p, Récurrence: e.target.value }))}
                  >
                    {RECURRENCES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-[#5a587a] hover:text-[#e8e4d9] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveTask}
                disabled={saving || !newTask.Titre.trim()}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#e8c97a] text-sm font-medium hover:from-[#c9a84c]/30 hover:to-[#e8c97a]/30 transition-all disabled:opacity-40"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
