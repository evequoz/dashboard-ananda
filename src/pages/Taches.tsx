import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, RefreshCw, CheckCircle2, Circle, AlertTriangle,
  RotateCcw, Calendar, Columns, Clock, ChevronLeft,
  ChevronRight, X, ChevronDown, ChevronRight as ChevronR, Pencil, Trash2, Sparkles
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  createTaskLegacy,
  deleteTaskLegacy,
  listTaskRows,
  processDueRecurringTasks,
  updateTaskLegacy,
} from '../data/supabaseApi';
import { generateTaskPlan, type PlannedTask } from '../lib/taskPlannerService';

const PROJETS = ['', 'Formation', 'Cours en ligne', 'Admin', 'Recrutement', 'Publications', 'Routines'];
const PRIORITES = ['Normale', 'Haute', 'Basse'];
const RECURRENCES = ['Aucune', 'Quotidienne', 'Hebdomadaire', 'Mensuelle'];
const STATUTS = ['À faire', 'En cours', 'Fait'];
const KANBAN_COLS = [
  { id: 'À faire',  color: '#5a587a' },
  { id: 'En cours', color: '#c9a84c' },
  { id: 'Fait',     color: '#4caf7d' },
];

type View = 'kanban' | 'today' | 'calendar';

interface Task {
  id: number;
  Titre?: string;
  Description?: string;
  Projet?: unknown;
  Priorité?: unknown;
  Statut?: unknown;
  Récurrence?: unknown;
  Fait?: boolean;
  'Date échéance'?: string;
  'Date faite'?: string;
  'Tâche parente'?: Array<{ id?: number }>;
}

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  statut: string;
  parent?: Task | null;
  task?: Task | null;
}

interface PlannerModalProps {
  onClose: () => void;
  onApply: (tasks: PlannedTask[]) => Promise<void>;
}

interface PlanHistoryEntry {
  id: string;
  goal: string;
  createdAt: string;
  tasks: PlannedTask[];
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

function dateToLocalIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function todayStr() { return dateToLocalIso(new Date()); }
function extractDatePart(value?: string) {
  if (!value) return '';
  return value.split('T')[0];
}
function formatDateLabel(value?: string) {
  const iso = extractDatePart(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erreur inconnue';
}
function getVal(f: unknown): string {
  if (!f) return '';
  if (Array.isArray(f)) return (f[0] as { value?: string } | undefined)?.value ?? '';
  if (typeof f === 'object' && 'value' in f) return String((f as { value?: unknown }).value ?? '');
  return String(f);
}
function isOverdue(t: Task) {
  if (!t['Date échéance'] || getVal(t.Statut) === 'Fait') return false;
  return extractDatePart(t['Date échéance']) < todayStr();
}
function getParentId(t: Task): number | null {
  const p = t['Tâche parente'];
  if (!p || !Array.isArray(p) || p.length === 0) return null;
  return p[0].id ?? null;
}

function normalizePriority(value?: string): 'Basse' | 'Normale' | 'Haute' {
  if (value === 'Basse' || value === 'Haute') return value;
  return 'Normale';
}

function buildChildrenMap(tasks: Task[]) {
  const map: Record<number, Task[]> = {};
  for (const task of tasks) {
    const parentId = getParentId(task);
    if (parentId === null) continue;
    if (!map[parentId]) map[parentId] = [];
    map[parentId].push(task);
  }
  return map;
}

function sortTasksForDisplay(items: Task[]) {
  return [...items].sort((a, b) => {
    const aDone = getVal(a.Statut) === 'Fait';
    const bDone = getVal(b.Statut) === 'Fait';
    if (aDone !== bDone) return aDone ? 1 : -1;

    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const prioRank: Record<string, number> = { Haute: 0, Normale: 1, Basse: 2 };
    const prioDiff = (prioRank[getVal(a.Priorité)] ?? 1) - (prioRank[getVal(b.Priorité)] ?? 1);
    if (prioDiff !== 0) return prioDiff;

    const aDue = extractDatePart(a['Date échéance']) || '9999-12-31';
    const bDue = extractDatePart(b['Date échéance']) || '9999-12-31';
    if (aDue !== bDue) return aDue.localeCompare(bDue);

    return (a.Titre || '').localeCompare(b.Titre || '', 'fr');
  });
}

function PrioBadge({ prio }: { prio: string }) {
  if (!prio || prio === 'Normale') return null;
  const s: Record<string, string> = {
    Haute: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
    Basse: 'bg-[var(--border)] text-[var(--text-muted)] border border-[var(--border-hover)]',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s[prio] || ''}`}>{prio}</span>;
}

function ProjetBadge({ projet }: { projet: string }) {
  if (!projet) return null;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]">{projet}</span>;
}

// ─── MODAL CRÉATION / ÉDITION ─────────────────────────────────
function TaskModal({ onClose, onSave, onUpdate, mode, task, defaultStatut = 'À faire', parentTask }: {
  onClose: () => void;
  onSave: (task: Task) => void;
  onUpdate: (task: Task) => void;
  mode: 'create' | 'edit';
  task?: Task | null;
  defaultStatut?: string;
  parentTask?: Task | null;
}) {
  const getInitialVal = (field: unknown): string => {
    if (!field) return '';
    if (Array.isArray(field)) return field[0]?.value ?? '';
    if (typeof field === 'object' && 'value' in field) return String((field as { value?: unknown }).value ?? '');
    return String(field);
  };
  const getInitialDate = (d: unknown) => {
    if (!d) return todayStr();
    return String(d).split('T')[0];
  };

  const [form, setForm] = useState({
    Titre: mode === 'edit' ? (task?.Titre || '') : '',
    Description: mode === 'edit' ? (task?.Description || '') : '',
    Projet: mode === 'edit' ? getInitialVal(task?.Projet) : '',
    Priorité: mode === 'edit' ? (getInitialVal(task?.Priorité) || 'Normale') : 'Normale',
    Statut: mode === 'edit' ? (getInitialVal(task?.Statut) || defaultStatut) : defaultStatut,
    'Date échéance': mode === 'edit' ? getInitialDate(task?.['Date échéance']) : todayStr(),
    Récurrence: mode === 'edit' ? (getInitialVal(task?.Récurrence) || 'Aucune') : 'Aucune',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!form.Titre.trim()) { setError('Le titre est obligatoire'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        Titre: form.Titre.trim(),
        Description: form.Description.trim() || null,
        Fait: form.Statut === 'Fait',
        'Date échéance': form['Date échéance'] || null,
        Statut: form.Statut,
      };
      if (form.Projet) body['Projet'] = form.Projet;
      if (form.Priorité) body['Priorité'] = form.Priorité;
      if (form.Récurrence && form.Récurrence !== 'Aucune') body['Récurrence'] = form.Récurrence;
      if (parentTask) body['Tâche parente'] = [parentTask.id];

      if (mode === 'edit' && task) {
        const updated = await updateTaskLegacy(task.id, body);
        onUpdate(updated as unknown as Task);
      } else {
        const created = await createTaskLegacy(body);
        onSave(created as unknown as Task);
      }
    } catch (e: unknown) { setError('Erreur : ' + getErrorMessage(e)); setSaving(false); }
  }

  const title = mode === 'edit'
    ? `Modifier "${task?.Titre || 'la tâche'}"`
    : parentTask
      ? `Sous-tâche de "${parentTask.Titre}"`
      : 'Nouvelle tâche';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
            {parentTask && mode === 'create' && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Sera rattachée à la tâche parente</p>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-xs rounded-lg p-3 mb-4">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Titre *</label>
            <input autoFocus className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
              placeholder="Nom de la tâche" value={form.Titre}
              onChange={e => set('Titre', e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Description</label>
            <textarea className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50 resize-none h-16"
              placeholder="Infos complémentaires..." value={form.Description}
              onChange={e => set('Description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Projet</label>
              <select className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Projet} onChange={e => set('Projet', e.target.value)}>
                {PROJETS.map(p => <option key={p} value={p}>{p || '— Choisir —'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Priorité</label>
              <select className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Priorité} onChange={e => set('Priorité', e.target.value)}>
                {PRIORITES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Statut</label>
              <select className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Statut} onChange={e => set('Statut', e.target.value)}>
                {STATUTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Récurrence</label>
              <select className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
                value={form.Récurrence} onChange={e => set('Récurrence', e.target.value)}>
                {RECURRENCES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Date d'échéance</label>
            <input type="date" className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c9a84c]/50"
              value={form['Date échéance']} onChange={e => set('Date échéance', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Annuler</button>
          <button onClick={save} disabled={saving || !form.Titre.trim()}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] text-sm font-medium hover:from-[#c9a84c]/30 transition-all disabled:opacity-40">
            {saving ? 'Enregistrement...' : mode === 'edit' ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlannerModal({ onClose, onApply }: PlannerModalProps) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<PlannedTask[] | null>(null);
  const [history, setHistory] = useState<PlanHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dashboard-ai-task-plans');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {
      // Ignore corrupted history.
    }
  }, []);

  const saveHistory = (entry: PlanHistoryEntry) => {
    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
    localStorage.setItem('dashboard-ai-task-plans', JSON.stringify(next));
  };

  const generate = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setError('');
    try {
      const generated = await generateTaskPlan(goal.trim());
      setPlan(generated.tasks || []);
      saveHistory({
        id: `${Date.now()}`,
        goal: goal.trim(),
        createdAt: new Date().toISOString(),
        tasks: generated.tasks || [],
      });
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Erreur de génération IA.");
    } finally {
      setLoading(false);
    }
  };

  const applyPlan = async () => {
    if (!plan?.length) return;
    setApplying(true);
    setError('');
    try {
      await onApply(plan);
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Erreur lors de la création des tâches.");
    } finally {
      setApplying(false);
    }
  };

  const renderNode = (task: PlannedTask, depth = 0) => (
    <div className={`${depth > 0 ? 'ml-4 border-l border-[#2b2b45] pl-3' : ''}`}>
      <div className="text-sm text-[var(--text-primary)] font-medium">{task.title}</div>
      {task.description && <div className="text-xs text-[var(--text-muted)] mt-0.5">{task.description}</div>}
      <div className="text-[10px] text-[var(--text-muted)] mt-1">
        {normalizePriority(task.priority)}{task.project ? ` · ${task.project}` : ''}{task.due_date ? ` · ${task.due_date}` : ''}
      </div>
      {!!task.subtasks?.length && (
        <div className="mt-2 space-y-2">
          {task.subtasks.map((sub, idx) => <div key={`${sub.title}-${idx}`}>{renderNode(sub, depth + 1)}</div>)}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Planifier avec IA</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3 overflow-y-auto pr-1">
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Ex: Préparer le lancement de la formation de mai et organiser les relances email."
            className="w-full h-24 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[#c9a84c]/50"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={generate}
              disabled={loading || !goal.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] text-sm font-medium disabled:opacity-40"
            >
              {loading ? 'Génération...' : 'Générer le plan'}
            </button>
            {plan && <span className="text-xs text-[var(--text-muted)]">{plan.length} tâche(s) principale(s)</span>}
          </div>
          {error && <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-xs rounded-lg p-3">{error}</div>}
          {plan && (
            <div className="max-h-80 overflow-y-auto border border-[var(--border)] rounded-lg p-3 space-y-3">
              {plan.map((task, idx) => <div key={`${task.title}-${idx}`}>{renderNode(task)}</div>)}
            </div>
          )}
          {history.length > 0 && (
            <div className="border border-[var(--border)] rounded-lg p-3">
              <div className="text-xs text-[var(--text-muted)] mb-2">Historique (10 derniers)</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setGoal(item.goal); setPlan(item.tasks); }}
                    className="w-full text-left px-2 py-1.5 rounded-md bg-[var(--bg-card)] hover:bg-[var(--border)] border border-[var(--border)] transition-colors"
                  >
                    <div className="text-xs text-[var(--text-primary)] truncate">{item.goal}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {new Date(item.createdAt).toLocaleString('fr-FR')} · {item.tasks.length} tâche(s)
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Annuler</button>
          <button
            onClick={applyPlan}
            disabled={applying || !plan?.length}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#4caf7d]/20 to-[#6dd79a]/20 border border-[#4caf7d]/40 text-[#7de4a7] text-sm font-medium disabled:opacity-40"
          >
            {applying ? 'Création...' : 'Créer les tâches'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARTE TÂCHE ─────────────────────────────────────────────
function TaskCard({ task, getChildren, onStatusChange, onEdit, onDelete, onAddSubTask, compact = false }: {
  task: Task;
  getChildren: (parentId: number) => Task[];
  onStatusChange: (id: number, statut: string) => void;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onAddSubTask?: (parent: Task) => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const statut = getVal(task.Statut);
  const prio = getVal(task.Priorité);
  const projet = getVal(task.Projet);
  const rec = getVal(task.Récurrence);
  const overdue = isOverdue(task);
  const done = statut === 'Fait';
  const subTasks = getChildren(task.id);
  const hasSubs = subTasks.length > 0;
  const doneSubs = subTasks?.filter(s => getVal(s.Statut) === 'Fait').length ?? 0;

  function nextStatut() {
    if (statut === 'À faire') return 'En cours';
    if (statut === 'En cours') return 'Fait';
    return 'À faire';
  }

  return (
    <div className={`rounded-lg border transition-all duration-200
      ${done ? 'border-[#1a1a2e] opacity-60' : overdue ? 'border-amber-800/40' : 'border-[var(--border)] hover:border-[#33335a]'}
      bg-[var(--bg-card)] group`}>

      {/* Ligne principale */}
      <div className="flex items-start gap-2 p-2.5">
        {/* Toggle sous-tâches */}
        <button
          onClick={() => hasSubs && !compact && setExpanded(e => !e)}
          aria-label={expanded ? 'Replier les sous-tâches' : 'Déplier les sous-tâches'}
          className={`mt-0.5 flex-shrink-0 transition-colors ${hasSubs && !compact ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]' : 'text-transparent cursor-default'}`}>
          {hasSubs && !compact
            ? expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronR className="w-4 h-4" />
            : <ChevronR className="w-4 h-4" />}
        </button>

        {/* Statut */}
        <button
          onClick={() => onStatusChange(task.id, nextStatut())}
          aria-label={`Changer le statut de ${task.Titre || 'la tâche'}`}
          className="mt-0.5 flex-shrink-0 hover:scale-110 transition-all">
          {done
            ? <CheckCircle2 className="w-4 h-4 text-[#4caf7d]" />
            : statut === 'En cours'
              ? <Circle className="w-4 h-4 text-[#c9a84c]" />
              : <Circle className={`w-4 h-4 ${overdue ? 'text-amber-500' : 'text-[#33335a] hover:text-[var(--text-muted)]'}`} />}
        </button>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-medium leading-tight ${done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
              {task.Titre || '(Sans titre)'}
            </span>
            <PrioBadge prio={prio} />
            {!compact && <ProjetBadge projet={projet} />}
            {overdue && !done && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-900/30 border border-amber-800/40 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5" />En retard
              </span>
            )}
          </div>
          {!compact && expanded && task.Description && (
            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{task.Description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {rec && rec !== 'Aucune' && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <RotateCcw className="w-2.5 h-2.5" />{rec}
              </span>
            )}
            {task['Date échéance'] && (
              <span className={`text-[10px] ${overdue && !done ? 'text-amber-300' : 'text-[var(--text-muted)]'}`}>
                {formatDateLabel(task['Date échéance'])}
              </span>
            )}
            {hasSubs && (
              <span className="text-[10px] text-[var(--text-muted)]">{doneSubs}/{subTasks.length} sous-tâches</span>
            )}
          </div>
        </div>

        {/* Boutons action */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <button onClick={() => onEdit(task)}
            aria-label={`Modifier ${task.Titre || 'la tâche'}`}
            className="p-1.5 rounded-lg text-[#33335a] hover:text-[#c9a84c] hover:bg-[var(--border)] transition-all"
            title="Modifier">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button onClick={() => onDelete(task)}
              aria-label={`Supprimer ${task.Titre || 'la tâche'}`}
              className="p-1.5 rounded-lg text-[#33335a] hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Barre progression */}
      {hasSubs && expanded && !compact && (
        <div className="px-2.5 pb-1">
          <div className="w-full bg-[var(--bg-surface)] rounded-full h-1 overflow-hidden">
            <div className="bg-[#4caf7d] h-full rounded-full transition-all duration-300"
              style={{ width: `${(doneSubs / subTasks.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Sous-tâches */}
      {hasSubs && expanded && !compact && (
        <div className="border-t border-[#1a1a2e] mx-2.5 mb-1 pt-2 space-y-1">
          {subTasks.map(sub => (
            <div key={sub.id} className="pl-3 border-l border-[#1f1f35]/80">
              <TaskCard
                task={sub}
                getChildren={getChildren}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddSubTask={onAddSubTask}
                compact={false}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bouton ajouter sous-tâche — toujours visible si pas compact */}
      {!compact && onAddSubTask && expanded && (
        <div className="px-2.5 pb-2 pt-1">
          <button onClick={() => onAddSubTask(task)}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[#c9a84c] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--border)]">
            <Plus className="w-3 h-3" />
            Ajouter une sous-tâche
          </button>
        </div>
      )}
    </div>
  );
}

// ─── KANBAN avec drag & drop ──────────────────────────────────
function KanbanView({ tasks, onStatusChange, onAddInCol, onEdit, onDelete, onAddSubTask }: {
  tasks: Task[];
  onStatusChange: (id: number, statut: string) => void;
  onAddInCol: (statut: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubTask: (parent: Task) => void;
}) {
  const dragId = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const childrenMap = buildChildrenMap(tasks);
  const getChildren = (pid: number) => childrenMap[pid] || [];
  const parentTasks = tasks.filter(t => !getParentId(t));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {KANBAN_COLS.map(col => {
        const colTasks = parentTasks.filter(t => {
          const s = getVal(t.Statut);
          return s === col.id || (!s && col.id === 'À faire');
        });
        const isOver = dragOver === col.id;
        return (
          <div key={col.id} className={`flex flex-col rounded-xl border-2 transition-all p-3
            ${isOver ? 'border-dashed' : 'border-transparent'}`}
            style={{ borderColor: isOver ? col.color + '60' : undefined, background: isOver ? col.color + '08' : undefined }}
            onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => {
              e.preventDefault(); setDragOver(null);
              if (dragId.current !== null) { onStatusChange(dragId.current, col.id); dragId.current = null; }
            }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: col.color }}>{col.id}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]">{colTasks.length}</span>
              </div>
              <button onClick={() => onAddInCol(col.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--border)] transition-all" title={`Créer dans ${col.id}`}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {colTasks.length === 0 && (
                <div className="border-2 border-dashed border-[#1a1a2e] rounded-xl p-6 text-center">
                  <p className="text-xs text-[#33335a]">Glisser ici</p>
                </div>
              )}
              {colTasks.map(t => (
                <div key={t.id} draggable onDragStart={e => { dragId.current = t.id; e.dataTransfer.effectAllowed = 'move'; }}
                  className="cursor-grab active:cursor-grabbing active:opacity-50 transition-opacity">
                  <TaskCard task={t} getChildren={getChildren} onStatusChange={onStatusChange}
                    onEdit={onEdit} onDelete={onDelete} onAddSubTask={onAddSubTask} compact />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── VUE AUJOURD'HUI ─────────────────────────────────────────
function TodayView({ tasks, onStatusChange, onEdit, onDelete, onAddSubTask }: {
  tasks: Task[];
  onStatusChange: (id: number, statut: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubTask: (parent: Task) => void;
}) {
  const [focusFilter, setFocusFilter] = useState<'all' | 'todo' | 'inprogress' | 'done' | 'overdue'>('all');
  const today = todayStr();
  const childrenMap = buildChildrenMap(tasks);
  const getChildren = (pid: number) => childrenMap[pid] || [];
  const parentTasks = tasks.filter(t => !getParentId(t));

  const todayTasks = parentTasks.filter(t => {
    const d = extractDatePart(t['Date échéance']);
    return !d || d <= today;
  });

  const overdue = sortTasksForDisplay(todayTasks.filter(t => isOverdue(t)));
  const inprogress = sortTasksForDisplay(todayTasks.filter(t => getVal(t.Statut) === 'En cours' && !isOverdue(t)));
  const pending = sortTasksForDisplay(todayTasks.filter(t => getVal(t.Statut) === 'À faire' && !isOverdue(t)));
  const done = sortTasksForDisplay(todayTasks.filter(t => getVal(t.Statut) === 'Fait'));

  const visibleOverdue = focusFilter === 'all' || focusFilter === 'overdue' ? overdue : [];
  const visibleInProgress = focusFilter === 'all' || focusFilter === 'inprogress' ? inprogress : [];
  const visiblePending = focusFilter === 'all' || focusFilter === 'todo' ? pending : [];
  const visibleDone = focusFilter === 'all' || focusFilter === 'done' ? done : [];

  const Section = ({ title, items, color }: { title: string; items: Task[]; color: string }) =>
    items.length > 0 ? (
      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color }}>{title}</p>
        <div className="space-y-2">
          {items.map(t => (
            <TaskCard key={t.id} task={t} getChildren={getChildren}
              onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onAddSubTask={onAddSubTask} />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: 'todo', label: 'À faire', value: pending.length, color: 'text-[var(--text-primary)]' },
          { id: 'inprogress', label: 'En cours', value: inprogress.length, color: 'text-[#c9a84c]' },
          { id: 'done', label: 'Faites', value: done.length, color: 'text-[#4caf7d]' },
          { id: 'overdue', label: 'En retard', value: overdue.length, color: overdue.length > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFocusFilter(prev => prev === s.id ? 'all' : (s.id as 'todo' | 'inprogress' | 'done' | 'overdue'))}
            className={`bg-[var(--bg-surface)] rounded-xl border p-3 text-left transition-all ${focusFilter === s.id ? 'border-[#c9a84c]/40' : 'border-[var(--border)] hover:border-[#33335a]'}`}
          >
            <p className="text-xs text-[var(--text-muted)] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFocusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${focusFilter === 'all' ? 'border-[#c9a84c]/40 text-[var(--gold-soft)] bg-[#c9a84c]/10' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
        >
          Toutes les tâches
        </button>
      </div>
      {overdue.length === 0 && pending.length === 0 && inprogress.length === 0 && done.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-[#4caf7d]/40 mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Aucune tâche pour aujourd'hui</p>
          <p className="text-[#33335a] text-xs mt-1">Clique sur "Nouvelle tâche" pour commencer</p>
        </div>
      )}
      {focusFilter !== 'all' && visibleOverdue.length === 0 && visibleInProgress.length === 0 && visiblePending.length === 0 && visibleDone.length === 0 && (
        <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-xl">
          <p className="text-sm text-[var(--text-muted)]">Aucune tâche dans ce filtre</p>
          <p className="text-xs text-[#33335a] mt-1">Clique de nouveau sur la carte active pour revenir à l'ensemble</p>
        </div>
      )}
      <div className="space-y-5">
        <Section title="En retard — à traiter" items={visibleOverdue} color="#f59e0b" />
        <Section title="En cours" items={visibleInProgress} color="#c9a84c" />
        <Section title="À faire aujourd'hui" items={visiblePending} color="#5a587a" />
        <Section title="Faites" items={visibleDone} color="#4caf7d" />
      </div>
    </div>
  );
}

// ─── VUE CALENDRIER ──────────────────────────────────────────
function CalendarView({ tasks, onEdit }: {
  tasks: Task[];
  onEdit: (task: Task) => void;
}) {
  const [mode, setMode] = useState<'week' | '15days'>('week');
  const [offset, setOffset] = useState(0);

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const days = mode === 'week' ? 7 : 15;

  const startDate = new Date(todayDate);
  if (mode === 'week') {
    const dow = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1;
    startDate.setDate(todayDate.getDate() - dow + offset * 7);
  } else {
    startDate.setDate(todayDate.getDate() + offset * 15);
  }

  const dateRange = Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate); d.setDate(startDate.getDate() + i); return d;
  });

  const parentTasks = tasks.filter(t => !getParentId(t));
  const tasksByDate: Record<string, Task[]> = {};
  parentTasks.forEach(t => {
    if (t['Date échéance']) {
      const d = extractDatePart(t['Date échéance']);
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(t);
    }
  });

  const s = dateRange[0]; const e = dateRange[dateRange.length - 1];
  const periodLabel = s.getMonth() === e.getMonth()
    ? `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
    : `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const maxPerDay = mode === 'week' ? 5 : 3;

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-1">
          {(['week', '15days'] as const).map(id => (
            <button key={id} onClick={() => { setMode(id); setOffset(0); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${mode === id ? 'bg-[var(--border)] text-[var(--gold-soft)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {id === 'week' ? 'Semaine' : '15 jours'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">{periodLabel}</span>
          <button onClick={() => setOffset(0)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#c9a84c]/40 transition-all">
            Aujourd'hui
          </button>
          <button onClick={() => setOffset(o => o - 1)}
            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setOffset(o => o + 1)}
            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grille */}
      <div className="overflow-x-auto pb-1">
        <div className={`grid gap-2 min-w-[920px] ${mode === 'week' ? 'grid-cols-7' : 'grid-cols-5'}`}>
          {dateRange.map(date => {
            const dateStr = dateToLocalIso(date);
            const dayTasks = tasksByDate[dateStr] || [];
            const isToday = dateStr === todayStr();
            const isPast = date < todayDate;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const pending = dayTasks.filter(t => getVal(t.Statut) !== 'Fait').length;
            const done = dayTasks.filter(t => getVal(t.Statut) === 'Fait').length;

            return (
              <div key={dateStr} className={`rounded-xl border p-2 transition-all ${
                isToday ? 'border-[#c9a84c]/50' : 'border-[var(--border)]'
              } ${isWeekend && !isToday ? 'opacity-60' : ''}`}
                style={{ background: isToday ? 'rgba(201,168,76,0.06)' : 'var(--bg-card)', minHeight: mode === 'week' ? 130 : 100 }}>

              {/* En-tête */}
              <div className="mb-2">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-[#c9a84c]' : 'text-[var(--text-muted)]'}`}>
                  {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </div>
                <div className={`font-bold leading-none mt-0.5 ${mode === 'week' ? 'text-xl' : 'text-base'} ${
                  isToday ? 'text-[#c9a84c]' : isPast ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                }`}>
                  {date.getDate()}
                </div>
                {dayTasks.length > 0 && (
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {pending > 0 && <span className="text-[9px] text-[#c9a84c] font-semibold">{pending} à faire</span>}
                    {done > 0 && <span className="text-[9px] text-[#4caf7d] font-semibold">{done} ✓</span>}
                  </div>
                )}
              </div>

              {/* Tâches */}
              <div className="space-y-0.5">
                {dayTasks.slice(0, maxPerDay).map(t => {
                  const statut = getVal(t.Statut);
                  const prio = getVal(t.Priorité);
                  const isDone = statut === 'Fait';
                  const isInProgress = statut === 'En cours';
                  return (
                    <button key={t.id} onClick={() => onEdit(t)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-snug transition-all hover:opacity-80 ${isDone ? 'line-through' : ''}`}
                      style={{
                        background: isInProgress ? 'rgba(201,168,76,0.12)' : 'var(--bg-surface)',
                        border: `1px solid ${prio === 'Haute' ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}>
                      {prio === 'Haute' && <span style={{ color: '#f59e0b', fontSize: 8, marginRight: 3 }}>●</span>}
                      {t.Titre || '—'}
                    </button>
                  );
                })}
                {dayTasks.length > maxPerDay && (
                  <p className="text-[9px] text-[var(--text-muted)] pl-1">+{dayTasks.length - maxPerDay} autres</p>
                )}
              </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export const Taches = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [view, setView] = useState<View>('today');
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create', statut: 'À faire', parent: null, task: null });
  const [plannerOpen, setPlannerOpen] = useState(false);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const loadTasks = useCallback(async () => {
    setLoading(true); setError('');
    try {
      await processDueRecurringTasks();
      setTasks((await listTaskRows()) as unknown as Task[]);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const raw = localStorage.getItem('dashboard-open-task-id');
    if (!raw || !tasks.length) return;
    const targetId = Number(raw);
    if (!Number.isFinite(targetId)) {
      localStorage.removeItem('dashboard-open-task-id');
      return;
    }
    const target = tasks.find(t => t.id === targetId);
    if (target) {
      openEdit(target);
    }
    localStorage.removeItem('dashboard-open-task-id');
  }, [tasks]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function updateStatut(id: number, statut: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, Statut: { id: 0, value: statut, color: '' }, Fait: statut === 'Fait' } : t));
    try {
      await updateTaskLegacy(id, { Statut: statut, Fait: statut === 'Fait' });
      setFeedback({ type: 'success', message: `Statut mis à jour: ${statut}` });
    } catch {
      setFeedback({ type: 'error', message: "Échec de mise à jour du statut." });
      loadTasks();
    }
  }

  function handleSaved(task: Task) {
    setTasks(prev => [task, ...prev]);
    setFeedback({ type: 'success', message: 'Tâche créée.' });
    setModal({ open: false, mode: 'create', statut: 'À faire', parent: null, task: null });
  }

  function handleUpdated(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setFeedback({ type: 'success', message: 'Tâche mise à jour.' });
    setModal({ open: false, mode: 'create', statut: 'À faire', parent: null, task: null });
  }

  function openEdit(task: Task) {
    setModal({ open: true, mode: 'edit', statut: getVal(task.Statut) || 'À faire', parent: null, task });
  }

  function openAddSubTask(parent: Task) {
    setModal({ open: true, mode: 'create', statut: 'À faire', parent, task: null });
  }

  function openCreate(statut: string) {
    setModal({ open: true, mode: 'create', statut, parent: null, task: null });
  }

  async function deleteTask(task: Task) {
    const childCount = tasks.filter(t => getParentId(t) === task.id).length;
    const taskLabel = task.Titre?.trim() || 'cette tâche';
    const warning = childCount > 0
      ? `Supprimer "${taskLabel}" ?\n\n${childCount} sous-tâche(s) liée(s) seront également impactées selon la configuration des relations.`
      : `Supprimer "${taskLabel}" ?`;
    if (!confirm(warning)) return;
    const childrenMap = buildChildrenMap(tasks);
    const idsToRemove = new Set<number>();
    const deleteOrder: number[] = [];
    const visit = (id: number) => {
      if (idsToRemove.has(id)) return;
      idsToRemove.add(id);
      const children = childrenMap[id] || [];
      for (const child of children) visit(child.id);
      // Post-order: delete children before parent.
      deleteOrder.push(id);
    };
    visit(task.id);
    setTasks(prev => prev.filter(t => !idsToRemove.has(t.id)));
    try {
      for (const idToDelete of deleteOrder) {
        await deleteTaskLegacy(idToDelete);
      }
      await loadTasks();
      setFeedback({
        type: 'success',
        message: deleteOrder.length > 1
          ? `Tâche et ${deleteOrder.length - 1} sous-tâche(s) supprimées.`
          : 'Tâche supprimée.',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Suppression impossible, rechargement en cours.' });
      loadTasks();
    }
  }

  async function createPlannedTask(task: PlannedTask, parentId: number | null = null): Promise<void> {
    const payload: Record<string, unknown> = {
      Titre: task.title?.trim() || 'Tâche IA',
      Description: task.description?.trim() || null,
      Statut: 'À faire',
      Priorité: normalizePriority(task.priority),
      Projet: task.project?.trim() || null,
      Fait: false,
      'Date échéance': task.due_date || null,
    };
    if (parentId) payload['Tâche parente'] = [parentId];
    const created = (await createTaskLegacy(payload)) as unknown as Task;
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      for (const subTask of task.subtasks) {
        await createPlannedTask(subTask, created.id);
      }
    }
  }

  async function applyPlan(tasksToCreate: PlannedTask[]) {
    for (const task of tasksToCreate) {
      await createPlannedTask(task, null);
    }
    await loadTasks();
    setFeedback({ type: 'success', message: 'Plan IA appliqué avec succès.' });
  }

  const VIEWS: { id: View; label: string; icon: LucideIcon }[] = [
    { id: 'today', label: "Aujourd'hui", icon: Clock },
    { id: 'kanban', label: 'Kanban', icon: Columns },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
  ];

  return (
    <div className="flex flex-col space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tâches</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
          <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-1 gap-1 w-full sm:w-auto overflow-x-auto">
            {VIEWS.map(v => {
              const Icon = v.icon;
              return (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${view === v.id ? 'bg-[var(--border)] text-[var(--gold-soft)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                  <Icon className="w-3.5 h-3.5" />{v.label}
                </button>
              );
            })}
          </div>
          <button onClick={loadTasks} aria-label="Rafraîchir la liste des tâches" className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#33335a] transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setPlannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#3d3368]/40 to-[#6f5bb0]/30 border border-[#7e69c2]/40 text-[#d8ccff] hover:from-[#4b3d80]/50 transition-all text-sm font-medium">
            <Sparkles className="w-4 h-4" />Découper avec IA
          </button>
          <button onClick={() => openCreate('À faire')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[var(--gold-soft)] hover:from-[#c9a84c]/30 transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />Nouvelle tâche
          </button>
        </div>
      </div>

      {error && <div className="bg-red-950/30 border border-red-800/40 text-red-400 text-sm rounded-xl p-4">{error}</div>}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
              : 'bg-red-950/30 border-red-800/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success'
              ? <CheckCircle2 className="w-4 h-4" />
              : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--text-muted)]" />
        </div>
      ) : (
        <>
          {view === 'today' && <TodayView tasks={tasks} onStatusChange={updateStatut} onEdit={openEdit} onDelete={deleteTask} onAddSubTask={openAddSubTask} />}
          {view === 'kanban' && <KanbanView tasks={tasks} onStatusChange={updateStatut} onAddInCol={openCreate} onEdit={openEdit} onDelete={deleteTask} onAddSubTask={openAddSubTask} />}
          {view === 'calendar' && <CalendarView tasks={tasks} onEdit={openEdit} />}
        </>
      )}

      {modal.open && (
        <TaskModal
          mode={modal.mode}
          task={modal.task}
          defaultStatut={modal.statut}
          parentTask={modal.parent}
          onClose={() => setModal({ open: false, mode: 'create', statut: 'À faire', parent: null, task: null })}
          onSave={handleSaved}
          onUpdate={handleUpdated}
        />
      )}

      {plannerOpen && (
        <PlannerModal
          onClose={() => setPlannerOpen(false)}
          onApply={applyPlan}
        />
      )}
    </div>
  );
};
