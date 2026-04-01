import { supabase } from '../lib/supabaseClient';

const N8N_DELETE_EMAIL_WEBHOOK = 'https://n8n.ananda-communaute.cloud/webhook/delete-email';

export const notifyInboxDeletionSync = async (
  emails: Array<{ id: number; accountEmail?: string | null }>,
  mode: 'trash' | 'hard_delete' = 'trash',
) => {
  if (!emails.length) return;
  try {
    await fetch(N8N_DELETE_EMAIL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'dashboard-ananda',
        action: mode,
        emails: emails.map(item => ({
          local_id: item.id,
          account_email: item.accountEmail || null,
        })),
      }),
    });
  } catch {
    // Best effort sync: local workflow still proceeds.
  }
};

const legacyTaskFromRow = (row: any) => ({
  id: row.id,
  Titre: row.title,
  Description: row.description,
  Projet: row.project,
  Priorité: row.priority,
  Statut: row.status,
  Récurrence: row.recurrence,
  Fait: row.done,
  'Date échéance': row.due_date,
  'Date faite': row.done_date,
  'Tâche parente': row.parent_task_id ? [{ id: row.parent_task_id }] : [],
  'Email source id': row.source_email_id ?? null,
});

const legacyEmailFromRow = (row: any) => ({
  id: row.id,
  Sujet: row.subject,
  'Expéditeur': row.sender,
  'Date réception': row.received_at,
  'Résumé IA': row.ai_summary,
  Contenu: row.content,
  'Action requise': row.action_required,
  Traité: row.processed,
  Compte: row.account_email,
  'Réponse 1': row.reply_1,
  'Réponse 2': row.reply_2,
  'Réponse 3': row.reply_3,
  'A une pièce jointe': row.has_attachment,
  Fichier: row.attachments || [],
  'Tâche liée': row.linked_task_id ?? null,
  'Converti en tâche': !!row.converted_to_task,
  'Date conversion': row.converted_at ?? null,
  'Supprimé le': row.deleted_at ?? null,
});

const legacySentFromRow = (row: any) => ({
  id: row.id,
  De: row.from_email,
  'À': row.to_emails,
  CC: row.cc,
  BCC: row.bcc,
  Sujet: row.subject,
  Corps: row.body,
  Date: row.sent_at,
  Compte: row.account_email,
  'Supprimé le': row.deleted_at ?? null,
});

const legacyAdminFromRow = (row: any) => ({
  id: row.id,
  Prénom: row.first_name,
  Nom: row.last_name,
  Email: row.email,
  Téléphone: row.phone,
  Entreprise: row.company,
  Catégorie: row.category ? { value: row.category } : null,
  Notes: row.notes,
  'Date création': row.created_at,
});

const legacyFinanceFromRow = (row: any) => ({
  id: row.id,
  Date: row.invoice_date,
  'Date paiement': row.payment_date,
  Libellé: row.label,
  Montant: row.amount,
  Type: row.type,
  Source: row.source,
  Catégorie: row.category,
  Notes: row.notes,
  Validé: row.validated,
});

const legacyBudgetFromRow = (row: any) => ({
  id: row.id,
  Libellé: row.label,
  Mensuel: row.monthly_amount,
  Actif: row.active,
  Catégorie: row.category,
});

export const listTaskRows = async () => {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []).map(legacyTaskFromRow);
};

export const createTaskLegacy = async (payload: Record<string, any>) => {
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

export const updateTaskLegacy = async (id: number | string, payload: Record<string, any>) => {
  const patch: Record<string, any> = {};
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
  payload: Record<string, any>,
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

export const listInboxEmails = async (size = 200, includeDeleted = false) => {
  let query = supabase.from('inbox_emails').select('*').order('id', { ascending: false }).limit(size);
  if (!includeDeleted) query = query.is('deleted_at', null);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(legacyEmailFromRow);
};

export const updateInboxEmail = async (id: number, payload: Record<string, any>) => {
  const patch: Record<string, any> = {};
  if ('Traité' in payload) patch.processed = payload.Traité;
  if ('Sujet' in payload) patch.subject = payload.Sujet;
  if ('Résumé IA' in payload) patch.ai_summary = payload['Résumé IA'];
  if ('Tâche liée' in payload) patch.linked_task_id = payload['Tâche liée'];
  if ('Converti en tâche' in payload) patch.converted_to_task = payload['Converti en tâche'];
  if ('Date conversion' in payload) patch.converted_at = payload['Date conversion'];
  const { error } = await supabase.from('inbox_emails').update(patch).eq('id', id);
  if (error) throw error;
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
  const { error } = await supabase.from('inbox_emails').update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
};

export const restoreInboxEmailsBulk = async (ids: number[]) => {
  if (!ids.length) return;
  const { error } = await supabase.from('inbox_emails').update({ deleted_at: null }).in('id', ids);
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

export const createSentEmail = async (payload: Record<string, any>) => {
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

export const createAdminContact = async (payload: Record<string, any>) => {
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

export const updateAdminContact = async (id: number, payload: Record<string, any>) => {
  const patch: Record<string, any> = {};
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

export const updateFinanceEntry = async (id: number, payload: Record<string, any>) => {
  const patch: Record<string, any> = {};
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

export const createFinanceEntry = async (payload: Record<string, any>) => {
  const insertPayload: Record<string, any> = {
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

  const { data: budgetItems, error: budgetError } = await supabase
    .from('budget_items')
    .select('id,label,monthly_amount,category,active');
  if (budgetError) throw budgetError;

  const activeBudgetItems = (budgetItems || []).filter((item: any) => {
    const activeRaw = item?.active;
    const activeStr = String(activeRaw ?? '').trim().toLowerCase();
    if ([false, 0].includes(activeRaw)) return false;
    if (['false', 'faux', '0', 'no', 'non'].includes(activeStr)) return false;
    return true;
  });

  const { data: existingAutoRows, error: existingError } = await supabase
    .from('finance_entries')
    .select('id,label,amount,invoice_date,source,type')
    .gte('invoice_date', monthStart)
    .lt('invoice_date', nextMonthStart)
    .eq('type', 'Dépense')
    .eq('source', 'Auto');
  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingAutoRows || []).map((row: any) => {
      const label = String(row.label || '').trim().toLowerCase();
      const amount = Number(row.amount || 0).toFixed(2);
      return `${label}|${amount}`;
    }),
  );

  const rowsToInsert = activeBudgetItems
    .filter((item: any) => Number(item.monthly_amount || 0) > 0 && String(item.label || '').trim())
    .filter((item: any) => {
      const key = `${String(item.label || '').trim().toLowerCase()}|${Number(item.monthly_amount || 0).toFixed(2)}`;
      return !existingKeys.has(key);
    })
    .map((item: any) => ({
      invoice_date: monthStart,
      payment_date: null,
      label: String(item.label || '').trim(),
      amount: item.monthly_amount,
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

// Compat layer from former baserowApi.ts
export const getFinances = listFinanceEntries;
export const getEmails = listInboxEmails;
export const getPosts = async () => [];
export const getFormations = async () => [];

export const getRevenuesDuMois = async () => {
  const rows = await listFinanceEntries();
  const now = new Date();
  return Math.round(rows.filter((row: any) => {
    if (!row.Date) return false;
    const d = new Date(row.Date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && row.Type === 'Entrée';
  }).reduce((sum: number, row: any) => sum + (parseFloat(row.Montant) || 0), 0));
};

export const getDepensesDuMois = async () => {
  const rows = await listFinanceEntries();
  const now = new Date();
  return Math.round(rows.filter((row: any) => {
    if (!row.Date) return false;
    const d = new Date(row.Date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && row.Type === 'Dépense';
  }).reduce((sum: number, row: any) => sum + (parseFloat(row.Montant) || 0), 0));
};

export const getEmailsNonTraites = async () => {
  const rows = await listInboxEmails();
  return rows.filter((row: any) => !row.Traité).length;
};

export const getTaches = listTaskRows;

export const getTachesAujourdhui = async () => {
  const rows = await listTaskRows();
  const today = new Date().toISOString().split('T')[0];
  return rows
    .filter((row: any) => {
      if (row['Tâche parente'] && row['Tâche parente'].length > 0) return false;
      const statut = row.Statut?.value || row.Statut || '';
      if (statut === 'Fait') return false;
      const dateEch = row['Date échéance']?.split('T')[0];
      return !dateEch || dateEch <= today;
    })
    .map((row: any) => ({
      id: row.id.toString(),
      text: row.Titre || '(Sans titre)',
      completed: (row.Statut?.value || row.Statut || '') === 'Fait',
      statut: row.Statut?.value || row.Statut || '',
      priorite: row.Priorité?.value || row.Priorité || '',
      projet: row.Projet?.value || row.Projet || '',
      dateEcheance: row['Date échéance']?.split('T')[0] || null,
    }));
};

export const updateTacheStatut = async (id: string, completed: boolean) => {
  await updateTaskLegacy(Number(id), { Statut: completed ? 'Fait' : 'En cours', Fait: completed });
};

export const getPostsParStatut = async (_statut: string) => [];

export const getStatsBaserow = async () => {
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

