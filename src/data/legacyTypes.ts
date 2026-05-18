/** Types et mappeurs des lignes Supabase (noms de champs UI legacy). */

export type DbRow = Record<string, unknown>;

export function fieldAsString(field: unknown, fallback = ''): string {
  if (field == null) return fallback;
  if (typeof field === 'string') return field;
  if (typeof field === 'number' || typeof field === 'boolean') return String(field);
  if (typeof field === 'object' && 'value' in (field as object)) {
    return String((field as { value?: unknown }).value ?? fallback);
  }
  return String(field);
}

export function fieldAsNumber(field: unknown, fallback = 0): number {
  const n = Number(field);
  return Number.isFinite(n) ? n : fallback;
}

export function fieldAsId(field: unknown): number {
  return fieldAsNumber(field, 0);
}

export function fieldAsBool(field: unknown): boolean {
  if (typeof field === 'boolean') return field;
  const s = String(field ?? '').trim().toLowerCase();
  return field === 1 || s === '1' || s === 'true' || s === 'oui';
}

export function fieldAsNullableString(field: unknown): string | null {
  const s = fieldAsString(field);
  return s || null;
}

export function isActiveFlag(value: unknown): boolean {
  if (value === false || value === 0) return false;
  const str = String(value ?? '').trim().toLowerCase();
  if (['false', 'faux', '0', 'no', 'non'].includes(str)) return false;
  return true;
}

export interface LegacyTaskRow {
  id: number;
  Titre: string;
  Description: string;
  Projet: string;
  Priorité: string;
  Statut: string;
  Récurrence: string;
  Fait: boolean;
  'Date échéance': string | null;
  'Date faite': string | null;
  'Tâche parente': Array<{ id: number }>;
  'Email source id': number | null;
}

export interface LegacyEmailRow {
  id: number;
  Sujet: string;
  'Expéditeur': string;
  'Date réception': string | null;
  'Résumé IA': string;
  Contenu: string;
  'Action requise': boolean;
  Traité: boolean;
  Compte: string;
  'Réponse 1': string;
  'Réponse 2': string;
  'Réponse 3': string;
  'A une pièce jointe': boolean;
  Fichier: unknown[];
  'Tâche liée': number | null;
  'Converti en tâche': boolean;
  'Date conversion': string | null;
  'Supprimé le': string | null;
  'Score spam': number | null;
  'Catégorie spam': string | null;
  'Challenge envoyé': boolean;
  'Challenge répondu': boolean;
  folder: string;
}

export interface LegacySentRow {
  id: number;
  De: string;
  'À': string;
  CC: string;
  BCC: string;
  Sujet: string;
  Corps: string;
  Date: string;
  Compte: string;
  'Supprimé le': string | null;
  replyToEmailId?: number | null;
}

export interface LegacyAdminRow {
  id: number;
  Prénom: string;
  Nom: string;
  Email: string;
  Téléphone: string;
  Entreprise: string;
  Catégorie: { value: string } | null;
  Notes: string;
  'Date création': string;
}

export interface LegacyFinanceRow {
  id: number;
  Date: string;
  'Date paiement': string;
  Libellé: string;
  Montant: number;
  Type: string;
  Source: string;
  Catégorie: string;
  Notes: string;
  Validé: boolean;
}

export interface LegacyBudgetRow {
  id: number;
  Libellé: string;
  Mensuel: number;
  Actif: boolean | string;
  Catégorie: string;
}

export interface TodayTaskSummary {
  id: string;
  text: string;
  completed: boolean;
  statut: string;
  priorite: string;
  projet: string;
  dateEcheance: string | null;
}

export function legacyTaskFromRow(row: DbRow): LegacyTaskRow {
  const parentId = row.parent_task_id;
  return {
    id: fieldAsId(row.id),
    Titre: fieldAsString(row.title),
    Description: fieldAsString(row.description),
    Projet: fieldAsString(row.project),
    Priorité: fieldAsString(row.priority, 'Normale'),
    Statut: fieldAsString(row.status, 'À faire'),
    Récurrence: fieldAsString(row.recurrence, 'Aucune'),
    Fait: fieldAsBool(row.done),
    'Date échéance': fieldAsNullableString(row.due_date),
    'Date faite': fieldAsNullableString(row.done_date),
    'Tâche parente': parentId ? [{ id: fieldAsId(parentId) }] : [],
    'Email source id': row.source_email_id != null ? fieldAsId(row.source_email_id) : null,
  };
}

export function legacyEmailFromRow(row: DbRow): LegacyEmailRow {
  return {
    id: fieldAsId(row.id),
    Sujet: fieldAsString(row.subject),
    'Expéditeur': fieldAsString(row.sender),
    'Date réception': fieldAsNullableString(row.received_at),
    'Résumé IA': fieldAsString(row.ai_summary),
    Contenu: fieldAsString(row.content),
    'Action requise': fieldAsBool(row.action_required),
    Traité: fieldAsBool(row.processed),
    Compte: fieldAsString(row.account_email),
    'Réponse 1': fieldAsString(row.reply_1),
    'Réponse 2': fieldAsString(row.reply_2),
    'Réponse 3': fieldAsString(row.reply_3),
    'A une pièce jointe': fieldAsBool(row.has_attachment),
    Fichier: Array.isArray(row.attachments) ? row.attachments : [],
    'Tâche liée': row.linked_task_id != null ? fieldAsId(row.linked_task_id) : null,
    'Converti en tâche': fieldAsBool(row.converted_to_task),
    'Date conversion': fieldAsNullableString(row.converted_at),
    'Supprimé le': fieldAsNullableString(row.deleted_at),
    'Score spam': row.spam_score != null ? fieldAsNumber(row.spam_score) : null,
    'Catégorie spam': fieldAsNullableString(row.spam_category),
    'Challenge envoyé': fieldAsBool(row.challenge_sent),
    'Challenge répondu': fieldAsBool(row.challenge_responded),
    folder: fieldAsString(row.folder, 'INBOX'),
  };
}

export function legacySentFromRow(row: DbRow): LegacySentRow {
  return {
    id: fieldAsId(row.id),
    De: fieldAsString(row.from_email),
    'À': fieldAsString(row.to_emails),
    CC: fieldAsString(row.cc),
    BCC: fieldAsString(row.bcc),
    Sujet: fieldAsString(row.subject),
    Corps: fieldAsString(row.body),
    Date: fieldAsString(row.sent_at),
    Compte: fieldAsString(row.account_email),
    'Supprimé le': fieldAsNullableString(row.deleted_at),
    replyToEmailId: row.reply_to_email_id != null ? fieldAsId(row.reply_to_email_id) : null,
  };
}

export function legacyAdminFromRow(row: DbRow): LegacyAdminRow {
  const category = fieldAsString(row.category);
  return {
    id: fieldAsId(row.id),
    Prénom: fieldAsString(row.first_name),
    Nom: fieldAsString(row.last_name),
    Email: fieldAsString(row.email),
    Téléphone: fieldAsString(row.phone),
    Entreprise: fieldAsString(row.company),
    Catégorie: category ? { value: category } : null,
    Notes: fieldAsString(row.notes),
    'Date création': fieldAsString(row.created_at),
  };
}

export function legacyFinanceFromRow(row: DbRow): LegacyFinanceRow {
  return {
    id: fieldAsId(row.id),
    Date: fieldAsString(row.invoice_date),
    'Date paiement': fieldAsString(row.payment_date),
    Libellé: fieldAsString(row.label),
    Montant: fieldAsNumber(row.amount),
    Type: fieldAsString(row.type),
    Source: fieldAsString(row.source),
    Catégorie: fieldAsString(row.category),
    Notes: fieldAsString(row.notes),
    Validé: fieldAsBool(row.validated),
  };
}

export function legacyBudgetFromRow(row: DbRow): LegacyBudgetRow {
  return {
    id: fieldAsId(row.id),
    Libellé: fieldAsString(row.label),
    Mensuel: fieldAsNumber(row.monthly_amount),
    Actif: row.active as boolean | string,
    Catégorie: fieldAsString(row.category),
  };
}

export function mapTodayTask(row: LegacyTaskRow): TodayTaskSummary {
  const statut = fieldAsString(row.Statut);
  const dateEch = row['Date échéance']?.split('T')[0] ?? null;
  return {
    id: String(row.id),
    text: row.Titre || '(Sans titre)',
    completed: statut === 'Fait',
    statut,
    priorite: fieldAsString(row.Priorité),
    projet: fieldAsString(row.Projet),
    dateEcheance: dateEch,
  };
}
