import { supabase } from '../lib/supabaseClient';
import { dispatchUntreatedEmailCount } from '../lib/emailCountEvents';
import {
  type DbRow,
  type LegacyEmailRow,
  type LegacyTaskRow,
  fieldAsString,
  isActiveFlag,
  legacyAdminFromRow,
  legacyBudgetFromRow,
  legacyEmailFromRow,
  legacyFinanceFromRow,
  legacySentFromRow,
  legacyTaskFromRow,
  mapTodayTask,
} from './legacyTypes';

export type { LegacyEmailRow, LegacyTaskRow } from './legacyTypes';

type LegacyPayload = Record<string, unknown>;

export const notifyInboxDeletionSync = async (
  emails: Array<{ id: number; accountEmail?: string | null }>,
  mode: 'trash' | 'hard_delete' = 'trash',
) => {
  if (!emails.length) return;
  const { data, error } = await supabase.functions.invoke('email-delete', {
    body: { emailIds: emails.map(e => e.id), mode },
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'success' in data && (data as { success?: boolean }).success === false) {
    throw new Error((data as { error?: string }).error || 'email-delete failed');
  }
};

export type SendEmailEdgePayload = {
  from: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
    encoding?: string;
  }>;
  replyToEmailId?: number;
};

export const sendEmailViaEdge = async (payload: SendEmailEdgePayload) => {
  const { data, error } = await supabase.functions.invoke('email-send', {
    body: payload,
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'success' in data && (data as { success?: boolean }).success === false) {
    throw new Error((data as { error?: string }).error || 'email-send failed');
  }
  return data as { success?: boolean; messageId?: string };
};

export const markInboxEmailNotSpam = async (inboxId: number, senderEmail: string) => {
  const pattern = senderEmail.trim().toLowerCase();
  const { error: wErr } = await supabase.from('email_senders').upsert(
    {
      email_pattern: pattern,
      status: 'whitelist',
      label: 'Dashboard',
    },
    { onConflict: 'email_pattern' },
  );
  if (wErr) throw wErr;
  const { error: uErr } = await supabase
    .from('inbox_emails')
    .update({
      spam_score: 0,
      spam_category: 'legitimate',
      processed: false,
    })
    .eq('id', inboxId);
  if (uErr) throw uErr;
};

export const listTaskRows = async (): Promise<LegacyTaskRow[]> => {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []).map(legacyTaskFromRow);
};

/** Tâches non terminées dont l'échéance est aujourd'hui ou dépassée. */
export const countDueTasksTodayOrOverdue = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'Fait')
    .eq('done', false)
    .lte('due_date', today);
  if (error) throw error;
  return count ?? 0;
};

/** Recrée les occurrences des tâches récurrentes terminées dont l'échéance est due. */
export const processDueRecurringTasks = async () => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('done', true)
    .neq('recurrence', 'Aucune')
    .not('due_date', 'is', null);

  if (error) throw error;

  for (const task of data || []) {
    const lastDate = new Date(String(task.due_date));
    if (Number.isNaN(lastDate.getTime())) continue;

    const nextDate = new Date(lastDate);
    if (task.recurrence === 'Quotidienne') nextDate.setDate(lastDate.getDate() + 1);
    if (task.recurrence === 'Hebdomadaire') nextDate.setDate(lastDate.getDate() + 7);
    if (task.recurrence === 'Mensuelle') nextDate.setMonth(lastDate.getMonth() + 1);

    const nextDateStr = nextDate.toISOString().split('T')[0];
    if (nextDateStr > today) continue;

    const { count, error: dupErr } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('title', task.title)
      .eq('due_date', nextDateStr)
      .eq('done', false);

    if (dupErr) throw dupErr;
    if (count && count > 0) continue;

    const { error: insertErr } = await supabase.from('tasks').insert({
      title: task.title,
      description: task.description,
      project: task.project,
      priority: task.priority,
      status: 'À faire',
      recurrence: task.recurrence,
      done: false,
      due_date: nextDateStr,
    });

    if (insertErr) throw insertErr;
  }
};

export const createTaskLegacy = async (payload: LegacyPayload): Promise<LegacyTaskRow> => {
  const insert = {
    title: payload.Titre,
    description: payload.Description ?? null,
    project: payload.Projet ?? null,
    priority: payload.Priorité ?? 'Normale',
    status: payload.Statut ?? 'À faire',
    recurrence: payload.Récurrence ?? 'Aucune',
    done: !!payload.Fait,
    due_date: payload['Date échéance'] ?? null,
    done_date: payload['Date faite'] ?? null,
    parent_task_id: Array.isArray(payload['Tâche parente']) ? payload['Tâche parente'][0] ?? null : null,
    source_email_id: payload['Email source id'] ?? null,
  };
  const { data, error } = await supabase.from('tasks').insert(insert).select('*').single();
  if (error) throw error;
  return legacyTaskFromRow(data);
};

export const updateTaskLegacy = async (id: number | string, payload: LegacyPayload) => {
  const patch: LegacyPayload = {};
  if ('Titre' in payload) patch.title = payload.Titre;
  if ('Description' in payload) patch.description = payload.Description;
  if ('Projet' in payload) patch.project = payload.Projet;
  if ('Priorité' in payload) patch.priority = payload.Priorité;
  if ('Statut' in payload) patch.status = payload.Statut;
  if ('Récurrence' in payload) patch.recurrence = payload.Récurrence;
  if ('Fait' in payload) patch.done = payload.Fait;
  if ('Date échéance' in payload) patch.due_date = payload['Date échéance'];
  if ('Date faite' in payload) patch.done_date = payload['Date faite'];
  if ('Tâche parente' in payload) patch.parent_task_id = Array.isArray(payload['Tâche parente']) ? payload['Tâche parente'][0] ?? null : null;
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return legacyTaskFromRow(data);
};

export const deleteTaskLegacy = async (id: number | string) => {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
};

export const findTaskBySourceEmail = async (emailId: number) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('source_email_id', emailId)
    .maybeSingle();
  if (error) throw error;
  return data ? legacyTaskFromRow(data) : null;
};

export const createTaskFromEmail = async (
  emailId: number,
  payload: LegacyPayload,
) => {
  const existing = await findTaskBySourceEmail(emailId);
  if (existing) {
    await updateInboxEmail(emailId, {
      'Tâche liée': existing.id,
      'Converti en tâche': true,
      'Date conversion': new Date().toISOString(),
    });
    return { task: existing, alreadyExisted: true };
  }

  const created = await createTaskLegacy({
    ...payload,
    'Email source id': emailId,
  });

  await updateInboxEmail(emailId, {
    'Tâche liée': created.id,
    'Converti en tâche': true,
    'Date conversion': new Date().toISOString(),
  });

  return { task: created, alreadyExisted: false };
};

export const listInboxEmails = async (
  size = 200,
  includeDeleted = false,
  options?: { treated?: boolean | null },
): Promise<LegacyEmailRow[]> => {
  let query = supabase.from('inbox_emails').select('*').order('id', { ascending: false }).limit(size);
  if (!includeDeleted) query = query.is('deleted_at', null);
  if (options?.treated === false) query = query.eq('processed', false);
  if (options?.treated === true) query = query.eq('processed', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(legacyEmailFromRow);
};

export const countUntreatedInboxEmails = async () => {
  const { count, error } = await supabase
    .from('inbox_emails')
    .select('id', { count: 'exact', head: true })
    .eq('processed', false)
    .is('deleted_at', null);
  if (error) throw error;
  return count ?? 0;
};

export const updateInboxEmail = async (id: number, payload: LegacyPayload) => {
  const patch: LegacyPayload = {};
  if ('Traité' in payload) patch.processed = payload.Traité;
  if ('Sujet' in payload) patch.subject = payload.Sujet;
  if ('Résumé IA' in payload) patch.ai_summary = payload['Résumé IA'];
  if ('Tâche liée' in payload) patch.linked_task_id = payload['Tâche liée'];
  if ('Converti en tâche' in payload) patch.converted_to_task = payload['Converti en tâche'];
  if ('Date conversion' in payload) patch.converted_at = payload['Date conversion'];
  if ('spam_score' in payload) patch.spam_score = payload.spam_score;
  if ('spam_category' in payload) patch.spam_category = payload.spam_category;
  if ('challenge_responded' in payload) patch.challenge_responded = payload.challenge_responded;
  if ('folder' in payload) patch.folder = payload.folder;
  const { error } = await supabase.from('inbox_emails').update(patch).eq('id', id);
  if (error) throw error;
  if ('Traité' in payload && payload.Traité === true) {
    const n = await countUntreatedInboxEmails();
    dispatchUntreatedEmailCount(n);
  }
};

export const deleteInboxEmail = async (id: number) => {
  const { error } = await supabase.from('inbox_emails').delete().eq('id', id);
  if (error) throw error;
};

export const moveInboxEmailToTrash = async (id: number) => {
  const { error } = await supabase.from('inbox_emails').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
};

export const moveInboxEmailsBulkToTrash = async (ids: number[]) => {
  if (!ids.length) return;
  const { error } = await supabase.from('inbox_emails').update({ deleted_at: new Date().toISOString() }).in('id', ids);
  if (error) throw error;
};

export const restoreInboxEmail = async (id: number) => {
  const { error } = await supabase.from('inbox_emails').update({ deleted_at: null, folder: 'INBOX' }).eq('id', id);
  if (error) throw error;
};

export const restoreInboxEmailsBulk = async (ids: number[]) => {
  if (!ids.length) return;
  const { error } = await supabase.from('inbox_emails').update({ deleted_at: null, folder: 'INBOX' }).in('id', ids);
  if (error) throw error;
};

export const deleteInboxEmailsBulk = async (ids: number[]) => {
  if (!ids.length) return;
  const { error } = await supabase.from('inbox_emails').delete().in('id', ids);
  if (error) throw error;
};

export const listSentEmails = async (size = 200, includeDeleted = false) => {
  let query = supabase.from('sent_emails').select('*').order('id', { ascending: false }).limit(size);
  if (!includeDeleted) query = query.is('deleted_at', null);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(legacySentFromRow);
};

export const createSentEmail = async (payload: LegacyPayload) => {
  const { error } = await supabase.from('sent_emails').insert({
    from_email: payload.De,
    to_emails: payload['À'],
    cc: payload.CC ?? '',
    bcc: payload.BCC ?? '',
    subject: payload.Sujet,
    body: payload.Corps,
    sent_at: payload.Date ?? new Date().toISOString(),
    account_email: payload.Compte,
  });
  if (error) throw error;
};

export const deleteSentEmailsBulk = async (ids: number[]) => {
  if (!ids.length) return;
  const { error } = await supabase.from('sent_emails').delete().in('id', ids);
  if (error) throw error;
};

export const moveSentEmailsBulkToTrash = async (ids: number[]) => {
  if (!ids.length) return;
  const { error } = await supabase.from('sent_emails').update({ deleted_at: new Date().toISOString() }).in('id', ids);
  if (error) throw error;
};

export const restoreSentEmailsBulk = async (ids: number[]) => {
  if (!ids.length) return;
  const { error } = await supabase.from('sent_emails').update({ deleted_at: null }).in('id', ids);
  if (error) throw error;
};

export const deleteSentEmailsOlderThanDays = async (days: number, accountEmail?: string) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase.from('sent_emails').update({ deleted_at: new Date().toISOString() }).lt('sent_at', cutoff).is('deleted_at', null);
  if (accountEmail) query = query.eq('account_email', accountEmail);
  const { error } = await query;
  if (error) throw error;
};

export const listAdminContacts = async () => {
  const { data, error } = await supabase.from('admin_contacts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(legacyAdminFromRow);
};

export const findAdminByEmail = async (email: string) => {
  const { data, error } = await supabase.from('admin_contacts').select('*').ilike('email', email).maybeSingle();
  if (error) throw error;
  return data ? legacyAdminFromRow(data) : null;
};

export const createAdminContact = async (payload: LegacyPayload) => {
  const { error } = await supabase.from('admin_contacts').insert({
    first_name: payload['Prénom'] ?? '',
    last_name: payload['Nom'] ?? '',
    email: payload.Email,
    phone: payload['Téléphone'] ?? '',
    company: payload.Entreprise ?? '',
    category: payload.Catégorie ?? null,
    notes: payload.Notes ?? '',
  });
  if (error) throw error;
};

export const updateAdminContact = async (id: number, payload: LegacyPayload) => {
  const patch: LegacyPayload = {};
  if ('Prénom' in payload) patch.first_name = payload['Prénom'];
  if ('Nom' in payload) patch.last_name = payload['Nom'];
  if ('Email' in payload) patch.email = payload.Email;
  if ('Téléphone' in payload) patch.phone = payload['Téléphone'];
  if ('Entreprise' in payload) patch.company = payload.Entreprise;
  if ('Catégorie' in payload) patch.category = payload.Catégorie;
  if ('Notes' in payload) patch.notes = payload.Notes;
  const { error } = await supabase.from('admin_contacts').update(patch).eq('id', id);
  if (error) throw error;
};

export const deleteAdminContact = async (id: number) => {
  const { error } = await supabase.from('admin_contacts').delete().eq('id', id);
  if (error) throw error;
};

export const listFinanceEntries = async () => {
  const { data, error } = await supabase.from('finance_entries').select('*').order('invoice_date', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []).map(legacyFinanceFromRow);
};

export const listBudgetItems = async () => {
  const { data, error } = await supabase.from('budget_items').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map(legacyBudgetFromRow);
};

export const deleteFinanceEntry = async (id: number) => {
  const { error } = await supabase.from('finance_entries').delete().eq('id', id);
  if (error) throw error;
};

export const updateFinanceEntry = async (id: number, payload: LegacyPayload) => {
  const patch: LegacyPayload = {};
  if ('Date' in payload) patch.invoice_date = payload.Date;
  if ('Date paiement' in payload) patch.payment_date = payload['Date paiement'] ?? null;
  if ('Libellé' in payload) patch.label = payload.Libellé;
  if ('Montant' in payload) patch.amount = payload.Montant;
  if ('Type' in payload) patch.type = payload.Type;
  if ('Source' in payload) patch.source = payload.Source;
  if ('Catégorie' in payload) patch.category = payload.Catégorie;
  if ('Notes' in payload) patch.notes = payload.Notes ?? '';
  if ('Validé' in payload) patch.validated = payload.Validé ?? true;
  const { error } = await supabase.from('finance_entries').update(patch).eq('id', id);
  if (error) throw error;
};

export const createFinanceEntry = async (payload: LegacyPayload) => {
  const insertPayload: LegacyPayload = {
    invoice_date: payload.Date,
    payment_date: payload['Date paiement'] ?? null,
    label: payload.Libellé,
    amount: payload.Montant,
    type: payload.Type,
    source: payload.Source,
    category: payload.Catégorie,
    notes: payload.Notes ?? '',
    validated: payload.Validé ?? true,
  };
  if (payload['Clé auto']) insertPayload.auto_key = payload['Clé auto'];

  const { error } = await supabase.from('finance_entries').insert(insertPayload);
  if (error) throw error;
};

export const ensureMonthlyFixedCharges = async (year: number, month: number) => {
  const mm = String(month).padStart(2, '0');
  const monthStart = `${year}-${mm}-01`;
  const nextMonth = new Date(year, month, 1);
  const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonth = new Date(year, month - 2, 1);
  const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthNext = `${year}-${mm}-01`;

  const { data: budgetItems, error: budgetError } = await supabase
    .from('budget_items')
    .select('id,label,monthly_amount,category,active');
  if (budgetError) throw budgetError;

  const activeBudgetItems = (budgetItems || []).filter((item: DbRow) =>
    isActiveFlag(item.active),
  );

  const { data: existingAutoRows, error: existingError } = await supabase
    .from('finance_entries')
    .select('id,label,amount,invoice_date,source,type')
    .gte('invoice_date', monthStart)
    .lt('invoice_date', nextMonthStart)
    .eq('type', 'Dépense')
    .eq('source', 'Auto');
  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingAutoRows || []).map((row: DbRow) => {
      const label = String(row.label || '').trim().toLowerCase();
      const amount = Number(row.amount || 0).toFixed(2);
      return `${label}|${amount}`;
    }),
  );

  let sourceItems: Array<{ label: string; amount: number; category: string | null }> = activeBudgetItems
    .filter((item: DbRow) => Number(item.monthly_amount || 0) > 0 && fieldAsString(item.label).trim())
    .map((item: DbRow) => ({
      label: fieldAsString(item.label).trim(),
      amount: Number(item.monthly_amount || 0),
      category: fieldAsString(item.category, 'Divers'),
    }));

  if (!sourceItems.length) {
    const { data: prevAutoRows, error: prevAutoError } = await supabase
      .from('finance_entries')
      .select('label,amount,category')
      .gte('invoice_date', prevMonthStart)
      .lt('invoice_date', prevMonthNext)
      .eq('type', 'Dépense')
      .eq('source', 'Auto');
    if (prevAutoError) throw prevAutoError;

    const uniq = new Map<string, { label: string; amount: number; category: string | null }>();
    (prevAutoRows || []).forEach((row: DbRow) => {
      const label = fieldAsString(row.label).trim();
      const amount = Number(row.amount || 0);
      if (!label || amount <= 0) return;
      const key = `${label.toLowerCase()}|${amount.toFixed(2)}`;
      if (!uniq.has(key)) uniq.set(key, { label, amount, category: fieldAsString(row.category, 'Divers') });
    });
    sourceItems = Array.from(uniq.values());
  }

  if (!sourceItems.length) {
    // Fallback plus robuste: reprendre les charges auto les plus recentes
    // (pas uniquement le mois precedent), utile si un mois n'a pas ete injecte.
    const { data: historicalAutoRows, error: historicalAutoError } = await supabase
      .from('finance_entries')
      .select('label,amount,category,invoice_date')
      .lt('invoice_date', monthStart)
      .eq('type', 'Dépense')
      .eq('source', 'Auto')
      .order('invoice_date', { ascending: false })
      .limit(500);
    if (historicalAutoError) throw historicalAutoError;

    const latestByKey = new Map<string, { label: string; amount: number; category: string | null }>();
    (historicalAutoRows || []).forEach((row: DbRow) => {
      const label = fieldAsString(row.label).trim();
      const amount = Number(row.amount || 0);
      if (!label || amount <= 0) return;
      const key = `${label.toLowerCase()}|${amount.toFixed(2)}`;
      if (!latestByKey.has(key)) {
        latestByKey.set(key, { label, amount, category: fieldAsString(row.category, 'Divers') });
      }
    });
    sourceItems = Array.from(latestByKey.values());
  }

  const rowsToInsert = sourceItems
    .filter((item) => !existingKeys.has(`${item.label.toLowerCase()}|${item.amount.toFixed(2)}`))
    .map((item) => ({
      invoice_date: monthStart,
      payment_date: null,
      label: item.label,
      amount: item.amount,
      type: 'Dépense',
      source: 'Auto',
      category: item.category || 'Divers',
      notes: `Charge fixe automatique ${year}-${mm}`,
      validated: true,
    }));

  if (!rowsToInsert.length) return 0;

  const { error, data } = await supabase.from('finance_entries').insert(rowsToInsert).select('id');
  if (error) throw error;

  return (data || []).length;
};

export const getFinances = listFinanceEntries;
export const getEmails = listInboxEmails;

export const getRevenuesDuMois = async () => {
  const rows = await listFinanceEntries();
  const now = new Date();
  return Math.round(rows.filter((row) => {
    if (!row.Date) return false;
    const d = new Date(row.Date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && row.Type === 'Entrée';
  }).reduce((sum, row) => sum + (row.Montant || 0), 0));
};

export const getDepensesDuMois = async () => {
  const rows = await listFinanceEntries();
  const now = new Date();
  return Math.round(rows.filter((row) => {
    if (!row.Date) return false;
    const d = new Date(row.Date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && row.Type === 'Dépense';
  }).reduce((sum, row) => sum + (row.Montant || 0), 0));
};

export const getEmailsNonTraites = async () => {
  const count = await countUntreatedInboxEmails();
  dispatchUntreatedEmailCount(count);
  return count;
};

export const refreshUntreatedEmailCount = countUntreatedInboxEmails;

export const getTaches = listTaskRows;

export const getTachesAujourdhui = async () => {
  const rows = await listTaskRows();
  const today = new Date().toISOString().split('T')[0];
  return rows
    .filter((row) => {
      if (row['Tâche parente'].length > 0) return false;
      if (fieldAsString(row.Statut) === 'Fait') return false;
      const dateEch = row['Date échéance']?.split('T')[0];
      return !dateEch || dateEch <= today;
    })
    .map(mapTodayTask);
};

export const updateTacheStatut = async (id: string, completed: boolean) => {
  await updateTaskLegacy(Number(id), { Statut: completed ? 'Fait' : 'En cours', Fait: completed });
};

export const getDashboardStats = async () => {
  const [revenus, depenses, emailsNonTraites] = await Promise.all([
    getRevenuesDuMois(),
    getDepensesDuMois(),
    getEmailsNonTraites(),
  ]);
  return {
    monthlyRevenue: revenus,
    monthlyExpenses: depenses,
    balance: revenus - depenses,
    unreadEmails: emailsNonTraites,
  };
};

