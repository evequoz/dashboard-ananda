// ============================================================
// BASEROW API — Connexion au cerveau admin
// ============================================================

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const API_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';

const TABLES = {
  finances: 348,
  formations: 533,
  emails: 534,
  posts: 535,
  taches: 536,
};

const headers = {
  Authorization: `Token ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

// ============================================================
// FINANCES
// ============================================================
export const getFinances = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.finances}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Erreur Baserow Finances:', e);
    return [];
  }
};

export const getRevenuesDuMois = async () => {
  try {
    const rows = await getFinances();
    const now = new Date();
    return Math.round(
      rows.filter((row: any) => {
        if (!row.Date) return false;
        const d = new Date(row.Date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && row.Type === 'Recette';
      }).reduce((sum: number, row: any) => sum + (parseFloat(row.Montant) || 0), 0)
    );
  } catch (e) { return 0; }
};

export const getDepensesDuMois = async () => {
  try {
    const rows = await getFinances();
    const now = new Date();
    return Math.round(
      rows.filter((row: any) => {
        if (!row.Date) return false;
        const d = new Date(row.Date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && row.Type === 'Dépense';
      }).reduce((sum: number, row: any) => sum + (parseFloat(row.Montant) || 0), 0)
    );
  } catch (e) { return 0; }
};

// ============================================================
// EMAILS
// ============================================================
export const getEmails = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.emails}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) { return []; }
};

export const getEmailsNonTraites = async () => {
  try {
    const rows = await getEmails();
    return rows.filter((row: any) => !row.Traité).length;
  } catch (e) { return 0; }
};

// ============================================================
// TÂCHES — corrigé pour Titre + Statut ('Fait')
// ============================================================
export const getTaches = async () => {
  try {
    const res = await fetch(
      `${BASEROW_URL}/database/rows/table/${TABLES.taches}/?user_field_names=true&size=200`,
      { headers }
    );
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Erreur Baserow Tâches:', e);
    return [];
  }
};

export const getTachesAujourdhui = async () => {
  try {
    const rows = await getTaches();
    const today = new Date().toISOString().split('T')[0];

    return rows
      .filter((row: any) => {
        // Exclure les sous-tâches (qui ont une tâche parente)
        if (row['Tâche parente'] && row['Tâche parente'].length > 0) return false;
        // Exclure les tâches déjà faites
        const statut = row.Statut?.value || row.Statut || '';
        if (statut === 'Fait') return false;
        // Garder tâches du jour ou sans date ou en retard
        const dateEch = row['Date échéance']?.split('T')[0];
        return !dateEch || dateEch <= today;
      })
      .map((row: any) => {
        const statut = row.Statut?.value || row.Statut || '';
        return {
          id: row.id.toString(),
          text: row.Titre || '(Sans titre)',
          completed: statut === 'Fait',
          statut,
          priorite: row.Priorité?.value || row.Priorité || '',
          projet: row.Projet?.value || row.Projet || '',
          dateEcheance: row['Date échéance']?.split('T')[0] || null,
        };
      });
  } catch (e) {
    console.error('Erreur getTachesAujourdhui:', e);
    return [];
  }
};

export const updateTacheStatut = async (id: string, completed: boolean) => {
  try {
    const statut = completed ? 'Fait' : 'En cours';
    await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.taches}/${id}/?user_field_names=true`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ Statut: statut, Fait: completed }),
    });
  } catch (e) {
    console.error('Erreur update tâche:', e);
  }
};

// ============================================================
// POSTS
// ============================================================
export const getPosts = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.posts}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) { return []; }
};

export const getPostsParStatut = async (statut: string) => {
  try {
    const rows = await getPosts();
    return rows.filter((row: any) => row.Statut === statut);
  } catch (e) { return []; }
};

// ============================================================
// FORMATIONS
// ============================================================
export const getFormations = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.formations}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) { return []; }
};

// ============================================================
// STATS GLOBALES
// ============================================================
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
