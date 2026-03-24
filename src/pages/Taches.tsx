import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, RefreshCw, CheckCircle2, Circle, AlertTriangle,
  RotateCcw, Calendar, Columns, Clock, ChevronLeft,
  ChevronRight, X, ChevronDown, ChevronRight as ChevronR, Pencil, Trash2
} from 'lucide-react';

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';
const TABLE_ID = 536;
const HEADERS = { 'Authorization': `Token ${TOKEN}`, 'Content-Type': 'application/json' };

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
  Projet?: any;
  Priorité?: any;
  Statut?: any;
  Récurrence?: any;
  Fait?: boolean;
  'Date échéance'?: string;
  'Date faite'?: string;
  'Tâche parente'?: any[];
}

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  statut: string;
  parent?: Task | null;
  task?: Task | null;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function getVal(f: any): string {
  if (!f) return '';
  if (Array.isArray(f)) return f[0]?.value ?? '';
  if (typeof f === 'object' && 'value' in f) return f.value;
  return String(f);
}
function isOverdue(t: Task) {
  if (!t['Date échéance'] || getVal(t.Statut) === 'Fait') return false;
  return t['Date échéance'].split('T')[0] < todayStr();
}
function getParentId(t: Task): number | null {
  const p = t['Tâche parente'];
  if (!p || !Array.isArray(p) || p.length === 0) return null;
  return p[0].id ?? null;
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
  const getInitialVal = (field: any): string => {
    if (!field) return '';
    if (Array.isArray(field)) return field[0]?.value ?? '';
    if (typeof field === 'object' && 'value' in field) return field.value;
    return String(field);
  };
  const getInitialDate = (d: any) => {
    if (!d) return todayStr();
    return d.split('T')[0];
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
      const body: Record<string, any> = {
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
        const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ID}/${task.id}/?user_field_names=true`, {
          method: 'PATCH', headers: HEADERS, body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(JSON.stringify(e)); }
        onUpdate(await res.json());
      } else {
        const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true`, {
          method: 'POST', headers: HEADERS, body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(JSON.stringify(e)); }
        onSave(await res.json());
      }
    } catch (e: any) { setError('Erreur : ' + e.message); setSaving(false); }
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
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#e8c97a] text-sm font-medium hover:from-[#c9a84c]/30 transition-all disabled:opacity-40">
            {saving ? 'Enregistrement...' : mode === 'edit' ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARTE TÂCHE ─────────────────────────────────────────────
function TaskCard({ task, subTasks, onStatusChange, onEdit, onDelete, onAddSubTask, compact = false }: {
  task: Task;
  subTasks?: Task[];
  onStatusChange: (id: number, statut: string) => void;
  onEdit: (task: Task) => void;
  onDelete?: (id: number) => void;
  onAddSubTask?: (parent: Task) => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const statut = getVal(task.Statut);
  const prio = getVal(task.Priorité);
  const projet = getVal(task.Projet);
  const rec = getVal(task.Récurrence);
  const overdue = isOverdue(task);
  const done = statut === 'Fait';
  const hasSubs = subTasks && subTasks.length > 0;
  const doneSubs = subTasks?.filter(s => getVal(s.Statut) === 'Fait').length ?? 0;

  function nextStatut() {
    if (statut === 'À faire') return 'En cours';
    if (statut === 'En cours') return 'Fait';
    return 'À faire';
  }

  return (
    <div className={`rounded-xl border transition-all duration-200
      ${done ? 'border-[#1a1a2e] opacity-60' : overdue ? 'border-amber-800/40' : 'border-[var(--border)] hover:border-[#33335a]'}
      bg-[var(--bg-card)] group`}>

      {/* Ligne principale */}
      <div className="flex items-start gap-2 p-3">
        {/* Toggle sous-tâches */}
        <button onClick={() => hasSubs && !compact && setExpanded(e => !e)}
          className={`mt-0.5 flex-shrink-0 transition-colors ${hasSubs && !compact ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]' : 'text-transparent cursor-default'}`}>
          {hasSubs && !compact
            ? expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronR className="w-4 h-4" />
            : <ChevronR className="w-4 h-4" />}
        </button>

        {/* Statut */}
        <button onClick={() => onStatusChange(task.id, nextStatut())} className="mt-0.5 flex-shrink-0 hover:scale-110 transition-all">
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
          {!compact && task.Description && (
            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{task.Description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {rec && rec !== 'Aucune' && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <RotateCcw className="w-2.5 h-2.5" />{rec}
              </span>
            )}
            {task['Date échéance'] && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {new Date(task['Date échéance']).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {hasSubs && (
              <span className="text-[10px] text-[var(--text-muted)]">{doneSubs}/{subTasks!.length} sous-tâches</span>
            )}
          </div>
        </div>

        {/* Boutons action */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <button onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg text-[#33335a] hover:text-[#c9a84c] hover:bg-[var(--border)] transition-all"
            title="Modifier">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg text-[#33335a] hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Barre progression */}
      {hasSubs && !compact && (
        <div className="px-3 pb-1">
          <div className="w-full bg-[var(--bg-surface)] rounded-full h-1 overflow-hidden">
            <div className="bg-[#4caf7d] h-full rounded-full transition-all duration-300"
              style={{ width: `${(doneSubs / subTasks!.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Sous-tâches */}
      {hasSubs && expanded && !compact && (
        <div className="border-t border-[#1a1a2e] mx-3 mb-1 pt-2 space-y-1">
          {subTasks!.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors group/sub">
              <button onClick={() => onStatusChange(sub.id, getVal(sub.Statut) === 'Fait' ? 'À faire' : 'Fait')}
                className="flex-shrink-0 hover:scale-110 transition-all">
                {getVal(sub.Statut) === 'Fait'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-[#4caf7d]" />
                  : <Circle className="w-3.5 h-3.5 text-[#33335a] hover:text-[var(--text-muted)]" />}
              </button>
              <span className={`text-xs flex-1 ${getVal(sub.Statut) === 'Fait' ? 'line-through text-[var(--text-muted)]' : 'text-[#c8c4b8]'}`}>
                {sub.Titre || '(Sans titre)'}
              </span>
              <button onClick={() => onEdit(sub)}
                className="opacity-0 group-hover/sub:opacity-100 p-1 text-[#33335a] hover:text-[#c9a84c] transition-all">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton ajouter sous-tâche — toujours visible si pas compact */}
      {!compact && onAddSubTask && (
        <div className="px-3 pb-2.5 pt-1">
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
  onDelete: (id: number) => void;
  onAddSubTask: (parent: Task) => void;
}) {
  const dragId = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const parentTasks = tasks.filter(t => !getParentId(t));
  const subTasks = tasks.filter(t => getParentId(t) !== null);
  const getSubTasks = (pid: number) => subTasks.filter(s => getParentId(s) === pid);

  return (
    <div className="grid grid-cols-3 gap-4">
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
                  <TaskCard task={t} subTasks={getSubTasks(t.id)} onStatusChange={onStatusChange}
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
  onDelete: (id: number) => void;
  onAddSubTask: (parent: Task) => void;
}) {
  const today = todayStr();
  const parentTasks = tasks.filter(t => !getParentId(t));
  const subTasks = tasks.filter(t => getParentId(t) !== null);
  const getSubTasks = (pid: number) => subTasks.filter(s => getParentId(s) === pid);

  const todayTasks = parentTasks.filter(t => {
    const d = t['Date échéance']?.split('T')[0];
    return !d || d <= today;
  });

  const overdue = todayTasks.filter(t => isOverdue(t));
  const inprogress = parentTasks.filter(t => getVal(t.Statut) === 'En cours' && !isOverdue(t));
  const pending = todayTasks.filter(t => getVal(t.Statut) === 'À faire' && !isOverdue(t));
  const done = todayTasks.filter(t => getVal(t.Statut) === 'Fait');

  const Section = ({ title, items, color }: { title: string; items: Task[]; color: string }) =>
    items.length > 0 ? (
      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color }}>{title}</p>
        <div className="space-y-2">
          {items.map(t => (
            <TaskCard key={t.id} task={t} subTasks={getSubTasks(t.id)}
              onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onAddSubTask={onAddSubTask} />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'À faire', value: pending.length, color: 'text-[var(--text-primary)]' },
          { label: 'En cours', value: inprogress.length, color: 'text-[#c9a84c]' },
          { label: 'Faites', value: done.length, color: 'text-[#4caf7d]' },
          { label: 'En retard', value: overdue.length, color: overdue.length > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {overdue.length === 0 && pending.length === 0 && inprogress.length === 0 && done.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-[#4caf7d]/40 mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Aucune tâche pour aujourd'hui</p>
          <p className="text-[#33335a] text-xs mt-1">Clique sur "Nouvelle tâche" pour commencer</p>
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
function CalendarView({ tasks, onStatusChange, onEdit }: {
  tasks: Task[];
  onStatusChange: (id: number, statut: string) => void;
  onEdit: (task: Task) => void;
}) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const parentTasks = tasks.filter(t => !getParentId(t));
  const tasksByDate: Record<string, Task[]> = {};
  parentTasks.forEach(t => {
    if (t['Date échéance']) {
      const d = t['Date échéance'].split('T')[0];
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(t);
    }
  });

  const selectedTasks = selected ? (tasksByDate[selected] || []) : [];

  return (
    <div className={`grid gap-4 ${selected ? 'grid-cols-[1fr_300px]' : 'grid-cols-1'}`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
            {cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="text-center text-xs text-[var(--text-muted)] font-medium py-1">{d}</div>
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
                className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 px-1 transition-all
                  ${isSelected ? 'bg-[#c9a84c]/20 border border-[#c9a84c]/40' : 'hover:bg-[var(--border)] border border-transparent'}
                  ${isToday && !isSelected ? 'border border-[#c9a84c]/30' : ''}`}>
                <span className={`font-medium text-[11px] ${isToday ? 'text-[#c9a84c]' : isPast ? 'text-[#33335a]' : 'text-[var(--text-primary)]'}`}>{day}</span>
                {dayTasks.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 justify-center">
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
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">
              {new Date(selected).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button onClick={() => setSelected(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-4 h-4" /></button>
          </div>
          {selectedTasks.length === 0
            ? <p className="text-xs text-[var(--text-muted)]">Aucune tâche ce jour</p>
            : <div className="space-y-2">
                {selectedTasks.map(t => (
                  <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} onEdit={onEdit} compact />
                ))}
              </div>
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
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create', statut: 'À faire', parent: null, task: null });

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const loadTasks = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true&size=200`, { headers: HEADERS });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setTasks((await res.json()).results || []);
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

  function handleSaved(task: Task) {
    setTasks(prev => [task, ...prev]);
    setModal({ open: false, mode: 'create', statut: 'À faire', parent: null, task: null });
  }

  function handleUpdated(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
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

  async function deleteTask(id: number) {
    if (!confirm('Supprimer cette tâche ?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`${BASEROW_URL}/database/rows/table/${TABLE_ID}/${id}/`, { method: 'DELETE', headers: HEADERS });
    } catch { loadTasks(); }
  }

  const VIEWS: { id: View; label: string; icon: any }[] = [
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-1 gap-1">
            {VIEWS.map(v => {
              const Icon = v.icon;
              return (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${view === v.id ? 'bg-[#22223a] text-[#e8c97a]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                  <Icon className="w-3.5 h-3.5" />{v.label}
                </button>
              );
            })}
          </div>
          <button onClick={loadTasks} className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#33335a] transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => openCreate('À faire')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border border-[#c9a84c]/40 text-[#e8c97a] hover:from-[#c9a84c]/30 transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />Nouvelle tâche
          </button>
        </div>
      </div>

      {error && <div className="bg-red-950/30 border border-red-800/40 text-red-400 text-sm rounded-xl p-4">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--text-muted)]" />
        </div>
      ) : (
        <>
          {view === 'today' && <TodayView tasks={tasks} onStatusChange={updateStatut} onEdit={openEdit} onDelete={deleteTask} onAddSubTask={openAddSubTask} />}
          {view === 'kanban' && <KanbanView tasks={tasks} onStatusChange={updateStatut} onAddInCol={openCreate} onEdit={openEdit} onDelete={deleteTask} onAddSubTask={openAddSubTask} />}
          {view === 'calendar' && <CalendarView tasks={tasks} onStatusChange={updateStatut} onEdit={openEdit} />}
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
    </div>
  );
};
